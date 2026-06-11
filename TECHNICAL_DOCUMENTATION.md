# NCF Research Nexus — Technical Documentation

> **Project**: ncfrepository-backend  
> **Purpose**: Academic research repository backend for Naga College Foundation  
> **Language**: JavaScript (Node.js)  
> **Framework**: Express.js v4.19.2  
> **Database**: MySQL (ncfrepo_new)  
> **File Storage**: Google Drive API v3  
> **Frontend**: https://ccs-research-repository.vercel.app  

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Technology Stack](#2-technology-stack)
3. [Directory Structure](#3-directory-structure)
4. [Database Schema](#4-database-schema)
5. [API Endpoint Reference](#5-api-endpoint-reference)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Data Flow Diagrams](#7-data-flow-diagrams)
8. [Security Vulnerabilities](#8-security-vulnerabilities)
9. [Code Quality Issues](#9-code-quality-issues)
10. [Recommended Rewrite Architecture](#10-recommended-rewrite-architecture)

---

## 1. System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser/React)                         │
│                     http://localhost:3000 (dev)                           │
│               https://ccs-research-repository.vercel.app (prod)          │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │ HTTPS / CORS
                               ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                     EXPRESS.JS SERVER (port 10121)                       │
│                                                                          │
│  ┌──────────────┐  ┌──────────────────┐  ┌────────────────────────────┐  │
│  │  Middleware    │  │    Routes        │  │    Controllers             │  │
│  │  - bodyParser  │  │  70+ endpoints  │  │  - fuseSearch              │  │
│  │  - cors        │  │  (see §5)       │  │  - fuzzballSearch          │  │
│  │  - auth (JWT)  │  │                 │  │  - Levenshtein             │  │
│  └──────────────┘  └──────────────────┘  │  - fuzzySearch (custom)     │  │
│                                            └────────────────────────────┘  │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    INTEGRATION LAYER                                 │  │
│  │  ┌──────────────┐  ┌────────────────┐  ┌────────────────────────┐  │  │
│  │  │ Google Drive  │  │  Nodemailer    │  │  Google OAuth2         │  │  │
│  │  │ (PDF storage, │  │  (Gmail SMTP)  │  │  (Social Login)        │  │  │
│  │  │  profile pics)│  │                │  │                        │  │  │
│  │  └──────────────┘  └────────────────┘  └────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬────────────────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────────┐
                    │     MySQL Database       │
                    │   CloudClusters.net      │
                    │   Database: ncfrepo_new  │
                    │   18+ tables             │
                    └─────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|---|---|
| **Express Server** | HTTP routing, request parsing, response formatting |
| **Auth Middleware** | JWT verification, role checking (imported but not applied) |
| **Route Handlers** | All business logic (no service layer separation) |
| **Controllers** | Search algorithms only (Fuse.js, Fuzzball, Levenshtein) |
| **MySQL** | All persistent data: users, researches, analytics, etc. |
| **Google Drive** | PDF file storage, profile picture storage |
| **Nodemailer** | Email verification, password reset, PDF delivery |

---

## 2. Technology Stack

### Production Dependencies

| Package | Version | Purpose |
|---|---|---|
| `express` | ^4.19.2 | HTTP server & routing |
| `mysql2` | ^3.9.4 | MySQL driver (promise-based pool) |
| `bcrypt` | ^5.1.1 | Password hashing (cost factor 10) |
| `jsonwebtoken` | ^9.0.2 | JWT generation & verification |
| `googleapis` | ^144.0.0 | Google Drive & Gmail API |
| `nodemailer` | ^6.9.15 | Email sending via Gmail SMTP |
| `multer` | ^1.4.5-lts.1 | Multipart form data parsing |
| `fuse.js` | ^7.0.0 | Client-side fuzzy search engine |
| `fuzzball` | ^2.1.2 | Token-based fuzzy string matching |
| `cors` | ^2.8.5 | Cross-Origin Resource Sharing |
| `dotenv` | ^16.4.7 | Environment variable loading |
| `express-validator` | ^7.2.0 | Request input validation (minimally used) |
| `body-parser` | ^1.20.2 | Request body parsing |
| `streamifier` | ^0.1.1 | Buffer-to-stream conversion |
| `axios` | ^1.6.8 | HTTP client (IP geolocation) |
| `jwt-decode` | ^4.0.0 | Client-side JWT decoding |
| `google-auth-library` | ^9.14.0 | Google OAuth verification |

### Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| `nodemon` | ^3.1.0 | Auto-restart on file changes |

### Environment Variables Required

| Variable | Source | Used In |
|---|---|---|
| `JWT_SECRET_KEY` | `authentication/config.js` | JWT signing |
| `GOOGLE_CLIENT_ID` | `.env` / hardcoded fallback | Google OAuth |
| `GOOGLE_TYPE` | `.env` | Service account config |
| `GOOGLE_PROJECT_ID` | `.env` | Service account config |
| `GOOGLE_PRIVATE_KEY_ID` | `.env` | Service account config |
| `GOOGLE_PRIVATE_KEY` | `.env` | Service account config |
| `GOOGLE_CLIENT_EMAIL` | `.env` | Service account config |
| `GOOGLE_CLIENT_ID` | `.env` | Service account config |
| `GOOGLE_AUTH_URI` | `.env` | Service account config |
| `GOOGLE_TOKEN_URI` | `.env` | Service account config |
| `GOOGLE_AUTH_PROVIDER_CERT_URL` | `.env` | Service account config |
| `GOOGLE_CLIENT_CERT_URL` | `.env` | Service account config |
| `GOOGLE_UNIVERSE_DOMAIN` | `.env` | Service account config |
| `EMAIL_USER` | `.env` | Nodemailer auth |
| `EMAIL_PASS` | `.env` | Nodemailer auth |
| `IPINFO_TOKEN` | `.env` | IP geolocation |
| `PORT` | default `10121` | Server port |

---

## 3. Directory Structure

```
nexus-back/
│
├── index.js                              # Main server entry point (142 lines)
│   - Initializes Express
│   - Mounts all route modules (no base paths, flat mounting)
│   - Configures CORS, COOP/COEP headers
│   - Serves static files from ../../uploads
│   - Listens on port 10121
│
├── package.json                          # Dependencies & scripts
├── README.md                             # Minimal project description
├── .gitignore                            # Git ignore rules
│
├── authentication/
│   ├── config.js                         # JWT secret key (fallback: 'Nhel-secret-key')
│   └── middleware.js                     # authenticateToken, isAdmin, isNCFUser, isNotNCFUser
│
├── controllers/
│   ├── googleConfig.js                   # Google service account from env vars
│   ├── generateRefreshToken.js           # OAuth refresh token script (hardcoded secrets)
│   ├── fuseSearch.js                     # Fuse.js fuzzy search
│   ├── fuzzballSearch.js                 # Fuzzball fuzzy search
│   ├── fuzzySearch.js                    # Custom Levenshtein distance search
│   └── Levenshtein.js                    # Levenshtein distance search (different impl)
│
├── database/
│   └── db.js                             # MySQL connection pool (hardcoded credentials)
│
├── model/
│   └── database.txt                      # Placeholder file
│
├── routes/
│   ├── authRoutes.js                     # POST /login
│   ├── userRoutes.js                     # POST /register, user CRUD, programs
│   ├── roleRoutes.js                     # GET /roles/all, /roles/:role_id
│   ├── documentRoutes.js                 # POST /upload (Google Drive), DELETE research
│   ├── adminRoutes.js                    # Approve/reject, analytics, admin user mgmt (678 lines)
│   ├── searchRoutes.js                   # Search routing to controllers
│   ├── filterRoutes.js                   # Browse by category/keyword/author
│   ├── dashboardRoutes.js                # Top downloads, trending, log search
│   ├── categories.js                     # Categories CRUD
│   ├── keywords.js                       # Keywords CRUD
│   ├── googleLogin.js                    # POST /google-login
│   ├── PasswordReset.js                  # Password reset with 6-digit codes
│   ├── EmailVerification.js              # GET /verify-email
│   ├── pdfFILES.js                       # GET /pdf/:research_id (stream from Drive)
│   ├── Pdf-request-retrieval.js          # GET /user/pdf-requests/:userId
│   ├── RequestPDFRoutes.js               # POST /request-pdf-files, reject
│   ├── FilePrivacy.js                    # PUT privacy, POST /request-pdf
│   ├── filesupdate.js                    # POST /research/:id/upload (replace file)
│   ├── SendPaper.js                      # POST /send-pdf/:research_id
│   ├── UserDash.js                       # Notifications, collections, user stats (540 lines)
│   ├── InstitutionRoutes.js              # Institutions CRUD
│   ├── Programs.js                       # DUPLICATE of roleRoutes.js
│   │
│   ├── Authors/
│   │   ├── AuthorsProgram.js             # GET /program/authors/:authorId
│   │   └── authorsProfilepic.js          # GET /profilepic/authors/:authorId
│   │
│   └── Content Filtering/
│       ├── browseRoutes.js               # DUPLICATE browse endpoints
│       ├── UploadUserPic.js              # POST /upload-profile-pic (Google Drive)
│       ├── ProfilePicRetrieval.js        # GET /profile-picture/:user_id
│       ├── HeartBeat.js                  # POST heartbeat, GET online users, POST logout
│       └── mostRoutes.js                 # GET /most-cited, /most-downloaded, /most-viewed
│
└── routes/uploads/documents/             # Local PDF cache (not actively used)
```

---

## 4. Database Schema

### Table: `users`

| Column | Type | Notes |
|---|---|---|
| user_id | INT (PK, AUTO_INCREMENT) | |
| first_name | VARCHAR | Required |
| middle_name | VARCHAR | Nullable |
| last_name | VARCHAR | Required |
| suffix | VARCHAR | Nullable |
| email | VARCHAR (UNIQUE) | Required |
| password | VARCHAR | bcrypt hash, nullable (Google accounts) |
| role_id | INT (FK → roles) | 1=Admin, 2=NCF User, 3=Non-NCF |
| program_id | INT (FK → program) | Nullable |
| institution_id | INT (FK → institution) | |
| verification | VARCHAR | 'verified' or NULL |
| profile_picture | VARCHAR | Google Drive file ID |
| last_active | DATETIME | Heartbeat timestamp |

### Table: `roles`

| Column | Type | Values |
|---|---|---|
| role_id | INT (PK) | 1, 2, 3 |
| role_name | VARCHAR | Admin, NCF User, Non-NCF User |

### Table: `researches`

| Column | Type | Notes |
|---|---|---|
| research_id | INT (PK, AUTO_INCREMENT) | |
| title | VARCHAR | Unique |
| publish_date | DATETIME | |
| abstract | TEXT | |
| filename | VARCHAR | Original filename |
| uploader_id | INT (FK → users) | |
| status | VARCHAR | pending, approved, rejected |
| file_id | VARCHAR | Google Drive file ID |
| file_privacy | VARCHAR | public, private |
| viewCount | INT | Total views |

### Table: `authors`

| Column | Type |
|---|---|
| author_id | INT (PK, AUTO_INCREMENT) |
| author_name | VARCHAR |
| email | VARCHAR |

### Table: `research_authors` (Junction)

| Column | Type |
|---|---|
| research_id | INT (FK → researches) |
| author_id | INT (FK → authors) |

### Table: `category`

| Column | Type |
|---|---|
| category_id | INT (PK, AUTO_INCREMENT) |
| category_name | VARCHAR |

### Table: `research_categories` (Junction)

| Column | Type |
|---|---|
| research_id | INT (FK → researches) |
| category_id | INT (FK → category) |

### Table: `keywords`

| Column | Type |
|---|---|
| keyword_id | INT (PK, AUTO_INCREMENT) |
| keyword_name | VARCHAR |

### Table: `research_keywords` (Junction)

| Column | Type |
|---|---|
| research_id | INT (FK → researches) |
| keyword_id | INT (FK → keywords) |

### Table: `program`

| Column | Type |
|---|---|
| program_id | INT (PK, AUTO_INCREMENT) |
| program_name | VARCHAR |

### Table: `institution`

| Column | Type |
|---|---|
| institution_id | INT (PK, AUTO_INCREMENT) |
| institution_name | VARCHAR |

### Table: `notifications`

| Column | Type |
|---|---|
| notification_id | INT (PK, AUTO_INCREMENT) |
| user_id | INT (FK → users) |
| research_id | INT (FK → researches, nullable) |
| message | TEXT |
| opened | TINYINT (0/1) |
| created_at | DATETIME |

### Table: `collections`

| Column | Type |
|---|---|
| user_id | INT (FK → users) |
| research_id | INT (FK → researches) |

### Table: `downloads`

| Column | Type |
|---|---|
| download_id | INT (PK, AUTO_INCREMENT) |
| research_id | INT (FK → researches) |
| download_count | INT |
| datetime | DATETIME |

### Table: `citations`

| Column | Type |
|---|---|
| citation_id | INT (PK, AUTO_INCREMENT) |
| research_id | INT (FK → researches) |
| citation_count | INT |
| datetime | DATETIME |

### Table: `views`

| Column | Type |
|---|---|
| view_id | INT (PK, AUTO_INCREMENT) |
| research_id | INT (FK → researches) |
| view_count | INT |
| datetime | DATETIME |

### Table: `search_logs`

| Column | Type |
|---|---|
| search_id | INT (PK, AUTO_INCREMENT) |
| research_id | INT (FK → researches) |

### Table: `pdf_requests`

| Column | Type |
|---|---|
| request_id | INT (PK, AUTO_INCREMENT) |
| research_id | INT (FK → researches) |
| research_title | VARCHAR |
| requester_name | VARCHAR |
| requester_email | VARCHAR |
| purpose | TEXT |
| status | VARCHAR (default: pending) |
| created_at | DATETIME |

### Table: `password_resets`

| Column | Type |
|---|---|
| user_id | INT (FK → users) |
| code | VARCHAR (6-digit) |
| expires | DATETIME |

---

## 5. API Endpoint Reference

### 5.1 Authentication

| Method | Endpoint | Auth | Request | Response | File |
|---|---|---|---|---|---|
| POST | `/login` | No | `{ email, password }` | `{ token, userId, firstName, lastName, verification }` | `authRoutes.js` |
| POST | `/google-login` | No | `{ id_token }` | `{ token, userId, roleId, userExists }` | `googleLogin.js` |
| GET | `/verify-email?token=` | No | Query: `token` (JWT) | `{ message }` | `EmailVerification.js` |
| POST | `/register` | No | `{ first_name, last_name, email, role_id, ... }` | `{ message }` | `userRoutes.js` |
| POST | `/request-password-reset` | No | `{ email }` | `{ message }` | `PasswordReset.js` |
| POST | `/verify-code` | No | `{ code }` | `{ message, userId }` | `PasswordReset.js` |
| POST | `/reset-password` | No | `{ email, code, newPassword }` | `{ message }` | `PasswordReset.js` |

### 5.2 User Management

| Method | Endpoint | Auth | Description | File |
|---|---|---|---|---|
| GET | `/users/all` | **No** | All users (⚠ exposes password hashes) | `userRoutes.js` |
| GET | `/users/:user_id` | No | Single user | `userRoutes.js` |
| PUT | `/users/update/:userId` | No | Update name/suffix | `userRoutes.js` |
| DELETE | `/users/delete/:userId` | No | Delete user | `userRoutes.js` |
| GET | `/admin/users/all` | No | All users w/ details (⚠ exposes passwords) | `adminRoutes.js` |
| PUT | `/admin/update/:userId` | No | Admin update user | `adminRoutes.js` |
| GET | `/roles/all` | No | List roles | `roleRoutes.js` |
| GET | `/roles/:role_id` | No | Single role | `roleRoutes.js` |
| GET | `/programs/all` | No | List programs | `userRoutes.js` |

### 5.3 Research Documents

| Method | Endpoint | Auth | Description | File |
|---|---|---|---|---|
| POST | `/upload` | No | Upload PDF + metadata to Google Drive | `documentRoutes.js` |
| DELETE | `/delete-research/:research_id` | No | Delete research | `documentRoutes.js` |
| PATCH | `/research/approve/:research_id` | No | Approve (sets status=approved) | `adminRoutes.js` |
| PATCH | `/research/reject/:research_id` | No | Reject with reason + notification | `adminRoutes.js` |
| GET | `/research/:research_id` | No | Full research details w/ authors, keywords, categories | `adminRoutes.js` |
| GET | `/researches` | No | All approved researches with download/cite/view stats | `adminRoutes.js` |
| GET | `/dash/researches` | No | All researches (any status) for dashboard | `adminRoutes.js` |
| GET | `/researches/rejected` | No | Rejected researches | `adminRoutes.js` |
| PUT | `/research/:researchId/abstract` | No | Update abstract | `UserDash.js` |

### 5.4 File Operations

| Method | Endpoint | Auth | Description | File |
|---|---|---|---|---|
| GET | `/pdf/:research_id` | No | Stream PDF from Google Drive | `pdfFILES.js` |
| POST | `/research/:researchId/upload` | **JWT** | Replace research PDF file | `filesupdate.js` |
| PUT | `/research/:researchId/privacy` | No | Set file_privacy (public/private) | `FilePrivacy.js` |
| POST | `/request-pdf` | No | Request PDF, notify authors | `FilePrivacy.js` |
| POST | `/request-pdf-files` | No | Create PDF request entry | `RequestPDFRoutes.js` |
| POST | `/reject-pdf-request/:request_id` | No | Reject + send email | `RequestPDFRoutes.js` |
| GET | `/user/pdf-requests/:userId` | No | User's PDF requests | `Pdf-request-retrieval.js` |
| POST | `/send-pdf/:research_id` | No | Send PDF as email attachment | `SendPaper.js` |

### 5.5 Search

| Method | Endpoint | Auth | Algorithm | File |
|---|---|---|---|---|
| POST | `/search/fuse` | No | Fuse.js (threshold: 0.6, keys: title, authors, abstract, keywords, category) | `fuseSearch.js` |
| POST | `/search/fuzzball` | No | Fuzzball `token_set_ratio`, limit 10 | `fuzzballSearch.js` |
| POST | `/search/levenshtein` | No | Levenshtein distance, threshold: 5 | `Levenshtein.js` |
| POST | `/search/fuzzy` | No | Custom Levenshtein distance | `fuzzySearch.js` |
| POST | `/log-search` | No | Insert into search_logs | `dashboardRoutes.js` |

### 5.6 Browse & Filter

| Method | Endpoint | Auth | Description | File |
|---|---|---|---|---|
| GET | `/category/:category_id` | No | Researches by category | `filterRoutes.js` |
| GET | `/keywords/:keyword_id` | No | Researches by keyword | `filterRoutes.js` |
| GET | `/authors/:authorId` | No | Single author | `filterRoutes.js` |
| GET | `/authors` | No | All authors with document counts | `filterRoutes.js` |
| GET | `/all/authors/:research_id` | No | Authors of a research | `filterRoutes.js` |
| GET | `/authors/:authorId/papers` | No | Author's approved papers | `filterRoutes.js` |
| GET | `/authors/:authorId/researches` | No | Author's all researches | `filterRoutes.js` |
| GET | `/user/researches/:userId` | No | User's uploads (validated) | `filterRoutes.js` |
| GET | `/:user_id/papers` | No | User's papers by status (approved/rejected) | `UserDash.js` |

### 5.7 Categories, Keywords, Institutions (CRUD)

| Method | Endpoint | Auth | Description | File |
|---|---|---|---|---|
| GET | `/categories/all` | No | All categories | `categories.js` |
| POST | `/categories/add` | No | Create category | `categories.js` |
| PUT | `/categories/:id` | No | Update category | `categories.js` |
| DELETE | `/categories/:id` | No | Delete category | `categories.js` |
| GET | `/keywords` | No | All keywords | `keywords.js` |
| POST | `/keywords/add` | No | Create keyword | `keywords.js` |
| PUT | `/keywords/:id` | No | Update keyword | `keywords.js` |
| DELETE | `/keywords/:id` | No | Delete keyword | `keywords.js` |
| GET | `/institutions/all` | No | All institutions | `InstitutionRoutes.js` |
| GET | `/institutions/:id` | No | Single institution | `InstitutionRoutes.js` |
| POST | `/institutions` | No | Create institution | `InstitutionRoutes.js` |
| PUT | `/institutions/:id` | No | Update institution | `InstitutionRoutes.js` |
| DELETE | `/institutions/:id` | No | Delete institution | `InstitutionRoutes.js` |

### 5.8 Dashboard & Analytics

| Method | Endpoint | Auth | Description | File |
|---|---|---|---|---|
| GET | `/top-downloads` | No | Top 10 by download count | `dashboardRoutes.js` |
| GET | `/trending-searches` | No | Top 10 by search count | `dashboardRoutes.js` |
| GET | `/most-cited` | No | Top 3 by citeCount | `mostRoutes.js` |
| GET | `/most-downloaded` | No | Top 3 by downloadCount | `mostRoutes.js` |
| GET | `/most-viewed` | No | Top 3 by viewCount | `mostRoutes.js` |
| GET | `/total/citations` | No | Total citation sum | `adminRoutes.js` |
| GET | `/total/downloads` | No | Total download count | `adminRoutes.js` |
| GET | `/total/views` | No | Total view count | `adminRoutes.js` |
| GET | `/total/researches` | No | Total research count | `adminRoutes.js` |
| GET | `/all/users` | No | Total user count | `adminRoutes.js` |
| GET | `/daily\|weekly\|monthly/citations` | No | Time-series citations | `adminRoutes.js` |
| GET | `/daily\|weekly\|monthly/downloads` | No | Time-series downloads | `adminRoutes.js` |
| GET | `/daily\|weekly\|monthly/views` | No | Time-series views | `adminRoutes.js` |

### 5.9 User Dashboard

| Method | Endpoint | Auth | Description | File |
|---|---|---|---|---|
| GET | `/notifications/:user_id` | No | User notifications | `UserDash.js` |
| GET | `/notifications/:id/researches` | No | Research for a notification | `UserDash.js` |
| POST | `/notifications/opened` | No | Mark notifications read | `UserDash.js` |
| POST | `/collection/add` | No | Add to collection | `UserDash.js` |
| GET | `/collections/:userId` | No | User collections w/ details | `UserDash.js` |
| DELETE | `/collection/remove/:userId/:researchId` | No | Remove from collection | `UserDash.js` |
| GET | `/user/dashboard` | No | Aggregate stats for user | `UserDash.js` |
| GET | `/total/researches\|citations\|downloads\|views/:id` | No | Per-user stats | `UserDash.js` |
| GET | `/user/daily\|weekly\|monthly/*/:research_id` | No | Per-user time-series | `UserDash.js` |

### 5.10 Online Tracking & Profile Pictures

| Method | Endpoint | Auth | Description | File |
|---|---|---|---|---|
| POST | `/admin/heartbeat/:userId` | No | Update last_active | `HeartBeat.js` |
| GET | `/admin/online-users` | No | Users active in last 60s | `HeartBeat.js` |
| POST | `/admin/logout/:userId` | No | Set last_active = NULL | `HeartBeat.js` |
| POST | `/upload-profile-pic` | No | Upload profile picture to Drive | `UploadUserPic.js` |
| GET | `/profile-picture/:user_id` | No | Retrieve profile picture | `ProfilePicRetrieval.js` |
| GET | `/profilepic/authors/:authorId` | No | Author profile picture | `authorsProfilepic.js` |
| GET | `/program/authors/:authorId` | No | Author's program | `AuthorsProgram.js` |
| POST | `/reject-research/:research_id` | No | Reject research (unused function) | `UserDash.js` |
| GET | `/uploader-stats-by-role` | No | Upload stats grouped by role | `adminRoutes.js` |

---

## 6. Authentication & Authorization

### 6.1 JWT Token Structure

```json
{
  "userId": 1,
  "email": "user@example.com",
  "firstName": "John",
  "middleName": "D",
  "Suffix": "",
  "lastName": "Doe",
  "roleId": 1,
  "verification": "verified",
  "iat": 1718000000,
  "exp": 1718003600
}
```

- **Algorithm**: HS256
- **Expiry**: 1 hour (`expiresIn: '1hour'`)
- **Secret**: `${JWT_SECRET_KEY}` with fallback `'Nhel-secret-key'`

### 6.2 Role System

| role_id | role_name | Description |
|---|---|---|
| 1 | Admin | Full system access |
| 2 | NCF User | Naga College Foundation affiliated |
| 3 | Non-NCF User | External users |

### 6.3 Current Auth Flow (Broken)

1. `POST /login` validates email/password → returns JWT
2. JWT secret is configurable but falls back to hardcoded string
3. `authenticateToken` middleware is **imported in 10+ route files but never applied to a single route**
4. The only exception: `filesupdate.js` validates JWT manually using `jsonwebtoken.verify()` directly
5. All 70+ endpoints are publicly accessible without authentication

### 6.4 Email Verification Flow

1. `POST /register` creates user, generates JWT with **no expiration**: `jwt.sign({ userId }, secretKey)`
2. Verification link: `https://ccs-research-repository.vercel.app/verify-email?token=${token}`
3. `GET /verify-email` decodes JWT using hardcoded secret `'Nhel-secret-key'`, sets `verification = "verified"`
4. **Issue**: Token never expires, hardcoded secret in verification endpoint

### 6.5 Password Reset Flow

1. `POST /request-password-reset` → generates 6-digit numeric code, stores with 5-min expiry
2. `POST /verify-code` → validates code (⚠ only code, no email binding, no rate limit)
3. `POST /reset-password` → requires email + code + newPassword, updates password

### 6.6 Google OAuth Flow

1. Client sends Google ID token to `POST /google-login`
2. Server verifies token via `google-auth-library`
3. If user exists by email → returns JWT
4. If user does not exist → returns `{ userExists: false }` for frontend to redirect to registration

---

## 7. Data Flow Diagrams

### 7.1 Research Upload

```
Client                          Server                        Google Drive              MySQL
  │                               │                               │                      │
  │  POST /upload (multipart)     │                               │                      │
  │  + file.pdf                   │                               │                      │
  │  + { title, authors,          │                               │                      │
  │    categories, keywords,      │                               │                      │
  │    abstract, uploader_id }    │                               │                      │
  │ ───────────────────────────► │                               │                      │
  │                               │  Validate: PDF only           │                      │
  │                               │  Parse authors "Name (email)" │                      │
  │                               │  Upload to Google Drive       │                      │
  │                               │ ───────────────────────────► │                      │
  │                               │ ◄─────────────────────────── │ file_id               │
  │                               │                               │                      │
  │                               │  Check uploader role          │                      │
  │                               │ ──────────────────────────────────────────────────►  │
  │                               │  Admin → status=approved      │                      │
  │                               │  Others → status=pending      │                      │
  │                               │                               │                      │
  │                               │  Check duplicate title        │                      │
  │                               │ ──────────────────────────────────────────────────►  │
  │                               │                               │                      │
  │                               │  INSERT researches            │                      │
  │                               │ ──────────────────────────────────────────────────►  │
  │                               │  INSERT authors (upsert)      │                      │
  │                               │ ──────────────────────────────────────────────────►  │
  │                               │  INSERT research_authors      │                      │
  │                               │ ──────────────────────────────────────────────────►  │
  │                               │  INSERT categories (upsert)   │                      │
  │                               │ ──────────────────────────────────────────────────►  │
  │                               │  INSERT research_categories   │                      │
  │                               │ ──────────────────────────────────────────────────►  │
  │                               │  INSERT keywords (upsert)     │                      │
  │                               │ ──────────────────────────────────────────────────►  │
  │                               │  INSERT research_keywords     │                      │
  │                               │ ──────────────────────────────────────────────────►  │
  │ ◄─────────────────────────── │  201 { message: "success" }   │                      │
```

### 7.2 PDF Retrieval

```
Client                          Server                        Google Drive
  │                               │                               │
  │  GET /pdf/:research_id        │                               │
  │ ───────────────────────────► │                               │
  │                               │  SELECT file_id FROM          │
  │                               │  researches WHERE research_id │
  │                               │  = ?                          │
  │                               │ ──────────────────► MySQL     │
  │                               │ ◄────────────────── file_id   │
  │                               │                               │
  │                               │  GET file metadata            │
  │                               │ ───────────────────────────► │
  │                               │ ◄─────────────────────────── │ name
  │                               │                               │
  │                               │  GET file content (alt:media) │
  │                               │ ───────────────────────────► │
  │                               │ ◄─────────────────────────── │ arraybuffer
  │                               │                               │
  │ ◄─────────────────────────── │ Content-Type: application/pdf │
  │                               │ Content-Disposition: inline   │
```

### 7.3 Password Reset (Vulnerable)

```
Client                          Server                        Gmail SMTP              MySQL
  │                               │                               │                      │
  │  POST /request-password-reset │                               │                      │
  │  { email }                    │                               │                      │
  │ ───────────────────────────► │                               │                      │
  │                               │  SELECT user_id FROM users    │                      │
  │                               │  WHERE email = ?              │                      │
  │                               │ ────────────────────────────────────────────────►    │
  │                               │ ◄────────────────────────────────────────────────    │
  │                               │                               │                      │
  │                               │  Generate 6-digit code        │                      │
  │                               │  INSERT INTO password_resets  │                      │
  │                               │ ────────────────────────────────────────────────►    │
  │                               │                               │                      │
  │                               │  Send email with code         │                      │
  │                               │ ───────────────────────────► │                      │
  │ ◄─────────────────────────── │ { message: "code sent" }     │                      │
  │                               │                               │                      │
  │  POST /verify-code            │  ⚠ No rate limiting          │                      │
  │  { code }  (brute-force)     │  ⚠ No email binding          │                      │
  │ ───────────────────────────► │                               │                      │
  │                               │  SELECT * FROM password_resets│                      │
  │                               │  WHERE code = ? AND expires   │                      │
  │                               │  > NOW()                      │                      │
  │                               │ ────────────────────────────────────────────────►    │
  │ ◄─────────────────────────── │ { userId, message }          │                      │
  │                               │                               │                      │
  │  POST /reset-password         │                               │                      │
  │  { email, code, newPassword } │                               │                      │
  │ ───────────────────────────► │                               │                      │
  │                               │  Validate code again          │                      │
  │                               │  bcrypt.hash(newPassword)     │                      │
  │                               │  UPDATE users SET password    │                      │
  │                               │ ────────────────────────────────────────────────►    │
  │                               │  DELETE FROM password_resets  │                      │
  │                               │ ────────────────────────────────────────────────►    │
  │ ◄─────────────────────────── │ { message: "success" }       │                      │
```

---

## 8. Security Vulnerabilities

### 8.1 CRITICAL: Hardcoded Secrets in Source Code

> **Impact**: Full system compromise. If source code is exposed, attackers gain database access, Google Drive access, and email access.

| File | Line(s) | Secret |
|---|---|---|
| `database/db.js` | 5-8 | MySQL host, port, user, password |
| `routes/documentRoutes.js` | 13-51 | Google Drive service account full private key |
| `routes/pdfFILES.js` | 12-50 | Same private key (duplicated) |
| `routes/SendPaper.js` | 10-48 | Same private key (duplicated) |
| `routes/Content Filtering/UploadUserPic.js` | 12-50 | Same private key (duplicated) |
| `routes/Content Filtering/ProfilePicRetrieval.js` | 12-50 | Same private key (duplicated) |
| `routes/Authors/authorsProfilepic.js` | 9-47 | Same private key (duplicated) |
| `routes/userRoutes.js` | 20-21 | Gmail SMTP password `uvebkflhfwuwqcuk` |
| `routes/PasswordReset.js` | 14-15 | Gmail SMTP password `uvebkflhfwuwqcuk` |
| `routes/SendPaper.js` | 63-64 | Different Gmail SMTP password `apnrnhrzikfjshut` |
| `routes/RequestPDFRoutes.js` | 11-12 | Gmail SMTP password `apnrnhrzikfjshut` |
| `controllers/generateRefreshToken.js` | 3-4 | Google OAuth client ID + secret |
| `authentication/config.js` | 2 | JWT secret fallback `'Nhel-secret-key'` |
| `routes/googleLogin.js` | 8-9 | Google Client ID + JWT secret fallbacks |
| `routes/EmailVerification.js` | 19 | Hardcoded JWT secret `'Nhel-secret-key'` |

> The same Google Drive service account RSA private key is **copy-pasted in 6 different files**. The Google Cloud project `ccsrepository-444308` and all its resources should be considered compromised.

### 8.2 CRITICAL: No Authentication on Any Endpoint

| Issue | Detail |
|---|---|
| **Routes without auth** | 70+ of 70+ endpoints lack `authenticateToken` middleware |
| **Middleware imported but unused** | `authentication/middleware.js` is imported in 10+ route files but never applied |
| **Single exception** | `filesupdate.js` manually calls `jwt.verify()` inline |
| **Impact** | Any unauthenticated user can: delete users, delete researches, view all data, modify any record, access admin functions |

### 8.3 HIGH: Password Hash Exposure

| Endpoint | Issue |
|---|---|
| `GET /users/all` | Returns `password` (bcrypt hash) for every user |
| `GET /admin/users/all` | Same — returns `password` field |
| `GET /users/:user_id` | Uses `SELECT *` which includes password |

### 8.4 HIGH: SQL Injection Vectors

| File | Line | Code | Issue |
|---|---|---|---|
| `adminRoutes.js` | 267 | `query += \` AND n.notification_id = ?\`` | String concatenation into query |
| `HeartBeat.js` | 39 | `WHERE last_active > NOW() - INTERVAL ${threshold} SECOND` | Direct interpolation into SQL |

### 8.5 HIGH: Email Verification Token Never Expires

| File | Line | Issue |
|---|---|---|
| `userRoutes.js` | 14 | `jwt.sign({ userId }, secretKey)` — no `expiresIn` set |
| `EmailVerification.js` | 19 | Uses hardcoded `'Nhel-secret-key'` (not from config) |

### 8.6 HIGH: Password Reset Code Brute-Force

| File | Issue |
|---|---|
| `PasswordReset.js` | 6-digit numeric code (1M combinations), no rate limiting, no attempt tracking |
| `PasswordReset.js:92-111` | `/verify-code` only checks `code`, no email binding |

### 8.7 MEDIUM: CORS Misconfiguration

| File | Line | Issue |
|---|---|---|
| `index.js` | 69 | `app.use(cors())` — allows all origins (no options) |
| `index.js` | 128-132 | Second `cors()` call overrides first with `origin: 'http://localhost:3000'` only |
| | | Production frontend at `https://ccs-research-repository.vercel.app` would be blocked |

### 8.8 MEDIUM: Arbitrary Static File Access

| File | Line | Issue |
|---|---|---|
| `index.js` | 119 | `express.static(path.join(__dirname, '../../uploads'))` — serves files from outside project root |

### 8.9 MEDIUM: Missing Security Headers

The following are not configured:
- `helmet` middleware (missing from dependencies)
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security

### 8.10 MEDIUM: No Rate Limiting

Any endpoint can be called unlimited times, enabling:
- Brute-force login attempts
- Abuse of password reset
- Database resource exhaustion
- Unlimited file uploads

### 8.11 MEDIUM: Google Drive Folder IDs Exposed

Hardcoded folder IDs visible in source:
- Research PDFs: `1z4LekckQJPlZbgduf5FjDQob3zmtAElc`
- Profile pictures: `1USofwFzlABog7FfsEGtqpjBA2v4Fhyt9`

---

## 9. Code Quality Issues

### 9.1 No Separation of Concerns

- All business logic is in route handler functions
- No service layer, no repository pattern
- Database queries are inline in HTTP handlers
- The `controllers/` directory only contains search algorithms

### 9.2 Massive Route Files

| File | Lines | Responsibility |
|---|---|---|
| `adminRoutes.js` | 678 | Approval, analytics, user management — should be 3+ files |
| `UserDash.js` | 540 | Notifications, collections, stats, papers — should be 4+ files |
| `filterRoutes.js` | 365 | Author queries, category browse, keyword browse |
| `userRoutes.js` | 259 | Registration, user CRUD, programs |

### 9.3 Mixed Async Patterns

```javascript
// Pattern 1: async/await with mysql2/promise (most files)
const [rows] = await db.query(sql, params);

// Pattern 2: Callback style (UserDash.js:48, RequestPDFRoutes.js:21, fuzzySearch.js:32)
db.query(sql, params, (err, result) => { ... });

// Pattern 3: db.promise().execute() (mostRoutes.js:19, Programs.js:15)
const [rows] = await db.promise().execute(sql, params);

// Pattern 4: mysql2/promise .execute() (authorsProfilepic.js:64, AuthorsProgram.js:16)
const [rows] = await db.execute(sql, params);
```

### 9.4 Duplicate Route Files

| Duplicate | Original | Difference |
|---|---|---|
| `Programs.js` | `roleRoutes.js` | Nearly identical `/roles/all` and `/roles/:role_id` |
| `browseRoutes.js` | `filterRoutes.js` | `/category/:id`, `/keywords/:id`, `/authors/:id`, `/authors` — different implementations |
| `browseRoutes.js:36` | — | `WHERE rc.category_id = 8` — hardcoded bug, ignores parameter |

### 9.5 Unused Imports

| File | Unused Import |
|---|---|
| `categories.js` | `bcrypt`, `jsonwebtoken`, `authenticateToken` |
| `keywords.js` | `bcrypt`, `jsonwebtoken`, `authenticateToken` |
| `roleRoutes.js` | `bcrypt`, `jsonwebtoken`, `authenticateToken` |
| `filterRoutes.js` | `bcrypt`, `jsonwebtoken` |
| `dashboardRoutes.js` | `bcrypt`, `jsonwebtoken`, all auth middleware |

### 9.6 Dead Code / Unused Functions

| File | Function | Status |
|---|---|---|
| `ProfilePicRetrieval.js:110-133` | `getUserProfilePic` | Defined but never mounted as route |
| `UserDash.js:7-16` | `getGeolocation` | Defined but never called |
| `UserDash.js:58-69` | `/reject-research/:research_id` | Calls undefined function `rejectResearchSubmission` |

### 9.7 Inconsistent Error Responses

```javascript
// Some return objects:
res.status(400).json({ error: 'message' });

// Others return plain strings:
res.status(404).send('Research not found');

// Some include details:
res.status(500).json({ error: '...', details: error.message });

// No standardized error format across the API
```

### 9.8 No Centralized Error Handler

Every route has its own try/catch with `console.error()` and `res.status(500)`. No global error middleware:

```javascript
// Missing
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});
```

### 9.9 No Input Validation

- `express-validator` is imported in `filterRoutes.js` but only applied to **one endpoint**
- No request body schema validation anywhere
- No max length enforcement on strings (title, abstract, etc.)
- No file size limits on uploads

### 9.10 Inconsistent Database Connection Handling

- `db.query()` from pool returns `[rows, fields]` in promise mode
- Some files use `db.promise().execute()` (legacy pattern)
- Some files use raw callbacks without checking for connection release
- No transaction support anywhere

---

## 10. Recommended Rewrite Architecture

### 10.1 Target Architecture

```
Client (React/Svelte)
       │
       │ HTTPS
       ▼
API Gateway (Nginx / Cloudflare)
  - SSL termination
  - Rate limiting
  - WAF
  - IP filtering
       │
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NODE.JS + EXPRESS/FASTIFY                        │
│                                                                     │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────────┐  │
│  │ Middleware       │  │ Routes (thin)  │  │ Services              │  │
│  │ - Helmet         │  │                │  │ - AuthService         │  │
│  │ - CORS (strict)  │  │ Validates      │  │ - UserService         │  │
│  │ - Rate Limit     │  │ input via Zod, │  │ - ResearchService     │  │
│  │ - Auth (JWT)     │  │ delegates to   │  │ - FileService (Drive) │  │
│  │ - Logger (Pino)  │  │ service        │  │ - EmailService        │  │
│  │ - Request Val.   │  │                │  │ - AnalyticsService    │  │
│  └────────────────┘  └────────────────┘  │ - SearchService        │  │
│                                            └──────────────────────┘  │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    DATA LAYER                                    │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │ │
│  │  │ MySQL         │  │ Google Drive  │  │ Redis                  │ │
│  │  │ (Prisma ORM)  │  │ (SDK)         │  │ - Cache                │ │
│  │  │               │  │               │  │ - Rate limiting        │ │
│  │  │               │  │               │  │ - Session store        │ │
│  │  └──────────────┘  └──────────────┘  └───────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.2 Technology Recommendations

| Area | Current | Recommended | Rationale |
|---|---|---|---|
| Runtime | Node.js | Node.js 20 LTS | Latest LTS, better performance |
| Framework | Express 4 | Express 4 (familiar) or Fastify | Fastify is 2x faster, has built-in schema validation |
| ORM | Raw mysql2 | Prisma | Type-safe queries, migrations, auto-generated types |
| Validation | Manual | Zod | TypeScript-first schema validation |
| Auth | Broken JWT | Passport.js + JWT + OAuth | Industry standard, well-tested |
| Password Reset | 6-digit code | Magic-link or signed tokens | No brute-force possible |
| File Storage | Raw Drive SDK | Centralized FileService | Swap storage without code changes |
| Email | Raw nodemailer | Nodemailer + Handlebars | Template-based emails |
| Cache | None | Redis (ioredis) | Session cache, rate limiting, query cache |
| Rate Limiting | None | express-rate-limit + Redis | Distributed rate limiting |
| Security | None | helmet | Security headers in one line |
| Logging | console.log | Pino | Structured JSON logging, 5x faster than Winston |
| Testing | None | Vitest + Supertest | Modern, fast, Jest-compatible |
| CI/CD | None | GitHub Actions | Automate testing + deployment |

### 10.3 File Structure (Recommended)

```
src/
├── index.js                        # Entry point
├── app.js                          # Express app setup
│
├── config/
│   ├── env.js                      # Environment validation
│   ├── database.js                 # Prisma client
│   └── google.js                   # Centralized Google auth
│
├── middleware/
│   ├── auth.js                      # authenticateToken, requireRole
│   ├── validate.js                  # Zod validation middleware
│   ├── rateLimit.js                 # Per-endpoint rate limits
│   └── errorHandler.js             # Global error handler
│
├── routes/
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── research.routes.js
│   ├── search.routes.js
│   ├── admin.routes.js
│   ├── dashboard.routes.js
│   └── file.routes.js
│
├── services/
│   ├── auth.service.js
│   ├── user.service.js
│   ├── research.service.js
│   ├── file.service.js             # Google Drive abstraction
│   ├── email.service.js
│   ├── analytics.service.js
│   └── search.service.js
│
├── validators/
│   ├── auth.validator.js
│   ├── user.validator.js
│   └── research.validator.js
│
├── utils/
│   ├── logger.js                    # Pino logger
│   ├── errors.js                    # Custom error classes
│   └── helpers.js
│
└── prisma/
    ├── schema.prisma
    └── migrations/
```

### 10.4 Migration Priority

| Phase | Tasks | Est. Effort |
|---|---|---|
| **P0: Security** | Remove hardcoded secrets → env vars; apply auth middleware; remove password from responses; add Helmet + rate limiting | 4 hrs |
| **P1: Core Restructure** | Centralize Google Drive auth; create service layer; consistent async patterns; global error handler | 8 hrs |
| **P2: Auth Overhaul** | Token expiry on verification; rate-limited password reset; refresh tokens; proper RBAC middleware | 6 hrs |
| **P3: Data Integrity** | Zod validation on all endpoints; fix duplicate routes; proper cascade deletes; transaction support | 8 hrs |
| **P4: Observability** | Pino logging; health checks; API metrics; Sentry error tracking | 4 hrs |
| **P5: Testing** | Unit tests for services; integration tests for API; security scan | 12 hrs |
| **P6: CI/CD** | GitHub Actions; automated testing; deployment pipeline | 4 hrs |
| **Total** | | **~46 hrs** |

### 10.5 Immediate Actions (Before Any Feature Work)

1. **Rotate all secrets immediately**: MySQL password, Google Drive service account (revoke and recreate), Gmail SMTP passwords, JWT secret
2. **Delete hardcoded credentials from Git history** using `git filter-branch` or `bfg-repo-cleaner`
3. **Add `.env.example`** with all required variables (no actual values)
4. **Apply `authenticateToken`** to all non-public routes
5. **Remove `password`** from all `SELECT *` queries on the `users` table

---

*Document generated from source code analysis — June 2026*
