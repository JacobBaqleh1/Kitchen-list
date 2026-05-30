import { Router } from 'express';
import { db } from '../db.js';
import { preferences } from '../schema.js';

const router = Router();

const PREFS_ID = '00000000-0000-0000-0000-000000000001';

router.get('/', async (req, res) => {
  try {
    const [prefs] = await db.select().from(preferences);
    res.json(prefs || { allergies: [], dislikes: [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/', async (req, res) => {
  const { allergies = [], dislikes = [] } = req.body;
  try {
    const [prefs] = await db
      .insert(preferences)
      .values({ id: PREFS_ID, allergies, dislikes })
      .onConflictDoUpdate({ target: preferences.id, set: { allergies, dislikes } })
      .returning();
    res.json(prefs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
