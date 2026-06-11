# NCF Research Nexus — Migration Roadmap

## Legacy → NestJS + PostgreSQL + DrizzleORM + Cloudflare R2

| Aspect | Legacy (Current) | Target |
|---|---|---|
| Runtime | Node.js (plain) | Node.js + NestJS |
| Language | JavaScript | TypeScript (strict) |
| Framework | Express.js v4.19.2 | NestJS v10+ |
| Database | MySQL (CloudClusters) | PostgreSQL 16 |
| ORM | Raw mysql2 queries | DrizzleORM |
| Validation | Manual / unused express-validator | Zod + Drizzle schemas |
| Auth | Broken JWT (never applied) | Passport.js + JWT |
| File Storage | Google Drive (raw, duplicated) | Cloudflare R2 (S3-compatible) |
| Email | Nodemailer (hardcoded creds) | Nodemailer + templates |
| API Style | REST (inconsistent) | REST (consistent, versioned) |
| Testing | None | Vitest + Supertest |
| Logging | console.log | Pino (via NestJS logger) |
| Documentation | None | Swagger/OpenAPI |

---

## Table of Contents

1. [Legacy Feature Inventory](#1-legacy-feature-inventory)
2. [NestJS Project Structure](#2-nestjs-project-structure)
3. [Database Schema (DrizzleORM)](#3-database-schema-drizzleorm)
4. [Module Design](#4-module-design)
5. [Complete API Reference with Sample Requests](#5-complete-api-reference-with-sample-requests)
6. [Authentication Architecture](#6-authentication-architecture)
7. [Cloudflare R2 File Storage](#7-cloudflare-r2-file-storage)
8. [Email System](#8-email-system)
9. [Phase-by-Phase Implementation Plan](#9-phase-by-phase-implementation-plan)
10. [Security Checklist](#10-security-checklist)
11. [Appendix: Dependency List](#11-appendix-dependency-list)

---

## 1. Legacy Feature Inventory

### 1.1 User Management

| Legacy Feature | Status | Target Module | Notes |
|---|---|---|---|
| Email/password registration | ✅ Keep | `AuthModule` | Add email confirmation via magic link |
| Email verification (JWT link) | ✅ Keep | `AuthModule` | Add token expiry |
| Password reset (6-digit code) | ❌ Rework | `AuthModule` | Replace with signed magic-link |
| User CRUD (admin) | ✅ Keep | `UsersModule` | Add role-based access |
| User profile update | ✅ Keep | `UsersModule` | Add profile picture upload |
| User listing (admin) | ✅ Keep | `UsersModule` | Pagination, filtering, exclude password |
| Program/institution management | ✅ Keep | `UsersModule` | |

### 1.2 Research Documents

| Legacy Feature | Status | Target Module | Notes |
|---|---|---|---|
| PDF upload to Google Drive | ✅ Keep | `ResearchModule` + `FileModule` | Switch to Cloudflare R2 |
| Research metadata (title, abstract, authors) | ✅ Keep | `ResearchModule` | Drizzle relations |
| Author management (upsert) | ✅ Keep | `ResearchModule` | |
| Category/keyword management | ✅ Keep | `ResearchModule` | Many-to-many via Drizzle |
| Research approval/rejection | ✅ Keep | `AdminModule` | |
| File privacy toggle (public/private) | ✅ Keep | `ResearchModule` | |
| Research file replacement | ✅ Keep | `FileModule` | |
| Research deletion (cascade) | ✅ Keep | `ResearchModule` | Add R2 file deletion |

### 1.3 File Operations

| Legacy Feature | Status | Target Module | Notes |
|---|---|---|---|
| PDF streaming | ✅ Keep | `FileModule` | From Cloudflare R2 |
| Profile picture upload | ✅ Keep | `FileModule` | |
| Profile picture retrieval | ✅ Keep | `FileModule` | |
| PDF request workflow | ✅ Keep | `RequestModule` | |
| Send PDF via email | ✅ Keep | `RequestModule` + `EmailModule` | |

### 1.4 Search

| Legacy Feature | Status | Target Module | Notes |
|---|---|---|---|
| Fuse.js fuzzy search | ❌ Drop | `SearchModule` | Replace with PostgreSQL full-text search |
| Fuzzball token search | ❌ Drop | — | PostgreSQL `pg_trgm` handles this |
| Levenshtein distance search | ❌ Drop | — | |
| Custom Levenshtein search | ❌ Drop | — | Redundant |
| Search logging | ✅ Keep | `SearchModule` | |

### 1.5 Dashboard & Analytics

| Legacy Feature | Status | Target Module |
|---|---|---|
| Top downloads (top 10) | ✅ Keep | `AnalyticsModule` |
| Trending searches (top 10) | ✅ Keep | `AnalyticsModule` |
| Most cited/downloaded/viewed (top 3) | ✅ Keep | `AnalyticsModule` |
| Total counts | ✅ Keep | `AnalyticsModule` |
| Daily/weekly/monthly time-series | ✅ Keep | `AnalyticsModule` |
| Per-user analytics | ✅ Keep | `AnalyticsModule` |
| Uploader stats by role | ✅ Keep | `AnalyticsModule` |

### 1.6 User Dashboard

| Legacy Feature | Status | Target Module |
|---|---|---|
| Notifications (approval/rejection) | ✅ Keep | `NotificationsModule` |
| Mark notifications as read | ✅ Keep | `NotificationsModule` |
| Research collections (bookmarks) | ✅ Keep | `CollectionsModule` |
| Heartbeat (online status) | ✅ Keep | `UsersModule` |
| Online users list | ✅ Keep | `AdminModule` |

### 1.7 Admin

| Legacy Feature | Status | Target Module |
|---|---|---|
| Research approval/rejection | ✅ Keep | `AdminModule` |
| User management (CRUD) | ✅ Keep | `AdminModule` |
| Analytics dashboard | ✅ Keep | `AdminModule` + `AnalyticsModule` |

### 1.8 Features Removed vs Legacy

| Feature Dropped | Reason |
|---|---|
| Google OAuth login | Not needed |
| 4 separate search algorithms | Replace with 1 PostgreSQL full-text search |
| Geolocation tracking | Privacy concern, unused |
| Static file serving from `../../uploads` | Security risk |
| `Programs.js` (duplicate) | Clean module structure |

---

## 2. NestJS Project Structure

```
ncfresearch-backend/
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── package.json
├── .env
├── .env.example
├── .gitignore
├── docker-compose.yml
├── drizzle.config.ts
│
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── roles.decorator.ts
│   │   │   └── public.decorator.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── interceptors/
│   │   │   └── transform.interceptor.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts
│   │   └── types/
│   │       ├── pagination.ts
│   │       └── response.ts
│   │
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   ├── r2.config.ts              # Cloudflare R2 config
│   │   ├── email.config.ts
│   │   └── app.config.ts
│   │
│   ├── database/
│   │   ├── drizzle.module.ts
│   │   ├── drizzle.provider.ts
│   │   └── schema/
│   │       ├── index.ts
│   │       ├── users.schema.ts
│   │       ├── roles.schema.ts
│   │       ├── researches.schema.ts
│   │       ├── authors.schema.ts
│   │       ├── research-authors.schema.ts
│   │       ├── categories.schema.ts
│   │       ├── research-categories.schema.ts
│   │       ├── keywords.schema.ts
│   │       ├── research-keywords.schema.ts
│   │       ├── programs.schema.ts
│   │       ├── institutions.schema.ts
│   │       ├── notifications.schema.ts
│   │       ├── collections.schema.ts
│   │       ├── downloads.schema.ts
│   │       ├── citations.schema.ts
│   │       ├── views.schema.ts
│   │       ├── search-logs.schema.ts
│   │       ├── pdf-requests.schema.ts
│   │       └── password-resets.schema.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── jwt-refresh.strategy.ts
│   │   │   ├── dto/
│   │   │   │   ├── login.dto.ts
│   │   │   │   ├── register.dto.ts
│   │   │   │   ├── forgot-password.dto.ts
│   │   │   │   └── reset-password.dto.ts
│   │   │   └── tests/
│   │   │
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── update-user.dto.ts
│   │   │   │   └── user-query.dto.ts
│   │   │   └── tests/
│   │   │
│   │   ├── research/
│   │   │   ├── research.module.ts
│   │   │   ├── research.controller.ts
│   │   │   ├── research.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-research.dto.ts
│   │   │   │   ├── update-research.dto.ts
│   │   │   │   └── research-query.dto.ts
│   │   │   └── tests/
│   │   │
│   │   ├── file/
│   │   │   ├── file.module.ts
│   │   │   ├── file.controller.ts
│   │   │   ├── file.service.ts         # Cloudflare R2 operations
│   │   │   └── tests/
│   │   │
│   │   ├── search/
│   │   │   ├── search.module.ts
│   │   │   ├── search.controller.ts
│   │   │   ├── search.service.ts
│   │   │   ├── dto/
│   │   │   │   └── search-query.dto.ts
│   │   │   └── tests/
│   │   │
│   │   ├── analytics/
│   │   │   ├── analytics.module.ts
│   │   │   ├── analytics.controller.ts
│   │   │   ├── analytics.service.ts
│   │   │   └── tests/
│   │   │
│   │   ├── notifications/
│   │   │   ├── notifications.module.ts
│   │   │   ├── notifications.controller.ts
│   │   │   ├── notifications.service.ts
│   │   │   └── tests/
│   │   │
│   │   ├── collections/
│   │   │   ├── collections.module.ts
│   │   │   ├── collections.controller.ts
│   │   │   ├── collections.service.ts
│   │   │   └── tests/
│   │   │
│   │   ├── requests/
│   │   │   ├── requests.module.ts
│   │   │   ├── requests.controller.ts
│   │   │   ├── requests.service.ts
│   │   │   └── tests/
│   │   │
│   │   ├── admin/
│   │   │   ├── admin.module.ts
│   │   │   ├── admin.controller.ts
│   │   │   ├── admin.service.ts
│   │   │   └── tests/
│   │   │
│   │   └── email/
│   │       ├── email.module.ts
│   │       ├── email.service.ts
│   │       └── templates/
│   │           ├── verification.hbs
│   │           ├── password-reset.hbs
│   │           ├── research-approved.hbs
│   │           ├── research-rejected.hbs
│   │           ├── pdf-request.hbs
│   │           └── pdf-delivery.hbs
│   │
│   └── database/
│       └── migrations/
│
├── test/
│   ├── e2e/
│   │   ├── auth.e2e-spec.ts
│   │   ├── research.e2e-spec.ts
│   │   └── admin.e2e-spec.ts
│   └── jest-e2e.json
│
└── scripts/
    ├── seed.ts
    └── migrate.ts
```

---

## 3. Database Schema (DrizzleORM)

### 3.1 Users & Roles

```typescript
// src/database/schema/users.schema.ts
import { pgTable, serial, varchar, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { roles } from './roles.schema';
import { programs } from './programs.schema';
import { institutions } from './institutions.schema';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  middleName: varchar('middle_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  suffix: varchar('suffix', { length: 50 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }),
  roleId: integer('role_id').references(() => roles.id).notNull().default(2),
  programId: integer('program_id').references(() => programs.id),
  institutionId: integer('institution_id').references(() => institutions.id),
  isVerified: boolean('is_verified').default(false),
  profilePictureKey: varchar('profile_picture_key', { length: 500 }), // R2 object key
  lastActive: timestamp('last_active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

```typescript
// src/database/schema/roles.schema.ts
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  // Values: 'admin', 'ncf_user', 'non_ncf_user'
});
```

### 3.2 Researches

```typescript
// src/database/schema/researches.schema.ts
export const researches = pgTable('researches', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 500 }).notNull().unique(),
  publishDate: timestamp('publish_date').defaultNow(),
  abstract: text('abstract'),
  filename: varchar('filename', { length: 255 }),
  uploaderId: integer('uploader_id').references(() => users.id).notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  // pending | approved | rejected
  fileKey: varchar('file_key', { length: 500 }),       // R2 object key
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
}));

// DDL for full-text search:
// ALTER TABLE researches ADD COLUMN search_vector tsvector
//   GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(abstract, ''))) STORED;
// CREATE INDEX researches_search_idx ON researches USING GIN(search_vector);
```

### 3.3 Authors (Many-to-Many)

```typescript
export const authors = pgTable('authors', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
});

export const researchAuthors = pgTable('research_authors', {
  researchId: integer('research_id').references(() => researches.id, { onDelete: 'cascade' }).notNull(),
  authorId: integer('author_id').references(() => authors.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.researchId, table.authorId] }),
}));
```

### 3.4 Categories & Keywords

```typescript
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
});

export const researchCategories = pgTable('research_categories', {
  researchId: integer('research_id').references(() => researches.id, { onDelete: 'cascade' }).notNull(),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.researchId, table.categoryId] }),
}));

export const keywords = pgTable('keywords', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
});

export const researchKeywords = pgTable('research_keywords', {
  researchId: integer('research_id').references(() => researches.id, { onDelete: 'cascade' }).notNull(),
  keywordId: integer('keyword_id').references(() => keywords.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.researchId, table.keywordId] }),
}));
```

### 3.5 Analytics Tables

```typescript
export const downloads = pgTable('downloads', {
  id: serial('id').primaryKey(),
  researchId: integer('research_id').references(() => researches.id, { onDelete: 'cascade' }).notNull(),
  downloadCount: integer('download_count').default(1),
  datetime: timestamp('datetime').defaultNow(),
});

export const citations = pgTable('citations', {
  id: serial('id').primaryKey(),
  researchId: integer('research_id').references(() => researches.id, { onDelete: 'cascade' }).notNull(),
  citationCount: integer('citation_count').default(1),
  datetime: timestamp('datetime').defaultNow(),
});

export const views = pgTable('views', {
  id: serial('id').primaryKey(),
  researchId: integer('research_id').references(() => researches.id, { onDelete: 'cascade' }).notNull(),
  viewCount: integer('view_count').default(1),
  datetime: timestamp('datetime').defaultNow(),
});
```

### 3.6 Feature Tables

```typescript
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  researchId: integer('research_id').references(() => researches.id, { onDelete: 'set null' }),
  message: text('message').notNull(),
  opened: boolean('opened').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const collections = pgTable('collections', {
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  researchId: integer('research_id').references(() => researches.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.researchId] }),
}));

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

export const passwordResets = pgTable('password_resets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: varchar('token', { length: 500 }).notNull(),
  expires: timestamp('expires').notNull(),
  used: boolean('used').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const searchLogs = pgTable('search_logs', {
  id: serial('id').primaryKey(),
  query: varchar('query', { length: 500 }),
  researchId: integer('research_id').references(() => researches.id, { onDelete: 'set null' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### 3.7 Programs & Institutions

```typescript
export const programs = pgTable('programs', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
});

export const institutions = pgTable('institutions', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
});
```

---

## 4. Module Design

### 4.1 AuthModule

```
AuthModule
├── Controller: AuthController
│
├── POST /api/v1/auth/register
├── POST /api/v1/auth/login
├── POST /api/v1/auth/refresh
├── POST /api/v1/auth/logout
├── GET  /api/v1/auth/verify-email?token=
├── POST /api/v1/auth/forgot-password
├── POST /api/v1/auth/reset-password
└── GET  /api/v1/auth/me
│
├── Services: AuthService
│   ├── register(dto)           → create user, send verification email
│   ├── login(dto)              → validate credentials, return JWT pair
│   ├── refreshToken(token)     → rotate refresh token
│   ├── verifyEmail(token)      → verify JWT from email link
│   ├── forgotPassword(dto)     → generate signed token, email
│   └── resetPassword(dto)      → verify token, update password
│
├── Strategies (Passport)
│   ├── JwtStrategy             → access token (15min expiry)
│   └── JwtRefreshStrategy      → refresh token (7 day expiry, hashed in DB)
│
├── Guards
│   ├── JwtAuthGuard (global, @Public() to bypass)
│   └── RolesGuard (@Roles('admin') etc.)
│
└── DTOs (Zod)
    ├── RegisterDto
    ├── LoginDto
    ├── ForgotPasswordDto
    └── ResetPasswordDto
```

### 4.2 UsersModule

```
UsersModule
├── Controller: UsersController
│
├── GET    /api/v1/users           → list (admin, paginated)
├── GET    /api/v1/users/:id       → single user
├── PATCH  /api/v1/users/:id       → update profile
├── DELETE /api/v1/users/:id       → delete (admin or self)
├── GET    /api/v1/users/:id/researches → user's researches
├── POST   /api/v1/users/heartbeat → update last_active
└── GET    /api/v1/users/online    → online users (admin)
│
└── DTOs: UpdateUserDto, UserQueryDto
```

### 4.3 ResearchModule

```
ResearchModule
├── Controller: ResearchController
│
├── POST   /api/v1/researches           → create (multipart: file + metadata)
├── GET    /api/v1/researches           → list approved (paginated, filterable)
├── GET    /api/v1/researches/:id       → single research with relations
├── PATCH  /api/v1/researches/:id       → update metadata
├── DELETE /api/v1/researches/:id       → delete + R2 cleanup
├── PATCH  /api/v1/researches/:id/privacy → toggle public/private
├── POST   /api/v1/researches/:id/download → +1 download
├── POST   /api/v1/researches/:id/cite     → +1 citation
└── POST   /api/v1/researches/:id/view     → +1 view
│
└── DTOs: CreateResearchDto, UpdateResearchDto, ResearchQueryDto
```

### 4.4 FileModule (Cloudflare R2)

```
FileModule
├── Controller: FileController
│
├── GET  /api/v1/files/pdf/:researchId       → stream PDF from R2
├── POST /api/v1/files/pdf/:researchId       → replace PDF in R2
├── POST /api/v1/files/profile-picture       → upload profile pic to R2
└── GET  /api/v1/files/profile-picture/:userId → get profile pic from R2
│
└── Services: FileService
    ├── uploadPdf(buffer, filename, researchId) → R2 object key
    ├── getPdfStream(fileKey)                  → readable stream
    ├── deleteFile(fileKey)                    → remove from R2
    ├── uploadProfilePic(buffer, userId)       → R2 object key
    └── getProfilePicStream(fileKey)           → readable stream
```

### 4.5 SearchModule

```
SearchModule
├── Controller: SearchController
│
├── GET /api/v1/search?q=&category=&author=&page=&limit=
└── POST /api/v1/search/log  → log a search
│
└── Service: SearchService
    └── Uses PostgreSQL full-text search:
        SELECT *, ts_rank(search_vector, query) AS rank
        FROM researches
        WHERE search_vector @@ plainto_tsquery('english', $1)
        ORDER BY rank DESC
```

### 4.6 AnalyticsModule

```
AnalyticsModule
├── Controller: AnalyticsController
│
├── GET /api/v1/analytics/top-downloads
├── GET /api/v1/analytics/trending
├── GET /api/v1/analytics/most-cited
├── GET /api/v1/analytics/most-viewed
├── GET /api/v1/analytics/totals
├── GET /api/v1/analytics/daily/:metric
├── GET /api/v1/analytics/weekly/:metric
├── GET /api/v1/analytics/monthly/:metric
└── GET /api/v1/analytics/user/:userId
```

### 4.7 NotificationsModule

```
NotificationsModule
├── Controller: NotificationsController
│
├── GET    /api/v1/notifications           → user's notifications
├── PATCH  /api/v1/notifications/read      → mark all as read
└── PATCH  /api/v1/notifications/:id/read  → mark single as read
```

### 4.8 CollectionsModule

```
CollectionsModule
├── Controller: CollectionsController
│
├── GET    /api/v1/collections             → user's collections
├── POST   /api/v1/collections             → add to collection
└── DELETE /api/v1/collections/:researchId → remove from collection
```

### 4.9 RequestsModule (PDF Requests)

```
RequestsModule
├── Controller: RequestsController
│
├── POST   /api/v1/requests/pdf             → create request
├── GET    /api/v1/requests/pdf             → user's requests
├── PATCH  /api/v1/requests/pdf/:id/approve → approve + send PDF email
└── PATCH  /api/v1/requests/pdf/:id/reject  → reject + send email
```

### 4.10 AdminModule

```
AdminModule
├── Controller: AdminController
│
├── GET    /api/v1/admin/users
├── PATCH  /api/v1/admin/users/:id
├── DELETE /api/v1/admin/users/:id
├── PATCH  /api/v1/admin/researches/:id/approve
├── PATCH  /api/v1/admin/researches/:id/reject
├── GET    /api/v1/admin/researches/pending
├── GET    /api/v1/admin/researches/rejected
├── GET    /api/v1/admin/categories
├── POST   /api/v1/admin/categories
├── PATCH  /api/v1/admin/categories/:id
├── DELETE /api/v1/admin/categories/:id
├── GET    /api/v1/admin/keywords
├── POST   /api/v1/admin/keywords
├── PATCH  /api/v1/admin/keywords/:id
├── DELETE /api/v1/admin/keywords/:id
├── GET    /api/v1/admin/institutions
├── POST   /api/v1/admin/institutions
├── PATCH  /api/v1/admin/institutions/:id
├── DELETE /api/v1/admin/institutions/:id
└── GET    /api/v1/admin/uploader-stats
```

### 4.11 EmailModule

```
EmailModule
├── Service: EmailService
│   ├── sendVerificationEmail(email, token)
│   ├── sendPasswordReset(email, token)
│   ├── sendResearchApproved(email, researchTitle)
│   ├── sendResearchRejected(email, researchTitle, reason)
│   ├── sendPdfRequestNotification(authorEmail, requester, title)
│   └── sendPdfDelivery(email, pdfBuffer, title)
│
└── Templates: verification.hbs, password-reset.hbs,
    research-approved.hbs, research-rejected.hbs,
    pdf-request.hbs, pdf-delivery.hbs
```

---

## 5. Complete API Reference with Sample Requests

All endpoints prefixed with `/api/v1`. All protected routes require `Authorization: Bearer <token>` header.

### 5.1 Authentication

---

#### `POST /api/v1/auth/register`

**Auth**: `@Public()` — No token required

**Request**:
```json
{
  "firstName": "John",
  "middleName": "D",
  "lastName": "Doe",
  "suffix": "",
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "roleId": 2,
  "programId": 1,
  "institutionId": 1
}
```

**Response 201**:
```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "userId": 1
}
```

**Response 409** (duplicate email):
```json
{ "error": "Email already registered", "code": "EMAIL_EXISTS" }
```

---

#### `POST /api/v1/auth/login`

**Auth**: `@Public()`

**Request**:
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

**Response 200**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJl...",
  "user": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "role": "ncf_user"
  }
}
```

**Response 401**:
```json
{ "error": "Invalid email or password", "code": "INVALID_CREDENTIALS" }
```

---

#### `POST /api/v1/auth/refresh`

**Auth**: `@Public()`

**Request**:
```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJl..."
}
```

**Response 200**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "bmV3IHJlZnJlc2ggdG9r...",
  "expiresIn": 900
}
```

---

#### `POST /api/v1/auth/logout`

**Auth**: Protected

**Headers**: `Authorization: Bearer <accessToken>`

**Request**:
```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJl..."
}
```

**Response 200**:
```json
{ "message": "Logged out successfully" }
```

---

#### `GET /api/v1/auth/verify-email`

**Auth**: `@Public()`

**Query**: `?token=eyJhbGciOiJIUzI1NiIs...`

**Response 200**:
```json
{ "message": "Email verified successfully" }
```

**Response 400**:
```json
{ "error": "Invalid or expired verification token", "code": "TOKEN_INVALID" }
```

---

#### `POST /api/v1/auth/forgot-password`

**Auth**: `@Public()`

**Request**:
```json
{
  "email": "john.doe@example.com"
}
```

**Response 200**:
```json
{ "message": "If the email exists, a password reset link has been sent" }
```

*(Always returns 200 to prevent email enumeration)*

---

#### `POST /api/v1/auth/reset-password`

**Auth**: `@Public()`

**Request**:
```json
{
  "token": "a1b2c3d4e5f6...",
  "newPassword": "NewSecurePass456!"
}
```

**Response 200**:
```json
{ "message": "Password reset successfully" }
```

---

#### `GET /api/v1/auth/me`

**Auth**: Protected

**Headers**: `Authorization: Bearer <accessToken>`

**Response 200**:
```json
{
  "id": 1,
  "firstName": "John",
  "middleName": "D",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "role": "ncf_user",
  "isVerified": true,
  "program": "BS Computer Science",
  "institution": "Naga College Foundation",
  "profilePictureUrl": "https://r2.example.com/profiles/1.jpg",
  "createdAt": "2026-06-01T00:00:00.000Z"
}
```

---

### 5.2 Users

---

#### `GET /api/v1/users`

**Auth**: Admin only (`@Roles('admin')`)

**Query**: `?page=1&limit=20&role=ncf_user&search=john`

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "role": "ncf_user",
      "isVerified": true,
      "createdAt": "2026-06-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

#### `GET /api/v1/users/:id`

**Auth**: Protected (self or admin)

**Response 200**:
```json
{
  "id": 1,
  "firstName": "John",
  "middleName": "D",
  "lastName": "Doe",
  "suffix": "",
  "email": "john.doe@example.com",
  "role": "ncf_user",
  "program": "BS Computer Science",
  "institution": "Naga College Foundation",
  "isVerified": true,
  "lastActive": "2026-06-10T14:30:00.000Z",
  "createdAt": "2026-06-01T00:00:00.000Z"
}
```
*(No password field ever returned)*

---

#### `PATCH /api/v1/users/:id`

**Auth**: Protected (self or admin)

**Request**:
```json
{
  "firstName": "Jonathan",
  "middleName": "David",
  "lastName": "Doe",
  "suffix": "Jr."
}
```

**Response 200**:
```json
{ "message": "Profile updated successfully" }
```

---

#### `DELETE /api/v1/users/:id`

**Auth**: Admin only

**Response 200**:
```json
{ "message": "User deleted successfully" }
```

---

#### `GET /api/v1/users/:id/researches`

**Auth**: Protected

**Query**: `?status=approved&page=1&limit=10`

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "title": "Machine Learning in Education",
      "status": "approved",
      "publishDate": "2026-05-15T00:00:00.000Z"
    }
  ],
  "meta": { "total": 5, "page": 1, "limit": 10, "totalPages": 1 }
}
```

---

#### `POST /api/v1/users/heartbeat`

**Auth**: Protected

**Request**:
```json
{}
```
*(User ID extracted from JWT)*

**Response 200**:
```json
{ "message": "Heartbeat updated" }
```

---

#### `GET /api/v1/users/online`

**Auth**: Admin only

**Response 200**:
```json
{
  "onlineUsers": [
    { "id": 1, "firstName": "John", "lastName": "Doe", "email": "john@example.com", "lastActive": "2026-06-10T14:35:00.000Z" }
  ],
  "count": 1
}
```

---

### 5.3 Researches

---

#### `POST /api/v1/researches`

**Auth**: Protected

**Content-Type**: `multipart/form-data`

| Field | Type | Required |
|---|---|---|
| `file` | File (PDF only) | Yes |
| `title` | string | Yes |
| `abstract` | text | No |
| `authors` | string (JSON array) | Yes |
| `categories` | string (JSON array) | No |
| `keywords` | string (JSON array) | No |

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/v1/researches \
  -H "Authorization: Bearer <token>" \
  -F "file=@research.pdf" \
  -F "title=Machine Learning in Modern Education" \
  -F "abstract=This paper explores..." \
  -F 'authors=[{"name":"John Doe","email":"john@example.com"},{"name":"Jane Smith","email":"jane@example.com"}]' \
  -F 'categories=["Education","Technology"]' \
  -F 'keywords=["machine learning","AI","education"]'
```

**Response 201**:
```json
{
  "message": "Research uploaded successfully",
  "researchId": 1,
  "status": "pending"
}
```

*(If uploader is admin, status = "approved" directly)*

---

#### `GET /api/v1/researches`

**Auth**: `@Public()`

**Query**: `?page=1&limit=20&category=1&keyword=2&author=3&search=机器学习&sortBy=date&order=desc`

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "title": "Machine Learning in Modern Education",
      "abstract": "This paper explores...",
      "authors": ["John Doe", "Jane Smith"],
      "categories": ["Education", "Technology"],
      "keywords": ["machine learning", "AI"],
      "publishDate": "2026-05-15T00:00:00.000Z",
      "totalDownloads": 150,
      "totalCitations": 12,
      "totalViews": 1024
    }
  ],
  "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 }
}
```

---

#### `GET /api/v1/researches/:id`

**Auth**: `@Public()`

**Response 200**:
```json
{
  "id": 1,
  "title": "Machine Learning in Modern Education",
  "abstract": "This paper explores...",
  "filename": "research_1.pdf",
  "status": "approved",
  "filePrivacy": "public",
  "authors": [
    { "id": 1, "name": "John Doe", "email": "john@example.com" }
  ],
  "categories": ["Education", "Technology"],
  "keywords": ["machine learning", "AI"],
  "uploader": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com"
  },
  "totalDownloads": 150,
  "totalCitations": 12,
  "totalViews": 1024,
  "viewCount": 1024,
  "publishDate": "2026-05-15T00:00:00.000Z",
  "createdAt": "2026-05-10T00:00:00.000Z"
}
```

---

#### `PATCH /api/v1/researches/:id`

**Auth**: Protected (owner or admin)

**Request**:
```json
{
  "title": "Updated Title",
  "abstract": "Updated abstract content..."
}
```

**Response 200**:
```json
{ "message": "Research updated successfully" }
```

---

#### `DELETE /api/v1/researches/:id`

**Auth**: Protected (owner or admin)

**Response 200**:
```json
{ "message": "Research deleted successfully" }
```

---

#### `PATCH /api/v1/researches/:id/privacy`

**Auth**: Protected (owner or admin)

**Request**:
```json
{
  "privacy": "private"
}
```

**Response 200**:
```json
{ "message": "Privacy updated to private" }
```

---

#### `POST /api/v1/researches/:id/download`

**Auth**: `@Public()`

**Response 200**:
```json
{ "message": "Download counted" }
```

---

#### `POST /api/v1/researches/:id/cite`

**Auth**: `@Public()`

**Response 200**:
```json
{ "message": "Citation counted" }
```

---

#### `POST /api/v1/researches/:id/view`

**Auth**: `@Public()`

**Response 200**:
```json
{ "message": "View counted" }
```

---

### 5.4 Files (Cloudflare R2)

---

#### `GET /api/v1/files/pdf/:researchId`

**Auth**: `@Public()`

**Response**: Binary PDF stream with headers:
```
Content-Type: application/pdf
Content-Disposition: inline; filename="research_1.pdf"
```

---

#### `POST /api/v1/files/pdf/:researchId`

**Auth**: Protected (owner or admin)

**Content-Type**: `multipart/form-data`

| Field | Type | Required |
|---|---|---|
| `file` | File (PDF only) | Yes |

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/v1/files/pdf/1 \
  -H "Authorization: Bearer <token>" \
  -F "file=@updated-research.pdf"
```

**Response 200**:
```json
{ "message": "File updated successfully" }
```

---

#### `POST /api/v1/files/profile-picture`

**Auth**: Protected

**Content-Type**: `multipart/form-data`

| Field | Type | Required |
|---|---|---|
| `file` | File (JPG/PNG only, max 5MB) | Yes |

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/v1/files/profile-picture \
  -H "Authorization: Bearer <token>" \
  -F "file=@avatar.jpg"
```

**Response 200**:
```json
{
  "message": "Profile picture uploaded successfully",
  "url": "https://r2.example.com/profiles/1.jpg"
}
```

---

#### `GET /api/v1/files/profile-picture/:userId`

**Auth**: `@Public()`

**Response**: Binary image stream (JPG/PNG)

---

### 5.5 Search

---

#### `GET /api/v1/search`

**Auth**: `@Public()`

**Query**: `?q=machine+learning&category=1&author=3&page=1&limit=20`

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "title": "Machine Learning in Modern Education",
      "abstract": "This paper explores...",
      "authors": ["John Doe"],
      "relevance": 0.95
    }
  ],
  "meta": { "total": 10, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

#### `POST /api/v1/search/log`

**Auth**: Protected

**Request**:
```json
{
  "researchId": 1,
  "query": "machine learning"
}
```

**Response 200**:
```json
{ "message": "Search logged" }
```

---

### 5.6 Analytics

---

#### `GET /api/v1/analytics/top-downloads`

**Auth**: `@Public()`

**Query**: `?limit=10`

**Response 200**:
```json
{
  "data": [
    {
      "researchId": 1,
      "title": "Machine Learning in Modern Education",
      "authors": ["John Doe"],
      "downloadCount": 150
    }
  ]
}
```

---

#### `GET /api/v1/analytics/trending`

**Auth**: `@Public()`

**Response 200**:
```json
{
  "data": [
    {
      "researchId": 1,
      "title": "Machine Learning in Modern Education",
      "searchCount": 45
    }
  ]
}
```

---

#### `GET /api/v1/analytics/most-cited`

**Auth**: `@Public()`

**Response 200**:
```json
{
  "data": [
    {
      "researchId": 1,
      "title": "Machine Learning in Modern Education",
      "citationCount": 25
    }
  ]
}
```

---

#### `GET /api/v1/analytics/most-viewed`

**Auth**: `@Public()`

**Response 200**: Same structure as above with `viewCount`.

---

#### `GET /api/v1/analytics/totals`

**Auth**: `@Public()`

**Response 200**:
```json
{
  "totalResearches": 150,
  "totalUsers": 45,
  "totalDownloads": 3200,
  "totalCitations": 450,
  "totalViews": 12000
}
```

---

#### `GET /api/v1/analytics/daily/:metric`

**Auth**: `@Public()`

**Path**: `:metric` = `downloads` | `citations` | `views`

**Query**: `?startDate=2026-01-01&endDate=2026-06-10`

**Response 200**:
```json
{
  "data": [
    { "date": "2026-06-01", "count": 15 },
    { "date": "2026-06-02", "count": 22 }
  ]
}
```

---

#### `GET /api/v1/analytics/weekly/:metric`

Same as daily but returns `{ "year": 2026, "week": 23, "count": 85 }`.

---

#### `GET /api/v1/analytics/monthly/:metric`

Same but returns `{ "year": 2026, "month": 6, "count": 350 }`.

---

#### `GET /api/v1/analytics/user/:userId`

**Auth**: Protected (self or admin)

**Response 200**:
```json
{
  "totalResearches": 5,
  "totalDownloads": 150,
  "totalCitations": 12,
  "totalViews": 1024
}
```

---

### 5.7 Notifications

---

#### `GET /api/v1/notifications`

**Auth**: Protected

**Query**: `?page=1&limit=20`

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "message": "Your research 'Machine Learning in Education' has been approved",
      "researchId": 1,
      "opened": false,
      "createdAt": "2026-06-08T10:00:00.000Z"
    }
  ],
  "meta": { "total": 3, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

#### `PATCH /api/v1/notifications/read`

**Auth**: Protected

**Request**:
```json
{
  "ids": [1, 2, 3]
}
```
*(Omitting `ids` marks all as read)*

**Response 200**:
```json
{ "message": "Notifications marked as read", "affected": 3 }
```

---

#### `PATCH /api/v1/notifications/:id/read`

**Auth**: Protected

**Response 200**:
```json
{ "message": "Notification marked as read" }
```

---

### 5.8 Collections

---

#### `GET /api/v1/collections`

**Auth**: Protected

**Response 200**:
```json
{
  "data": [
    {
      "researchId": 1,
      "title": "Machine Learning in Modern Education",
      "authors": ["John Doe"],
      "abstract": "This paper...",
      "addedAt": "2026-06-05T00:00:00.000Z"
    }
  ]
}
```

---

#### `POST /api/v1/collections`

**Auth**: Protected

**Request**:
```json
{
  "researchId": 1
}
```

**Response 201**:
```json
{ "message": "Added to collection" }
```

---

#### `DELETE /api/v1/collections/:researchId`

**Auth**: Protected

**Response 200**:
```json
{ "message": "Removed from collection" }
```

---

### 5.9 PDF Requests

---

#### `POST /api/v1/requests/pdf`

**Auth**: `@Public()`

**Request**:
```json
{
  "researchId": 1,
  "requesterName": "Alice Wang",
  "requesterEmail": "alice@example.com",
  "purpose": "Academic research"
}
```

**Response 201**:
```json
{ "message": "PDF request submitted. Authors have been notified.", "requestId": 1 }
```

---

#### `GET /api/v1/requests/pdf`

**Auth**: Protected (author/uploader)

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "researchId": 1,
      "researchTitle": "Machine Learning in Modern Education",
      "requesterName": "Alice Wang",
      "requesterEmail": "alice@example.com",
      "purpose": "Academic research",
      "status": "pending",
      "createdAt": "2026-06-09T00:00:00.000Z"
    }
  ]
}
```

---

#### `PATCH /api/v1/requests/pdf/:id/approve`

**Auth**: Protected (author/uploader)

**Response 200**:
```json
{ "message": "Request approved. PDF has been sent to requester's email." }
```

---

#### `PATCH /api/v1/requests/pdf/:id/reject`

**Auth**: Protected (author/uploader)

**Request**:
```json
{
  "reason": "This paper is currently under review for journal publication."
}
```

**Response 200**:
```json
{ "message": "Request rejected. Requester has been notified." }
```

---

### 5.10 Admin

---

#### `GET /api/v1/admin/users`

**Auth**: Admin only

**Query**: `?page=1&limit=20&role=admin&search=john&isVerified=true`

**Response 200**: Same as `GET /api/v1/users` but with more fields.

---

#### `PATCH /api/v1/admin/users/:id`

**Auth**: Admin only

**Request**:
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@example.com",
  "roleId": 1,
  "programId": 2,
  "institutionId": 1,
  "isVerified": true
}
```

**Response 200**:
```json
{ "message": "User updated successfully" }
```

---

#### `DELETE /api/v1/admin/users/:id`

**Auth**: Admin only

**Response 200**:
```json
{ "message": "User deleted successfully" }
```

---

#### `PATCH /api/v1/admin/researches/:id/approve`

**Auth**: Admin only

**Response 200**:
```json
{ "message": "Research approved successfully" }
```

---

#### `PATCH /api/v1/admin/researches/:id/reject`

**Auth**: Admin only

**Request**:
```json
{
  "reason": "Insufficient methodology section. Please revise and resubmit."
}
```

**Response 200**:
```json
{ "message": "Research rejected. Notification sent to uploader." }
```

---

#### `GET /api/v1/admin/researches/pending`

**Auth**: Admin only

**Response 200**: Paginated list of researches with `status: "pending"`.

---

#### `GET /api/v1/admin/researches/rejected`

**Auth**: Admin only

**Response 200**: Paginated list of rejected researches with rejection reasons.

---

#### CRUD: Categories

**Auth**: Admin only

`GET /api/v1/admin/categories`
**Response 200**:
```json
{ "data": [{ "id": 1, "name": "Education" }, { "id": 2, "name": "Technology" }] }
```

`POST /api/v1/admin/categories`
**Request**:
```json
{ "name": "Biology" }
```
**Response 201**:
```json
{ "id": 3, "name": "Biology" }
```

`PATCH /api/v1/admin/categories/:id`
**Request**:
```json
{ "name": "Life Sciences" }
```
**Response 200**:
```json
{ "message": "Category updated" }
```

`DELETE /api/v1/admin/categories/:id`
**Response 200**:
```json
{ "message": "Category deleted" }
```

*(Keywords and Institutions follow the same CRUD pattern)*

---

#### `GET /api/v1/admin/uploader-stats`

**Auth**: Admin only

**Response 200**:
```json
{
  "data": [
    { "role": "admin", "uploads": 25 },
    { "role": "ncf_user", "uploads": 100 },
    { "role": "non_ncf_user", "uploads": 15 }
  ]
}
```

---

### 5.11 Reference Data (Public)

**Auth**: `@Public()`

---

#### `GET /api/v1/programs`

**Response 200**:
```json
{ "data": [{ "id": 1, "name": "BS Computer Science" }] }
```

#### `GET /api/v1/roles`

**Response 200**:
```json
{ "data": [{ "id": 1, "name": "admin" }, { "id": 2, "name": "ncf_user" }, { "id": 3, "name": "non_ncf_user" }] }
```

#### `GET /api/v1/authors`

**Query**: `?page=1&limit=50&search=john`

**Response 200**:
```json
{
  "data": [
    { "id": 1, "name": "John Doe", "email": "john@example.com", "documentCount": 3 }
  ],
  "meta": { "total": 50, "page": 1, "limit": 50, "totalPages": 1 }
}
```

#### `GET /api/v1/authors/:id`

**Response 200**:
```json
{ "id": 1, "name": "John Doe", "email": "john@example.com" }
```

#### `GET /api/v1/authors/:id/researches`

**Query**: `?page=1&limit=10`

**Response 200**: Paginated list of the author's researches.

---

## 6. Authentication Architecture

### 6.1 Token Strategy

```
Register/Login
     │
     ▼
┌──────────────┐
│  Access Token  │ ◄── 15 min expiry, stateless (JWT)
│                │     Contains: userId, email, role
└──────┬───────┘
       │
┌──────────────┐
│ Refresh Token │ ◄── 7 day expiry, stored in DB (hashed bcrypt)
│               │     One-time use, rotated on each refresh
└──────────────┘

Password Reset
     │
     ▼
┌──────────────────┐
│  crypto.randomBytes│ ◄── 32 bytes → hex string (64 chars)
│  (Magic Link)     │     15 min expiry, one-time use, stored in DB
└──────────────────┘

Email Verification
     │
     ▼
┌──────────────────┐
│ JWT Token         │ ◄── 24 hour expiry
│                   │     Contains: userId only
└──────────────────┘
```

### 6.2 JWT Payload

```typescript
// Access Token
{
  sub: 1,                    // userId
  email: "john@example.com",
  role: "ncf_user",
  iat: 1718000000,
  exp: 1718000900            // +15 min
}

// Refresh Token (JWT or opaque string)
{
  jti: "uuid-v4",            // unique ID, stored hashed in DB
  sub: 1,                    // userId
  iat: 1718000000,
  exp: 1718604800            // +7 days
}
```

### 6.3 Guard Implementation

```typescript
// common/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  handleRequest(err: any, user: any, _info: any, context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return user || null;
    if (err || !user) throw new UnauthorizedException();
    return user;
  }
}

// common/decorators/public.decorator.ts
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// common/decorators/roles.decorator.ts
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// common/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

### 6.4 Global Guard Registration

```typescript
// src/app.module.ts
import { APP_GUARD } from '@nestjs/core';

@Module({
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },  // All routes protected by default
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
```

### 6.5 Route Protection Matrix

| Decorator | Effect |
|---|---|
| `@Public()` | No auth required (login, register, forgot-password, public GET endpoints) |
| *(none)* | Any authenticated user |
| `@Roles('admin')` | Only admin users |
| `@Roles('ncf_user')` | Only NCF users |
| `@Roles('admin', 'ncf_user')` | Admin or NCF users |

---

## 7. Cloudflare R2 File Storage

### 7.1 Why R2

- **S3-compatible API** → use `@aws-sdk/client-s3`
- **Zero egress fees** → PDF streaming costs nothing
- **No hardcoded credentials** → all from env vars
- **Public buckets** → direct URL access for profile pictures
- **Presigned URLs** → secure temporary access to private PDFs

### 7.2 R2 Configuration

```typescript
// src/config/r2.config.ts
import { S3Client } from '@aws-sdk/client-s3';

@Injectable()
export class R2Config {
  public readonly client: S3Client;
  public readonly bucket: string;
  public readonly publicUrl: string;
  public readonly researchFolder: string;
  public readonly profileFolder: string;

  constructor() {
    this.client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,               // https://<accountid>.r2.cloudflarestorage.com
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    });
    this.bucket = process.env.R2_BUCKET!;
    this.publicUrl = process.env.R2_PUBLIC_URL!;        // https://r2.example.com
    this.researchFolder = 'researches';
    this.profileFolder = 'profiles';
  }
}
```

### 7.3 FileService Implementation

```typescript
// src/modules/file/file.service.ts
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class FileService {
  constructor(private readonly r2: R2Config) {}

  async uploadPdf(
    buffer: Buffer,
    originalName: string,
    researchId: number,
  ): Promise<string> {
    const key = `${this.r2.researchFolder}/${researchId}/${Date.now()}_${originalName}`;
    await this.r2.client.send(new PutObjectCommand({
      Bucket: this.r2.bucket,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
    }));
    return key;
  }

  async getPdfStream(fileKey: string) {
    const response = await this.r2.client.send(new GetObjectCommand({
      Bucket: this.r2.bucket,
      Key: fileKey,
    }));
    return response.Body as Readable;
  }

  async deleteFile(fileKey: string): Promise<void> {
    await this.r2.client.send(new DeleteObjectCommand({
      Bucket: this.r2.bucket,
      Key: fileKey,
    }));
  }

  async uploadProfilePic(buffer: Buffer, userId: number): Promise<string> {
    const ext = this.detectImageType(buffer); // jpg or png
    const key = `${this.r2.profileFolder}/${userId}.${ext}`;
    await this.r2.client.send(new PutObjectCommand({
      Bucket: this.r2.bucket,
      Key: key,
      Body: buffer,
      ContentType: `image/${ext}`,
    }));
    return key;
  }

  async getProfileUrl(fileKey: string): Promise<string> {
    if (!fileKey) return `${this.r2.publicUrl}/default-avatar.png`;
    return `${this.r2.publicUrl}/${fileKey}`;
  }

  private detectImageType(buffer: Buffer): 'jpeg' | 'png' {
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'jpeg';
    if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'png';
    throw new BadRequestException('Invalid image format. Only JPG and PNG are allowed.');
  }
}
```

### 7.4 Environment Variables

```env
# R2
R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<your-access-key>
R2_SECRET_ACCESS_KEY=<your-secret-key>
R2_BUCKET=ncf-research-nexus
R2_PUBLIC_URL=https://r2.example.com
```

### 7.5 R2 Folder Structure

```
Bucket: ncf-research-nexus
├── researches/
│   ├── 1/
│   │   ├── 1718000000_paper.pdf
│   │   └── 1718100000_revised.pdf
│   ├── 2/
│   │   └── 1718200000_manuscript.pdf
│   └── ...
│
├── profiles/
│   ├── 1.jpeg
│   ├── 2.png
│   └── ...
│
└── default-avatar.png
```

---

## 8. Email System

### 8.1 Technology

- **@nestjs-modules/mailer** with Handlebars templates
- **Nodemailer** transport (Gmail SMTP or any SMTP)
- **Credentials from env only**: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`

### 8.2 Template Example

```handlebars
{{! templates/verification.hbs }}
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Verify Email</title></head>
<body>
  <h2>Welcome to NCF Research Nexus!</h2>
  <p>Please verify your email by clicking the link below:</p>
  <a href="{{verificationLink}}" style="padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;">
    Verify Email
  </a>
  <p style="margin-top:24px;color:#666;font-size:14px;">This link expires in 24 hours.</p>
</body>
</html>
```

### 8.3 Email Types

| Type | Trigger | Template |
|---|---|---|
| Email Verification | Registration | `verification.hbs` |
| Password Reset | User requests reset | `password-reset.hbs` |
| Research Approved | Admin approves | `research-approved.hbs` |
| Research Rejected | Admin rejects | `research-rejected.hbs` |
| PDF Request | User requests PDF | `pdf-request.hbs` |
| PDF Delivery | Request approved | `pdf-delivery.hbs` |

---

## 9. Phase-by-Phase Implementation Plan

### Phase 0: Project Scaffolding (Day 1)

```
Tasks:
☐ Install NestJS CLI: npm i -g @nestjs/cli && nest new ncfresearch-backend
☐ Configure TypeScript (strict mode, decorator metadata, path aliases)
☐ Set up ESLint + Prettier
☐ Configure Docker Compose (PostgreSQL 16)
☐ Install DrizzleORM + drizzle-kit
☐ Create drizzle.config.ts with PostgreSQL connection
☐ Write all Drizzle schemas (18 tables)
☐ Run initial migration: npx drizzle-kit push
☐ Set up ConfigModule with env validation (Joi or Zod)
☐ Set up global ValidationPipe, HttpExceptionFilter
☐ Install and configure @nestjs/swagger (Swagger UI at /api/docs)
☐ Set up Pino logger (LoggerModule from nestjs-pino)

Deliverables:
- Running NestJS app on port 3000
- PostgreSQL with all 18 tables created
- Swagger UI at /api/docs
- Structured logging
```

### Phase 1: Auth Module (Days 2-3)

```
Tasks:
☐ Create AuthModule
☐ Implement JwtStrategy (access token from Authorization header)
☐ Implement JwtRefreshStrategy (refresh token from body)
☐ Create @Public() decorator, register JwtAuthGuard as global guard
☐ Create @Roles() decorator, register RolesGuard
☐ Implement register()
☐ Implement login() with bcrypt compare
☐ Implement refreshToken() with rotation
☐ Implement logout() — delete refresh token from DB
☐ Implement verifyEmail() — verify JWT from email link (24h expiry)
☐ Implement forgotPassword() — crypto.randomBytes(32) token
☐ Implement resetPassword() — validate one-time token
☐ Seed roles table: admin, ncf_user, non_ncf_user
☐ Write auth integration tests (register → login → refresh → me)

Sample flow test:
  POST /api/v1/auth/register → 201
  GET /api/v1/auth/verify-email?token=... → 200
  POST /api/v1/auth/login → { accessToken, refreshToken }
  GET /api/v1/auth/me (with Bearer token) → 200
  POST /api/v1/auth/refresh → new tokens
  POST /api/v1/auth/logout → 200
  GET /api/v1/auth/me (with old refresh token) → 401
```

### Phase 2: Users & Research Core (Days 4-6)

```
Tasks:
☐ Create UsersModule
☐ Implement findAll (paginated, filterable by role/search)
☐ Implement findById (no password in response)
☐ Implement update (firstName, middleName, lastName, suffix)
☐ Implement remove (admin or self-only)
☐ Create ResearchModule
☐ Implement create — multipart: file (PDF) + JSON metadata
    1. Upload PDF to R2 → get fileKey
    2. Insert research record with fileKey
    3. Upsert authors via research_authors junction
    4. Upsert categories via research_categories junction
    5. Upsert keywords via research_keywords junction
☐ Implement findAll (approved only, paginated, filterable)
☐ Implement findById (with authors, categories, keywords, stats)
☐ Implement update (title, abstract only)
☐ Implement remove (cascade delete all relations + R2 file)
☐ Implement privacy toggle
☐ Implement increment download/cite/view
☐ Implement getResearchesByUser(userId, status filter)
☐ Create seed script with sample data

Sample flow test:
  POST /api/v1/researches (multipart) → 201
  GET /api/v1/researches → 200 [{ ... }]
  GET /api/v1/researches/1 → 200 { ... authors, categories, keywords }
  PATCH /api/v1/researches/1/privacy { "privacy": "private" } → 200
  POST /api/v1/researches/1/download → 200
  DELETE /api/v1/researches/1 → 200
```

### Phase 3: File Module — Cloudflare R2 (Day 7)

```
Tasks:
☐ Install @aws-sdk/client-s3, @aws-sdk/s3-request-presigner
☐ Create R2Config (singleton S3Client from env)
☐ Create FileService
☐ Implement uploadPdf(buffer, filename, researchId) → fileKey
☐ Implement getPdfStream(fileKey) → Readable
☐ Implement deleteFile(fileKey) → void
☐ Implement uploadProfilePic(buffer, userId) → fileKey
☐ Implement getProfilePicUrl(fileKey) → public URL
☐ Create FileController
☐ GET /api/v1/files/pdf/:researchId — stream PDF from R2
☐ POST /api/v1/files/pdf/:researchId — replace PDF
☐ POST /api/v1/files/profile-picture — upload + update user record
☐ GET /api/v1/files/profile-picture/:userId — serve or redirect
☐ Integrate FileService into ResearchModule (use on create/delete)
☐ Set up public R2 bucket with CORS for frontend

Sample flow test:
  POST /api/v1/files/profile-picture (multipart) → 200 { url }
  GET /api/v1/files/profile-picture/1 → binary image
  GET /api/v1/files/pdf/1 → binary PDF
  POST /api/v1/files/pdf/1 (multipart, replace) → 200
```

### Phase 4: Search Module (Days 8-9)

```
Tasks:
☐ Run raw SQL migration: ALTER TABLE researches ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' ||
  coalesce(abstract,''))) STORED;
☐ Create GIN index: CREATE INDEX researches_search_idx ON researches USING GIN(search_vector);
☐ Enable pg_trgm: CREATE EXTENSION IF NOT EXISTS pg_trgm;
☐ Create SearchModule + SearchController
☐ Implement GET /api/v1/search?q=
  SELECT *, ts_rank(search_vector, plainto_tsquery('english', $1)) AS rank
  FROM researches
  WHERE search_vector @@ plainto_tsquery('english', $1)
     OR title ILIKE '%' || $1 || '%'
  ORDER BY rank DESC
  LIMIT $2 OFFSET $3
☐ Add category/author filters to search query
☐ Implement POST /api/v1/search/log
☐ Write search integration tests

Sample flow test:
  GET /api/v1/search?q=machine+learning → 200 { data, meta }
  GET /api/v1/search?q=machine&category=1 → 200 { filtered results }
  POST /api/v1/search/log { "researchId": 1, "query": "machine" } → 200
```

### Phase 5: Analytics Module (Day 10)

```
Tasks:
☐ Create AnalyticsModule + AnalyticsController
☐ Implement top downloads:
  SELECT r.id, r.title, COALESCE(SUM(d.download_count), 0) AS total
  FROM researches r LEFT JOIN downloads d ON r.id = d.research_id
  GROUP BY r.id ORDER BY total DESC LIMIT 10
☐ Implement trending (by search_logs count)
☐ Implement most cited/downloaded/viewed (top 3 each)
☐ Implement totals (COUNT researches, COUNT users, SUM downloads/citations/views)
☐ Implement daily/weekly/monthly time-series using DATE_TRUNC
☐ Implement per-user analytics
☐ Write analytics integration tests

Sample flow test:
  GET /api/v1/analytics/top-downloads → 200 [{ researchId, title, downloadCount }]
  GET /api/v1/analytics/totals → 200 { totalResearches, totalUsers, ... }
  GET /api/v1/analytics/daily/downloads?startDate=2026-01-01 → 200 [{ date, count }]
  GET /api/v1/analytics/user/1 → 200 { totalResearches: 5, ... }
```

### Phase 6: Notifications & Collections (Day 11)

```
Tasks:
☐ Create NotificationsModule
☐ Create CollectionsModule
☐ Implement create notification on approve/reject
☐ Implement list notifications for authenticated user
☐ Implement mark single/all notifications as read
☐ Implement add/remove/list collections
☐ Write integration tests

Sample flow test:
  POST /api/v1/collections { "researchId": 1 } → 201
  GET /api/v1/collections → 200 [{ researchId, title, authors }]
  DELETE /api/v1/collections/1 → 200
  GET /api/v1/notifications → 200 [{ message, opened, createdAt }]
  PATCH /api/v1/notifications/read { "ids": [1,2] } → 200
```

### Phase 7: PDF Requests (Day 12)

```
Tasks:
☐ Create RequestsModule
☐ Implement POST /api/v1/requests/pdf — create + email authors
☐ Implement GET /api/v1/requests/pdf — list for uploader/author
☐ Implement approve — fetch PDF from R2, email to requester, update status
☐ Implement reject — send rejection email, update status
☐ Write integration tests

Sample flow test:
  POST /api/v1/requests/pdf { "researchId": 1, "requesterName": "Alice",
    "requesterEmail": "alice@test.com", "purpose": "Study" } → 201
  GET /api/v1/requests/pdf → 200 [{ requesterName, status, ... }]
  PATCH /api/v1/requests/pdf/1/approve → 200 (email sent)
  PATCH /api/v1/requests/pdf/2/reject { "reason": "Not available" } → 200
```

### Phase 8: Admin Module (Day 13)

```
Tasks:
☐ Create AdminModule (imports UsersModule, ResearchModule)
☐ Guard all admin routes with @Roles('admin')
☐ Implement user management (list all, update, delete)
☐ Implement research approve (update status + create notification)
☐ Implement research reject (update status + create notification with reason)
☐ Implement categories/keywords/institutions full CRUD
☐ Implement uploader stats by role
☐ Write admin integration tests

Sample flow test:
  PATCH /api/v1/admin/researches/1/approve → 200 (notification created)
  PATCH /api/v1/admin/researches/1/reject { "reason": "..." } → 200
  GET /api/v1/admin/users?role=ncf_user → 200 { data, meta }
  POST /api/v1/admin/categories { "name": "Physics" } → 201
  GET /api/v1/admin/uploader-stats → 200 [{ role, uploads }]
```

### Phase 9: Email Templates & Polish (Day 14)

```
Tasks:
☐ Install @nestjs-modules/mailer with Handlebars adapter
☐ Design all 6 email templates (responsive HTML)
☐ Wire templates: verification, password-reset, approved, rejected, pdf-request, pdf-delivery
☐ Add rate limiting to auth endpoints (5 req/min per IP)
☐ Add Helmet middleware for security headers
☐ Add file size validation (PDF max 50MB, image max 5MB)
☐ Add file type validation beyond MIME (magic bytes)
☐ Add pagination defaults to all list endpoints
☐ Write E2E tests for critical flows (register → upload → search → download)
☐ Create seed script for demo data
☐ Add request ID tracking (correlation ID for debugging)

Deliverables:
- Professional HTML email templates
- Rate limiting on auth
- Security headers via Helmet
- E2E test coverage for critical paths
```

### Phase 10: Data Migration & Go-Live (Days 15-16)

```
Tasks:
☐ Create data migration script: read from MySQL, write to PostgreSQL via Drizzle
☐ Map legacy IDs to new auto-increment IDs (maintain referential integrity)
☐ Migrate users (passwords as-is, map verification → isVerified boolean)
☐ Migrate researches and all relations (authors, categories, keywords)
☐ Migrate analytics data (downloads, citations, views, search_logs)
☐ Migrate notifications, collections, pdf_requests
☐ Migrate files from Google Drive to Cloudflare R2:
    - Download each file from Drive using existing fileId
    - Upload to R2 under researches/{researchId}/{filename}
    - Update fileKey in researches table
☐ Verify data integrity (spot-check 10% of records)
☐ Run full integration suite against migrated data
☐ Deploy to staging, coordinate frontend testing
☐ Update frontend API calls to new /api/v1/* endpoints
☐ DNS cutover to production
☐ Monitor logs for 24h post-launch

Deliverables:
- All legacy data in PostgreSQL with R2 files
- Frontend fully working with NestJS API
- Production deployment running
```

---

## 10. Security Checklist

### Must-Fix (Blocking)

- [ ] No hardcoded secrets — all from env vars (R2 keys, JWT secret, DB password, email creds)
- [ ] `password` column never returned in any API response
- [ ] All endpoints protected by global `JwtAuthGuard`, only `@Public()` routes are open
- [ ] Rate limiting on auth: 5 req/min per IP on login, register, forgot-password
- [ ] Email verification token has 24h expiry
- [ ] Password reset uses cryptographically random one-time token (not 6-digit code)
- [ ] Refresh tokens stored hashed (bcrypt) in database
- [ ] File upload size limits: 50MB for PDFs, 5MB for images
- [ ] CORS configured for frontend origin only

### Should-Fix (High Priority)

- [ ] Helmet security headers configured
- [ ] Zod validation on every DTO (type + length + format checks)
- [ ] SQL injection impossible (parameterized queries via Drizzle)
- [ ] R2 bucket names and folder structure in env, not source
- [ ] Proper cascade deletes on all foreign keys
- [ ] Transaction support for multi-table operations (research create = 6+ inserts)
- [ ] PDF MIME validation beyond Content-Type (check magic bytes `%PDF`)

### Nice-to-Have

- [ ] Request logging with correlation ID (who accessed what, when)
- [ ] Audit log for admin actions (approve/reject/delete user)
- [ ] Content Security Policy headers
- [ ] CSRF protection (if using cookie-based auth in future)

---

## 11. Appendix: Dependency List

### Production Dependencies

```json
{
  "@nestjs/common": "^10.4.0",
  "@nestjs/core": "^10.4.0",
  "@nestjs/platform-express": "^10.4.0",
  "@nestjs/config": "^3.2.0",
  "@nestjs/jwt": "^10.2.0",
  "@nestjs/passport": "^10.0.3",
  "@nestjs/swagger": "^7.3.0",
  "@nestjs-modules/mailer": "^2.0.0",
  "@aws-sdk/client-s3": "^3.600.0",
  "@aws-sdk/s3-request-presigner": "^3.600.0",
  "drizzle-orm": "^0.31.0",
  "postgres": "^3.4.0",
  "passport": "^0.7.0",
  "passport-jwt": "^4.0.1",
  "bcrypt": "^5.1.1",
  "nodemailer": "^6.9.15",
  "handlebars": "^4.7.8",
  "zod": "^3.23.0",
  "class-validator": "^0.14.1",
  "class-transformer": "^0.5.1",
  "helmet": "^7.1.0",
  "pino": "^9.1.0",
  "nestjs-pino": "^3.5.0",
  "multer": "^1.4.5-lts.1",
  "@types/multer": "^1.4.11",
  "rxjs": "^7.8.1",
  "reflect-metadata": "^0.2.1",
  "uuid": "^9.0.1"
}
```

### Dev Dependencies

```json
{
  "@nestjs/cli": "^10.3.0",
  "@nestjs/testing": "^10.4.0",
  "@types/node": "^20.12.0",
  "@types/express": "^4.17.21",
  "@types/passport-jwt": "^4.0.1",
  "@types/bcrypt": "^5.0.2",
  "@types/nodemailer": "^6.4.15",
  "@types/uuid": "^9.0.8",
  "drizzle-kit": "^0.22.0",
  "typescript": "^5.4.0",
  "vitest": "^1.6.0",
  "supertest": "^7.0.0",
  "@types/supertest": "^6.0.2",
  "ts-jest": "^29.1.2",
  "eslint": "^8.57.0",
  "prettier": "^3.2.5",
  "docker-compose": "^1.0.0"
}
```

### Docker Compose (Development)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ncfrepo_new
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./scripts/init-search.sql:/docker-entrypoint-initdb.d/init-search.sql
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U admin -d ncfrepo_new']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### init-search.sql

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
```

### .env.example

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ncfrepo_new
DB_USER=admin
DB_PASSWORD=your_secure_password

# JWT
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_ACCESS_EXPIRY=900
JWT_REFRESH_EXPIRY=604800

# Cloudflare R2
R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET=ncf-research-nexus
R2_PUBLIC_URL=https://r2.example.com

# Email (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=ncfresearchnexus@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=ncfresearchnexus@gmail.com

# Frontend URL (for email links)
FRONTEND_URL=https://your-frontend.vercel.app
```

---

## Summary: What Changes from Legacy

| Aspect | Legacy Problem | NestJS Solution |
|---|---|---|
| **Secrets** | Hardcoded in 15+ files | Environment variables only |
| **Auth** | 0 of 70+ endpoints protected | Global JwtAuthGuard, all routes secure by default |
| **Google OAuth** | Present, complex | Removed. Email/password + JWT only |
| **Password reset** | 6-digit brute-forceable code | Signed one-time magic link (crypto.randomBytes) |
| **Search** | 4 duplicate JS implementations | PostgreSQL full-text search (1 impl) |
| **File storage** | Copy-pasted Drive code in 6 files | Centralized Cloudflare R2 service (S3 SDK) |
| **Google Drive** | RSA private key hardcoded 6× | Removed. R2 with env-based credentials |
| **Database** | Raw SQL mixed with callbacks | DrizzleORM, typed, consistent |
| **Validation** | Almost none | Zod schemas on every DTO |
| **Error handling** | Per-route try/catch, inconsistent | Global exception filter |
| **Logging** | console.log everywhere | Structured Pino logging |
| **Testing** | None | Vitest + Supertest |
| **Documentation** | README only | Swagger/OpenAPI auto-generated |
| **API contracts** | Guess from reading code | Every endpoint has sample request/response |

---

*Generated from legacy codebase analysis — June 2026*
