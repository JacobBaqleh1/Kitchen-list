import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../db.js';

/**
 * Idempotent setup for full-text + trigram search on the `recipes` table.
 * Run ONCE after `npm run db:push` (and again only if you change the FTS
 * expression). Drizzle manages the table's columns; this manages the
 * Postgres-specific search objects it can't express.
 *
 * IMPORTANT: the to_tsvector(...) expression below must stay byte-for-byte
 * identical to FTS_EXPR in lib/recipeContext.js, or the index won't be used.
 */
async function main() {
  console.log('Enabling pg_trgm extension…');
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

  console.log('Creating functional full-text GIN index…');
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS recipes_fts_idx ON recipes USING gin (
      to_tsvector('english', coalesce(title,'') || ' ' || coalesce(cuisine,'') || ' ' || coalesce(raw_text,''))
    )
  `);

  console.log('Creating trigram index on title for fuzzy ingredient matching…');
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS recipes_title_trgm_idx ON recipes USING gin (title gin_trgm_ops)
  `);

  console.log('✓ Search setup complete.');
  process.exit(0);
}

main().catch(e => {
  console.error('Search setup failed:', e.message);
  process.exit(1);
});
