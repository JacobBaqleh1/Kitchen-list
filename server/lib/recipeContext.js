import { sql } from 'drizzle-orm';
import { db } from '../db.js';

// Keep this expression byte-for-byte identical to the functional GIN index
// created in scripts/setup-search.js, otherwise Postgres won't use the index.
const FTS_EXPR = sql`to_tsvector('english', coalesce(title,'') || ' ' || coalesce(cuisine,'') || ' ' || coalesce(raw_text,''))`;

/**
 * Turn a set of ingredient names + an optional freeform prompt into a
 * websearch_to_tsquery string. Terms are OR'd so a recipe matching ANY
 * ingredient is a candidate (ranking sorts the best ones to the top).
 */
function buildQueryString(ingredients = [], userPrompt = '') {
  const fromPrompt = (userPrompt || '')
    .split(/\s+/)
    .filter(w => w.length > 3); // drop noise words like "and", "the"

  const terms = [...ingredients, ...fromPrompt]
    .map(t => String(t).toLowerCase().replace(/[^a-z0-9 ]/g, '').trim())
    .filter(Boolean);

  // De-dup and OR them together. websearch_to_tsquery understands "OR".
  return [...new Set(terms)].join(' OR ');
}

/**
 * Retrieve relevant cached recipe blocks from Neon via full-text search.
 * This is the read side of the cost-saving harness: no Apify/LLM calls here.
 *
 * @returns {Promise<{ rows: Array, contextString: string }>}
 */
export async function retrieveRecipeContext({ ingredients = [], userPrompt = '', limit = 5 }) {
  const queryStr = buildQueryString(ingredients, userPrompt);
  if (!queryStr) return { rows: [], contextString: '' };

  let rows = [];
  try {
    const result = await db.execute(sql`
      SELECT title, source_url, cuisine, raw_text,
             ts_rank(${FTS_EXPR}, websearch_to_tsquery('english', ${queryStr})) AS rank
      FROM recipes
      WHERE ${FTS_EXPR} @@ websearch_to_tsquery('english', ${queryStr})
      ORDER BY rank DESC
      LIMIT ${limit}
    `);
    rows = result?.rows ?? result ?? [];
  } catch (e) {
    // Retrieval is best-effort: if the table/index isn't set up yet, or the
    // query fails, we degrade gracefully to a no-context generation.
    console.error('retrieveRecipeContext failed (continuing without context):', e.message);
    return { rows: [], contextString: '' };
  }

  const contextString = rows
    .map((r, i) => {
      const head = [r.title, r.cuisine].filter(Boolean).join(' — ');
      const src = r.source_url ? `\nSource: ${r.source_url}` : '';
      return `[Recipe ${i + 1}] ${head}${src}\n${r.raw_text}`;
    })
    .join('\n\n---\n\n');

  return { rows, contextString };
}
