import { pgTable, serial, varchar, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { roles } from './roles.schema';
import { programs } from './programs.schema';
import { institutions } from './institutions.schema';
import { relations } from 'drizzle-orm';
import { notifications } from './notifications.schema';
import { collections } from './collections.schema';
import { researches } from './researches.schema';
import { searchLogs } from './search-logs.schema';
import { passwordResets } from './password-resets.schema';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  middleName: varchar('middle_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  suffix: varchar('suffix', { length: 50 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }),
  roleId: integer('role_id').references(() => roles.id).notNull().default(2),
  programId: integer('program_id').references(() => programs.id),
  institutionId: integer('institution_id').references(() => institutions.id),
  isVerified: boolean('is_verified').default(false),
  profilePictureKey: varchar('profile_picture_key', { length: 500 }),
  lastActive: timestamp('last_active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
  program: one(programs, { fields: [users.programId], references: [programs.id] }),
  institution: one(institutions, { fields: [users.institutionId], references: [institutions.id] }),
  researches: many(researches),
  notifications: many(notifications),
  collections: many(collections),
  searchLogs: many(searchLogs),
  passwordResets: many(passwordResets),
}));
