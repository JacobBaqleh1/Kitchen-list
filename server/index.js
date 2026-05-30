import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import itemsRouter from './routes/items.js';
import preferencesRouter from './routes/preferences.js';
import mealRouter from './routes/meal.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/items', itemsRouter);
app.use('/api/preferences', preferencesRouter);
app.use('/api/meal', mealRouter);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
