import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { researches } from './researches.js';

export const pdfRequests = pgTable('pdf_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  researchId: uuid('research_id')
    .notNull()
    .references(() => researches.id, { onDelete: 'cascade' }),
  requesterName: varchar('requester_name', { length: 255 }).notNull(),
  requesterEmail: varchar('requester_email', { length: 255 }).notNull(),
  purpose: text('purpose'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type PdfRequest = typeof pdfRequests.$inferSelect;
export type NewPdfRequest = typeof pdfRequests.$inferInsert;
