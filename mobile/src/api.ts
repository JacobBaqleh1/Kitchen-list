import { auth } from './auth';
import { API_URL } from './config';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token ?? null;
}

async function currentToken() {
  if (authToken) return authToken;
  if (typeof auth.getSession !== 'function') return null;
  const { data } = await auth.getSession();
  return (data?.session as { token?: string } | undefined)?.token ?? null;
}

const DEFAULT_TIMEOUT_MS = 30_000;

function formatApiError(path: string, res: Response, body: { error?: string }) {
  const detail = body.error || res.statusText || `HTTP ${res.status}`;
  return `${detail} (${path})`;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await currentToken();
  const isFormData = options.body instanceof FormData;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const send = (bearer: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...(options.headers as Record<string, string> | undefined),
      },
    });

  try {
    let res = await send(token);

    if (__DEV__) {
      console.log(`[api] ${options.method ?? 'GET'} ${path} → ${res.status}`);
    }

    if (res.status === 401 && token && typeof auth.getSession === 'function') {
      const { data } = await auth.getSession();
      const fresh = (data?.session as { token?: string } | undefined)?.token ?? null;
      setAuthToken(fresh);
      if (fresh && fresh !== token) res = await send(fresh);
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(formatApiError(path, res, body));
    }
    return res.json();
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request timed out (${path})`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function apiFetchPublic(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(formatApiError(path, res, body));
  }
  return res.json();
}

export function wsBase() {
  return API_URL.replace(/^http/, 'ws');
}
