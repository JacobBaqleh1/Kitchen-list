import { logForbidden } from '../lib/securityLog.js';

// Catch any 403 response (present or future) and emit a structured security log.
export function securityResponseLogger(req, res, next) {
  res.on('finish', () => {
    if (res.statusCode === 403) {
      logForbidden(req, { statusCode: 403 });
    }
  });
  next();
}
