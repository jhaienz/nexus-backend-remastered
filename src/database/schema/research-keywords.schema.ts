import { integer, pgTable, primaryKey } from 'drizzle-orm/pg-core';
import { researches } from './researches.schema';
import { keywords } from './keywords.schema';
import { relations } from 'drizzle-orm';

export const researchKeywords = pgTable('research_keywords', {
  researchId: integer('research_id').references(() => researches.id, { onDelete: 'cascade' }).notNull(),
  keywordId: integer('keyword_id').references(() => keywords.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.researchId, table.keywordId] }),
}));

export const researchKeywordsRelations = relations(researchKeywords, ({ one }) => ({
  research: one(researches, { fields: [researchKeywords.researchId], references: [researches.id] }),
  keyword: one(keywords, { fields: [researchKeywords.keywordId], references: [keywords.id] }),
}));
