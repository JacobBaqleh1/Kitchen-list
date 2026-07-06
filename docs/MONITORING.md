# Production monitoring

MyKitchenList runs on managed services. You do not need to run your own monitoring stack to start — each provider has a dashboard, and the API exposes a health endpoint external uptime checks can ping.

## What to watch

| Signal | Where | What it tells you |
|--------|-------|-------------------|
| API up / DB reachable | `GET https://kitchen-list.onrender.com/health` | Render process is running and Neon responds |
| API CPU, memory, restarts | [Render dashboard](https://dashboard.render.com) → `kitchenlist-api` → Metrics | Single-instance saturation, OOM, crash loops |
| DB compute & connections | [Neon console](https://console.neon.tech) → your project → Monitoring | Query latency, compute usage, storage |
| Web traffic & Web Vitals | [Vercel dashboard](https://vercel.com) → Analytics / Speed Insights | Frontend errors and slow pages (already enabled in the client) |
| Downtime alerts | [UptimeRobot](https://uptimerobot.com) (or similar) | Email/SMS when `/health` stops returning 200 |

## Health endpoint

```bash
curl -s https://kitchen-list.onrender.com/health | jq
```

Example response:

```json
{
  "status": "ok",
  "db": "ok",
  "uptimeSeconds": 86412,
  "memoryMb": { "heapUsed": 42, "rss": 78 },
  "timestamp": "2026-07-06T09:00:00.000Z"
}
```

- `status: "ok"` — process and database are healthy.
- `status: "degraded"` with `db: "error"` — API is up but Neon is unreachable (check Neon status / `DATABASE_URL`).
- `memoryMb.heapUsed` climbing without dropping — possible memory leak or too many concurrent photo scans.

`/health` intentionally runs `SELECT 1` against Neon so a periodic ping (e.g. UptimeRobot every 5 minutes) keeps the Neon compute from going fully cold on the free/low tier.

## Recommended UptimeRobot setup

1. Create a monitor: **HTTP(s)**, URL `https://kitchen-list.onrender.com/health`, interval **5 minutes**.
2. Alert contacts: your email (and optional SMS).
3. Optional keyword check: response body contains `"status":"ok"`.

## Render alerts

In Render → your web service → **Notifications**, enable deploy failure and instance unhealthy alerts.

Useful metrics on the Metrics tab:

- **CPU %** — sustained high CPU → upgrade instance size or reduce Bedrock/photo load.
- **Memory %** — spikes during `/api/photos/scan` are normal; sustained high memory → upgrade RAM.
- **HTTP response times** — p95 latency for API routes.

## Neon alerts

In Neon → project → **Settings → Integrations** (or Monitoring), watch:

- **Compute time** — approaches plan limit → upgrade compute.
- **Storage** — inventory + chat messages grow slowly; recipes table is the largest static dataset.
- **Query duration** — sudden spikes often correlate with traffic or missing indexes.

## What you do *not* need yet

- Custom Grafana/Prometheus — overkill until you outgrow a single Render instance.
- WebSocket-specific monitoring — chat is in-memory on one process; if you add a second Render instance later, watch for “messages only appear after refresh” (sign you need Redis pub/sub).
- Log aggregation (Datadog, etc.) — add when debugging production issues becomes painful.

## When to act

| Symptom | Likely cause | First step |
|---------|--------------|------------|
| `/health` 500, `db: "error"` | Neon outage or bad `DATABASE_URL` | Neon status page, verify env vars on Render |
| Slow meal suggestions | Bedrock quota/latency | Check AWS CloudWatch for Bedrock; rate limits are 20/10min per user |
| Render restarts often | OOM from photo scans | Upgrade Render plan RAM |
| Site loads but API 502 | Render service sleeping (free tier) or crashed | Upgrade to paid Render or increase health ping frequency |
