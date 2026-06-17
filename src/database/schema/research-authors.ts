import { pgTable, uuid, primaryKey } from 'drizzle-orm/pg-core';
import { researches } from './researches.js';
import { authors } from './authors.js';

export const researchAuthors = pgTable(
  'research_authors',
  {
    researchId: uuid('research_id')
      .notNull()
      .references(() => researches.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => authors.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.researchId, table.authorId] })],
);
