import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { researches } from './researches.js';

export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  researchId: uuid('research_id')
    .notNull()
    .references(() => researches.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 20 }).notNull(),
  userId: uuid('user_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
