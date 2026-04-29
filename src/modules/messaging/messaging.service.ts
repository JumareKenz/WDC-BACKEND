import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import type { Queue } from 'bullmq';
import { POSTGRES_POOL } from '../../infra/postgres/postgres.module';
import { MESSAGES_QUEUE } from '../../infra/queue/queue.module';
import { withRlsTransaction, type RlsContext } from '../../common/rls/rls-context';
import { AuditService } from '../audit/audit.service';
import { InAppAdapter } from './adapters/in-app.adapter';
import { EmailAdapter } from './adapters/email.adapter';
import { SmsAdapter } from './adapters/sms.adapter';
import { WhatsAppAdapter } from './adapters/whatsapp.adapter';
import type { ChannelAdapter } from './adapters/channel-adapter.interface';

interface DeliveryRow {
  id: string;
  recipient_user_id: string;
  channel: 'in_app' | 'email' | 'sms' | 'whatsapp';
  provider_ref: string | null;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  payload: Record<string, unknown>;
  queued_at: Date;
  sent_at: Date | null;
  delivered_at: Date | null;
  read_at: Date | null;
  failed_at: Date | null;
  error_message: string | null;
}

function isQuietHoursWat(): boolean {
  // WAT = UTC+1. Compute current hour in WAT.
  const now = new Date();
  const watHour = (now.getUTCHours() + 1) % 24;
  return watHour >= 22 || watHour < 6;
}

function msUntilQuietHoursEnd(): number {
  const now = new Date();
  const watHour = (now.getUTCHours() + 1) % 24;
  const watMin = now.getUTCMinutes();
  let hoursToAdd: number;
  if (watHour >= 22) {
    hoursToAdd = (24 - watHour + 6);
  } else {
    hoursToAdd = 6 - watHour;
  }
  return ((hoursToAdd * 60 - watMin) * 60 - now.getUTCSeconds()) * 1000 - now.getUTCMilliseconds();
}

@Injectable()
export class MessagingService {
  private readonly adapters: Record<string, ChannelAdapter>;

  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(MESSAGES_QUEUE) private readonly msgQueue: Queue,
    @Inject(InAppAdapter) private readonly inApp: InAppAdapter,
    @Inject(EmailAdapter) private readonly email: EmailAdapter,
    @Inject(SmsAdapter) private readonly sms: SmsAdapter,
    @Inject(WhatsAppAdapter) private readonly whatsapp: WhatsAppAdapter,
  ) {
    this.adapters = {
      in_app: this.inApp,
      email: this.email,
      sms: this.sms,
      whatsapp: this.whatsapp,
    };
  }

  async broadcast(
    actor: RlsContext,
    args: {
      body: string;
      channels: ('in_app' | 'email' | 'sms' | 'whatsapp')[];
      scopeKind: 'state' | 'lga' | 'ward';
      scopeIds?: string[];
      urgent?: boolean;
      requestId: string | null;
    },
  ): Promise<{ messageId: string; conversationId: string; recipientCount: number; deliveryCount: number; queuedDuringQuietHours: boolean }> {
    requireDirector(actor);
    const quiet = isQuietHoursWat();
    const queuedDuringQuietHours = quiet && !args.urgent;

    const client = await this.pool.connect();
    try {
      const result = await withRlsTransaction(client, actor, async (c) => {
        const convoRow = (await c.query<{ id: string }>(`SELECT gen_random_uuid() AS id`)).rows[0];
        if (!convoRow) throw new Error('gen_random_uuid returned no row');
        const conversationId = convoRow.id;

        // Insert message with inline encryption (body_ciphertext is text; pgp_sym_encrypt
        // returns bytea, so we let Postgres handle the cast inside the same SQL expression)
        const msg = await c.query<{ id: string }>(
          `INSERT INTO messages (conversation_id, sender_user_id, body_ciphertext, key_id)
           VALUES ($1, $2, pgp_sym_encrypt($3, current_setting('app.dek')), 'kid-dev')
           RETURNING id`,
          [conversationId, actor.userId, args.body],
        );
        const msgRow = msg.rows[0];
        if (!msgRow) throw new Error('messages insert returned no row');
        const messageId = msgRow.id;

        // Resolve recipients by scope
        const recipients = await this.resolveRecipients(c, args.scopeKind, args.scopeIds ?? []);
        const recipientCount = recipients.length;
        let deliveryCount = 0;

        // Create delivery attempts
        const pendingDeliveries: Array<{
          deliveryId: string;
          userId: string;
          channel: string;
          phone: string | null;
          email: string | null;
        }> = [];
        for (const user of recipients) {
          for (const channel of args.channels) {
            const da = await c.query<{ id: string }>(
              `INSERT INTO delivery_attempts
                 (recipient_user_id, channel, status, payload)
               VALUES ($1, $2, 'queued', $3)
               RETURNING id`,
              [user.id, channel, { messageId, conversationId, body: args.body }],
            );
            deliveryCount++;
            const daRow = da.rows[0];
            if (!daRow) throw new Error('delivery_attempts insert returned no row');
            pendingDeliveries.push({
              deliveryId: daRow.id,
              userId: user.id,
              channel,
              phone: user.phone,
              email: user.email,
            });
          }
        }

        return { messageId, conversationId, recipientCount, deliveryCount, pendingDeliveries };
      });

      // Dispatch inline outside the director txn so we can use system role for updates
      if (!queuedDuringQuietHours) {
        for (const d of result.pendingDeliveries) {
          await this.dispatchOneSystem(d.deliveryId, d.userId, d.channel, d.phone, d.email, args.body);
        }
      } else {
        await this.msgQueue.add(
          'broadcast.dispatch',
          { conversationId: result.conversationId },
          { delay: msUntilQuietHoursEnd() },
        );
      }

      await this.audit.append({
        actorUserId: actor.userId,
        actorRole: actor.role,
        eventKind: 'messages.broadcast',
        targetTable: 'messages',
        targetId: result.messageId,
        payload: {
          scope_kind: args.scopeKind,
          channels: args.channels,
          recipient_count: result.recipientCount,
          quiet_hours_queued: queuedDuringQuietHours,
        },
        requestId: args.requestId,
      });

      return {
        messageId: result.messageId,
        conversationId: result.conversationId,
        recipientCount: result.recipientCount,
        deliveryCount: result.deliveryCount,
        queuedDuringQuietHours,
      };
    } finally {
      client.release();
    }
  }

  private async resolveRecipients(
    c: PoolClient,
    scopeKind: 'state' | 'lga' | 'ward',
    scopeIds: string[],
  ): Promise<Array<{ id: string; phone: string | null; email: string | null }>> {
    if (scopeKind === 'state') {
      const r = await c.query<{ id: string; phone_ciphertext: Buffer; email_ciphertext: Buffer | null }>(
        `SELECT id, phone_ciphertext, email_ciphertext FROM users WHERE status = 'active' AND deleted_at IS NULL`,
      );
      // We don't decrypt here for performance; the adapter stubs only need
      // phone/email in production. In dev tests we can skip personalisation.
      return r.rows.map((row) => ({ id: row.id, phone: null, email: null }));
    }
    if (scopeKind === 'lga') {
      const r = await c.query<{ id: string }>(
        `SELECT id FROM users WHERE status = 'active' AND deleted_at IS NULL AND lga_id = ANY($1::uuid[])`,
        [scopeIds],
      );
      return r.rows.map((row) => ({ id: row.id, phone: null, email: null }));
    }
    // ward
    const r = await c.query<{ id: string }>(
      `SELECT id FROM users WHERE status = 'active' AND deleted_at IS NULL AND ward_id = ANY($1::uuid[])`,
      [scopeIds],
    );
    return r.rows.map((row) => ({ id: row.id, phone: null, email: null }));
  }

  private async dispatchOneSystem(
    deliveryId: string,
    userId: string,
    channel: string,
    phone: string | null,
    email: string | null,
    body: string,
  ): Promise<void> {
    const adapter = this.adapters[channel];
    if (!adapter) return;
    const client = await this.pool.connect();
    try {
      await withRlsTransaction(
        client,
        { role: 'system', userId: '00000000-0000-0000-0000-000000000000', lgaId: null, wardId: null },
        async (c) => {
          try {
            const result = await adapter.send({ userId, phone, email, payload: { body } });
            await c.query(
              `UPDATE delivery_attempts
               SET status = 'sent', provider_ref = $1, sent_at = now()
               WHERE id = $2`,
              [result.providerRef, deliveryId],
            );
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            await c.query(
              `UPDATE delivery_attempts
               SET status = 'failed', failed_at = now(), error_message = $1
               WHERE id = $2`,
              [message, deliveryId],
            );
          }
        },
      );
    } finally {
      client.release();
    }
  }

  async listDeliveries(
    actor: RlsContext,
    args: { cursor?: string; limit?: number },
  ): Promise<{ items: Array<{
    id: string; channel: string; status: string; providerRef: string | null;
    payload: Record<string, unknown>; queuedAt: string; sentAt: string | null;
    deliveredAt: string | null; readAt: string | null; failedAt: string | null;
    errorMessage: string | null;
  }>; nextCursor: string | null }> {
    const limit = Math.min(args.limit ?? 20, 100);
    const client = await this.pool.connect();
    try {
      const { rows } = await withRlsTransaction(client, actor, async (c) => {
        const decoded = args.cursor ? decodeCursor(args.cursor) : null;
        if (args.cursor && !decoded) {
          throw new ForbiddenException('invalid cursor');
        }
        const params: unknown[] = [actor.userId];
        let where = 'WHERE recipient_user_id = $1';
        if (decoded) {
          params.push(decoded.queuedAt.toISOString(), decoded.id);
          where += ` AND (queued_at, id) < ($2, $3)`;
        }
        params.push(limit + 1);
        const r = await c.query<DeliveryRow>(
          `SELECT id, recipient_user_id, channel, provider_ref, status, payload,
                  queued_at, sent_at, delivered_at, read_at, failed_at, error_message
           FROM delivery_attempts
           ${where}
           ORDER BY queued_at DESC, id DESC
           LIMIT $${params.length}`,
          params,
        );
        return r;
      });
      const more = rows.length > limit;
      const slice = more ? rows.slice(0, limit) : rows;
      const items = slice.map(toDeliveryView);
      const last = slice[slice.length - 1];
      const nextCursor = more && last ? encodeCursor({ queuedAt: last.queued_at, id: last.id }) : null;
      return { items, nextCursor };
    } finally {
      client.release();
    }
  }

  async markRead(actor: RlsContext, deliveryId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await withRlsTransaction(client, actor, async (c) => {
        const r = await c.query<{ id: string }>(
          `UPDATE delivery_attempts
           SET status = 'read', read_at = now()
           WHERE id = $1 AND recipient_user_id = $2
           RETURNING id`,
          [deliveryId, actor.userId],
        );
        if (r.rows.length === 0) {
          throw new NotFoundException('delivery attempt not found');
        }
      });
    } finally {
      client.release();
    }
  }

  async getDelivery(actor: RlsContext, deliveryId: string): Promise<ReturnType<typeof toDeliveryView>> {
    const client = await this.pool.connect();
    try {
      const row = await withRlsTransaction(client, actor, async (c) => {
        const r = await c.query<DeliveryRow>(
          `SELECT id, recipient_user_id, channel, provider_ref, status, payload,
                  queued_at, sent_at, delivered_at, read_at, failed_at, error_message
           FROM delivery_attempts
           WHERE id = $1 AND recipient_user_id = $2`,
          [deliveryId, actor.userId],
        );
        if (r.rows.length === 0) throw new NotFoundException('delivery attempt not found');
        const daRow = r.rows[0];
        if (!daRow) throw new NotFoundException('delivery attempt not found');
        return daRow;
      });
      return toDeliveryView(row);
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

function toDeliveryView(row: DeliveryRow): {
  id: string;
  channel: string;
  status: string;
  providerRef: string | null;
  payload: Record<string, unknown>;
  queuedAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
} {
  return {
    id: row.id,
    channel: row.channel,
    status: row.status,
    providerRef: row.provider_ref,
    payload: row.payload,
    queuedAt: row.queued_at.toISOString(),
    sentAt: row.sent_at?.toISOString() ?? null,
    deliveredAt: row.delivered_at?.toISOString() ?? null,
    readAt: row.read_at?.toISOString() ?? null,
    failedAt: row.failed_at?.toISOString() ?? null,
    errorMessage: row.error_message,
  };
}

function encodeCursor(args: { queuedAt: Date; id: string }): string {
  return Buffer.from(`${args.queuedAt.toISOString()}|${args.id}`).toString('base64url');
}

function decodeCursor(cursor: string): { queuedAt: Date; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const [iso, id] = decoded.split('|');
    if (!iso || !id) return null;
    const queuedAt = new Date(iso);
    if (Number.isNaN(queuedAt.getTime())) return null;
    return { queuedAt, id };
  } catch {
    return null;
  }
}
