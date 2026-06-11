import { pgTable, serial, integer, timestamp } from 'drizzle-orm/pg-core';
import { researches } from './researches.schema';
import { relations } from 'drizzle-orm';

export const citations = pgTable('citations', {
  id: serial('id').primaryKey(),
  researchId: integer('research_id').references(() => researches.id, { onDelete: 'cascade' }).notNull(),
  citationCount: integer('citation_count').default(1),
  datetime: timestamp('datetime').defaultNow(),
});

export const citationsRelations = relations(citations, ({ one }) => ({
  research: one(researches, { fields: [citations.researchId], references: [researches.id] }),
}));
