import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { POSTGRES_POOL } from '../../infra/postgres/postgres.module';
import { StorageService } from '../../infra/storage/storage.service';
import { withRlsTransaction, type RlsContext } from '../../common/rls/rls-context';
import type { Queue } from 'bullmq';
import { OCR_QUEUE, ASR_QUEUE } from '../../infra/queue/queue.module';
import type { UploadAttachmentDto, AttachmentResponseDto } from './attachments.dto';
import { OcrProcessor } from './processors/ocr.processor';
import { AsrProcessor } from './processors/asr.processor';

@Injectable()
export class AttachmentsService {
  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(OCR_QUEUE) private readonly ocrQueue: Queue,
    @Inject(ASR_QUEUE) private readonly asrQueue: Queue,
    // Inject processors to force NestJS to instantiate them (workers must start)
    @Inject(OcrProcessor) private readonly _ocrProcessor: OcrProcessor,
    @Inject(AsrProcessor) private readonly _asrProcessor: AsrProcessor,
  ) {}

  async upload(
    actor: RlsContext,
    dto: UploadAttachmentDto,
    file: Express.Multer.File,
  ): Promise<AttachmentResponseDto> {
    // Validate file size (max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('file exceeds 50MB limit');
    }

    // Validate MIME type against kind
    const mimeKind = this.inferKind(file.mimetype);
    if (mimeKind !== dto.kind) {
      throw new BadRequestException(`file mimetype ${file.mimetype} does not match declared kind ${dto.kind}`);
    }

    const id = randomUUID();
    const storageKey = `attachments/${dto.reportId}/${id}`;

    // Upload to S3/MinIO
    await this.storage.upload(storageKey, file.buffer, file.mimetype);

    // Store metadata in DB
    const client = await this.pool.connect();
    try {
      const result = await withRlsTransaction(client, actor, async (c) => {
        // Verify report exists and is editable
        const reportR = await c.query<{ state: string }>(
          `SELECT state FROM reports WHERE id = $1`,
          [dto.reportId],
        );
        if (reportR.rows.length === 0) {
          throw new NotFoundException('report not found');
        }
        const state = reportR.rows[0]?.state;
        if (state === 'sealed') {
          throw new BadRequestException('cannot attach to sealed report');
        }

        const insertR = await c.query<{
          id: string;
          report_id: string;
          kind: string;
          storage_key: string;
          bytes: number;
          mime_type: string;
          processing_state: string;
          uploaded_by: string;
          created_at: Date;
        }>(
          `INSERT INTO attachments
             (id, report_id, kind, storage_key, bytes, mime_type, processing_state, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
           RETURNING id, report_id, kind, storage_key, bytes, mime_type, processing_state, uploaded_by, created_at`,
          [id, dto.reportId, dto.kind, storageKey, file.size, file.mimetype, actor.userId],
        );
        const inserted = insertR.rows[0];
        if (!inserted) {
          throw new Error('attachment insert returned no row');
        }
        return inserted;
      });

      // Queue async processing job
      if (dto.kind === 'image') {
        await this.ocrQueue.add('ocr', { attachmentId: id, storageKey, kind: dto.kind });
      } else if (dto.kind === 'audio') {
        await this.asrQueue.add('asr', { attachmentId: id, storageKey, kind: dto.kind });
      }

      return {
        id: result.id,
        reportId: result.report_id,
        kind: result.kind,
        storageKey: result.storage_key,
        bytes: result.bytes,
        mimeType: result.mime_type,
        processingState: result.processing_state,
        uploadedBy: result.uploaded_by,
        createdAt: result.created_at.toISOString(),
      };
    } finally {
      client.release();
    }
  }

  async listByReport(actor: RlsContext, reportId: string): Promise<AttachmentResponseDto[]> {
    const client = await this.pool.connect();
    try {
      const rows = await withRlsTransaction(client, actor, async (c) => {
        const r = await c.query<{
          id: string;
          report_id: string;
          kind: string;
          storage_key: string;
          bytes: number;
          mime_type: string;
          transcript: string | null;
          confidence: string | null;
          processing_state: string;
          uploaded_by: string;
          created_at: Date;
        }>(
          `SELECT id, report_id, kind, storage_key, bytes, mime_type, transcript, confidence,
                  processing_state, uploaded_by, created_at
           FROM attachments WHERE report_id = $1 ORDER BY created_at DESC`,
          [reportId],
        );
        return r.rows;
      });

      return Promise.all(
        rows.map(async (row) => ({
          id: row.id,
          reportId: row.report_id,
          kind: row.kind,
          storageKey: row.storage_key,
          bytes: row.bytes,
          mimeType: row.mime_type,
          transcript: row.transcript,
          confidence: row.confidence ? parseFloat(row.confidence) : null,
          processingState: row.processing_state,
          signedUrl: await this.storage.getSignedUrl(row.storage_key, 3600),
          uploadedBy: row.uploaded_by,
          createdAt: row.created_at.toISOString(),
        })),
      );
    } finally {
      client.release();
    }
  }

  async getById(actor: RlsContext, id: string): Promise<AttachmentResponseDto | null> {
    const client = await this.pool.connect();
    try {
      const row = await withRlsTransaction(client, actor, async (c) => {
        const r = await c.query<{
          id: string;
          report_id: string;
          kind: string;
          storage_key: string;
          bytes: number;
          mime_type: string;
          transcript: string | null;
          confidence: string | null;
          processing_state: string;
          uploaded_by: string;
          created_at: Date;
        }>(
          `SELECT id, report_id, kind, storage_key, bytes, mime_type, transcript, confidence,
                  processing_state, uploaded_by, created_at
           FROM attachments WHERE id = $1`,
          [id],
        );
        return r.rows[0] ?? null;
      });

      if (!row) return null;

      return {
        id: row.id,
        reportId: row.report_id,
        kind: row.kind,
        storageKey: row.storage_key,
        bytes: row.bytes,
        mimeType: row.mime_type,
        transcript: row.transcript,
        confidence: row.confidence ? parseFloat(row.confidence) : null,
        processingState: row.processing_state,
        signedUrl: await this.storage.getSignedUrl(row.storage_key, 3600),
        uploadedBy: row.uploaded_by,
        createdAt: row.created_at.toISOString(),
      };
    } finally {
      client.release();
    }
  }

  private inferKind(mime: string): 'image' | 'audio' | 'document' {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('audio/')) return 'audio';
    return 'document';
  }
}
