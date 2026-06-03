import { pgTable, uuid, text, integer, boolean, date, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const items = pgTable('items', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  quantity: integer('quantity').notNull().default(1),
  expiryDate: date('expiry_date'),
  checked: boolean('checked').notNull().default(false),
  location: text('location').notNull().default('fridge'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const receipts = pgTable('receipts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  boxFileId: text('box_file_id').notNull(),
  photoType: text('photo_type').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Scraped recipe cache (seeded out-of-band via Apify). The live meal route
// only reads from this table — see lib/recipeContext.js. Full-text search is
// provided by a functional GIN index created in scripts/setup-search.js.
export const recipes = pgTable('recipes', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  sourceUrl: text('source_url').unique(),
  cuisine: text('cuisine'),
  ingredients: text('ingredients').array().default(sql`'{}'::text[]`),
  instructions: text('instructions'),
  rawText: text('raw_text').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const preferences = pgTable('preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().unique(),
  allergies: text('allergies').array().default(sql`'{}'::text[]`),
  dislikes: text('dislikes').array().default(sql`'{}'::text[]`),
});
