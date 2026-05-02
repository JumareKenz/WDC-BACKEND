import { pgTable, bigint, text, timestamp, index } from 'drizzle-orm/pg-core';

export const embeddings = pgTable(
  'embeddings',
  {
    id: bigint('id', { mode: 'number' }).generatedByDefaultAsIdentity(),
    sourceTable: text('source_table').notNull(),
    sourceId: text('source_id').notNull(),
    embedding: text('embedding').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    sourceIdx: index('embeddings_source_idx').on(t.sourceTable, t.sourceId),
  }),
);

export type Embedding = typeof embeddings.$inferSelect;
export type NewEmbedding = typeof embeddings.$inferInsert;