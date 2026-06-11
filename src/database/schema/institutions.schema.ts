import { pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const institutions = pgTable('institutions', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
});
