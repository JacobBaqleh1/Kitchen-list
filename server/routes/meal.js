import { Router } from 'express';
import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';
import { eq, and } from 'drizzle-orm';
import { db } from '../db.js';
import { items, preferences } from '../schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const anthropic = new AnthropicBedrock({
  awsAccessKey: process.env.AWS_ACCESS_KEY_ID,
  awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsRegion: process.env.AWS_REGION || 'us-east-1',
});

router.use(requireAuth);

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
    const pantryItems = unchecked.filter(i => i.location === 'pantry');

    const fmt = arr => arr.length ? arr.map(i => `${i.quantity}x ${i.name}`).join(', ') : 'none';

    const userMessage = `Fridge contains: ${fmt(fridgeItems)}
Pantry contains: ${fmt(pantryItems)}
Allergies: ${allergies.length ? allergies.join(', ') : 'none'}
Dislikes: ${dislikes.length ? dislikes.join(', ') : 'none'}${userPrompt ? `\nExtra request: ${userPrompt}` : ''}

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

    const response = await anthropic.messages.create({
      model: 'us.anthropic.claude-opus-4-5-20251101-v1:0',
      max_tokens: 2048,
      system:
        'You are a helpful meal planning assistant. Given a list of fridge and pantry items and user preferences, suggest 3 meals. For each meal return a name, a full step-by-step recipe, and a shopping list of extra ingredients needed. Respond ONLY in valid JSON. No markdown, no explanation.',
      messages: [{ role: 'user', content: userMessage }],
    });

    const raw = response.content[0].text;
    // Strip markdown fences if model wraps output despite instructions
    const text = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    try {
      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch {
      console.error('AI raw response:', raw.slice(0, 500));
      res.status(500).json({ error: 'AI returned invalid response, try again' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
