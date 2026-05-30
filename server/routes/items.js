import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db.js';
import { items } from '../schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const all = await db.select().from(items)
      .where(eq(items.userId, req.user.id))
      .orderBy(items.createdAt);
    res.json(all);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  const { name, quantity = 1, expiryDate, location = 'fridge' } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const [item] = await db.insert(items)
      .values({ userId: req.user.id, name: name.trim(), quantity: Number(quantity), expiryDate: expiryDate || null, location })
      .returning();
    res.status(201).json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id', async (req, res) => {
  const { name, quantity, expiryDate, location } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (quantity !== undefined) updates.quantity = Number(quantity);
  if (expiryDate !== undefined) updates.expiryDate = expiryDate || null;
  if (location !== undefined) updates.location = location;

  try {
    const [item] = await db.update(items).set(updates)
      .where(and(eq(items.id, req.params.id), eq(items.userId, req.user.id)))
      .returning();
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id/toggle', async (req, res) => {
  try {
    const [existing] = await db.select().from(items)
      .where(and(eq(items.id, req.params.id), eq(items.userId, req.user.id)));
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const [item] = await db.update(items)
      .set({ checked: !existing.checked })
      .where(eq(items.id, req.params.id))
      .returning();
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await db.delete(items)
      .where(and(eq(items.id, req.params.id), eq(items.userId, req.user.id)))
      .returning();
    if (!deleted.length) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/bulk', async (req, res) => {
  const { items: newItems } = req.body;
  if (!Array.isArray(newItems) || !newItems.length) {
    return res.status(400).json({ error: 'items array required' });
  }
  try {
    const inserted = await db.insert(items)
      .values(newItems.map(({ name, quantity = 1, location = 'fridge' }) => ({
        userId: req.user.id,
        name: name.trim(),
        quantity: Number(quantity) || 1,
        location,
      })))
      .returning();
    res.status(201).json(inserted);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
