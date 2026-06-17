import { relations } from 'drizzle-orm';
import { users } from './users.js';
import { institutions } from './institutions.js';
import { programs } from './programs.js';
import { researches } from './researches.js';
import { authors } from './authors.js';
import { categories } from './categories.js';
import { keywords } from './keywords.js';
import { researchAuthors } from './research-authors.js';
import { researchCategories } from './research-categories.js';
import { researchKeywords } from './research-keywords.js';
import { analyticsEvents } from './analytics-events.js';
import { collections } from './collections.js';
import { notifications } from './notifications.js';
import { pdfRequests } from './pdf-requests.js';
import { passwordResets } from './password-resets.js';

export const usersRelations = relations(users, ({ one, many }) => ({
  institution: one(institutions, {
    fields: [users.institutionId],
    references: [institutions.id],
  }),
  program: one(programs, {
    fields: [users.programId],
    references: [programs.id],
  }),
  researches: many(researches),
  collections: many(collections),
  notifications: many(notifications),
  passwordResets: many(passwordResets),
}));

export const institutionsRelations = relations(institutions, ({ many }) => ({
  users: many(users),
}));

export const programsRelations = relations(programs, ({ many }) => ({
  users: many(users),
}));

export const researchesRelations = relations(researches, ({ one, many }) => ({
  uploader: one(users, {
    fields: [researches.uploaderId],
    references: [users.id],
  }),
  researchAuthors: many(researchAuthors),
  researchCategories: many(researchCategories),
  researchKeywords: many(researchKeywords),
  analyticsEvents: many(analyticsEvents),
  collections: many(collections),
  notifications: many(notifications),
  pdfRequests: many(pdfRequests),
}));

export const authorsRelations = relations(authors, ({ many }) => ({
  researchAuthors: many(researchAuthors),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  researchCategories: many(researchCategories),
}));

export const keywordsRelations = relations(keywords, ({ many }) => ({
  researchKeywords: many(researchKeywords),
}));

export const researchAuthorsRelations = relations(
  researchAuthors,
  ({ one }) => ({
    research: one(researches, {
      fields: [researchAuthors.researchId],
      references: [researches.id],
    }),
    author: one(authors, {
      fields: [researchAuthors.authorId],
      references: [authors.id],
    }),
  }),
);

export const researchCategoriesRelations = relations(
  researchCategories,
  ({ one }) => ({
    research: one(researches, {
      fields: [researchCategories.researchId],
      references: [researches.id],
    }),
    category: one(categories, {
      fields: [researchCategories.categoryId],
      references: [categories.id],
    }),
  }),
);

export const researchKeywordsRelations = relations(
  researchKeywords,
  ({ one }) => ({
    research: one(researches, {
      fields: [researchKeywords.researchId],
      references: [researches.id],
    }),
    keyword: one(keywords, {
      fields: [researchKeywords.keywordId],
      references: [keywords.id],
    }),
  }),
);

export const analyticsEventsRelations = relations(
  analyticsEvents,
  ({ one }) => ({
    research: one(researches, {
      fields: [analyticsEvents.researchId],
      references: [researches.id],
    }),
  }),
);

export const collectionsRelations = relations(collections, ({ one }) => ({
  user: one(users, {
    fields: [collections.userId],
    references: [users.id],
  }),
  research: one(researches, {
    fields: [collections.researchId],
    references: [researches.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  research: one(researches, {
    fields: [notifications.researchId],
    references: [researches.id],
  }),
}));

export const pdfRequestsRelations = relations(pdfRequests, ({ one }) => ({
  research: one(researches, {
    fields: [pdfRequests.researchId],
    references: [researches.id],
  }),
}));

export const passwordResetsRelations = relations(passwordResets, ({ one }) => ({
  user: one(users, {
    fields: [passwordResets.userId],
    references: [users.id],
  }),
}));
