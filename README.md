# KitchenList

A smart fridge and pantry tracker that uses AI to suggest meals from what you already have in stock.

## Features

- **Fridge & pantry tracking** — add items manually or scan a photo to auto-detect them
- **AI meal suggestions** — Claude analyzes your current inventory and suggests 3 meals with step-by-step recipes and a shopping list for missing ingredients
- **Dietary preferences** — set allergies and dislikes so suggestions always fit your needs
- **Per-user data** — authenticated accounts keep your inventory and preferences private
- **Share your list** — invite anyone (by email, or just a link) to view your kitchen read-only, Google-Doc style. No account required to view.
- **Live chat** — viewers and the list owner can chat in real time over WebSockets while looking at the shared list

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
# for sharing emails (optional): RESEND_API_KEY, SHARE_EMAIL_FROM, APP_BASE_URL
# apply the schema (adds the new `shares` / `share_messages` tables):
npm run db:push
npm run dev
```

> **Sharing & chat.** The server hosts a WebSocket endpoint at `/ws/shares` on
> the same port as the API, so the client only needs `VITE_API_URL` (the WS URL
> is derived from it). Invite emails are sent via [Resend](https://resend.com)
> when `RESEND_API_KEY` is set; otherwise the share still works and the link is
> shown in the UI to copy/send manually. People without a MyKitchenList account
> can open a share link, view the list read-only, pick a display name, and chat
> with the owner — and they're nudged to create their own account.

**Client**
```bash
cd client
npm install
# create a .env with VITE_API_URL pointing to your local server
npm run dev
```

