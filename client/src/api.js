import { auth } from './auth';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Auth token cached in memory and kept in sync with the live session by
// <SessionTokenSync/> in App.jsx. This avoids a network round trip to the auth
// server (auth.getSession()) before every request — the token is already known
// once the user is signed in. Memory-only: never persisted, cleared on logout.
let authToken = null;
export function setAuthToken(token) {
  authToken = token ?? null;
}

// Fall back to a one-time session fetch only if a request fires before the
// session has synced into the cache (e.g. the very first call after load).
async function currentToken() {
  if (authToken) return authToken;
  const { data } = await auth.getSession();
  return data?.session?.token ?? null;
}

export async function apiFetch(path, options = {}) {
  const token = await currentToken();
  const isFormData = options.body instanceof FormData;

  const send = (bearer) => fetch(`${BASE}${path}`, {
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  let res = await send(token);

  // The cached token may have expired or rotated. Refresh once from the live
  // session and retry before surfacing an auth error.
  if (res.status === 401 && token) {
    const { data } = await auth.getSession();
    const fresh = data?.session?.token ?? null;
    setAuthToken(fresh);
    if (fresh && fresh !== token) res = await send(fresh);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Unauthenticated fetch for token-gated public endpoints (shared list views).
// These work for visitors with no MyKitchenList account, so we never attach a
// bearer token.
export async function apiFetchPublic(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// WebSocket origin derived from the HTTP API base (http->ws, https->wss).
export function wsBase() {
  return BASE.replace(/^http/, 'ws');
}
