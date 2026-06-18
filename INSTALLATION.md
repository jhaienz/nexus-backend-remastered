# Installation Guide

Step-by-step setup for the NCF Research Nexus v2 backend.

---

## Prerequisites

- **Node.js** >= 18
- **PostgreSQL** >= 15 (with `pg_trgm` extension support — included by default in standard installs)
- **Cloudflare R2** bucket (for PDF storage)
- **Resend** account (for transactional emails)

---

## 1. Clone & Install Dependencies

```bash
git clone <your-repo-url>
cd nexus-backend-remastered
npm install
```

---

## 2. Configure Environment Variables

```bash
cp .env.example .env
```

Open `.env` and fill in your actual values:

```bash
# Database — your PostgreSQL connection string
DATABASE_URL=postgresql://nexus_user:your_password@localhost:5432/nexus_db

# Auth — generate two different random 64-character strings
# You can use: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=<random-64-char>
JWT_REFRESH_SECRET=<random-64-char>

# Cloudflare R2 — from your Cloudflare dashboard > R2 > Manage R2 API Tokens
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=nexus-pdfs
R2_PUBLIC_URL=https://your-bucket.r2.dev

# Resend — from https://resend.com/api-keys
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=noreply@yourdomain.com

# App
FRONTEND_URL=http://localhost:3000
PORT=3001
```

---

## 3. Create the PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres
```

```sql
-- Create the database and user
CREATE DATABASE nexus_db;
CREATE USER nexus_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE nexus_db TO nexus_user;

-- Connect to the new database
\c nexus_db

-- Grant schema permissions (PostgreSQL 15+ requires this)
GRANT ALL ON SCHEMA public TO nexus_user;

-- Exit psql
\q
```

---

## 4. Run Automated Database Setup

The setup script at `scripts/setup-db.ts` automates the entire database initialization. It handles creating tables, enabling extensions, setting up the search trigger, and creating indexes — all in the correct order.

Run it with:

```bash
npm run db:setup
```

> This runs `npx tsx scripts/setup-db.ts` under the hood. The script reads `DATABASE_URL` from your `.env` file.

What it does (in order):

1. **Pushes the Drizzle schema** → creates all 16 tables and enums
2. **Enables `pg_trgm`** → the PostgreSQL extension for fuzzy/similarity matching
3. **Creates the `search_vector` trigger** → auto-populates the full-text search column whenever a research is inserted or updated
4. **Creates performance indexes** → GIN indexes for search, B-tree indexes for common queries

You should see output like:

```
🔌 Connecting to database...
📦 Step 1: Pushing Drizzle schema...
   ✅ Schema pushed successfully
🔧 Step 2: Enabling pg_trgm extension...
   ✅ pg_trgm enabled
🔧 Step 3: Creating search_vector trigger...
   ✅ Trigger created
🔧 Step 4: Creating performance indexes...
   ✅ idx_researches_search_vector
   ✅ idx_researches_title_trgm
   ✅ idx_authors_name_trgm
   ✅ idx_researches_status
   ✅ idx_researches_uploader_status

🎉 Database setup complete!
```

> **Note:** This script is idempotent — you can run it again safely. It uses `CREATE IF NOT EXISTS` and `CREATE OR REPLACE` so nothing breaks on re-runs.

---

## 5. Build & Start the Server

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod
```

The server starts on `http://localhost:3001` (or your configured `PORT`).

- **API base URL:** `http://localhost:3001/api`
- **Swagger docs:** `http://localhost:3001/api/docs`

---

## 6. Verify Installation

1. Open `http://localhost:3001/api/docs` — you should see the Swagger UI with all endpoints
2. Try `POST /api/auth/register` to create a user
3. Check your database: `SELECT count(*) FROM users;` should return 1

---

## Troubleshooting

### `pg_trgm` extension error

If you see `permission denied to create extension "pg_trgm"`, your database user doesn't have superuser privileges. Fix it by running as the postgres superuser:

```bash
psql -U postgres -d nexus_db -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
```

Then re-run `npm run db:setup` — it will skip the extension (already created) and continue with the rest.

### `relation "researches" does not exist`

This means the schema push failed or was skipped. Make sure your `DATABASE_URL` in `.env` is correct and the database exists, then re-run `npm run db:setup`.

### `ECONNREFUSED` or connection errors

- Check that PostgreSQL is running: `pg_isready`
- Check that the `DATABASE_URL` in `.env` matches your PostgreSQL host/port/credentials

---

## What `db:setup` Creates (for reference)

If you prefer to understand what runs under the hood, here's what the script executes after creating tables:

**`pg_trgm` extension** — enables the `similarity()` function used by `/api/search/suggestions` for typo-tolerant autocomplete. Without it, that endpoint throws `function similarity() does not exist`.

**`search_vector` trigger** — the `researches` table has a `tsvector` column called `search_vector`. This stores a pre-computed, indexed representation of the title + abstract for PostgreSQL full-text search (`@@` operator). A trigger auto-populates it on every INSERT/UPDATE so the application never has to manage it. Without the trigger, the column stays `NULL` and search returns zero results.

**Indexes:**

| Index | Type | Purpose |
|-------|------|---------|
| `idx_researches_search_vector` | GIN | Fast full-text search matching |
| `idx_researches_title_trgm` | GIN (trigram) | Fast `similarity()` on titles |
| `idx_authors_name_trgm` | GIN (trigram) | Fast `similarity()` on author names |
| `idx_researches_status` | B-tree | Fast filtering by approval status |
| `idx_researches_uploader_status` | B-tree | Fast user dashboard queries |

---

## Useful Commands

```bash
npm run start:dev           # Dev server with hot reload
npm run build               # Compile TypeScript
npm run lint                # Lint with ESLint
npm run format              # Format with Prettier
npm test                    # Run unit tests
npm run test:e2e            # Run e2e tests
npm run db:setup            # Full database setup (idempotent)
npx drizzle-kit generate    # Generate migration after schema changes
npx drizzle-kit migrate     # Apply pending migrations
npx drizzle-kit studio      # Open Drizzle Studio (database GUI)
```
