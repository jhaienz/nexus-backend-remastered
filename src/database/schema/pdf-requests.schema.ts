import { pgTable, serial, integer, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { researches } from './researches.schema';
import { relations } from 'drizzle-orm';

export const pdfRequests = pgTable('pdf_requests', {
  id: serial('id').primaryKey(),
  researchId: integer('research_id').references(() => researches.id, { onDelete: 'cascade' }).notNull(),
  researchTitle: varchar('research_title', { length: 500 }),
  requesterName: varchar('requester_name', { length: 255 }).notNull(),
  requesterEmail: varchar('requester_email', { length: 255 }).notNull(),
  purpose: text('purpose'),
  status: varchar('status', { length: 50 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const pdfRequestsRelations = relations(pdfRequests, ({ one }) => ({
  research: one(researches, { fields: [pdfRequests.researchId], references: [researches.id] }),
}));
