import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { logFailedLogin } from '../lib/securityLog.js';

const router = Router();

// Bound reporting so a compromised client can't flood logs. Threshold for the
// spike alert is 20/5min, so 60/5min leaves headroom without allowing abuse.
const reportLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  handler: (_req, res) => res.status(429).json({ error: 'Too many reports' }),
});

// Clients call this when Neon Auth sign-in fails (auth lives outside this API).
// Body is optional metadata only — never send passwords.
router.post('/login-failure', reportLimit, (req, res) => {
  const status = Number(req.body?.status) || null;
  const reason = typeof req.body?.reason === 'string'
    ? req.body.reason.slice(0, 120)
    : null;
  const source = typeof req.body?.source === 'string'
    ? req.body.source.slice(0, 40)
    : 'unknown';

  logFailedLogin(req, { status, reason, source });
  res.status(204).end();
});

export default router;
