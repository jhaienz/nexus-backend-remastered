import { pgTable, serial, integer, timestamp } from 'drizzle-orm/pg-core';
import { researches } from './researches.schema';
import { relations } from 'drizzle-orm';

export const downloads = pgTable('downloads', {
  id: serial('id').primaryKey(),
  researchId: integer('research_id').references(() => researches.id, { onDelete: 'cascade' }).notNull(),
  downloadCount: integer('download_count').default(1),
  datetime: timestamp('datetime').defaultNow(),
});

export const downloadsRelations = relations(downloads, ({ one }) => ({
  research: one(researches, { fields: [downloads.researchId], references: [researches.id] }),
}));
