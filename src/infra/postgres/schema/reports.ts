import { sql } from 'drizzle-orm';
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
  check,
} from 'drizzle-orm/pg-core';
import { wards } from './geography';
import { users } from './users';
import { formVersions } from './forms';

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    formVersionId: uuid('form_version_id').notNull(),
    wardId: uuid('ward_id').notNull(),
    submittedBy: uuid('submitted_by').notNull(),
    submissionMethod: text('submission_method').notNull(),
    state: text('state').notNull().default('draft'),
    sealedAt: timestamp('sealed_at', { withTimezone: true }),
    canonical: jsonb('canonical').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    formVersionFk: foreignKey({
      columns: [t.formVersionId],
      foreignColumns: [formVersions.id],
      name: 'reports_form_version_id_fkey',
    }),
    wardFk: foreignKey({
      columns: [t.wardId],
      foreignColumns: [wards.id],
      name: 'reports_ward_id_fkey',
    }),
    submittedByFk: foreignKey({
      columns: [t.submittedBy],
      foreignColumns: [users.id],
      name: 'reports_submitted_by_fkey',
    }),
    methodCk: check(
      'reports_submission_method_ck',
      sql`submission_method in ('amira','wizard','snap')`,
    ),
    stateCk: check(
      'reports_state_ck',
      sql`state in ('draft','submitted','in_review','approved','returned','sealed')`,
    ),
    wardIdx: index('reports_ward_idx').on(t.wardId),
    submittedByIdx: index('reports_submitted_by_idx').on(t.submittedBy),
    stateIdx: index('reports_state_idx').on(t.state),
  }),
);

export const reportOpLog = pgTable(
  'report_op_log',
  {
    reportId: uuid('report_id').notNull(),
    opId: uuid('op_id').notNull(),
    serverSeq: bigint('server_seq', { mode: 'bigint' }).notNull(),
    deviceId: text('device_id').notNull(),
    actorUserId: uuid('actor_user_id').notNull(),
    opKind: text('op_kind').notNull(),
    payload: jsonb('payload').notNull(),
    wallClockTs: timestamp('wall_clock_ts', { withTimezone: true }).notNull(),
    serverTs: timestamp('server_ts', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: uniqueIndex('report_op_log_pk').on(t.reportId, t.opId),
    reportFk: foreignKey({
      columns: [t.reportId],
      foreignColumns: [reports.id],
      name: 'report_op_log_report_id_fkey',
    }),
    actorFk: foreignKey({
      columns: [t.actorUserId],
      foreignColumns: [users.id],
      name: 'report_op_log_actor_fkey',
    }),
    seqUk: uniqueIndex('report_op_log_server_seq_uk').on(t.serverSeq),
    reportSeqIdx: index('report_op_log_report_seq_idx').on(t.reportId, t.serverSeq),
    opKindCk: check(
      'report_op_log_kind_ck',
      sql`op_kind in ('field_set','attachment_add','submit','open_review','approve','return','seal')`,
    ),
  }),
);

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    key: text('key').primaryKey(),
    requestHash: text('request_hash').notNull(),
    responseStatus: bigint('response_status', { mode: 'number' }).notNull(),
    responseBody: jsonb('response_body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    expiresIdx: index('idempotency_keys_expires_idx').on(t.expiresAt),
  }),
);
