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

# Create the database and user
CREATE DATABASE nexus_db;
CREATE USER nexus_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE nexus_db TO nexus_user;

# Connect to the new database
\c nexus_db

# Grant schema permissions (PostgreSQL 15+ requires this)
GRANT ALL ON SCHEMA public TO nexus_user;
```

---

## 4. Run Drizzle Migrations

This generates SQL migration files from the Drizzle schema, then applies them to your database:

```bash
# Generate migration files from schema
npx drizzle-kit generate

# Apply migrations to the database
npx drizzle-kit migrate
```

After this step, all 16 tables are created in your database.

---

## 5. Set Up Full-Text Search (pg_trgm + search_vector trigger)

**Why is this needed?**

The search module uses two PostgreSQL features that can't be expressed through Drizzle ORM's schema definition:

1. **`pg_trgm` extension** — Enables the `similarity()` function used by the `/api/search/suggestions` endpoint. This is what powers the "did you mean?" autocomplete feature. Without it, the suggestions endpoint will throw a SQL error because `similarity()` doesn't exist.

2. **`search_vector` trigger** — The `researches` table has a `search_vector` column of type `tsvector`. This column stores a pre-computed, indexed representation of the research's title and abstract for fast full-text search. Without a trigger, this column would always be `NULL` and search would return zero results.

   The trigger automatically updates `search_vector` whenever a research is inserted or its title/abstract is updated. This is standard PostgreSQL practice — the database handles the indexing, not the application.

**Run this SQL against your database:**

```bash
psql -U nexus_user -d nexus_db
```

Then paste:

```sql
-- 1. Enable the pg_trgm extension (for fuzzy/similarity search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create the trigger function that updates search_vector
--    This concatenates title (weight A = highest priority) and abstract (weight B)
--    into a single tsvector for full-text search.
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.abstract, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach the trigger to the researches table
--    Fires on every INSERT and on UPDATEs that touch title or abstract
CREATE TRIGGER researches_search_vector_update
  BEFORE INSERT OR UPDATE OF title, abstract ON researches
  FOR EACH ROW
  EXECUTE FUNCTION update_search_vector();

-- 4. Create indexes for search performance
--    GIN index on search_vector — makes @@ (full-text match) queries fast
CREATE INDEX IF NOT EXISTS idx_researches_search_vector
  ON researches USING GIN (search_vector);

--    GIN index with pg_trgm on title — makes similarity() queries fast
CREATE INDEX IF NOT EXISTS idx_researches_title_trgm
  ON researches USING GIN (title gin_trgm_ops);

--    GIN index with pg_trgm on author names — for author autocomplete
CREATE INDEX IF NOT EXISTS idx_authors_name_trgm
  ON authors USING GIN (name gin_trgm_ops);

-- 5. Additional B-tree indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_researches_status ON researches (status);
CREATE INDEX IF NOT EXISTS idx_researches_uploader_status ON researches (uploader_id, status);
```

**What each piece does:**

| Component | Purpose | What breaks without it |
|-----------|---------|----------------------|
| `pg_trgm` extension | Enables `similarity()` for typo-tolerant autocomplete | `/api/search/suggestions` throws `function similarity() does not exist` |
| `update_search_vector()` function | Converts title + abstract into a searchable `tsvector` | `search_vector` column is always NULL, full-text search returns 0 results |
| `researches_search_vector_update` trigger | Auto-runs the function on INSERT/UPDATE | Same as above — search_vector never gets populated |
| GIN index on `search_vector` | Makes `@@` full-text queries use an index scan instead of sequential scan | Search works but is slow on large datasets |
| GIN index with `gin_trgm_ops` | Makes `similarity()` queries use an index | Suggestions work but are slow |

---

## 6. Build & Start the Server

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

## 7. Verify Installation

1. Open `http://localhost:3001/api/docs` — you should see the Swagger UI with all endpoints
2. Try `POST /api/auth/register` to create a user
3. Check your database: `SELECT count(*) FROM users;` should return 1

---

## Useful Commands

```bash
npm run start:dev      # Dev server with hot reload
npm run build          # Compile TypeScript
npm run lint           # Lint with ESLint
npm run format         # Format with Prettier
npm test               # Run unit tests
npm run test:e2e       # Run e2e tests
npx drizzle-kit generate   # Generate new migration after schema changes
npx drizzle-kit migrate    # Apply pending migrations
npx drizzle-kit studio     # Open Drizzle Studio (database GUI)
```
