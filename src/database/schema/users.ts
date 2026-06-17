import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { userRole } from './enums.js';
import { institutions } from './institutions.js';
import { programs } from './programs.js';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  middleName: varchar('middle_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  suffix: varchar('suffix', { length: 20 }),
  role: userRole('role').notNull().default('guest'),
  institutionId: uuid('institution_id').references(() => institutions.id),
  programId: uuid('program_id').references(() => programs.id),
  status: varchar('status', { length: 20 }).notNull().default('unverified'),
  profilePicKey: varchar('profile_pic_key', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
