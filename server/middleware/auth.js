const NEON_AUTH_URL = process.env.NEON_AUTH_URL;

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const r = await fetch(`${NEON_AUTH_URL}/get-session`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return res.status(401).json({ error: 'Invalid session' });
    const data = await r.json();
    if (!data?.user?.id) return res.status(401).json({ error: 'No user found' });
    req.user = { id: data.user.id };
    next();
  } catch {
    res.status(401).json({ error: 'Auth error' });
  }
}
