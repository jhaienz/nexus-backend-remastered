import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const emailVerificationCodes = pgTable('email_verification_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 6 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type EmailVerificationCode = typeof emailVerificationCodes.$inferSelect;
export type NewEmailVerificationCode =
  typeof emailVerificationCodes.$inferInsert;
