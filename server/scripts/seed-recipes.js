import 'dotenv/config';
import { seedRecipesFromApify } from '../lib/apifySeed.js';

// Thin CLI wrapper around the Apify -> Neon seeder. Run: npm run seed:recipes
seedRecipesFromApify()
  .then(n => {
    console.log(`Done. ${n} recipe rows processed.`);
    process.exit(0);
  })
  .catch(e => {
    console.error('Seeding failed:', e.message);
    process.exit(1);
  });
