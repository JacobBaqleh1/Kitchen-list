import * as Sentry from '@sentry/node';

const FAILED_LOGIN_WINDOW_MS = 5 * 60 * 1000;
const FAILED_LOGIN_SPIKE_THRESHOLD = 20;

// ip -> timestamps of failed login reports in the sliding window
const failedLoginByIp = new Map();
// ip -> last spike alert time (avoid flooding Sentry on every extra attempt)
const spikeAlertedAt = new Map();

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Emit a structured security event to stdout (Render logs) and Sentry Logs.
 * Never include passwords or full tokens in `attrs`.
 */
export function logSecurityEvent(event, attrs = {}) {
  const payload = {
    level: attrs.level || 'warn',
    event,
    timestamp: new Date().toISOString(),
    ...attrs,
  };
  delete payload.level;

  const line = JSON.stringify({ level: attrs.level || 'warn', ...payload });
  if ((attrs.level || 'warn') === 'error') console.error(line);
  else console.warn(line);

  if (!process.env.SENTRY_DSN) return;

  const { level: _level, message, ...rest } = attrs;
  const logAttrs = { 'security.event': event, ...flattenAttrs(rest) };
  const msg = message || event;

  try {
    if (attrs.level === 'error') Sentry.logger.error(msg, logAttrs);
    else Sentry.logger.warn(msg, logAttrs);
  } catch {
    /* never let telemetry break the request path */
  }
}

function flattenAttrs(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value == null) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    } else {
      out[key] = String(value);
    }
  }
  return out;
}

function pruneWindow(timestamps, now) {
  const cutoff = now - FAILED_LOGIN_WINDOW_MS;
  while (timestamps.length && timestamps[0] < cutoff) timestamps.shift();
}

/**
 * Record a failed login for an IP. Returns spike info when the threshold is crossed.
 */
export function recordFailedLogin(ip) {
  const now = Date.now();
  let timestamps = failedLoginByIp.get(ip);
  if (!timestamps) {
    timestamps = [];
    failedLoginByIp.set(ip, timestamps);
  }
  pruneWindow(timestamps, now);
  timestamps.push(now);

  const count = timestamps.length;
  if (count < FAILED_LOGIN_SPIKE_THRESHOLD) {
    return { count, spiked: false };
  }

  const lastAlert = spikeAlertedAt.get(ip) || 0;
  if (now - lastAlert < FAILED_LOGIN_WINDOW_MS) {
    return { count, spiked: false, alreadyAlerted: true };
  }
  spikeAlertedAt.set(ip, now);
  return { count, spiked: true };
}

export function logFailedLogin(req, details = {}) {
  const ip = clientIp(req);
  const { count, spiked } = recordFailedLogin(ip);

  logSecurityEvent('security.failed_login', {
    message: 'Failed login attempt',
    ip,
    path: req.originalUrl || req.url,
    method: req.method,
    countInWindow: count,
    ...details,
  });

  if (spiked) {
    logSecurityEvent('security.failed_login_spike', {
      level: 'error',
      message: `Failed login spike: ${count} attempts from one IP in 5 minutes`,
      ip,
      countInWindow: count,
      windowMinutes: 5,
      threshold: FAILED_LOGIN_SPIKE_THRESHOLD,
    });

    if (process.env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        scope.setLevel('error');
        scope.setTag('security.event', 'failed_login_spike');
        scope.setFingerprint(['security.failed_login_spike', ip]);
        scope.setContext('security', {
          ip,
          countInWindow: count,
          windowMinutes: 5,
          threshold: FAILED_LOGIN_SPIKE_THRESHOLD,
        });
        Sentry.captureMessage(
          `Failed login spike: ${count} attempts from ${ip} in 5 minutes`,
          'error',
        );
      });
    }
  }

  return { count, spiked };
}

export function logForbidden(req, details = {}) {
  logSecurityEvent('security.forbidden', {
    message: 'HTTP 403 Forbidden',
    ip: clientIp(req),
    path: req.originalUrl || req.url,
    method: req.method,
    userId: req.user?.id || null,
    ...details,
  });
}

export function logRateLimitHit(req, details = {}) {
  logSecurityEvent('security.rate_limit', {
    message: 'Rate limit exceeded',
    ip: clientIp(req),
    path: req.originalUrl || req.url,
    method: req.method,
    userId: req.user?.id || null,
    ...details,
  });
}

export function logAuthRejected(req, details = {}) {
  logSecurityEvent('security.auth_rejected', {
    message: 'Authentication rejected',
    ip: clientIp(req),
    path: req.originalUrl || req.url,
    method: req.method,
    ...details,
  });
}

export { clientIp, FAILED_LOGIN_SPIKE_THRESHOLD, FAILED_LOGIN_WINDOW_MS };
