import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  bigint,
  numeric,
  timestamp,
  jsonb,
  index,
  foreignKey,
  check,
} from 'drizzle-orm/pg-core';
import { reports } from './reports';
import { users } from './users';

export const attachments = pgTable(
  'attachments',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    reportId: uuid('report_id').notNull(),
    kind: text('kind').notNull(),
    storageKey: text('storage_key').notNull(),
    bytes: bigint('bytes', { mode: 'number' }).notNull(),
    mimeType: text('mime_type').notNull(),
    transcript: text('transcript'),
    confidence: numeric('confidence', { precision: 4, scale: 3 }),
    processingState: text('processing_state').notNull().default('pending'),
    processingMeta: jsonb('processing_meta').notNull().default(sql`'{}'::jsonb`),
    uploadedBy: uuid('uploaded_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    reportFk: foreignKey({
      columns: [t.reportId],
      foreignColumns: [reports.id],
      name: 'attachments_report_id_fkey',
    }),
    uploadedByFk: foreignKey({
      columns: [t.uploadedBy],
      foreignColumns: [users.id],
      name: 'attachments_uploaded_by_fkey',
    }),
    kindCk: check('attachments_kind_ck', sql`kind in ('audio','image','document')`),
    stateCk: check(
      'attachments_processing_state_ck',
      sql`processing_state in ('pending','processing','done','failed')`,
    ),
    confidenceCk: check(
      'attachments_confidence_ck',
      sql`confidence is null or (confidence >= 0 and confidence <= 1)`,
    ),
    reportIdx: index('attachments_report_idx').on(t.reportId),
  }),
);
