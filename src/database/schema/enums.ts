import { pgEnum } from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['admin', 'user', 'guest']);
export const researchStatus = pgEnum('research_status', [
  'pending',
  'approved',
  'rejected',
]);
export const filePrivacy = pgEnum('file_privacy', ['public', 'private']);
