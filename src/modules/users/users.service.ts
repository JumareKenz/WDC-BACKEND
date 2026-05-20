import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { POSTGRES_POOL } from '../../infra/postgres/postgres.module';
import { withRlsTransaction, type RlsContext, type Role } from '../../common/rls/rls-context';
import { normalisePhone, phoneHash, emailHash } from '../../common/crypto/phone';
import { pgcryptoEncrypt, pgcryptoDecrypt } from '../../common/crypto/pgcrypto';
import { AuditService } from '../audit/audit.service';

const ENROLMENT_TTL_MS = 24 * 60 * 60 * 1000;
const DEK_KEY_ID = 'kid-dev'; // bumped on rotation; M13.

interface UserRow {
  id: string;
  role: Role;
  lga_id: string | null;
  ward_id: string | null;
  full_name_ciphertext: Buffer;
  phone_ciphertext: Buffer;
  email_ciphertext: Buffer | null;
  status: 'active' | 'suspended' | 'deleted';
  created_at: Date;
  updated_at: Date;
}

export interface UserView {
  id: string;
  role: Role;
  fullName: string;
  phone: string;
  email: string | null;
  lgaId: string | null;
  wardId: string | null;
  status: 'active' | 'suspended' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async create(args: {
    actor: RlsContext;
    role: Role;
    fullName: string;
    phone: string;
    email?: string;
    lgaId?: string;
    wardId?: string;
    requestId: string | null;
  }): Promise<UserView & { enrolmentToken: string; enrolmentExpiresAt: Date }> {
    requireDirector(args.actor);
    const phoneE164 = normalisePhone(args.phone);
    const emailNorm = args.email?.trim().toLowerCase();

    const enrolmentToken = randomBytes(32).toString('base64url');
    const enrolmentTokenHash = sha256(enrolmentToken);
    const enrolmentExpiresAt = new Date(Date.now() + ENROLMENT_TTL_MS);

    const client = await this.pool.connect();
    try {
      const created = await withRlsTransaction(client, args.actor, async (c) => {
        // Phone uniqueness is at the DB level (unique index on phone_hash);
        // catch the constraint violation and surface a friendly 409.
        try {
          const fullNameCt = await pgcryptoEncrypt(c, args.fullName);
          const phoneCt = await pgcryptoEncrypt(c, phoneE164);
          const emailCt = emailNorm ? await pgcryptoEncrypt(c, emailNorm) : null;

          const r = await c.query<UserRow>(
            `INSERT INTO users (
               role, lga_id, ward_id,
               full_name_ciphertext, phone_hash, phone_ciphertext,
               email_hash, email_ciphertext,
               key_id, status, enrolment_token_hash, enrolment_expires_at
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11)
             RETURNING id, role, lga_id, ward_id,
                       full_name_ciphertext, phone_ciphertext, email_ciphertext,
                       status, created_at, updated_at`,
            [
              args.role,
              args.lgaId ?? null,
              args.wardId ?? null,
              fullNameCt,
              phoneHash(phoneE164),
              phoneCt,
              emailNorm ? emailHash(emailNorm) : null,
              emailCt,
              DEK_KEY_ID,
              enrolmentTokenHash,
              enrolmentExpiresAt,
            ],
          );
          const row = r.rows[0];
          if (!row) throw new Error('users INSERT returned no row');
          return row;
        } catch (e) {
          const msg = (e as Error).message;
          if (/users_phone_hash_uk/.test(msg)) {
            throw new ConflictException('a user with this phone already exists');
          }
          throw e;
        }
      });

      const view = await this.materialiseView(created, phoneE164, emailNorm ?? null);
      await this.audit.append({
        actorUserId: args.actor.userId,
        actorRole: args.actor.role,
        eventKind: 'users.created',
        targetTable: 'users',
        targetId: view.id,
        payload: { role: view.role, lga_id: view.lgaId, ward_id: view.wardId },
        requestId: args.requestId,
      });

      return { ...view, enrolmentToken, enrolmentExpiresAt };
    } finally {
      client.release();
    }
  }

  async getById(actor: RlsContext, id: string): Promise<UserView> {
    const client = await this.pool.connect();
    try {
      const row = await withRlsTransaction(client, actor, async (c) => {
        const r = await c.query<UserRow>(
          `SELECT id, role, lga_id, ward_id,
                  full_name_ciphertext, phone_ciphertext, email_ciphertext,
                  status, created_at, updated_at
           FROM users WHERE id = $1 AND deleted_at IS NULL`,
          [id],
        );
        const out = r.rows[0];
        if (!out) throw new NotFoundException('user not found');
        return out;
      });
      return await this.viewFromRow(row);
    } finally {
      client.release();
    }
  }

  async list(
    actor: RlsContext,
    filters: { role?: Role; lgaId?: string; wardId?: string; cursor?: string; limit?: number },
  ): Promise<{ items: UserView[]; nextCursor: string | null }> {
    requireDirector(actor);
    const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100);
    const cursorTs = filters.cursor ? decodeCursor(filters.cursor) : null;
    if (filters.cursor && !cursorTs) {
      throw new BadRequestException('invalid cursor');
    }

    const client = await this.pool.connect();
    try {
      const rows = await withRlsTransaction(client, actor, async (c) => {
        const where: string[] = [`deleted_at IS NULL`];
        const params: unknown[] = [];
        if (filters.role) {
          params.push(filters.role);
          where.push(`role = $${params.length}`);
        }
        if (filters.lgaId) {
          params.push(filters.lgaId);
          where.push(`lga_id = $${params.length}`);
        }
        if (filters.wardId) {
          params.push(filters.wardId);
          where.push(`ward_id = $${params.length}`);
        }
        if (cursorTs) {
          params.push(cursorTs.createdAt);
          params.push(cursorTs.id);
          where.push(`(created_at, id) < ($${params.length - 1}, $${params.length})`);
        }
        params.push(limit + 1);
        const r = await c.query<UserRow>(
          `SELECT id, role, lga_id, ward_id,
                  full_name_ciphertext, phone_ciphertext, email_ciphertext,
                  status, created_at, updated_at
           FROM users
           WHERE ${where.join(' AND ')}
           ORDER BY created_at DESC, id DESC
           LIMIT $${params.length}`,
          params,
        );
        return r.rows;
      });

      const more = rows.length > limit;
      const slice = more ? rows.slice(0, limit) : rows;
      const items = (
        await Promise.all(
          slice.map(async (r) => {
            try {
              return await this.viewFromRow(r);
            } catch {
              // Skip rows with corrupted / unreadable ciphertext rather than
              // crashing the entire list endpoint (defence in depth).
              return null;
            }
          }),
        )
      ).filter(Boolean) as UserView[];
      const last = slice[slice.length - 1];
      const nextCursor = more && last ? encodeCursor({ createdAt: last.created_at, id: last.id }) : null;
      return { items, nextCursor };
    } finally {
      client.release();
    }
  }

  async updateAssignment(
    actor: RlsContext,
    id: string,
    patch: { lgaId?: string | null; wardId?: string | null },
    requestId: string | null,
  ): Promise<UserView> {
    requireDirector(actor);
    const client = await this.pool.connect();
    try {
      const row = await withRlsTransaction(client, actor, async (c) => {
        const sets: string[] = [];
        const params: unknown[] = [];
        if (patch.lgaId !== undefined) {
          params.push(patch.lgaId);
          sets.push(`lga_id = $${params.length}`);
        }
        if (patch.wardId !== undefined) {
          params.push(patch.wardId);
          sets.push(`ward_id = $${params.length}`);
        }
        if (sets.length === 0) {
          throw new ConflictException('no changes specified');
        }
        params.push(id);
        const r = await c.query<UserRow>(
          `UPDATE users SET ${sets.join(', ')}
           WHERE id = $${params.length} AND deleted_at IS NULL
           RETURNING id, role, lga_id, ward_id,
                     full_name_ciphertext, phone_ciphertext, email_ciphertext,
                     status, created_at, updated_at`,
          params,
        );
        const out = r.rows[0];
        if (!out) throw new NotFoundException('user not found');
        return out;
      });
      const view = await this.viewFromRow(row);
      await this.audit.append({
        actorUserId: actor.userId,
        actorRole: actor.role,
        eventKind: 'users.assignment_changed',
        targetTable: 'users',
        targetId: view.id,
        payload: { lga_id: view.lgaId, ward_id: view.wardId },
        requestId,
      });
      return view;
    } finally {
      client.release();
    }
  }

  async setStatus(
    actor: RlsContext,
    id: string,
    status: 'active' | 'suspended',
    requestId: string | null,
  ): Promise<UserView> {
    requireDirector(actor);
    const client = await this.pool.connect();
    try {
      const row = await withRlsTransaction(client, actor, async (c) => {
        const r = await c.query<UserRow>(
          `UPDATE users SET status = $1
           WHERE id = $2 AND deleted_at IS NULL
           RETURNING id, role, lga_id, ward_id,
                     full_name_ciphertext, phone_ciphertext, email_ciphertext,
                     status, created_at, updated_at`,
          [status, id],
        );
        const out = r.rows[0];
        if (!out) throw new NotFoundException('user not found');
        return out;
      });
      const view = await this.viewFromRow(row);
      await this.audit.append({
        actorUserId: actor.userId,
        actorRole: actor.role,
        eventKind: status === 'suspended' ? 'users.suspended' : 'users.reactivated',
        targetTable: 'users',
        targetId: view.id,
        payload: { status },
        requestId,
      });
      return view;
    } finally {
      client.release();
    }
  }

  async softDelete(actor: RlsContext, id: string, requestId: string | null): Promise<void> {
    requireDirector(actor);
    const client = await this.pool.connect();
    try {
      await withRlsTransaction(client, actor, async (c) => {
        const r = await c.query(
          `UPDATE users SET status = 'deleted', deleted_at = now()
           WHERE id = $1 AND deleted_at IS NULL`,
          [id],
        );
        if ((r.rowCount ?? 0) === 0) throw new NotFoundException('user not found');
      });
      await this.audit.append({
        actorUserId: actor.userId,
        actorRole: actor.role,
        eventKind: 'users.deleted',
        targetTable: 'users',
        targetId: id,
        payload: {},
        requestId,
      });
    } finally {
      client.release();
    }
  }

  private async viewFromRow(row: UserRow): Promise<UserView> {
    const client = await this.pool.connect();
    try {
      return await withRlsTransaction(
        client,
        { userId: null, role: 'system', lgaId: null, wardId: null },
        async (c) => {
          const fullName = await pgcryptoDecrypt(c, row.full_name_ciphertext);
          const phone = await pgcryptoDecrypt(c, row.phone_ciphertext);
          const email = row.email_ciphertext ? await pgcryptoDecrypt(c, row.email_ciphertext) : null;
          return {
            id: row.id,
            role: row.role,
            fullName,
            phone,
            email,
            lgaId: row.lga_id,
            wardId: row.ward_id,
            status: row.status,
            createdAt: row.created_at.toISOString(),
            updatedAt: row.updated_at.toISOString(),
          };
        },
      );
    } finally {
      client.release();
    }
  }

  /**
   * The view we already encrypted plaintext for during `create` — avoid the
   * round-trip pgcrypto decrypt and use the plaintext we have on hand.
   */
  private async materialiseView(
    row: UserRow,
    phoneE164: string,
    email: string | null,
  ): Promise<UserView> {
    const client = await this.pool.connect();
    try {
      return await withRlsTransaction(
        client,
        { userId: null, role: 'system', lgaId: null, wardId: null },
        async (c) => {
          const fullName = await pgcryptoDecrypt(c, row.full_name_ciphertext);
          return {
            id: row.id,
            role: row.role,
            fullName,
            phone: phoneE164,
            email,
            lgaId: row.lga_id,
            wardId: row.ward_id,
            status: row.status,
            createdAt: row.created_at.toISOString(),
            updatedAt: row.updated_at.toISOString(),
          };
        },
      );
    } finally {
      client.release();
    }
  }
}

function requireDirector(actor: RlsContext): void {
  if (actor.role !== 'director') {
    throw new ForbiddenException('director role required for this action');
  }
}

function sha256(input: string): Buffer {
  return createHash('sha256').update(input).digest();
}

function encodeCursor(args: { createdAt: Date; id: string }): string {
  return Buffer.from(`${args.createdAt.toISOString()}|${args.id}`).toString('base64url');
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const [iso, id] = decoded.split('|');
    if (!iso || !id) return null;
    const createdAt = new Date(iso);
    if (Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

export const __test__ = { encodeCursor, decodeCursor };

// Discard unused PoolClient import warning — used only at type-level.
export type _unusedPoolClient = PoolClient;
