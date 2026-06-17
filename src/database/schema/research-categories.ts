import { pgTable, uuid, primaryKey } from 'drizzle-orm/pg-core';
import { researches } from './researches.js';
import { categories } from './categories.js';

export const researchCategories = pgTable(
  'research_categories',
  {
    researchId: uuid('research_id')
      .notNull()
      .references(() => researches.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.researchId, table.categoryId] })],
);
