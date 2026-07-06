import { Router } from 'express';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../db.js';
import { items, preferences, receipts, shares, shareMessages } from '../schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// Permanently delete all app data for the authenticated user. The Neon Auth
// account itself is removed separately via auth.deleteUser() on the client.
router.delete('/', async (req, res) => {
  const userId = req.user.id;
  try {
    const userShares = await db.select({ id: shares.id }).from(shares)
      .where(eq(shares.ownerId, userId));
    const shareIds = userShares.map((s) => s.id);

    if (shareIds.length > 0) {
      await db.delete(shareMessages).where(inArray(shareMessages.shareId, shareIds));
      await db.delete(shares).where(eq(shares.ownerId, userId));
    }

    await db.delete(items).where(eq(items.userId, userId));
    await db.delete(preferences).where(eq(preferences.userId, userId));
    await db.delete(receipts).where(eq(receipts.userId, userId));

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
