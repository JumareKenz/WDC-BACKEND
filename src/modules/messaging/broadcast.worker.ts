import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker, type Job } from 'bullmq';
import type { Pool } from 'pg';
import { POSTGRES_POOL } from '../../infra/postgres/postgres.module';
import { MESSAGES_QUEUE } from '../../infra/queue/queue.module';
import { loadConfig } from '../../config/configuration';
import { withRlsTransaction } from '../../common/rls/rls-context';
import { InAppAdapter } from './adapters/in-app.adapter';
import { EmailAdapter } from './adapters/email.adapter';
import { SmsAdapter } from './adapters/sms.adapter';
import { WhatsAppAdapter } from './adapters/whatsapp.adapter';
import type { ChannelAdapter } from './adapters/channel-adapter.interface';

@Injectable()
export class BroadcastWorker implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker;

  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    @Inject(MESSAGES_QUEUE) private readonly msgQueue: Worker['opts'], // placeholder to force queue module load
    private readonly inApp: InAppAdapter,
    private readonly email: EmailAdapter,
    private readonly sms: SmsAdapter,
    private readonly whatsapp: WhatsAppAdapter,
  ) {}

  onModuleInit(): void {
    const cfg = loadConfig();
    const adapters: Record<string, ChannelAdapter> = {
      in_app: this.inApp,
      email: this.email,
      sms: this.sms,
      whatsapp: this.whatsapp,
    };

    this.worker = new Worker(
      'messages.dispatch',
      async (job: Job<{ conversationId: string }>) => {
        const { conversationId } = job.data;
        const client = await this.pool.connect();
        try {
          await withRlsTransaction(
            client,
            { role: 'system', userId: '00000000-0000-0000-0000-000000000000', lgaId: null, wardId: null },
            async (c) => {
              const pending = await c.query<{
                id: string;
                recipient_user_id: string;
                channel: string;
                payload: Record<string, unknown>;
              }>(
                `SELECT id, recipient_user_id, channel, payload
                 FROM delivery_attempts
                 WHERE status = 'queued'
                   AND payload->>'conversationId' = $1`,
                [conversationId],
              );
              for (const row of pending.rows) {
                const adapter = adapters[row.channel];
                if (!adapter) continue;
                try {
                  const result = await adapter.send({
                    userId: row.recipient_user_id,
                    payload: row.payload,
                  });
                  await c.query(
                    `UPDATE delivery_attempts
                     SET status = 'sent', provider_ref = $1, sent_at = now()
                     WHERE id = $2`,
                    [result.providerRef, row.id],
                  );
                } catch (err) {
                  const message = err instanceof Error ? err.message : String(err);
                  await c.query(
                    `UPDATE delivery_attempts
                     SET status = 'failed', failed_at = now(), error_message = $1
                     WHERE id = $2`,
                    [message, row.id],
                  );
                }
              }
            },
          );
        } finally {
          client.release();
        }
      },
      {
        connection: { url: cfg.redisUrl },
        concurrency: 2,
      },
    );
  }

  onModuleDestroy(): void {
    void this.worker?.close();
  }
}
