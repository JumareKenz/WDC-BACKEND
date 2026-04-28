import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  bigint,
  timestamp,
  jsonb,
  index,
  foreignKey,
  check,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const investigations = pgTable(
  'investigations',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    title: text('title').notNull(),
    summary: text('summary'),
    status: text('status').notNull().default('open'),
    priority: text('priority').notNull().default('normal'),
    openedBy: uuid('opened_by').notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    openedByFk: foreignKey({
      columns: [t.openedBy],
      foreignColumns: [users.id],
      name: 'investigations_opened_by_fkey',
    }),
    statusCk: check(
      'investigations_status_ck',
      sql`status in ('open','in_progress','resolved','closed')`,
    ),
    priorityCk: check(
      'investigations_priority_ck',
      sql`priority in ('low','normal','high','urgent')`,
    ),
    statusIdx: index('investigations_status_idx').on(t.status),
  }),
);

export const investigationEvidence = pgTable(
  'investigation_evidence',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    investigationId: uuid('investigation_id').notNull(),
    kind: text('kind').notNull(),
    refTable: text('ref_table'),
    refId: text('ref_id'),
    note: text('note'),
    addedBy: uuid('added_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    investigationFk: foreignKey({
      columns: [t.investigationId],
      foreignColumns: [investigations.id],
      name: 'investigation_evidence_investigation_fkey',
    }),
    addedByFk: foreignKey({
      columns: [t.addedBy],
      foreignColumns: [users.id],
      name: 'investigation_evidence_added_by_fkey',
    }),
    kindCk: check(
      'investigation_evidence_kind_ck',
      sql`kind in ('report_ref','attachment_ref','note','external_link')`,
    ),
    investigationIdx: index('investigation_evidence_investigation_idx').on(t.investigationId),
  }),
);

export const embeddings = pgTable(
  'embeddings',
  {
    id: bigint('id', { mode: 'bigint' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ startWith: 1 }),
    sourceTable: text('source_table').notNull(),
    sourceId: text('source_id').notNull(),
    chunkIndex: bigint('chunk_index', { mode: 'number' }).notNull().default(0),
    content: text('content').notNull(),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    sourceIdx: index('embeddings_source_idx').on(t.sourceTable, t.sourceId),
  }),
);
