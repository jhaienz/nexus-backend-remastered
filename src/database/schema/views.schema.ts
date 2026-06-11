import { pgTable, serial, integer, timestamp } from 'drizzle-orm/pg-core';
import { researches } from './researches.schema';
import { relations } from 'drizzle-orm';

export const views = pgTable('views', {
  id: serial('id').primaryKey(),
  researchId: integer('research_id').references(() => researches.id, { onDelete: 'cascade' }).notNull(),
  viewCount: integer('view_count').default(1),
  datetime: timestamp('datetime').defaultNow(),
});

export const viewsRelations = relations(views, ({ one }) => ({
  research: one(researches, { fields: [views.researchId], references: [researches.id] }),
}));
