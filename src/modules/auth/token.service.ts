import { Injectable, OnModuleInit, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Pool } from 'pg';
import { POSTGRES_POOL } from '../../infra/postgres/postgres.module';
import { withRlsTransaction, type Role } from '../../common/rls/rls-context';
import type { AppConfig } from '../../config/configuration';

export interface JwtPayload {
  sub: string; // user id
  role: Role;
  lga: string | null;
  ward: string | null;
  jti: string;
}

export interface TokenPair {
  accessToken: string;
  accessExpiresIn: number;
  refreshToken: string;
  refreshExpiresAt: Date;
}

const REFRESH_BYTES = 48;

@Injectable()
export class TokenService implements OnModuleInit {
  private privateKey!: Buffer;
  private publicKey!: Buffer;
  private accessTtl!: string;
  private refreshTtlMs!: number;

  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(ConfigService) private readonly config: ConfigService<AppConfig, true>,
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
  ) {}

  onModuleInit(): void {
    const auth = this.config.get('auth', { infer: true });
    this.privateKey = readFileSync(resolve(process.cwd(), auth.jwtPrivateKeyPath));
    this.publicKey = readFileSync(resolve(process.cwd(), auth.jwtPublicKeyPath));
    this.accessTtl = auth.jwtAccessTtl;
    this.refreshTtlMs = parseDurationMs(auth.jwtRefreshTtl);
  }

  /**
   * Issue an access+refresh pair for a fresh sign-in. The refresh token is
   * persisted hashed (sha256, no salt — the token itself is high-entropy
   * 48 random bytes so rainbow tables don't help). Device id is required for
   * mobile and ignored for console (web sessions don't device-bind).
   */
  async issuePair(args: {
    userId: string;
    role: Role;
    lgaId: string | null;
    wardId: string | null;
    deviceId: string;
  }): Promise<TokenPair> {
    const jti = randomBytes(16).toString('hex');
    const accessToken = await this.signAccess({
      sub: args.userId,
      role: args.role,
      lga: args.lgaId,
      ward: args.wardId,
      jti,
    });
    const refreshToken = randomBytes(REFRESH_BYTES).toString('base64url');
    const expiresAt = new Date(Date.now() + this.refreshTtlMs);
    await this.persistRefreshToken({
      userId: args.userId,
      deviceId: args.deviceId,
      tokenHash: hashRefresh(refreshToken),
      expiresAt,
      rotatedFromId: null,
    });
    return {
      accessToken,
      accessExpiresIn: parseDurationMs(this.accessTtl) / 1000,
      refreshToken,
      refreshExpiresAt: expiresAt,
    };
  }

  /**
   * Rotate a refresh token. The presented token is looked up by hash; if it
   * is unknown, expired, or already revoked, we throw. On success the old
   * row is marked revoked, a new row is inserted with rotated_from_id set,
   * and a fresh access+refresh pair is returned. Re-presenting the old
   * token after rotation triggers full revocation of the device's chain
   * (token reuse detection).
   */
  async rotate(args: {
    presentedToken: string;
    deviceId: string;
  }): Promise<TokenPair> {
    const hash = hashRefresh(args.presentedToken);
    const client = await this.pool.connect();
    try {
      const result = await withRlsTransaction(
        client,
        { userId: null, role: 'system', lgaId: null, wardId: null },
        async (c): Promise<TokenPair | { reuse: { userId: string; deviceId: string } }> => {
          const row = await c.query<{
            id: string;
            user_id: string;
            device_id: string;
            expires_at: Date;
            revoked_at: Date | null;
          }>(
            `SELECT id, user_id, device_id, expires_at, revoked_at
             FROM refresh_tokens WHERE token_hash = $1`,
            [hash],
          );
          const tok = row.rows[0];
          if (!tok) throw new UnauthorizedException('refresh token not recognised');
          if (tok.device_id !== args.deviceId) {
            throw new UnauthorizedException('refresh token / device mismatch');
          }
          if (tok.expires_at.getTime() <= Date.now()) {
            throw new UnauthorizedException('refresh token expired');
          }
          if (tok.revoked_at) {
            // Reuse of a revoked token. The kill must happen in a separate
            // committed txn, otherwise the throw rolls it back.
            return { reuse: { userId: tok.user_id, deviceId: tok.device_id } } as const;
          }

          // Look up the user's current scope for the new access token.
          const userRow = await c.query<{
            role: Role;
            lga_id: string | null;
            ward_id: string | null;
          }>(`SELECT role, lga_id, ward_id FROM users WHERE id = $1`, [tok.user_id]);
          const user = userRow.rows[0];
          if (!user) throw new UnauthorizedException('user no longer exists');

          await c.query(`UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1`, [tok.id]);

          const newToken = randomBytes(REFRESH_BYTES).toString('base64url');
          const newExpiresAt = new Date(Date.now() + this.refreshTtlMs);
          await c.query(
            `INSERT INTO refresh_tokens (user_id, device_id, token_hash, expires_at, rotated_from_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [tok.user_id, tok.device_id, hashRefresh(newToken), newExpiresAt, tok.id],
          );

          const jti = randomBytes(16).toString('hex');
          const accessToken = await this.signAccess({
            sub: tok.user_id,
            role: user.role,
            lga: user.lga_id,
            ward: user.ward_id,
            jti,
          });

          return {
            accessToken,
            accessExpiresIn: parseDurationMs(this.accessTtl) / 1000,
            refreshToken: newToken,
            refreshExpiresAt: newExpiresAt,
          };
        },
      );
      if ('reuse' in result) {
        await this.revokeAllForDevice(result.reuse.userId, result.reuse.deviceId);
        throw new UnauthorizedException('refresh token reused — chain revoked');
      }
      return result;
    } finally {
      client.release();
    }
  }

  async revokeAllForDevice(userId: string, deviceId: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      const out = await withRlsTransaction(
        client,
        { userId: null, role: 'system', lgaId: null, wardId: null },
        async (c) =>
          c.query(
            `UPDATE refresh_tokens SET revoked_at = now()
             WHERE user_id = $1 AND device_id = $2 AND revoked_at IS NULL`,
            [userId, deviceId],
          ),
      );
      return out.rowCount ?? 0;
    } finally {
      client.release();
    }
  }

  async verifyAccess(token: string): Promise<JwtPayload> {
    return this.jwt.verifyAsync<JwtPayload>(token, {
      algorithms: ['RS256'],
      publicKey: this.publicKey,
    });
  }

  private async signAccess(payload: JwtPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      algorithm: 'RS256',
      privateKey: this.privateKey,
      expiresIn: this.accessTtl,
    });
  }

  private async persistRefreshToken(args: {
    userId: string;
    deviceId: string;
    tokenHash: string;
    expiresAt: Date;
    rotatedFromId: string | null;
  }): Promise<void> {
    const client = await this.pool.connect();
    try {
      await withRlsTransaction(
        client,
        { userId: null, role: 'system', lgaId: null, wardId: null },
        async (c) => {
          await c.query(
            `INSERT INTO refresh_tokens (user_id, device_id, token_hash, expires_at, rotated_from_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [args.userId, args.deviceId, args.tokenHash, args.expiresAt, args.rotatedFromId],
          );
        },
      );
    } finally {
      client.release();
    }
  }
}

function hashRefresh(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function parseDurationMs(input: string): number {
  const m = /^(\d+)\s*([smhd])$/.exec(input.trim());
  if (!m) throw new Error(`invalid duration: ${input}`);
  const [, n, unit] = m;
  const mult = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit as 's' | 'm' | 'h' | 'd'];
  return Number(n) * mult;
}

// Exported for unit testing.
export const __test__ = { hashRefresh, parseDurationMs };
