import { pgTable, serial, varchar, timestamp, integer, text } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { relations } from 'drizzle-orm';
import { researchAuthors } from './research-authors.schema';
import { researchCategories } from './research-categories.schema';
import { researchKeywords } from './research-keywords.schema';
import { downloads } from './downloads.schema';
import { citations } from './citations.schema';
import { views } from './views.schema';
import { notifications } from './notifications.schema';
import { collections } from './collections.schema';
import { pdfRequests } from './pdf-requests.schema';
import { searchLogs } from './search-logs.schema';

export const researches = pgTable('researches', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 500 }).notNull().unique(),
  publishDate: timestamp('publish_date').defaultNow(),
  abstract: text('abstract'),
  filename: varchar('filename', { length: 255 }),
  uploaderId: integer('uploader_id').references(() => users.id).notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  fileKey: varchar('file_key', { length: 500 }),
  filePrivacy: varchar('file_privacy', { length: 50 }).default('public'),
  viewCount: integer('view_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const researchesRelations = relations(researches, ({ many, one }) => ({
  uploader: one(users, { fields: [researches.uploaderId], references: [users.id] }),
  authors: many(researchAuthors),
  categories: many(researchCategories),
  keywords: many(researchKeywords),
  downloads: many(downloads),
  citations: many(citations),
  views: many(views),
  notifications: many(notifications),
  collections: many(collections),
  pdfRequests: many(pdfRequests),
  searchLogs: many(searchLogs),
}));
