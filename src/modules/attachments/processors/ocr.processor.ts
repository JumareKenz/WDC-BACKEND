import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker, type Job } from 'bullmq';
import type { Pool } from 'pg';
import { POSTGRES_POOL } from '../../../infra/postgres/postgres.module';
import { StorageService } from '../../../infra/storage/storage.service';
import { loadConfig } from '../../../config/configuration';
import { withRlsTransaction } from '../../../common/rls/rls-context';

@Injectable()
export class OcrProcessor implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker;

  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  onModuleInit(): void {
    const cfg = loadConfig();
    this.worker = new Worker(
      'ocr.process',
      async (job: Job<{ attachmentId: string; storageKey: string; kind: string }>) => {
        const { attachmentId, storageKey, kind } = job.data;

        // Stub: simulate OCR processing
        // In production this would download from S3, run Tesseract/cloud Vision,
        // then store extracted text as a field_set op or update the attachment.
        const extractedText = `OCR_STUB: extracted text from ${storageKey}`;
        const confidence = 0.85;

        const client = await this.pool.connect();
        try {
          await withRlsTransaction(
            client,
            { role: 'system', userId: '00000000-0000-0000-0000-000000000000', lgaId: null, wardId: null },
            async (c) => {
              // Get the uploaded_by user from the attachment for FK compliance
              const attachR = await c.query<{ uploaded_by: string }>(
                `SELECT uploaded_by FROM attachments WHERE id = $1`,
                [attachmentId],
              );
              const actorUserId = attachR.rows[0]?.uploaded_by ?? '00000000-0000-0000-0000-000000000000';

              // Update attachment with transcript
              await c.query(
                `UPDATE attachments
                 SET processing_state = 'done',
                     transcript = $1,
                     confidence = $2::numeric,
                     processing_meta = jsonb_set(processing_meta, '{ocr}', $3::jsonb)
                 WHERE id = $4`,
                [extractedText, confidence, JSON.stringify({ provider: 'stub', version: '1.0' }), attachmentId],
              );

              // Also insert a field_set op so the extracted text becomes part of the report canonical
              const payload = JSON.stringify({
                key: `ocr_${kind}_${attachmentId}`,
                value: extractedText,
                source: 'scanned',
                confidence,
              });
              await c.query(
                `INSERT INTO report_op_log
                   (report_id, op_id, device_id, actor_user_id, op_kind, payload, wall_clock_ts)
                 SELECT report_id, $1, 'ocr-worker', $2,
                        'field_set', $3::jsonb, now()
                 FROM attachments WHERE id = $4`,
                [attachmentId, actorUserId, payload, attachmentId],
              );
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
