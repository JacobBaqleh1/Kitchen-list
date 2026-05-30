import { pgTable, uuid, text, integer, boolean, date, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const items = pgTable('items', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  quantity: integer('quantity').notNull().default(1),
  expiryDate: date('expiry_date'),
  checked: boolean('checked').notNull().default(false),
  location: text('location').notNull().default('fridge'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const preferences = pgTable('preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  allergies: text('allergies').array().default(sql`'{}'::text[]`),
  dislikes: text('dislikes').array().default(sql`'{}'::text[]`),
});
