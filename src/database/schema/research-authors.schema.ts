import { integer, pgTable, primaryKey } from 'drizzle-orm/pg-core';
import { researches } from './researches.schema';
import { authors } from './authors.schema';
import { relations } from 'drizzle-orm';

export const researchAuthors = pgTable('research_authors', {
  researchId: integer('research_id').references(() => researches.id, { onDelete: 'cascade' }).notNull(),
  authorId: integer('author_id').references(() => authors.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.researchId, table.authorId] }),
}));

export const researchAuthorsRelations = relations(researchAuthors, ({ one }) => ({
  research: one(researches, { fields: [researchAuthors.researchId], references: [researches.id] }),
  author: one(authors, { fields: [researchAuthors.authorId], references: [authors.id] }),
}));
