import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { sql } from 'drizzle-orm';
import { db } from './db.js';
import itemsRouter from './routes/items.js';
import preferencesRouter from './routes/preferences.js';
import mealRouter from './routes/meal.js';
import photosRouter from './routes/photos.js';
import sharesRouter from './routes/shares.js';
import accountRouter from './routes/account.js';
import savedMealsRouter from './routes/savedMeals.js';
import { requireAuth } from './middleware/auth.js';
import { initShareChat } from './ws/shareChat.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Render serves behind a reverse proxy; trust the first hop so req.ip reflects
// the real client (used by the rate limiter's IP fallback).
app.set('trust proxy', 1);

const allowedOrigins = [
  'https://mykitchenlist.app',
  'https://www.mykitchenlist.app',
  'https://mykitchenlist.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
];
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
  credentials: true,
}));
app.use(express.json());

app.use('/api/items', itemsRouter);
app.use('/api/preferences', preferencesRouter);
app.use('/api/meal', mealRouter);
app.use('/api/photos', photosRouter);
app.use('/api/shares', sharesRouter);
app.use('/api/account', accountRouter);
app.use('/api/saved-meals', savedMealsRouter);

// Authoritative session check: verifies the bearer token server-side and echoes
// the user it resolves to. Clients (notably the iOS standalone PWA, which can
// only persist a token in localStorage) call this before trusting a restored
// session, so a stored token alone never grants access to the UI.
app.get('/api/auth/session', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Touches the DB so UptimeRobot's 5-min ping keeps both the Render process and
// the Neon compute warm (SELECT 1 = negligible payload, no auth required).
// See docs/MONITORING.md for how to use this in production.
const startedAt = Date.now();
app.get('/health', async (_, res) => {
  const mem = process.memoryUsage();
  const base = {
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    memoryMb: {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      rss: Math.round(mem.rss / 1024 / 1024),
    },
    timestamp: new Date().toISOString(),
  };
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ status: 'ok', db: 'ok', ...base });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'error', ...base });
  }
});

// Wrap Express in a bare HTTP server so the WebSocket chat can share the same
// port (Render exposes a single port and supports WS over the same listener).
const server = createServer(app);
initShareChat(server);

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
