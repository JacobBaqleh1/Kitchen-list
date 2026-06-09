import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { sql } from 'drizzle-orm';
import { db } from './db.js';
import itemsRouter from './routes/items.js';
import preferencesRouter from './routes/preferences.js';
import mealRouter from './routes/meal.js';
import photosRouter from './routes/photos.js';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
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

// Touches the DB so UptimeRobot's 5-min ping keeps both the Render process and
// the Neon compute warm (SELECT 1 = negligible payload, no auth required).
app.get('/health', async (_, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ status: 'ok' });
  } catch {
    res.status(500).json({ status: 'db_error' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
