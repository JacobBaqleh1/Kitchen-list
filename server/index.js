import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
