import { auth } from './auth';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function apiFetch(path, options = {}) {
  const token = await auth.getJWTToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}
