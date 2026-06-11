import { pgTable, serial, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { researchCategories } from './research-categories.schema';

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  researches: many(researchCategories),
}));
