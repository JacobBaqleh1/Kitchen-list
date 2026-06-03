import { db } from '../db.js';
import { recipes } from '../schema.js';

/**
 * ----------------------------------------------------------------------------
 * Apify -> Neon seeding (PLACEHOLDER)
 * ----------------------------------------------------------------------------
 * This is the WRITE side of the harness. It is intentionally decoupled from the
 * request path: scraping is expensive, so we run it out-of-band (cron / manual)
 * and the live meal route only ever READS from Neon (see recipeContext.js).
 *
 * Wire-up later by setting in .env:
 *   APIFY_TOKEN=...
 *   APIFY_RECIPE_DATASET_ID=...     (a finished actor run's default dataset)
 * Then run:  npm run seed:recipes
 */

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const DATASET_ID = process.env.APIFY_RECIPE_DATASET_ID;

/**
 * Map one raw Apify dataset item to our `recipes` row shape.
 * Adjust the field names to match whichever recipe-scraper actor you use.
 */
export function mapApifyItemToRecipe(item) {
  const ingredients = Array.isArray(item.ingredients)
    ? item.ingredients
    : String(item.ingredients || '').split('\n').filter(Boolean);

  const instructions = Array.isArray(item.instructions)
    ? item.instructions.join('\n')
    : String(item.instructions || item.steps || '');

  // raw_text is the block we inject into the Nova prompt window.
  const rawText = [
    item.title && `Title: ${item.title}`,
    item.cuisine && `Cuisine: ${item.cuisine}`,
    ingredients.length && `Ingredients: ${ingredients.join(', ')}`,
    instructions && `Instructions: ${instructions}`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    title: item.title || item.name || 'Untitled recipe',
    sourceUrl: item.url || item.sourceUrl || null,
    cuisine: item.cuisine || null,
    ingredients,
    instructions,
    rawText,
  };
}

/**
 * Fetch a finished Apify actor's dataset items and upsert them into Neon.
 * Returns the number of rows attempted. Idempotent: conflicts on source_url
 * are ignored so re-running is safe.
 */
export async function seedRecipesFromApify({ datasetId = DATASET_ID } = {}) {
  if (!APIFY_TOKEN || !datasetId) {
    console.warn(
      '[apifySeed] Skipped — set APIFY_TOKEN and APIFY_RECIPE_DATASET_ID to enable seeding.'
    );
    return 0;
  }

  // Pull the dataset items via Apify's REST API (no extra SDK dependency).
  const url = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&clean=true&format=json`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Apify dataset fetch failed: ${resp.status}`);
  const items = await resp.json();

  const rows = items
    .map(mapApifyItemToRecipe)
    .filter(r => r.rawText && r.title);

  if (!rows.length) return 0;

  // Upsert in chunks; ignore duplicates by source_url.
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await db
      .insert(recipes)
      .values(rows.slice(i, i + CHUNK))
      .onConflictDoNothing({ target: recipes.sourceUrl });
  }

  console.log(`[apifySeed] Upserted up to ${rows.length} recipes into Neon.`);
  return rows.length;
}
