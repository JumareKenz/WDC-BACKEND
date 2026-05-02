import { sql } from 'drizzle-orm';
import { pgTable, bigint, text, timestamp, index, foreignKey } from 'drizzle-orm/pg-core';
import { auditEvents } from './audit';

export const auditAnchors = pgTable(
  'audit_anchors',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity({ startWith: 1 }),
    anchoredAt: timestamp('anchored_at', { withTimezone: true }).notNull().defaultNow(),
    latestEventId: bigint('latest_event_id', { mode: 'bigint' }).notNull(),
    latestHash: text('latest_hash').notNull(),
    signatureAlg: text('signature_alg').notNull(),
    signingKeyId: text('signing_key_id').notNull(),
    signature: text('signature').notNull(),
  },
  (t) => ({
    eventFk: foreignKey({
      columns: [t.latestEventId],
      foreignColumns: [auditEvents.id],
      name: 'audit_anchors_latest_event_id_fkey',
    }),
    anchoredIdx: index('audit_anchors_anchored_idx').on(t.anchoredAt),
  }),
);

// Suppress no-unused-vars warning — re-exported for type discovery.
export const _audit_anchors_sql = sql;
