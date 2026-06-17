import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core';

export const keywords = pgTable('keywords', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
});

export type Keyword = typeof keywords.$inferSelect;
export type NewKeyword = typeof keywords.$inferInsert;
