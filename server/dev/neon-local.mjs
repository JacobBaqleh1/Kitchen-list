// Dev-only preload: point the @neondatabase/serverless HTTP driver at a local
// Neon proxy (see docker-compose in AGENTS.md) instead of Neon cloud, so the
// server can run against a local Postgres without any app code changes.
//
// Usage: NODE_OPTIONS='--import ./dev/neon-local.mjs' npm run dev
import { neonConfig } from '@neondatabase/serverless';

const host = process.env.NEON_LOCAL_PROXY_HOST || 'db.localtest.me';
const port = process.env.NEON_LOCAL_PROXY_PORT || '4444';

neonConfig.fetchEndpoint = `http://${host}:${port}/sql`;
neonConfig.poolQueryViaFetch = true;
neonConfig.useSecureWebSocket = false;
neonConfig.wsProxy = (h) => `${host}:${port}/v2`;
