import { BadRequestException, Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { POSTGRES_POOL } from '../../infra/postgres/postgres.module';
import { withRlsTransaction, type Role } from '../../common/rls/rls-context';
import { pgcryptoEncrypt } from '../../common/crypto/pgcrypto';
import { ArgonService } from './argon.service';
import { TotpService } from './totp.service';
import { TokenService, type TokenPair } from './token.service';
import { AuditService } from '../audit/audit.service';

interface UserAuthRow {
  id: string;
  role: Role;
  lga_id: string | null;
  ward_id: string | null;
  pin_hash: string | null;
  password_hash: string | null;
  totp_secret_ciphertext: Buffer | null;
  status: 'active' | 'suspended' | 'deleted';
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    @Inject(ArgonService) private readonly argon: ArgonService,
    @Inject(TotpService) private readonly totp: TotpService,
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  /**
   * Mobile flow: phone + PIN. Lookup by phone_hash (sha256 of E.164),
   * verify PIN with Argon2 + pepper, issue tokens. Same response shape and
   * timing whether the user doesn't exist or the PIN is wrong (per
   * THREATS #11 — phone enumeration).
   */
  async signInMobile(args: {
    phone: string;
    pin: string;
    deviceId: string;
    requestId: string | null;
  }): Promise<TokenPair> {
    const phoneHash = sha256Buf(args.phone);
    const user = await this.lookupByPhone(phoneHash);

    // Always run argon verify — even on miss — so timing is uniform.
    const decoyHash = '$argon2id$v=19$m=65536,t=3,p=1$ZGVjb3lzYWx0ZGVjb3k$decoy';
    const stored = user?.pin_hash ?? decoyHash;
    const valid = (await this.argon.verify(stored, args.pin)) && user !== null;

    if (!user || !valid || user.status !== 'active') {
      await this.audit.append({
        actorUserId: user?.id ?? null,
        actorRole: 'system',
        eventKind: 'auth.sign_in.mobile.failed',
        targetTable: 'users',
        targetId: user?.id ?? null,
        payload: { reason: !user ? 'no_user' : !valid ? 'bad_pin' : 'inactive' },
        requestId: args.requestId,
      });
      throw new UnauthorizedException('invalid credentials');
    }

    const pair = await this.tokens.issuePair({
      userId: user.id,
      role: user.role,
      lgaId: user.lga_id,
      wardId: user.ward_id,
      deviceId: args.deviceId,
    });
    await this.audit.append({
      actorUserId: user.id,
      actorRole: user.role,
      eventKind: 'auth.sign_in.mobile.ok',
      targetTable: 'users',
      targetId: user.id,
      payload: { device_id: args.deviceId },
      requestId: args.requestId,
    });
    return pair;
  }

  /**
   * Console flow: email + password + TOTP. Director only.
   * TOTP is required — no fallback or "remember device" path.
   */
  async signInConsole(args: {
    email: string;
    password: string;
    totp: string;
    deviceId: string;
    requestId: string | null;
  }): Promise<TokenPair> {
    const emailHash = sha256Buf(args.email.toLowerCase());
    const user = await this.lookupByEmail(emailHash);

    const decoyHash = '$argon2id$v=19$m=65536,t=3,p=1$ZGVjb3lzYWx0ZGVjb3k$decoy';
    const passwordOk =
      (await this.argon.verify(user?.password_hash ?? decoyHash, args.password)) && user !== null;

    let totpOk = false;
    if (user?.totp_secret_ciphertext) {
      const secret = await this.decryptTotpSecret(user.totp_secret_ciphertext);
      totpOk = this.totp.verify(secret, args.totp);
    }

    if (!user || !passwordOk || !totpOk || user.role !== 'director' || user.status !== 'active') {
      await this.audit.append({
        actorUserId: user?.id ?? null,
        actorRole: 'system',
        eventKind: 'auth.sign_in.console.failed',
        targetTable: 'users',
        targetId: user?.id ?? null,
        payload: {
          reason: !user
            ? 'no_user'
            : !passwordOk
              ? 'bad_password'
              : !totpOk
                ? 'bad_totp'
                : user.role !== 'director'
                  ? 'wrong_role'
                  : 'inactive',
        },
        requestId: args.requestId,
      });
      throw new UnauthorizedException('invalid credentials');
    }

    const pair = await this.tokens.issuePair({
      userId: user.id,
      role: user.role,
      lgaId: user.lga_id,
      wardId: user.ward_id,
      deviceId: args.deviceId,
    });
    await this.audit.append({
      actorUserId: user.id,
      actorRole: user.role,
      eventKind: 'auth.sign_in.console.ok',
      targetTable: 'users',
      targetId: user.id,
      payload: { device_id: args.deviceId },
      requestId: args.requestId,
    });
    return pair;
  }

  /**
   * Redeem an enrolment token to set credentials. Mobile users supply a PIN;
   * console users (director only) supply password + TOTP secret + a TOTP
   * proof generated from that secret. The token is invalidated on redemption.
   */
  async setCredentials(args: {
    enrolmentToken: string;
    pin?: string;
    password?: string;
    totpSecret?: string;
    totp?: string;
    requestId: string | null;
  }): Promise<{ ok: true }> {
    const tokenHash = sha256Buf(args.enrolmentToken);
    const client = await this.pool.connect();
    try {
      const userIdAndRole = await withRlsTransaction(
        client,
        { userId: null, role: 'system', lgaId: null, wardId: null },
        async (c) => {
          const r = await c.query<{ id: string; role: Role; expires: Date }>(
            `SELECT id, role, enrolment_expires_at AS expires
             FROM users WHERE enrolment_token_hash = $1 AND deleted_at IS NULL`,
            [tokenHash],
          );
          const row = r.rows[0];
          if (!row) throw new UnauthorizedException('enrolment token not recognised');
          if (row.expires.getTime() <= Date.now()) {
            throw new UnauthorizedException('enrolment token expired');
          }

          if (row.role === 'director') {
            if (!args.password || !args.totpSecret || !args.totp) {
              throw new BadRequestException(
                'password, totpSecret and totp are required for director enrolment',
              );
            }
            if (!this.totp.verify(args.totpSecret, args.totp)) {
              throw new BadRequestException('totp proof did not validate against the secret');
            }
            const passwordHash = await this.argon.hash(args.password);
            const totpCt = await pgcryptoEncrypt(c, args.totpSecret);
            await c.query(
              `UPDATE users
               SET password_hash = $1,
                   totp_secret_ciphertext = $2,
                   pin_hash = NULL,
                   enrolment_token_hash = NULL,
                   enrolment_expires_at = NULL
               WHERE id = $3`,
              [passwordHash, totpCt, row.id],
            );
          } else {
            if (!args.pin) {
              throw new BadRequestException('pin is required for mobile enrolment');
            }
            const pinHash = await this.argon.hash(args.pin);
            await c.query(
              `UPDATE users
               SET pin_hash = $1,
                   enrolment_token_hash = NULL,
                   enrolment_expires_at = NULL
               WHERE id = $2`,
              [pinHash, row.id],
            );
          }
          return { id: row.id, role: row.role };
        },
      );

      await this.audit.append({
        actorUserId: userIdAndRole.id,
        actorRole: userIdAndRole.role,
        eventKind: 'auth.enrolment.completed',
        targetTable: 'users',
        targetId: userIdAndRole.id,
        payload: { method: userIdAndRole.role === 'director' ? 'console' : 'mobile' },
        requestId: args.requestId,
      });
      return { ok: true } as const;
    } finally {
      client.release();
    }
  }

  async signOut(args: {
    userId: string;
    role: Role;
    deviceId: string;
    requestId: string | null;
  }): Promise<{ revoked: number }> {
    const revoked = await this.tokens.revokeAllForDevice(args.userId, args.deviceId);
    await this.audit.append({
      actorUserId: args.userId,
      actorRole: args.role,
      eventKind: 'auth.sign_out',
      targetTable: 'users',
      targetId: args.userId,
      payload: { device_id: args.deviceId, revoked },
      requestId: args.requestId,
    });
    return { revoked };
  }

  private async lookupByPhone(phoneHash: Buffer): Promise<UserAuthRow | null> {
    return this.lookupOne(`phone_hash = $1`, [phoneHash]);
  }

  private async lookupByEmail(emailHash: Buffer): Promise<UserAuthRow | null> {
    return this.lookupOne(`email_hash = $1`, [emailHash]);
  }

  private async lookupOne(predicate: string, params: unknown[]): Promise<UserAuthRow | null> {
    const client = await this.pool.connect();
    try {
      return await withRlsTransaction(
        client,
        { userId: null, role: 'system', lgaId: null, wardId: null },
        async (c) => {
          const r = await c.query<UserAuthRow>(
            `SELECT id, role, lga_id, ward_id, pin_hash, password_hash,
                    totp_secret_ciphertext, status
             FROM users WHERE ${predicate} AND deleted_at IS NULL LIMIT 1`,
            params,
          );
          return r.rows[0] ?? null;
        },
      );
    } finally {
      client.release();
    }
  }

  /**
   * Decrypt a TOTP secret using pgcrypto. The DEK is fetched via the user's
   * `key_id` — but at M3 we use a single dev DEK; per-user DEK + KMS rotation
   * is M13. The wrapping fn lives DB-side as `pgp_sym_decrypt`.
   */
  private async decryptTotpSecret(ciphertext: Buffer): Promise<string> {
    const client = await this.pool.connect();
    try {
      return await withRlsTransaction(
        client,
        { userId: null, role: 'system', lgaId: null, wardId: null },
        async (c) => {
          const r = await c.query<{ secret: string }>(
            `SELECT pgp_sym_decrypt($1::bytea, current_setting('app.totp_dek')) AS secret`,
            [ciphertext],
          );
          const row = r.rows[0];
          if (!row) throw new Error('pgp_sym_decrypt returned no row');
          return row.secret;
        },
      );
    } finally {
      client.release();
    }
  }
}

function sha256Buf(input: string): Buffer {
  return createHash('sha256').update(input).digest();
}

export const __test__ = { sha256Buf };
