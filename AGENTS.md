# AGENTS.md

KitchenList is a smart fridge/pantry tracker with AI meal suggestions. See
`README.md` for the product overview and the canonical run commands.

- `client/` — React 19 + Vite + Tailwind SPA (port 5173). Auth UI via Neon Auth.
- `server/` — Node/Express API (port 3001). Drizzle ORM over the
  `@neondatabase/serverless` driver; AI via AWS Bedrock (Amazon Nova); photo
  storage via Box.

Standard scripts live in each `package.json` (`npm run dev`, `client` has
`lint`/`build`; `server` has `db:push`, `db:setup-search`, `db:setup-indexes`,
`seed:recipes`). `client/.env.example` and `server/.env.example` list env vars.

## Cursor Cloud specific instructions

### External-service dependencies (what does / doesn't run locally)
This app is built around managed cloud services. Without real secrets you can
still run both apps and exercise the full data layer, but these need real
credentials to function:
- **Neon Auth** (`VITE_NEON_AUTH_URL`, `NEON_AUTH_JWKS_URL`) — hosted sign-in.
  Without it the client renders the sign-in page but cannot complete login.
- **AWS Bedrock** (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_REGION`) —
  required only for `/api/meal/suggest` and `/api/photos/scan`.
- **Box** (`BOX_*`) — required only for `/api/photos/scan` uploads.

### Local Postgres for the serverless driver (no cloud DB needed)
The server's `db.js` calls `neon(DATABASE_URL)` (Neon SQL-over-HTTP/WebSocket),
so a plain local Postgres is not directly reachable. Run the bundled proxy:

```
docker compose -f docker-compose.dev.yml up -d   # Postgres :5432 + Neon proxy :4444
```

`server/.env` should set
`DATABASE_URL=postgres://postgres:postgres@db.localtest.me:5432/main`
(`db.localtest.me` resolves to localhost). Run the server/CLI with the dev
preload so the driver targets the local proxy instead of Neon cloud — **this is
the only non-obvious part**:

```
cd server
NODE_OPTIONS='--import ./dev/neon-local.mjs' npm run db:push   # create tables
NODE_OPTIONS='--import ./dev/neon-local.mjs' npm run dev       # start API
```

`GET http://localhost:3001/health` returning `{"status":"ok"}` confirms the
server↔DB path. (Docker itself isn't preinstalled on a bare VM; install it if
the proxy isn't running.)

### Testing authenticated routes without Neon Auth
All `/api/*` routes except `/health` require a Bearer JWT verified against
`NEON_AUTH_JWKS_URL`. For local testing, `server/dev/jwks-dev-server.mjs` mints
RS256 tokens and serves a JWKS:

```
node server/dev/jwks-dev-server.mjs    # JWKS on :9999, writes /tmp/devauth/token.txt
```

Point `NEON_AUTH_JWKS_URL=http://localhost:9999/jwks.json` in `server/.env` and
restart the server, then:
`curl http://localhost:3001/api/items -H "Authorization: Bearer $(cat /tmp/devauth/token.txt)"`.

### Client
`cd client && npm run dev`. Set `VITE_API_URL=http://localhost:3001`. Lint
(`npm run lint`) currently reports pre-existing `react-hooks/set-state-in-effect`
errors in `AddItemForm.jsx`/`FridgeView.jsx` (eslint-plugin-react-hooks v7) —
these are existing code issues, not environment problems.
