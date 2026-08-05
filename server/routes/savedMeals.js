import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db.js';
import { savedMeals } from '../schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function mealKey(name, recipe) {
  return `${name.trim().toLowerCase()}::${JSON.stringify(recipe)}`;
}

function matchesMeal(row, name, recipe) {
  return mealKey(row.name, row.recipe) === mealKey(name, recipe);
}

router.get('/', async (req, res) => {
  try {
    const all = await db.select().from(savedMeals)
      .where(eq(savedMeals.userId, req.user.id))
      .orderBy(desc(savedMeals.createdAt));
    res.json(all);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  const { name, recipe, shopping_list: shoppingList = [] } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  if (!Array.isArray(recipe) || !recipe.length) {
    return res.status(400).json({ error: 'recipe must be a non-empty array' });
  }

  try {
    const existing = await db.select().from(savedMeals)
      .where(eq(savedMeals.userId, req.user.id));

    const duplicate = existing.find((row) => matchesMeal(row, name, recipe));
    if (duplicate) {
      return res.status(200).json(duplicate);
    }

    const [saved] = await db.insert(savedMeals).values({
      userId: req.user.id,
      name: name.trim(),
      recipe,
      shoppingList: Array.isArray(shoppingList) ? shoppingList : [],
    }).returning();

    res.status(201).json(saved);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await db.delete(savedMeals)
      .where(and(eq(savedMeals.id, req.params.id), eq(savedMeals.userId, req.user.id)))
      .returning();
    if (!deleted.length) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
