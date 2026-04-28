import {
  pgTable,
  uuid,
  text,
  bigint,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const auditEvents = pgTable(
  'audit_events',
  {
    id: bigint('id', { mode: 'bigint' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ startWith: 1 }),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    actorUserId: uuid('actor_user_id'),
    actorRole: text('actor_role').notNull(),
    eventKind: text('event_kind').notNull(),
    targetTable: text('target_table'),
    targetId: text('target_id'),
    payload: jsonb('payload').notNull(),
    prevHash: text('prev_hash').notNull(),
    hash: text('hash').notNull(),
    requestId: uuid('request_id'),
  },
  (t) => ({
    actorFk: foreignKey({
      columns: [t.actorUserId],
      foreignColumns: [users.id],
      name: 'audit_events_actor_fkey',
    }),
    hashUk: uniqueIndex('audit_events_hash_uk').on(t.hash),
    occurredIdx: index('audit_events_occurred_idx').on(t.occurredAt),
    targetIdx: index('audit_events_target_idx').on(t.targetTable, t.targetId),
  }),
);
