import { pgTable, uuid, varchar, unique } from 'drizzle-orm/pg-core';

export const authors = pgTable(
  'authors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
  },
  (table) => [unique('authors_name_email_unique').on(table.name, table.email)],
);

export type Author = typeof authors.$inferSelect;
export type NewAuthor = typeof authors.$inferInsert;
