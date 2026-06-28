import { Router } from 'express';
import { randomBytes } from 'crypto';
import { eq, and, asc } from 'drizzle-orm';
import { db } from '../db.js';
import { shares, shareMessages, items } from '../schema.js';
import { requireAuth } from '../middleware/auth.js';
import { sendShareInvite } from '../lib/email.js';

const router = Router();

const APP_BASE_URL = process.env.APP_BASE_URL || 'https://mykitchenlist.app';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function shareUrl(token) {
  return `${APP_BASE_URL.replace(/\/$/, '')}/s/${token}`;
}

// Shape a share row for the owner's management UI (never leaks across users).
function ownerShareView(row) {
  return {
    id: row.id,
    token: row.token,
    url: shareUrl(row.token),
    invitedEmail: row.invitedEmail,
    status: row.status,
    createdAt: row.createdAt,
  };
}

// ---- Public, token-gated endpoints (NO auth — this is the whole point of a
// shareable link). Mounted before requireAuth so anyone with the link can read.

// Resolve a share token to the owner's read-only list.
router.get('/view/:token', async (req, res) => {
  try {
    const [share] = await db.select().from(shares)
      .where(eq(shares.token, req.params.token));
    if (!share || share.status !== 'active') {
      return res.status(404).json({ error: 'This shared list is no longer available' });
    }

    const list = await db.select().from(items)
      .where(eq(items.userId, share.ownerId))
      .orderBy(items.createdAt);

    res.json({
      share: { id: share.id, token: share.token, ownerName: share.ownerName },
      items: list.map(({ userId, ...rest }) => rest),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Chat history for a share (token-gated). Live messages stream over WebSockets;
// this is the initial backfill on page load / reconnect.
router.get('/view/:token/messages', async (req, res) => {
  try {
    const [share] = await db.select().from(shares)
      .where(eq(shares.token, req.params.token));
    if (!share || share.status !== 'active') {
      return res.status(404).json({ error: 'This shared list is no longer available' });
    }
    const history = await db.select().from(shareMessages)
      .where(eq(shareMessages.shareId, share.id))
      .orderBy(asc(shareMessages.createdAt));
    res.json({ messages: history });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Owner endpoints (authenticated) ----
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const rows = await db.select().from(shares)
      .where(and(eq(shares.ownerId, req.user.id), eq(shares.status, 'active')))
      .orderBy(asc(shares.createdAt));
    res.json(rows.map(ownerShareView));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const ownerName = (req.body.ownerName || '').trim()
    || req.user.name
    || (req.user.email ? req.user.email.split('@')[0] : null);

  if (email && !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  try {
    const token = randomBytes(24).toString('base64url');
    const [share] = await db.insert(shares).values({
      token,
      ownerId: req.user.id,
      ownerName,
      invitedEmail: email || null,
    }).returning();

    let emailResult = { sent: false, reason: 'no_recipient' };
    if (email) {
      emailResult = await sendShareInvite({
        to: email,
        ownerName,
        shareUrl: shareUrl(token),
      });
    }

    res.status(201).json({ ...ownerShareView(share), emailSent: emailResult.sent });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [updated] = await db.update(shares)
      .set({ status: 'revoked' })
      .where(and(eq(shares.id, req.params.id), eq(shares.ownerId, req.user.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
