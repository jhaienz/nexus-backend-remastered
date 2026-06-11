import { integer, pgTable, primaryKey } from 'drizzle-orm/pg-core';
import { researches } from './researches.schema';
import { categories } from './categories.schema';
import { relations } from 'drizzle-orm';

export const researchCategories = pgTable('research_categories', {
  researchId: integer('research_id').references(() => researches.id, { onDelete: 'cascade' }).notNull(),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.researchId, table.categoryId] }),
}));

export const researchCategoriesRelations = relations(researchCategories, ({ one }) => ({
  research: one(researches, { fields: [researchCategories.researchId], references: [researches.id] }),
  category: one(categories, { fields: [researchCategories.categoryId], references: [categories.id] }),
}));
