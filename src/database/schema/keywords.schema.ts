import { pgTable, serial, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { researchKeywords } from './research-keywords.schema';

export const keywords = pgTable('keywords', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
});

export const keywordsRelations = relations(keywords, ({ many }) => ({
  researches: many(researchKeywords),
}));
