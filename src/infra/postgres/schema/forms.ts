import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  foreignKey,
  check,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const forms = pgTable(
  'forms',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    titleHa: text('title_ha').notNull(),
    scopeKind: text('scope_kind').notNull(),
    scopeIds: jsonb('scope_ids').notNull().default(sql`'[]'::jsonb`),
    status: text('status').notNull().default('draft'),
    currentVersionId: uuid('current_version_id'),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    createdByFk: foreignKey({
      columns: [t.createdBy],
      foreignColumns: [users.id],
      name: 'forms_created_by_fkey',
    }),
    slugUk: uniqueIndex('forms_slug_uk').on(t.slug),
    scopeKindCk: check('forms_scope_kind_ck', sql`scope_kind in ('state','lga','ward')`),
    statusCk: check('forms_status_ck', sql`status in ('draft','deployed','archived')`),
  }),
);

export const formVersions = pgTable(
  'form_versions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    formId: uuid('form_id').notNull(),
    versionNumber: integer('version_number').notNull(),
    schema: jsonb('schema').notNull(),
    deployedAt: timestamp('deployed_at', { withTimezone: true }),
    deployedBy: uuid('deployed_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    formFk: foreignKey({
      columns: [t.formId],
      foreignColumns: [forms.id],
      name: 'form_versions_form_id_fkey',
    }),
    deployedByFk: foreignKey({
      columns: [t.deployedBy],
      foreignColumns: [users.id],
      name: 'form_versions_deployed_by_fkey',
    }),
    formVersionUk: uniqueIndex('form_versions_form_version_uk').on(t.formId, t.versionNumber),
    formIdx: index('form_versions_form_idx').on(t.formId),
  }),
);
