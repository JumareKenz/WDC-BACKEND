import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  foreignKey,
  check,
} from 'drizzle-orm/pg-core';
import { bytea } from './_types';
import { lgas, wards } from './geography';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    role: text('role').notNull(),
    lgaId: uuid('lga_id'),
    wardId: uuid('ward_id'),

    fullNameCiphertext: bytea('full_name_ciphertext').notNull(),
    phoneHash: bytea('phone_hash').notNull(),
    phoneCiphertext: bytea('phone_ciphertext').notNull(),
    emailHash: bytea('email_hash'),
    emailCiphertext: bytea('email_ciphertext'),

    pinHash: text('pin_hash'),
    passwordHash: text('password_hash'),
    totpSecretCiphertext: bytea('totp_secret_ciphertext'),

    keyId: text('key_id').notNull(),
    status: text('status').notNull().default('active'),
    mustResetPassword: boolean('must_reset_password').notNull().default(false),
    enrolmentTokenHash: bytea('enrolment_token_hash'),
    enrolmentExpiresAt: timestamp('enrolment_expires_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    lgaFk: foreignKey({ columns: [t.lgaId], foreignColumns: [lgas.id], name: 'users_lga_id_fkey' }),
    wardFk: foreignKey({
      columns: [t.wardId],
      foreignColumns: [wards.id],
      name: 'users_ward_id_fkey',
    }),
    roleCk: check(
      'users_role_ck',
      sql`role in ('secretary','coordinator','director','system')`,
    ),
    statusCk: check('users_status_ck', sql`status in ('active','suspended','deleted')`),
    phoneHashUk: uniqueIndex('users_phone_hash_uk').on(t.phoneHash),
    lgaIdx: index('users_lga_id_idx').on(t.lgaId),
    wardIdx: index('users_ward_id_idx').on(t.wardId),
  }),
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id').notNull(),
    deviceId: text('device_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    rotatedFromId: uuid('rotated_from_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userFk: foreignKey({
      columns: [t.userId],
      foreignColumns: [users.id],
      name: 'refresh_tokens_user_id_fkey',
    }),
    rotatedFk: foreignKey({
      columns: [t.rotatedFromId],
      foreignColumns: [t.id],
      name: 'refresh_tokens_rotated_from_fkey',
    }),
    userIdx: index('refresh_tokens_user_idx').on(t.userId),
    tokenHashUk: uniqueIndex('refresh_tokens_token_hash_uk').on(t.tokenHash),
  }),
);
