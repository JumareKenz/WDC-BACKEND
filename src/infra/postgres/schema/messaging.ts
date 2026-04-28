import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  foreignKey,
  check,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    conversationId: uuid('conversation_id').notNull(),
    senderUserId: uuid('sender_user_id').notNull(),
    bodyCiphertext: text('body_ciphertext').notNull(),
    keyId: text('key_id').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    senderFk: foreignKey({
      columns: [t.senderUserId],
      foreignColumns: [users.id],
      name: 'messages_sender_fkey',
    }),
    convoIdx: index('messages_conversation_idx').on(t.conversationId, t.sentAt),
    senderIdx: index('messages_sender_idx').on(t.senderUserId),
  }),
);

export const deliveryAttempts = pgTable(
  'delivery_attempts',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    recipientUserId: uuid('recipient_user_id').notNull(),
    channel: text('channel').notNull(),
    providerRef: text('provider_ref'),
    status: text('status').notNull().default('queued'),
    payload: jsonb('payload').notNull(),
    queuedAt: timestamp('queued_at', { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    errorMessage: text('error_message'),
  },
  (t) => ({
    recipientFk: foreignKey({
      columns: [t.recipientUserId],
      foreignColumns: [users.id],
      name: 'delivery_attempts_recipient_fkey',
    }),
    channelCk: check(
      'delivery_attempts_channel_ck',
      sql`channel in ('in_app','email','sms','whatsapp')`,
    ),
    statusCk: check(
      'delivery_attempts_status_ck',
      sql`status in ('queued','sent','delivered','read','failed')`,
    ),
    recipientIdx: index('delivery_attempts_recipient_idx').on(t.recipientUserId),
    statusIdx: index('delivery_attempts_status_idx').on(t.status),
  }),
);
