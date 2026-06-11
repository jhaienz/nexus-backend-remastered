import { pgTable, serial, integer, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { researches } from './researches.schema';
import { relations } from 'drizzle-orm';

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  researchId: integer('research_id').references(() => researches.id, { onDelete: 'set null' }),
  message: text('message').notNull(),
  opened: boolean('opened').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  research: one(researches, { fields: [notifications.researchId], references: [researches.id] }),
}));
