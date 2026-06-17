# NCF Research Nexus v2 — System Design Document

Technical specification for the complete rewrite of the NCF Research Nexus legacy application.

---

## 1. Tech Stack Summary

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 15 (App Router) | Server-side rendering for SEO on public research pages. File-based routing eliminates the legacy's manual route sprawl. Server Components reduce client JS bundle. |
| **Backend** | NestJS | Module-based architecture replaces the legacy's 29 disorganized Express route files. Built-in dependency injection, validation pipes, and guards map directly to the auth/RBAC needs. |
| **Database** | PostgreSQL | Full-text search via `pg_trgm` + `tsvector` replaces all four legacy search algorithms with a single, index-backed approach. JSONB support for flexible metadata. |
| **ORM** | Drizzle ORM | Type-safe SQL-like syntax with zero runtime overhead. Schema-as-code replaces the legacy's undocumented, raw-SQL-everywhere approach. Migrations are deterministic. |
| **File Storage** | Cloudflare R2 | S3-compatible object storage with zero egress fees. Replaces the fragile Google Drive service account integration. Presigned URLs eliminate the backend as a proxy for downloads. |
| **Email** | Resend | 3,000 emails/month free tier covers verification, password reset, and PDF request notifications. Replaces the legacy's hardcoded Gmail SMTP credentials. |
| **Auth** | JWT (access + refresh) | Stateless authentication with RBAC. No OAuth providers — simplifies the auth surface to email/password only. |

**What was eliminated and why:**

- **4 search algorithms** (Fuse.js, Fuzzball, Levenshtein, custom fuzzy) → 1 PostgreSQL full-text search. The legacy fetched all documents on every search request, then filtered in-memory. The rewrite pushes search to the database where it belongs.
- **Google Drive API** → Cloudflare R2. The legacy duplicated a Google service account private key across 3 files. R2 uses a single env-configured S3 client.
- **Gmail SMTP with hardcoded app passwords** → Resend API. One API key, no SMTP configuration.
- **Google OAuth** → Removed entirely per requirements.
- **Client-side search** (SearchBar.jsx fetching all researches on mount) → Server-side search with pagination. The legacy loaded the entire approved research catalog into browser memory.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
│                                                              │
│   Next.js App (Server Components + Client Components)        │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│   │ Public Pages  │  │ User Pages   │  │ Admin Pages      │  │
│   │ (SSR/SSG)     │  │ (Protected)  │  │ (Protected+RBAC) │  │
│   └──────────────┘  └──────────────┘  └──────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS (JSON)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                     NestJS API Server                        │
│                                                              │
│   ┌────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│   │ Auth   │ │ Research  │ │ User     │ │ Analytics      │  │
│   │ Module │ │ Module    │ │ Module   │ │ Module         │  │
│   └───┬────┘ └────┬─────┘ └────┬─────┘ └───────┬────────┘  │
│       │           │            │               │            │
│   ┌───┴───────────┴────────────┴───────────────┴─────────┐  │
│   │              Drizzle ORM (shared schema)              │  │
│   └──────────────────────┬────────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │
              ┌────────────┼────────────────┐
              ▼            ▼                ▼
     ┌──────────────┐ ┌────────┐  ┌──────────────┐
     │ PostgreSQL   │ │ R2     │  │ Resend       │
     │ (Data + FTS) │ │ (PDFs) │  │ (Email)      │
     └──────────────┘ └────────┘  └──────────────┘
```

**Interaction summary:**

1. **Next.js → NestJS**: All data flows through the NestJS REST API. Next.js Server Components call the API during SSR for public pages (research detail, search results). Client Components call the API for authenticated actions (upload, dashboard).
2. **NestJS → PostgreSQL**: All data access goes through Drizzle ORM. No raw SQL strings scattered across route files.
3. **NestJS → Cloudflare R2**: The backend generates presigned upload URLs (for uploads) and presigned read URLs (for downloads/viewing). The client uploads/downloads directly to/from R2 — the backend never proxies file bytes.
4. **NestJS → Resend**: Transactional emails for verification, password reset, and PDF request notifications.

---

## 3. System Design & Data Flow

### 3.1 JWT Authentication Flow

The legacy stored a single JWT with no refresh mechanism and a 1-hour expiry. The rewrite uses an access/refresh token pair.

```
Register:
  Client → POST /api/auth/register { email, password, firstName, lastName, ... }
    → NestJS validates input (class-validator pipes)
    → Hashes password (bcrypt, 12 rounds)
    → Inserts user with status='unverified'
    → Calls Resend API to send verification email with signed token
    → Returns 201

Verify Email:
  Client → GET /api/auth/verify-email?token=<jwt>
    → NestJS verifies JWT signature
    → Updates user status to 'active'
    → Returns 200

Login:
  Client → POST /api/auth/login { email, password }
    → NestJS looks up user by email
    → Checks status is 'active' (not 'unverified' or 'suspended')
    → Compares bcrypt hash
    → Generates accessToken (15min) + refreshToken (7 days)
    → Returns { accessToken, refreshToken, user: { id, email, role } }

Token Refresh:
  Client → POST /api/auth/refresh { refreshToken }
    → NestJS verifies refresh token
    → Issues new accessToken
    → Returns { accessToken }

RBAC Enforcement:
  Every protected endpoint uses NestJS Guards:
    1. AuthGuard — verifies accessToken from Authorization header
    2. RolesGuard — checks decoded token's `role` against @Roles() decorator
  
  Roles: 'admin' | 'user' | 'guest'
    - admin: full access (approve/reject research, manage users, view all analytics)
    - user: NCF-affiliated user (upload research, manage own papers, view own analytics)
    - guest: non-NCF user (browse, search, request PDFs, manage own collection)
```

**Simplification from legacy:** The legacy had 3 numeric role IDs (1, 2, 3) scattered across middleware checks with no clear naming. The rewrite uses string enum roles with NestJS decorator-based guards. The legacy also had no refresh token — users were forced to re-login after 1 hour.

### 3.2 PDF Upload & Retrieval Flow (Cloudflare R2)

The legacy uploaded PDFs through the backend (multer → buffer → Google Drive API), making the server a bottleneck. The rewrite uses presigned URLs for direct client-to-R2 transfers.

```
Upload:
  1. Client → POST /api/research (metadata: title, abstract, authors, keywords, categories)
     → NestJS validates metadata, creates research record with status='pending'
     → Returns { researchId }
  
  2. Client → POST /api/research/:id/upload-url { filename, contentType }
     → NestJS generates R2 presigned PUT URL (5min expiry)
     → Stores the R2 object key in the research record
     → Returns { uploadUrl, key }
  
  3. Client → PUT <presigned-url> (uploads PDF directly to R2)
     → R2 stores the file
  
  4. Client → POST /api/research/:id/confirm-upload
     → NestJS verifies the object exists in R2
     → Updates research record: uploadComplete=true

Download/View:
  1. Client → GET /api/research/:id/pdf
     → NestJS checks file_privacy ('public' → return URL, 'private' → check auth)
     → Generates R2 presigned GET URL (1hr expiry)
     → Returns { url }
  
  2. Client opens the presigned URL directly (R2 serves the PDF)
```

**Simplification from legacy:** The legacy duplicated a Google service account key inline in 3 separate files (`documentRoutes.js`, `pdfFILES.js`, `SendPaper.js`). The backend acted as a proxy for every PDF read/write. The rewrite eliminates this bottleneck entirely — the backend only issues signed URLs.

### 3.3 Search & Data Querying Flow

The legacy had 5 separate search implementations (4 backend + 1 client-side). The rewrite uses PostgreSQL full-text search.

```
Search:
  Client → GET /api/research/search?q=<query>&page=1&limit=20&category=<id>&sort=relevance
    → NestJS builds a Drizzle query:
        - Converts query to tsquery
        - Matches against a tsvector column (title + abstract + keywords + author names)
        - Ranks results with ts_rank_cd()
        - Applies optional filters (category, date range, author)
        - Paginates with LIMIT/OFFSET
    → Returns { results: [...], total, page, totalPages }
```

**Database indexing strategy:**
- GIN index on `search_vector` (tsvector column) for full-text search
- GIN index with `pg_trgm` on `title` for typo-tolerant "did you mean" suggestions
- B-tree indexes on foreign keys and frequently filtered columns (`status`, `category_id`)
- Composite index on `(uploader_id, status)` for user dashboard queries

**Simplification from legacy:** The legacy `SearchBar.jsx` fetched ALL approved researches on page load (no pagination, no limit), then ran fuzzy matching in the browser. This was untenable at scale. The rewrite pushes search to PostgreSQL where it is index-backed and paginated.

### 3.4 Optimized Database Schema (Drizzle ORM)

```typescript
// ---- Enums ----
export const userRole = pgEnum('user_role', ['admin', 'user', 'guest']);
export const researchStatus = pgEnum('research_status', ['pending', 'approved', 'rejected']);
export const filePrivacy = pgEnum('file_privacy', ['public', 'private']);

// ---- Core Tables ----

export const users = pgTable('users', {
  id:            uuid('id').primaryKey().defaultRandom(),
  email:         varchar('email', { length: 255 }).notNull().unique(),
  passwordHash:  varchar('password_hash', { length: 255 }),      // null for unset
  firstName:     varchar('first_name', { length: 100 }).notNull(),
  middleName:    varchar('middle_name', { length: 100 }),
  lastName:      varchar('last_name', { length: 100 }).notNull(),
  suffix:        varchar('suffix', { length: 20 }),
  role:          userRole('role').notNull().default('guest'),
  institutionId: uuid('institution_id').references(() => institutions.id),
  programId:     uuid('program_id').references(() => programs.id),
  status:        varchar('status', { length: 20 }).notNull().default('unverified'),
  profilePicKey: varchar('profile_pic_key', { length: 500 }),    // R2 object key
  createdAt:     timestamp('created_at').notNull().defaultNow(),
  updatedAt:     timestamp('updated_at').notNull().defaultNow(),
});

export const institutions = pgTable('institutions', {
  id:   uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
});

export const programs = pgTable('programs', {
  id:   uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
});

export const researches = pgTable('researches', {
  id:             uuid('id').primaryKey().defaultRandom(),
  title:          varchar('title', { length: 500 }).notNull(),
  abstract:       text('abstract'),
  publishDate:    date('publish_date'),
  status:         researchStatus('status').notNull().default('pending'),
  filePrivacy:    filePrivacy('file_privacy').notNull().default('public'),
  fileKey:        varchar('file_key', { length: 500 }),          // R2 object key
  fileName:       varchar('file_name', { length: 255 }),
  uploadComplete: boolean('upload_complete').notNull().default(false),
  uploaderId:     uuid('uploader_id').notNull().references(() => users.id),
  rejectionReason: text('rejection_reason'),
  searchVector:   tsvector('search_vector'),                     // auto-updated via trigger
  viewCount:      integer('view_count').notNull().default(0),
  downloadCount:  integer('download_count').notNull().default(0),
  citationCount:  integer('citation_count').notNull().default(0),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  updatedAt:      timestamp('updated_at').notNull().defaultNow(),
});

export const authors = pgTable('authors', {
  id:    uuid('id').primaryKey().defaultRandom(),
  name:  varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
}, (table) => ({
  uniqueNameEmail: unique().on(table.name, table.email),
}));

export const categories = pgTable('categories', {
  id:   uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
});

export const keywords = pgTable('keywords', {
  id:   uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
});

// ---- Junction Tables ----

export const researchAuthors = pgTable('research_authors', {
  researchId: uuid('research_id').notNull().references(() => researches.id, { onDelete: 'cascade' }),
  authorId:   uuid('author_id').notNull().references(() => authors.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.researchId, table.authorId] }),
}));

export const researchCategories = pgTable('research_categories', {
  researchId: uuid('research_id').notNull().references(() => researches.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.researchId, table.categoryId] }),
}));

export const researchKeywords = pgTable('research_keywords', {
  researchId: uuid('research_id').notNull().references(() => researches.id, { onDelete: 'cascade' }),
  keywordId:  uuid('keyword_id').notNull().references(() => keywords.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.researchId, table.keywordId] }),
}));

// ---- Analytics (simplified: counters on researches table + event log) ----

export const analyticsEvents = pgTable('analytics_events', {
  id:         uuid('id').primaryKey().defaultRandom(),
  researchId: uuid('research_id').notNull().references(() => researches.id, { onDelete: 'cascade' }),
  eventType:  varchar('event_type', { length: 20 }).notNull(), // 'view' | 'download' | 'citation'
  createdAt:  timestamp('created_at').notNull().defaultNow(),
});

// ---- Supporting Tables ----

export const collections = pgTable('collections', {
  userId:     uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  researchId: uuid('research_id').notNull().references(() => researches.id, { onDelete: 'cascade' }),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.researchId] }),
}));

export const notifications = pgTable('notifications', {
  id:         uuid('id').primaryKey().defaultRandom(),
  userId:     uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  researchId: uuid('research_id').references(() => researches.id, { onDelete: 'set null' }),
  message:    text('message').notNull(),
  read:       boolean('read').notNull().default(false),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
});

export const pdfRequests = pgTable('pdf_requests', {
  id:              uuid('id').primaryKey().defaultRandom(),
  researchId:      uuid('research_id').notNull().references(() => researches.id, { onDelete: 'cascade' }),
  requesterName:   varchar('requester_name', { length: 255 }).notNull(),
  requesterEmail:  varchar('requester_email', { length: 255 }).notNull(),
  purpose:         text('purpose'),
  status:          varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
});

export const passwordResets = pgTable('password_resets', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  code:      varchar('code', { length: 6 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

**Key simplification from legacy:**
- The legacy had 3 separate tables (`downloads`, `citations`, `views`) each storing individual event rows with a `_count` column always set to 1. The rewrite uses a single `analytics_events` table for the event log (needed for time-series charts) plus denormalized counters on the `researches` table (incremented atomically via `SET count = count + 1`) for fast totals.
- UUIDs replace auto-increment integers — no sequential ID guessing.
- `ON DELETE CASCADE` on junction tables replaces the legacy's manual multi-table deletion logic.
- The `search_vector` column is populated by a PostgreSQL trigger on INSERT/UPDATE, avoiding application-level search indexing.

---

## 4. Backend Features & API Specification (NestJS)

### 4.1 Module Overview

| Module | Responsibility |
|--------|---------------|
| **AuthModule** | Registration, login, token refresh, email verification, password reset |
| **UserModule** | User CRUD, profile management, profile picture upload |
| **ResearchModule** | Research CRUD, file upload/download, approval workflow, privacy |
| **SearchModule** | Full-text search, filtering, pagination |
| **CategoryModule** | Category CRUD |
| **KeywordModule** | Keyword CRUD |
| **AuthorModule** | Author listing, author detail with papers |
| **CollectionModule** | User bookmark/collection management |
| **NotificationModule** | Notification CRUD, mark-as-read |
| **AnalyticsModule** | Event tracking, dashboard aggregations (daily/weekly/monthly) |
| **PdfRequestModule** | PDF access request workflow, email notifications |
| **InstitutionModule** | Institution CRUD |
| **ProgramModule** | Program CRUD |
| **StorageModule** | Cloudflare R2 presigned URL generation (shared service) |
| **EmailModule** | Resend API wrapper (shared service) |

### 4.2 API Endpoints

All endpoints are prefixed with `/api`. Auth-required endpoints are marked with a lock. Admin-only endpoints are marked with a shield.

#### Auth Module (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | - | Register new user. Sends verification email via Resend. |
| GET | `/verify-email` | - | Verify email via signed token in query string. |
| POST | `/login` | - | Authenticate. Returns access + refresh tokens. |
| POST | `/refresh` | - | Exchange refresh token for new access token. |
| POST | `/forgot-password` | - | Send 6-digit reset code to email. |
| POST | `/verify-reset-code` | - | Validate the 6-digit code. Returns a short-lived reset token. |
| POST | `/reset-password` | - | Set new password using reset token. |

#### User Module (`/api/users`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me` | User | Get current user's profile. |
| PATCH | `/me` | User | Update own profile (name, suffix). |
| POST | `/me/profile-picture` | User | Upload profile picture (presigned URL flow). |
| GET | `/:id` | Admin | Get any user by ID. |
| GET | `/` | Admin | List all users with role, institution, program. Paginated. |
| PATCH | `/:id` | Admin | Admin update user (role, institution, program). |
| DELETE | `/:id` | Admin | Delete user. |

#### Research Module (`/api/research`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | User | Create research (metadata only). Returns `{ id }`. |
| POST | `/:id/upload-url` | User | Get presigned R2 upload URL. |
| POST | `/:id/confirm-upload` | User | Confirm upload completed. |
| GET | `/:id` | - | Get single research with authors, keywords, categories. |
| GET | `/` | - | List approved researches. Paginated, filterable. |
| PATCH | `/:id` | User | Update own research metadata (title, abstract). |
| PATCH | `/:id/privacy` | User | Toggle file privacy (public/private). |
| DELETE | `/:id` | User | Delete own research (cascades). |
| PATCH | `/:id/approve` | Admin | Approve pending research. |
| PATCH | `/:id/reject` | Admin | Reject with reason. Creates notification for uploader. |
| GET | `/pending` | Admin | List all pending researches. |
| GET | `/my` | User | List current user's researches (any status). |
| GET | `/:id/pdf` | - | Get presigned download URL (respects file_privacy). |
| POST | `/:id/view` | - | Track view event. |
| POST | `/:id/download` | - | Track download event. |
| POST | `/:id/cite` | - | Track citation event. |

#### Search Module (`/api/search`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | - | Full-text search with `q`, `category`, `keyword`, `author`, `dateFrom`, `dateTo`, `sort`, `page`, `limit`. |
| GET | `/suggestions` | - | Autocomplete suggestions based on partial query (pg_trgm similarity). |

#### Category Module (`/api/categories`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | - | List all categories with research count. |
| GET | `/:id` | - | Get category with its researches. Paginated. |
| POST | `/` | Admin | Create category. |
| PATCH | `/:id` | Admin | Update category name. |
| DELETE | `/:id` | Admin | Delete category. |

#### Keyword Module (`/api/keywords`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | - | List all keywords. |
| POST | `/` | Admin | Create keyword. |
| PATCH | `/:id` | Admin | Update keyword. |
| DELETE | `/:id` | Admin | Delete keyword. |

#### Author Module (`/api/authors`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | - | List authors with paper count. Paginated, searchable. |
| GET | `/:id` | - | Get author detail. |
| GET | `/:id/papers` | - | Get author's approved papers. Paginated. |

#### Collection Module (`/api/collections`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | User | Get current user's collection. |
| POST | `/` | User | Add research to collection `{ researchId }`. |
| DELETE | `/:researchId` | User | Remove from collection. |

#### Notification Module (`/api/notifications`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | User | Get current user's notifications. Paginated. |
| PATCH | `/read-all` | User | Mark all as read. |
| GET | `/unread-count` | User | Get count of unread notifications. |

#### Analytics Module (`/api/analytics`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/overview` | Admin | Total researches, users, downloads, citations, views. |
| GET | `/admin/trends` | Admin | Time-series data (daily/weekly/monthly) with `period` and `metric` query params. |
| GET | `/admin/uploads-by-role` | Admin | Upload counts grouped by user role. |
| GET | `/user/overview` | User | Current user's totals (own research stats). |
| GET | `/user/trends` | User | Current user's time-series data. |

#### PDF Request Module (`/api/pdf-requests`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | - | Submit a PDF request `{ researchId, name, email, purpose }`. Emails authors. |
| GET | `/my` | User | List PDF requests for current user's researches. |
| POST | `/:id/approve` | User | Approve request. Sends PDF download link via Resend. |
| POST | `/:id/reject` | User | Reject request. Sends rejection email. |

#### Institution Module (`/api/institutions`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | - | List all institutions. |
| POST | `/` | Admin | Create institution. |
| PATCH | `/:id` | Admin | Update institution. |
| DELETE | `/:id` | Admin | Delete institution. |

#### Program Module (`/api/programs`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | - | List all programs. |
| POST | `/` | Admin | Create program. |
| PATCH | `/:id` | Admin | Update program. |
| DELETE | `/:id` | Admin | Delete program. |

**Key simplification from legacy:** The legacy had 80+ endpoints across 29 route files with inconsistent naming (`/total/citations`, `/total/citations/:research_id`, `/user/daily/citations/:research_id`, `/user/weekly/citations/:research_id`, `/user/monthly/citations/:research_id` — 5 endpoints for citation data alone). The rewrite collapses these into parameterized endpoints: `/api/analytics/admin/trends?period=daily&metric=citations` handles all granularities.

---

## 5. Required Pages & UI Flow (Next.js)

### 5.1 Public Routes (no auth required)

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home / Search | Search bar with autocomplete, featured/recent researches. Landing page. |
| `/search` | Search Results | Paginated results with filters (category, date range, author). Sort by relevance/date. |
| `/research/[id]` | Research Detail | Title, abstract, authors, keywords, categories, view/download/cite counts. PDF viewer (if public). Request PDF button (if private). |
| `/authors` | Authors Directory | Alphabetical list with paper counts. Search/filter. |
| `/authors/[id]` | Author Profile | Author info, list of their approved papers. |
| `/categories` | Categories | Grid/list of categories with paper counts. |
| `/categories/[id]` | Category Detail | Category name + paginated list of papers in that category. |
| `/login` | Login | Email/password form. Link to register and forgot password. |
| `/register` | Register | Multi-field form: name, email, password, role selection, institution, program. |
| `/verify-email` | Email Verification | Token validation landing page. Success/error state. |
| `/forgot-password` | Forgot Password | Step 1: enter email. Step 2: enter 6-digit code. Step 3: new password. |

### 5.2 Authenticated User Routes (role: user or guest)

| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | User Dashboard | Overview cards (total papers, views, downloads, citations). Trend charts (daily/weekly/monthly toggle). |
| `/dashboard/papers` | My Papers | Table of user's uploaded papers with status badges (pending/approved/rejected). |
| `/dashboard/collections` | My Collections | Bookmarked/saved papers. Remove button. |
| `/dashboard/notifications` | Notifications | List with read/unread state. Click to view detail. |
| `/dashboard/pdf-requests` | PDF Requests | Incoming requests for user's private papers. Approve/reject actions. |
| `/dashboard/settings` | Account Settings | Edit name, change password, upload profile picture. |
| `/upload` | Upload Research | Multi-step form: metadata → file upload → confirmation. |

### 5.3 Admin Routes (role: admin)

| Route | Page | Description |
|-------|------|-------------|
| `/admin` | Admin Dashboard | System-wide stats (total users, papers, downloads, citations, views). Trend charts. Uploads by role. |
| `/admin/research` | Manage Research | Table of all papers (all statuses). Approve/reject actions. Search + filter. |
| `/admin/users` | Manage Users | User table with role, institution, program. Edit/delete actions. |
| `/admin/categories` | Manage Categories | CRUD table for categories. |
| `/admin/keywords` | Manage Keywords | CRUD table for keywords. |
| `/admin/institutions` | Manage Institutions | CRUD table for institutions. |
| `/admin/programs` | Manage Programs | CRUD table for programs. |

### 5.4 Navigation Flow

```
                    ┌─────────┐
                    │  Home   │
                    │ (Search)│
                    └────┬────┘
              ┌──────────┼──────────┐
              ▼          ▼          ▼
        ┌──────────┐ ┌────────┐ ┌──────────┐
        │ Authors  │ │ Search │ │Categories│
        └────┬─────┘ │Results │ └────┬─────┘
             ▼       └───┬────┘      ▼
        ┌──────────┐     │     ┌──────────┐
        │ Author   │     ▼     │ Category │
        │ Profile  │ ┌──────┐  │ Detail   │
        └──────────┘ │Detail│  └──────────┘
                     └──┬───┘
                        │ (if private)
                        ▼
                  ┌───────────┐
                  │Request PDF│
                  └───────────┘

  Logged-in user sees:
        ┌───────────┐
        │ Dashboard │──→ Papers | Collections | Notifications
        └───────────┘           | PDF Requests | Settings

  Admin sees (additional):
        ┌───────────────┐
        │Admin Dashboard│──→ Research | Users | Categories
        └───────────────┘    Keywords | Institutions | Programs
```

---

## 6. Folder Architecture

**Recommendation: Monorepo using Turborepo.** Both apps share the Drizzle schema and TypeScript types. A monorepo avoids type drift and simplifies CI/CD.

```
nexus/
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── public/
│   │   │   └── assets/               # Static images, logos
│   │   ├── src/
│   │   │   ├── app/                   # Next.js App Router
│   │   │   │   ├── (public)/          # Route group: no auth layout
│   │   │   │   │   ├── page.tsx                # Home / Search
│   │   │   │   │   ├── search/page.tsx
│   │   │   │   │   ├── research/[id]/page.tsx
│   │   │   │   │   ├── authors/page.tsx
│   │   │   │   │   ├── authors/[id]/page.tsx
│   │   │   │   │   ├── categories/page.tsx
│   │   │   │   │   ├── categories/[id]/page.tsx
│   │   │   │   │   ├── login/page.tsx
│   │   │   │   │   ├── register/page.tsx
│   │   │   │   │   ├── verify-email/page.tsx
│   │   │   │   │   └── forgot-password/page.tsx
│   │   │   │   ├── (dashboard)/       # Route group: auth required
│   │   │   │   │   ├── layout.tsx              # Sidebar layout
│   │   │   │   │   ├── dashboard/page.tsx
│   │   │   │   │   ├── dashboard/papers/page.tsx
│   │   │   │   │   ├── dashboard/collections/page.tsx
│   │   │   │   │   ├── dashboard/notifications/page.tsx
│   │   │   │   │   ├── dashboard/pdf-requests/page.tsx
│   │   │   │   │   ├── dashboard/settings/page.tsx
│   │   │   │   │   └── upload/page.tsx
│   │   │   │   ├── (admin)/           # Route group: admin role required
│   │   │   │   │   ├── layout.tsx              # Admin sidebar layout
│   │   │   │   │   ├── admin/page.tsx
│   │   │   │   │   ├── admin/research/page.tsx
│   │   │   │   │   ├── admin/users/page.tsx
│   │   │   │   │   ├── admin/categories/page.tsx
│   │   │   │   │   ├── admin/keywords/page.tsx
│   │   │   │   │   ├── admin/institutions/page.tsx
│   │   │   │   │   └── admin/programs/page.tsx
│   │   │   │   ├── layout.tsx         # Root layout (Navbar, providers)
│   │   │   │   └── not-found.tsx
│   │   │   ├── components/
│   │   │   │   ├── ui/                # Reusable primitives (Button, Input, Modal, Card, Table, Badge)
│   │   │   │   ├── forms/             # Form components (SearchForm, UploadForm, LoginForm)
│   │   │   │   ├── layout/            # Navbar, Footer, Sidebar, AdminSidebar
│   │   │   │   └── features/          # Domain components (ResearchCard, AuthorCard, AnalyticsChart)
│   │   │   ├── lib/
│   │   │   │   ├── api.ts             # Centralized API client (axios instance with base URL + interceptors)
│   │   │   │   ├── auth.ts            # Token management, auth context/provider
│   │   │   │   └── utils.ts           # Formatting helpers
│   │   │   ├── hooks/                 # Custom React hooks (useAuth, useDebounce, usePagination)
│   │   │   └── types/                 # Frontend-specific types
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                           # NestJS backend
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   │   ├── auth.module.ts
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   ├── strategies/          # JWT strategy
│       │   │   │   ├── guards/              # AuthGuard, RolesGuard
│       │   │   │   ├── decorators/          # @Roles(), @CurrentUser()
│       │   │   │   └── dto/                 # LoginDto, RegisterDto, etc.
│       │   │   ├── user/
│       │   │   │   ├── user.module.ts
│       │   │   │   ├── user.controller.ts
│       │   │   │   ├── user.service.ts
│       │   │   │   └── dto/
│       │   │   ├── research/
│       │   │   │   ├── research.module.ts
│       │   │   │   ├── research.controller.ts
│       │   │   │   ├── research.service.ts
│       │   │   │   └── dto/
│       │   │   ├── search/
│       │   │   │   ├── search.module.ts
│       │   │   │   ├── search.controller.ts
│       │   │   │   └── search.service.ts
│       │   │   ├── category/
│       │   │   ├── keyword/
│       │   │   ├── author/
│       │   │   ├── collection/
│       │   │   ├── notification/
│       │   │   ├── analytics/
│       │   │   ├── pdf-request/
│       │   │   ├── institution/
│       │   │   └── program/
│       │   ├── common/
│       │   │   ├── storage/                  # R2 service (presigned URLs)
│       │   │   │   ├── storage.module.ts
│       │   │   │   └── storage.service.ts
│       │   │   ├── email/                    # Resend service
│       │   │   │   ├── email.module.ts
│       │   │   │   └── email.service.ts
│       │   │   ├── filters/                  # Global exception filters
│       │   │   ├── pipes/                    # Global validation pipes
│       │   │   └── interceptors/             # Logging, transform
│       │   ├── database/
│       │   │   ├── database.module.ts
│       │   │   └── drizzle.provider.ts       # Drizzle connection setup
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── drizzle.config.ts
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   └── database/                      # Shared Drizzle schema package
│       ├── src/
│       │   ├── schema/                # Table definitions (the schema from Section 3.4)
│       │   │   ├── users.ts
│       │   │   ├── researches.ts
│       │   │   ├── authors.ts
│       │   │   ├── categories.ts
│       │   │   ├── keywords.ts
│       │   │   ├── analytics.ts
│       │   │   ├── collections.ts
│       │   │   ├── notifications.ts
│       │   │   ├── pdf-requests.ts
│       │   │   ├── institutions.ts
│       │   │   ├── programs.ts
│       │   │   └── index.ts           # Re-exports all schemas
│       │   ├── migrations/            # Drizzle-kit generated SQL migrations
│       │   └── seed.ts                # Seed script for dev data
│       ├── drizzle.config.ts
│       ├── tsconfig.json
│       └── package.json
│
├── turbo.json                         # Turborepo pipeline config
├── package.json                       # Root workspace
├── pnpm-workspace.yaml
├── .env.example                       # Template for all env vars
├── docker-compose.yml                 # PostgreSQL for local dev
└── CLAUDE.md
```

**Environment variables** (defined in `.env`, no more hardcoded secrets):

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/nexus

# Auth
JWT_ACCESS_SECRET=<random-64-char>
JWT_REFRESH_SECRET=<random-64-char>

# Cloudflare R2
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<r2-access-key>
R2_SECRET_ACCESS_KEY=<r2-secret-key>
R2_BUCKET_NAME=nexus-pdfs
R2_PUBLIC_URL=https://<bucket>.r2.dev

# Resend
RESEND_API_KEY=re_<key>
EMAIL_FROM=noreply@yourdomain.com

# App
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:3001
```

---

## 7. Figma Wireframe Specifications

Structural guide for each page. Lists required UI elements, not visual design decisions.

### 7.1 Public Pages

#### Home / Search (`/`)

```
┌──────────────────────────────────────────┐
│ Navbar: Logo | Search | Authors |        │
│         Categories | [Sign In]           │
├──────────────────────────────────────────┤
│                                          │
│  [Hero Section]                          │
│   Large search bar (centered)            │
│   Placeholder: "Search by title,         │
│   author, keyword..."                    │
│   [Search Button] [Voice Search Button]  │
│                                          │
│  Autocomplete dropdown (on type):        │
│   - Research title (bold match)          │
│   - Author name                          │
│   - "See all results" link               │
│                                          │
├──────────────────────────────────────────┤
│  [Recent / Featured Research]            │
│   Grid of ResearchCards (3-4 per row):   │
│   ┌─────────────────────┐               │
│   │ Title               │               │
│   │ Authors (truncated)  │               │
│   │ Category badge       │               │
│   │ Date | Views | DLs   │               │
│   └─────────────────────┘               │
├──────────────────────────────────────────┤
│ Footer: Links | Copyright                │
└──────────────────────────────────────────┘
```

**Components:** Navbar, SearchBar (with autocomplete dropdown), HeroSection, ResearchCard (grid), Footer

#### Search Results (`/search`)

```
┌──────────────────────────────────────────┐
│ Navbar (with embedded search bar)        │
├────────────┬─────────────────────────────┤
│ Filters    │ Results                     │
│            │                             │
│ Category   │ "X results for 'query'"     │
│ [dropdown] │ Sort: [Relevance|Date|...]  │
│            │                             │
│ Date Range │ ┌───────────────────────┐   │
│ [from][to] │ │ Title (highlighted)   │   │
│            │ │ Authors               │   │
│ Author     │ │ Abstract snippet...   │   │
│ [search]   │ │ Category | Date       │   │
│            │ │ Views | Downloads     │   │
│ [Apply]    │ └───────────────────────┘   │
│ [Clear]    │ (repeat for each result)    │
│            │                             │
│            │ [Pagination: < 1 2 3 ... >] │
└────────────┴─────────────────────────────┘
```

**Components:** Navbar (compact search), FilterSidebar (CategoryFilter, DateRangePicker, AuthorSearch), SearchResultCard (list), PaginationBar

#### Research Detail (`/research/[id]`)

```
┌──────────────────────────────────────────┐
│ Navbar                                   │
├──────────────────────────────────────────┤
│                                          │
│ [Back to results]                        │
│                                          │
│ Title (h1)                               │
│ Authors: Name1, Name2 (linked)           │
│ Published: Jan 2024                      │
│ Categories: [Badge1] [Badge2]            │
│ Keywords: [Badge] [Badge] [Badge]        │
│                                          │
│ ┌────────────────────────────────────┐   │
│ │ Stats bar:                          │   │
│ │ Views: 123 | Downloads: 45 |       │   │
│ │ Citations: 12                       │   │
│ └────────────────────────────────────┘   │
│                                          │
│ [Download PDF] [Cite] [Add to Collection]│
│ (if private: [Request PDF] instead of DL)│
│                                          │
│ Abstract                                 │
│ ────────────                             │
│ Full abstract text...                    │
│                                          │
│ ┌────────────────────────────────────┐   │
│ │ PDF Viewer (embedded, if public)    │   │
│ └────────────────────────────────────┘   │
│                                          │
│ Citation Generator                       │
│ Format: [APA|MLA|Chicago|IEEE] dropdown  │
│ [Generated citation text]                │
│ [Copy to clipboard]                      │
│                                          │
└──────────────────────────────────────────┘
```

**Components:** BackLink, ResearchHeader, StatsBadgeRow, ActionButtons (Download/Cite/Collect/Request), AbstractSection, PdfViewer (iframe with presigned URL), CitationGenerator (format selector + output + copy)

#### Authors Directory (`/authors`)

```
┌──────────────────────────────────────────┐
│ Navbar                                   │
├──────────────────────────────────────────┤
│ Authors                                  │
│ Search: [________________] [Search]      │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ Name          │ Papers │ Email       │ │
│ ├──────────────────────────────────────┤ │
│ │ Author Name   │   5    │ a@b.com    │ │
│ │ Author Name   │   3    │ c@d.com    │ │
│ │ ...           │  ...   │ ...        │ │
│ └──────────────────────────────────────┘ │
│ [Pagination]                             │
└──────────────────────────────────────────┘
```

**Components:** SearchInput, DataTable (sortable columns), PaginationBar

#### Author Profile (`/authors/[id]`)

```
┌──────────────────────────────────────────┐
│ Navbar                                   │
├──────────────────────────────────────────┤
│ [Back to Authors]                        │
│                                          │
│ Author Name (h1)                         │
│ Email: author@email.com                  │
│ Papers: 5                                │
│                                          │
│ Published Research                       │
│ (ResearchCard list, same as search       │
│  results but filtered by this author)    │
│ [Pagination]                             │
└──────────────────────────────────────────┘
```

**Components:** BackLink, AuthorHeader, ResearchCard (list), PaginationBar

#### Login (`/login`)

```
┌──────────────────────────────────────────┐
│ Navbar                                   │
├──────────────────────────────────────────┤
│        ┌────────────────────┐            │
│        │ Sign In            │            │
│        │                    │            │
│        │ Email: [________]  │            │
│        │ Password: [_____]  │            │
│        │                    │            │
│        │ [Sign In Button]   │            │
│        │                    │            │
│        │ Forgot password?   │            │
│        │ Don't have account?│            │
│        │ Register           │            │
│        └────────────────────┘            │
└──────────────────────────────────────────┘
```

**Components:** FormCard, EmailInput, PasswordInput, SubmitButton, LinkText

#### Register (`/register`)

```
┌──────────────────────────────────────────┐
│ Navbar                                   │
├──────────────────────────────────────────┤
│        ┌────────────────────┐            │
│        │ Create Account     │            │
│        │                    │            │
│        │ First Name: [____] │            │
│        │ Middle Name: [___] │            │
│        │ Last Name: [_____] │            │
│        │ Suffix: [________] │            │
│        │ Email: [_________] │            │
│        │ Password: [______] │            │
│        │ Confirm: [_______] │            │
│        │                    │            │
│        │ I am a:            │            │
│        │ ( ) NCF Student    │            │
│        │ ( ) External       │            │
│        │                    │            │
│        │ Institution:       │            │
│        │ [dropdown/create]  │            │
│        │ Program:           │            │
│        │ [dropdown/create]  │            │
│        │                    │            │
│        │ [Register Button]  │            │
│        │ Already have acct? │            │
│        └────────────────────┘            │
└──────────────────────────────────────────┘
```

**Components:** FormCard, TextInput (x5), PasswordInput (x2), RadioGroup (role), ComboboxSelect (institution, program — allows typing new), SubmitButton, LinkText

#### Forgot Password (`/forgot-password`)

```
Step 1: Enter email → [Send Code]
Step 2: Enter 6-digit code → [Verify]
Step 3: New password + confirm → [Reset Password]
(3-step wizard with progress indicator)
```

**Components:** StepWizard (3 steps), EmailInput, CodeInput (6-digit), PasswordInput (x2), SubmitButton

### 7.2 Dashboard Pages (Authenticated)

#### User Dashboard (`/dashboard`)

```
┌────────┬─────────────────────────────────┐
│Sidebar │ Dashboard                       │
│        │                                 │
│ Dash   │ ┌──────┐┌──────┐┌──────┐┌────┐│
│ Papers │ │Papers││Views ││DLs   ││Cit.││
│ Coll.  │ │  12  ││ 340  ││  89  ││ 23 ││
│ Notif. │ └──────┘└──────┘└──────┘└────┘│
│ PDF Req│                                 │
│ Sett.  │ [Daily | Weekly | Monthly] tabs │
│        │ ┌─────────────────────────────┐ │
│ Logout │ │  Line chart (views/DLs/cit  │ │
│        │ │  over time, toggleable)     │ │
│        │ └─────────────────────────────┘ │
└────────┴─────────────────────────────────┘
```

**Components:** DashboardSidebar, StatCard (x4), PeriodTabs (daily/weekly/monthly), LineChart (react-chartjs-2 or recharts), MetricToggle

#### My Papers (`/dashboard/papers`)

```
┌────────┬─────────────────────────────────┐
│Sidebar │ My Papers          [Upload New] │
│        │                                 │
│        │ Filter: [All|Pending|Approved|  │
│        │          Rejected]              │
│        │                                 │
│        │ ┌────────────────────────────┐  │
│        │ │Title │Status │Date │Actions│  │
│        │ ├────────────────────────────┤  │
│        │ │Paper1│✓ Appr│01/24│[View] │  │
│        │ │Paper2│⏳ Pend│02/24│[Edit] │  │
│        │ │Paper3│✗ Rej │03/24│[View] │  │
│        │ │      │      │     │[Delete]│ │
│        │ └────────────────────────────┘  │
│        │ [Pagination]                    │
└────────┴─────────────────────────────────┘
```

**Components:** DashboardSidebar, StatusFilterTabs, DataTable (sortable: title, status badge, date, action buttons), PaginationBar, UploadButton (links to /upload)

#### Upload Research (`/upload`)

```
┌────────┬─────────────────────────────────┐
│Sidebar │ Upload Research                 │
│        │                                 │
│        │ Step 1 of 2: Metadata           │
│        │ ───────────────────             │
│        │ Title: [________________________]│
│        │ Abstract: [textarea____________]│
│        │                                 │
│        │ Authors (add multiple):         │
│        │ Name: [______] Email: [______]  │
│        │ [+ Add Author]                  │
│        │ - Author 1 (a@b.com) [×]       │
│        │ - Author 2 (c@d.com) [×]       │
│        │                                 │
│        │ Categories: [multi-select]      │
│        │ Keywords: [tag input]           │
│        │                                 │
│        │ [Next →]                        │
│        │                                 │
│        │ Step 2 of 2: Upload PDF         │
│        │ ───────────────────             │
│        │ ┌──────────────────────────┐    │
│        │ │  Drop PDF here or click  │    │
│        │ │  to browse               │    │
│        │ │  (Max 50MB, PDF only)    │    │
│        │ └──────────────────────────┘    │
│        │ [Upload progress bar]           │
│        │                                 │
│        │ [← Back] [Submit for Review]    │
└────────┴─────────────────────────────────┘
```

**Components:** StepIndicator (2 steps), TextInput, TextArea, AuthorInputGroup (repeatable name+email pair), MultiSelect (categories), TagInput (keywords), FileDropzone (react-dropzone, PDF only), ProgressBar, StepNavigation

#### My Collections (`/dashboard/collections`)

```
┌────────┬─────────────────────────────────┐
│Sidebar │ My Collections                  │
│        │                                 │
│        │ ┌───────────────────────────┐   │
│        │ │ Title                     │   │
│        │ │ Authors | Category        │   │
│        │ │ [View] [Remove]           │   │
│        │ └───────────────────────────┘   │
│        │ (repeat)                        │
│        │ [Pagination]                    │
└────────┴─────────────────────────────────┘
```

**Components:** DashboardSidebar, CollectionCard (title, authors, category, view link, remove button), PaginationBar, EmptyState

#### Notifications (`/dashboard/notifications`)

```
┌────────┬─────────────────────────────────┐
│Sidebar │ Notifications     [Mark all     │
│        │                    as read]      │
│        │                                 │
│        │ ● Your research "Title" has     │
│        │   been approved.        2h ago  │
│        │                                 │
│        │ ○ Your research "Title" has     │
│        │   been rejected. Reason:...     │
│        │                         1d ago  │
│        │                                 │
│        │ (● = unread, ○ = read)          │
│        │ [Pagination]                    │
└────────┴─────────────────────────────────┘
```

**Components:** DashboardSidebar, NotificationItem (unread indicator, message, timestamp, click to expand), MarkAllReadButton, PaginationBar

#### PDF Requests (`/dashboard/pdf-requests`)

```
┌────────┬─────────────────────────────────┐
│Sidebar │ PDF Requests                    │
│        │                                 │
│        │ ┌────────────────────────────┐  │
│        │ │Paper │Requester│Purpose│Act│  │
│        │ ├────────────────────────────┤  │
│        │ │Title │J. Doe   │Thesis │✓✗ │  │
│        │ │      │j@e.com  │       │   │  │
│        │ └────────────────────────────┘  │
│        │ (repeat)                        │
└────────┴─────────────────────────────────┘
```

**Components:** DashboardSidebar, DataTable (paper title, requester name/email, purpose text, Approve/Reject icon buttons), EmptyState

#### Account Settings (`/dashboard/settings`)

```
┌────────┬─────────────────────────────────┐
│Sidebar │ Account Settings                │
│        │                                 │
│        │ Profile Picture                 │
│        │ [Current pic] [Change]          │
│        │                                 │
│        │ Personal Info                   │
│        │ First Name: [________]          │
│        │ Middle Name: [_______]          │
│        │ Last Name: [_________]          │
│        │ Suffix: [____________]          │
│        │ [Save Changes]                  │
│        │                                 │
│        │ Change Password                 │
│        │ Current: [___________]          │
│        │ New: [_______________]          │
│        │ Confirm: [___________]          │
│        │ [Update Password]              │
└────────┴─────────────────────────────────┘
```

**Components:** DashboardSidebar, AvatarUpload (preview + change button), FormSection (Personal Info: 4 text inputs + save), FormSection (Change Password: 3 password inputs + save)

### 7.3 Admin Pages

#### Admin Dashboard (`/admin`)

```
┌──────────┬───────────────────────────────┐
│Admin     │ Admin Dashboard               │
│Sidebar   │                               │
│          │ ┌──────┐┌──────┐┌──────┐     │
│ Dash     │ │Users ││Papers││DLs   │     │
│ Research │ │  156 ││  89  ││ 1.2k │     │
│ Users    │ └──────┘└──────┘└──────┘     │
│ Categ.   │ ┌──────┐┌──────┐             │
│ Keywords │ │Views ││Cites │             │
│ Instit.  │ │ 4.5k ││ 234  │             │
│ Programs │ └──────┘└──────┘             │
│          │                               │
│ Logout   │ [Daily|Weekly|Monthly] tabs   │
│          │ ┌───────────────────────────┐ │
│          │ │ Multi-line chart          │ │
│          │ │ (Views, DLs, Citations)   │ │
│          │ └───────────────────────────┘ │
│          │                               │
│          │ Uploads by Role               │
│          │ ┌───────────────────────────┐ │
│          │ │ Bar/Pie chart             │ │
│          │ └───────────────────────────┘ │
└──────────┴───────────────────────────────┘
```

**Components:** AdminSidebar, StatCard (x5), PeriodTabs, MultiLineChart, UploaderRoleChart (bar or pie)

#### Manage Research (`/admin/research`)

```
┌──────────┬───────────────────────────────┐
│Admin     │ Manage Research               │
│Sidebar   │                               │
│          │ Filter: [All|Pending|Approved| │
│          │          Rejected]             │
│          │ Search: [________________]     │
│          │                               │
│          │ ┌─────────────────────────┐   │
│          │ │Title│Author│Status│Date│Act│ │
│          │ ├─────────────────────────┤   │
│          │ │...  │...   │Badge │... │✓✗👁││
│          │ └─────────────────────────┘   │
│          │ [Pagination]                  │
└──────────┴───────────────────────────────┘

Approve: one-click action
Reject: opens modal with reason textarea
View: navigates to /research/[id]
```

**Components:** AdminSidebar, StatusFilterTabs, SearchInput, DataTable (title, authors, status badge, date, action icons), RejectModal (textarea + confirm), PaginationBar

#### Manage Users (`/admin/users`)

```
┌──────────┬───────────────────────────────┐
│Admin     │ Manage Users                  │
│Sidebar   │                               │
│          │ Search: [________________]     │
│          │                               │
│          │ ┌──────────────────────────┐  │
│          │ │Name│Email│Role│Inst│Act   │  │
│          │ ├──────────────────────────┤  │
│          │ │... │...  │... │... │✏️🗑️  │ │
│          │ └──────────────────────────┘  │
│          │ [Pagination]                  │
└──────────┴───────────────────────────────┘

Edit: opens modal with role/institution/program dropdowns
Delete: confirmation dialog
```

**Components:** AdminSidebar, SearchInput, DataTable (name, email, role badge, institution, edit/delete icons), EditUserModal (role dropdown, institution dropdown, program dropdown), ConfirmDeleteDialog, PaginationBar

#### Manage Categories / Keywords / Institutions / Programs (`/admin/<entity>`)

All four follow the same pattern:

```
┌──────────┬───────────────────────────────┐
│Admin     │ Manage [Entity]    [+ Add]    │
│Sidebar   │                               │
│          │ ┌──────────────────────────┐  │
│          │ │ Name          │ Actions  │  │
│          │ ├──────────────────────────┤  │
│          │ │ Entity Name   │ ✏️  🗑️   │  │
│          │ └──────────────────────────┘  │
│          │ [Pagination]                  │
└──────────┴───────────────────────────────┘

Add: opens modal with name input
Edit: opens modal with pre-filled name input
Delete: confirmation dialog
```

**Components:** AdminSidebar, DataTable (name, optional count column for categories, edit/delete icons), AddEditModal (single text input), ConfirmDeleteDialog, PaginationBar

---

## Appendix: Legacy → Rewrite Migration Checklist

| Legacy Feature | Legacy Files | Rewrite Location |
|---------------|-------------|-----------------|
| Login/Register | `authRoutes.js`, `userRoutes.js` | `AuthModule`, `UserModule` |
| Email verification | `EmailVerification.js`, `userRoutes.js` | `AuthModule` (verify endpoint) |
| Password reset | `PasswordReset.js` | `AuthModule` (forgot/reset endpoints) |
| Google OAuth | `googleLogin.js`, `googleConfig.js` | **Removed** |
| Research CRUD | `documentRoutes.js`, `filesupdate.js` | `ResearchModule` |
| Research approval | `adminRoutes.js` | `ResearchModule` (approve/reject) |
| PDF upload/view | `documentRoutes.js`, `pdfFILES.js` | `ResearchModule` + `StorageModule` |
| PDF send via email | `SendPaper.js` | `PdfRequestModule` + `EmailModule` |
| File privacy | `FilePrivacy.js` | `ResearchModule` (privacy endpoint) |
| Search (x4 algorithms) | `searchRoutes.js`, `controllers/*` | `SearchModule` (PostgreSQL FTS) |
| Client-side search | `SearchBar.jsx` | `SearchModule` (server-side) |
| Browse by category | `filterRoutes.js`, `categories.js` | `CategoryModule` |
| Browse by keyword | `filterRoutes.js`, `keywords.js` | `KeywordModule` |
| Browse by author | `filterRoutes.js`, `browseRoutes.js` | `AuthorModule` |
| User dashboard | `UserDash.js` | `AnalyticsModule` (user endpoints) |
| Admin dashboard | `adminRoutes.js`, `dashboardRoutes.js` | `AnalyticsModule` (admin endpoints) |
| Collections | `UserDash.js` | `CollectionModule` |
| Notifications | `UserDash.js` | `NotificationModule` |
| PDF requests | `RequestPDFRoutes.js`, `FilePrivacy.js`, `Pdf-request-retrieval.js` | `PdfRequestModule` |
| Profile pictures | `UploadUserPic.js`, `ProfilePicRetrieval.js` | `UserModule` + `StorageModule` |
| Institutions | `InstitutionRoutes.js` | `InstitutionModule` |
| Programs | `Programs.js`, `AuthorsProgram.js` | `ProgramModule` |
| Heartbeat/online users | `HeartBeat.js`, `OnlineUsers.js` | **Removed** (unnecessary complexity) |
| Geolocation | `UserDash.js` (unused/broken) | **Removed** |
| Trending searches | `browseRoutes.js` (log-search) | Deferred (can add later with analytics_events) |
