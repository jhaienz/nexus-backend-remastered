import { integer, pgTable, primaryKey } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { researches } from './researches.schema';
import { relations } from 'drizzle-orm';

export const collections = pgTable('collections', {
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  researchId: integer('research_id').references(() => researches.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.researchId] }),
}));

export const collectionsRelations = relations(collections, ({ one }) => ({
  user: one(users, { fields: [collections.userId], references: [users.id] }),
  research: one(researches, { fields: [collections.researchId], references: [researches.id] }),
}));
