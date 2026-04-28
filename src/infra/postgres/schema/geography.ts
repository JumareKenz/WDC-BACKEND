import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, uniqueIndex, index, foreignKey } from 'drizzle-orm/pg-core';

export const lgas = pgTable(
  'lgas',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    code: text('code').notNull(),
    name: text('name').notNull(),
    nameHa: text('name_ha').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    codeUk: uniqueIndex('lgas_code_uk').on(t.code),
  }),
);

export const wards = pgTable(
  'wards',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    lgaId: uuid('lga_id').notNull(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    nameHa: text('name_ha').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    lgaFk: foreignKey({ columns: [t.lgaId], foreignColumns: [lgas.id], name: 'wards_lga_id_fkey' }),
    lgaIdx: index('wards_lga_id_idx').on(t.lgaId),
    codeUk: uniqueIndex('wards_lga_code_uk').on(t.lgaId, t.code),
  }),
);
