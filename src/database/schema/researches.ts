import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  boolean,
  integer,
  timestamp,
  customType,
} from 'drizzle-orm/pg-core';
import { researchStatus, filePrivacy } from './enums.js';
import { users } from './users.js';

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const researches = pgTable('researches', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 500 }).notNull(),
  abstract: text('abstract'),
  publishDate: date('publish_date'),
  status: researchStatus('status').notNull().default('pending'),
  filePrivacy: filePrivacy('file_privacy').notNull().default('public'),
  fileKey: varchar('file_key', { length: 500 }),
  fileName: varchar('file_name', { length: 255 }),
  uploadComplete: boolean('upload_complete').notNull().default(false),
  uploaderId: uuid('uploader_id')
    .notNull()
    .references(() => users.id),
  rejectionReason: text('rejection_reason'),
  searchVector: tsvector('search_vector'),
  viewCount: integer('view_count').notNull().default(0),
  downloadCount: integer('download_count').notNull().default(0),
  citationCount: integer('citation_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Research = typeof researches.$inferSelect;
export type NewResearch = typeof researches.$inferInsert;
