/**
 * Automated database setup script.
 *
 * Runs in order:
 *   1. Drizzle schema push (creates all tables)
 *   2. pg_trgm extension
 *   3. search_vector trigger
 *   4. Performance indexes
 *
 * Usage: npx tsx scripts/setup-db.ts
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from '../src/database/schema/index.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in .env');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1 });

async function run() {
  console.log('🔌 Connecting to database...');
  console.log(`   ${DATABASE_URL!.replace(/\/\/.*@/, '//***@')}`);

  // ── Step 1: Push schema (creates tables if they don't exist) ──
  console.log('\n📦 Step 1: Pushing Drizzle schema...');
  try {
    // Use drizzle-kit push via CLI since programmatic push isn't exposed
    const { execSync } = await import('child_process');
    execSync('npx drizzle-kit push --force', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL },
    });
    console.log('   ✅ Schema pushed successfully');
  } catch (e) {
    console.error('   ❌ Schema push failed:', (e as Error).message);
    process.exit(1);
  }

  // ── Step 2: Enable pg_trgm extension ──
  console.log('\n🔧 Step 2: Enabling pg_trgm extension...');
  await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
  console.log('   ✅ pg_trgm enabled');

  // ── Step 3: Create search_vector trigger ──
  console.log('\n🔧 Step 3: Creating search_vector trigger...');

  await sql`
    CREATE OR REPLACE FUNCTION update_search_vector()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.abstract, '')), 'B');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `;

  await sql`
    DROP TRIGGER IF EXISTS researches_search_vector_update ON researches
  `;

  await sql`
    CREATE TRIGGER researches_search_vector_update
      BEFORE INSERT OR UPDATE OF title, abstract ON researches
      FOR EACH ROW
      EXECUTE FUNCTION update_search_vector()
  `;

  console.log('   ✅ Trigger created');

  // ── Step 4: Create performance indexes ──
  console.log('\n🔧 Step 4: Creating performance indexes...');

  const indexes = [
    {
      name: 'idx_researches_search_vector',
      sql: sql`CREATE INDEX IF NOT EXISTS idx_researches_search_vector ON researches USING GIN (search_vector)`,
    },
    {
      name: 'idx_researches_title_trgm',
      sql: sql`CREATE INDEX IF NOT EXISTS idx_researches_title_trgm ON researches USING GIN (title gin_trgm_ops)`,
    },
    {
      name: 'idx_authors_name_trgm',
      sql: sql`CREATE INDEX IF NOT EXISTS idx_authors_name_trgm ON authors USING GIN (name gin_trgm_ops)`,
    },
    {
      name: 'idx_researches_status',
      sql: sql`CREATE INDEX IF NOT EXISTS idx_researches_status ON researches (status)`,
    },
    {
      name: 'idx_researches_uploader_status',
      sql: sql`CREATE INDEX IF NOT EXISTS idx_researches_uploader_status ON researches (uploader_id, status)`,
    },
  ];

  for (const idx of indexes) {
    await idx.sql;
    console.log(`   ✅ ${idx.name}`);
  }

  // ── Done ──
  console.log('\n🎉 Database setup complete!\n');
  console.log('You can now start the server:');
  console.log('  npm run start:dev\n');

  await sql.end();
}

run().catch((err) => {
  console.error('\n❌ Setup failed:', err);
  sql.end().then(() => process.exit(1));
});
