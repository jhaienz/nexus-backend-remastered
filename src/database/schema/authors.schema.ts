import { pgTable, serial, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { researchAuthors } from './research-authors.schema';

export const authors = pgTable('authors', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
});

export const authorsRelations = relations(authors, ({ many }) => ({
  researches: many(researchAuthors),
}));
