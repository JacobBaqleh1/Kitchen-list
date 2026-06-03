import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db.js';
import { items, preferences } from '../schema.js';
import { requireAuth } from '../middleware/auth.js';
import { invokeNova, extractJson, DEFAULT_MEAL_MODEL } from '../lib/nova.js';
import { retrieveRecipeContext } from '../lib/recipeContext.js';

const router = Router();
router.use(requireAuth);

const SYSTEM_PROMPT =
  'You are a helpful meal planning assistant. Given the user\'s available ingredients, ' +
  'their preferences, and a set of reference recipes retrieved from our database, suggest 3 meals. ' +
  'Use the reference recipes as inspiration and grounding when they are relevant, but adapt them to ' +
  'the user\'s actual ingredients and constraints. For each meal return a name, a full step-by-step ' +
  'recipe, and a shopping list of extra ingredients needed. ' +
  'Respond ONLY with valid JSON matching the requested shape. No markdown, no explanation.';

router.post('/suggest', async (req, res) => {
  const { userPrompt } = req.body;

  try {
    const unchecked = await db.select().from(items)
      .where(and(eq(items.userId, req.user.id), eq(items.checked, false)));
    if (!unchecked.length) {
      return res.status(400).json({ error: 'No items in stock to suggest meals from' });
    }

    const [prefs] = await db.select().from(preferences)
      .where(eq(preferences.userId, req.user.id));
    const allergies = prefs?.allergies || [];
    const dislikes = prefs?.dislikes || [];

    const fridgeItems = unchecked.filter(i => i.location === 'fridge');
    const freezerItems = unchecked.filter(i => i.location === 'freezer');
    const pantryItems = unchecked.filter(i => i.location === 'pantry');
    const fmt = arr => arr.length ? arr.map(i => `${i.quantity}x ${i.name}`).join(', ') : 'none';

    // 1. Retrieve relevant cached recipe context from Neon (cheap, read-only).
    const ingredientNames = unchecked.map(i => i.name);
    const { rows: contextRows, contextString } = await retrieveRecipeContext({
      ingredients: ingredientNames,
      userPrompt,
      limit: 5,
    });

    // 2. Compile the prompt, injecting the Neon context as a reference harness.
    const referenceBlock = contextString
      ? `Reference recipes from our database (use as grounding/inspiration where relevant):\n\n${contextString}\n\n---\n\n`
      : '';

    const userMessage = `${referenceBlock}Fridge contains: ${fmt(fridgeItems)}
Freezer contains: ${fmt(freezerItems)}
Pantry contains: ${fmt(pantryItems)}
Allergies (never include): ${allergies.length ? allergies.join(', ') : 'none'}
Dislikes (avoid): ${dislikes.length ? dislikes.join(', ') : 'none'}${userPrompt ? `\nExtra request: ${userPrompt}` : ''}

Return JSON in this exact shape:
{
  "meals": [
    {
      "name": "...",
      "recipe": ["step 1", "step 2"],
      "shopping_list": ["item1", "item2"]
    }
  ]
}`;

    // 3. Invoke Amazon Nova via the native Bedrock runtime.
    const raw = await invokeNova({
      system: SYSTEM_PROMPT,
      user: userMessage,
      model: DEFAULT_MEAL_MODEL,
      maxTokens: 2048,
    });

    // 4. Parse and return clean JSON.
    const parsed = extractJson(raw);
    if (!parsed || !Array.isArray(parsed.meals)) {
      console.error('Nova raw response:', String(raw).slice(0, 500));
      return res.status(500).json({ error: 'AI returned invalid response, try again' });
    }

    res.json({ ...parsed, _contextUsed: contextRows.length });
  } catch (e) {
    console.error('Meal suggest error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

export default router;
