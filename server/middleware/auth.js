import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL(process.env.NEON_AUTH_JWKS_URL)
);

// Verify a Neon Auth JWT and project the claims we care about. Returns null on
// any failure so callers (HTTP middleware and the WebSocket upgrade handler)
// can decide how to react. Name/email are best-effort: not every provider puts
// them in the token, so consumers must fall back gracefully.
export async function verifyToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWKS);
    return {
      id: payload.sub,
      name: payload.name || payload.given_name || null,
      email: payload.email || null,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const user = await verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid or expired token' });

  req.user = user;
  next();
}
