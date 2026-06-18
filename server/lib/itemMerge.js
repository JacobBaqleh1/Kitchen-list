import { eq, and, inArray, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { items } from '../schema.js';

export function normalizeItemName(name) {
  return name.trim().toLowerCase();
}

export function mergeExpiryDates(...dates) {
  const valid = dates.filter(Boolean);
  if (!valid.length) return null;
  return valid.sort()[0];
}

function groupKey(item) {
  return `${normalizeItemName(item.name)}|${item.location}|${item.checked}`;
}

/** Collapse existing duplicate rows (same name, location, checked state). */
export async function consolidateDuplicates(userId) {
  const all = await db.select().from(items)
    .where(eq(items.userId, userId))
    .orderBy(items.createdAt);

  const groups = new Map();
  for (const item of all) {
    const key = groupKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const toDelete = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;

    const sorted = [...group].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const keeper = sorted[0];
    const totalQty = group.reduce((sum, i) => sum + i.quantity, 0);
    const expiry = mergeExpiryDates(...group.map(i => i.expiryDate));

    await db.update(items).set({
      quantity: totalQty,
      expiryDate: expiry,
      name: keeper.name.trim(),
    }).where(eq(items.id, keeper.id));

    toDelete.push(...sorted.slice(1).map(i => i.id));
  }

  if (toDelete.length) {
    await db.delete(items).where(inArray(items.id, toDelete));
  }
}

/** Add quantity to an existing in-stock match, or insert a new row. */
export async function upsertItem(userId, { name, quantity, expiryDate = null, location = 'fridge' }) {
  const trimmed = name.trim();
  const qty = Math.max(1, Number(quantity) || 1);
  const normalized = normalizeItemName(trimmed);

  const [match] = await db.select().from(items)
    .where(and(
      eq(items.userId, userId),
      eq(items.checked, false),
      eq(items.location, location),
      sql`lower(trim(${items.name})) = ${normalized}`,
    ))
    .limit(1);

  if (match) {
    const [updated] = await db.update(items).set({
      quantity: match.quantity + qty,
      expiryDate: mergeExpiryDates(match.expiryDate, expiryDate),
      name: trimmed,
    }).where(eq(items.id, match.id)).returning();
    return updated;
  }

  const [item] = await db.insert(items).values({
    userId,
    name: trimmed,
    quantity: qty,
    expiryDate: expiryDate || null,
    location,
  }).returning();
  return item;
}
