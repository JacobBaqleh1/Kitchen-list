import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../db.js';

/**
 * Idempotent index setup. Safe to run multiple times. Mirrors the composite
 * index declared in schema.js so it can be applied without a full `db:push`.
 *
 * GET /api/items filters by user_id and orders by created_at, so a composite
 * index on (user_id, created_at) lets Postgres find a user's rows already in
 * sort order instead of scanning the whole table.
 */
async function main() {
  console.log('Creating items(user_id, created_at) index…');
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS items_user_created_idx
      ON items (user_id, created_at)
  `);

  console.log('✓ Index setup complete.');
  process.exit(0);
}

main().catch(e => {
  console.error('Index setup failed:', e.message);
  process.exit(1);
});
