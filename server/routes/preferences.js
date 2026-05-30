import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { preferences } from '../schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const [prefs] = await db.select().from(preferences)
      .where(eq(preferences.userId, req.user.id));
    res.json(prefs || { allergies: [], dislikes: [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/', async (req, res) => {
  const { allergies = [], dislikes = [] } = req.body;
  try {
    const [prefs] = await db.insert(preferences)
      .values({ userId: req.user.id, allergies, dislikes })
      .onConflictDoUpdate({ target: preferences.userId, set: { allergies, dislikes } })
      .returning();
    res.json(prefs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
