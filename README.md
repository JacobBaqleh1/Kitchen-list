# KitchenList

A smart fridge and pantry tracker that uses AI to suggest meals from what you already have in stock.

## Features

- **Fridge & pantry tracking** — add items manually or scan a photo to auto-detect them
- **AI meal suggestions** — Claude analyzes your current inventory and suggests 3 meals with step-by-step recipes and a shopping list for missing ingredients
- **Dietary preferences** — set allergies and dislikes so suggestions always fit your needs
- **Per-user data** — authenticated accounts keep your inventory and preferences private

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, React Router v7, Vite |
| Backend | Node.js, Express |
| Database | Neon (serverless Postgres), Drizzle ORM |
| Auth | Neon Auth |
| AI | Claude via AWS Bedrock |
| Hosting | Vercel (client), Render (API) |

## Running Locally

**Server**
```bash
cd server
npm install
# create a .env with DATABASE_URL, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
npm run dev
```

**Client**
```bash
cd client
npm install
# create a .env with VITE_API_URL pointing to your local server
npm run dev
```

