import 'dotenv/config';
import * as Sentry from '@sentry/node';

// Loaded via `node --import ./instrument.mjs` before the app, so Express and
// other modules are auto-instrumented. No-op when SENTRY_DSN is unset (local).
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    enableLogs: true,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  });
}
