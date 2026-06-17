import { pgTable, uuid, primaryKey } from 'drizzle-orm/pg-core';
import { researches } from './researches.js';
import { keywords } from './keywords.js';

export const researchKeywords = pgTable(
  'research_keywords',
  {
    researchId: uuid('research_id')
      .notNull()
      .references(() => researches.id, { onDelete: 'cascade' }),
    keywordId: uuid('keyword_id')
      .notNull()
      .references(() => keywords.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.researchId, table.keywordId] })],
);
