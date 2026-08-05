import { pgTable, uuid, text, integer, boolean, date, timestamp, index } from 'drizzle-orm/pg-core';
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
}, (t) => [
  // Matches GET /api/items: filter by user_id, order by created_at.
  index('items_user_created_idx').on(t.userId, t.createdAt),
]);

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

export const savedMeals = pgTable('saved_meals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  recipe: text('recipe').array().notNull().default(sql`'{}'::text[]`),
  shoppingList: text('shopping_list').array().default(sql`'{}'::text[]`),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('saved_meals_user_created_idx').on(t.userId, t.createdAt),
]);

export const preferences = pgTable('preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().unique(),
  allergies: text('allergies').array().default(sql`'{}'::text[]`),
  dislikes: text('dislikes').array().default(sql`'{}'::text[]`),
});

// A read-only, link-based share of an owner's kitchen list (Google-Doc style).
// `token` is the unguessable secret embedded in the share URL — anyone holding
// it can view the list and chat, no account required. Revoking flips `status`.
export const shares = pgTable('shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: text('token').notNull().unique(),
  ownerId: text('owner_id').notNull(),
  ownerName: text('owner_name'),
  invitedEmail: text('invited_email'),
  status: text('status').notNull().default('active'), // 'active' | 'revoked'
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('shares_owner_idx').on(t.ownerId),
]);

// Chat messages exchanged on a share. Persisted so history survives reconnects;
// live delivery happens over WebSockets (see ws/shareChat.js). A guest viewer
// has no account so senderUserId is null and senderName is their chosen handle.
export const shareMessages = pgTable('share_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  shareId: uuid('share_id').notNull(),
  senderRole: text('sender_role').notNull(), // 'owner' | 'guest'
  senderName: text('sender_name').notNull(),
  senderUserId: text('sender_user_id'),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('share_messages_share_created_idx').on(t.shareId, t.createdAt),
]);
