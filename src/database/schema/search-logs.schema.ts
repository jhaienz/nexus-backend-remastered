import { pgTable, serial, integer, varchar, timestamp } from 'drizzle-orm/pg-core';
import { researches } from './researches.schema';
import { users } from './users.schema';
import { relations } from 'drizzle-orm';

export const searchLogs = pgTable('search_logs', {
  id: serial('id').primaryKey(),
  query: varchar('query', { length: 500 }),
  researchId: integer('research_id').references(() => researches.id, { onDelete: 'set null' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const searchLogsRelations = relations(searchLogs, ({ one }) => ({
  research: one(researches, { fields: [searchLogs.researchId], references: [researches.id] }),
  user: one(users, { fields: [searchLogs.userId], references: [users.id] }),
}));
