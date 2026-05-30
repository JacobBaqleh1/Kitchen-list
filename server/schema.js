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

export const preferences = pgTable('preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().unique(),
  allergies: text('allergies').array().default(sql`'{}'::text[]`),
  dislikes: text('dislikes').array().default(sql`'{}'::text[]`),
});
