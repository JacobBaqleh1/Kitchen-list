import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Per-user rate limiter for the expensive LLM-backed routes (meal suggestions,
// photo scans). Keyed by authenticated user id, so it must be mounted AFTER
// requireAuth. Falls back to the client IP for safety (ipKeyGenerator
// normalizes IPv6 so a single client can't bypass via address rotation).
export function llmRateLimit({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
    handler: (_req, res) =>
      res.status(429).json({ error: message || 'Too many requests — please slow down and try again shortly.' }),
  });
}
