import { API_URL } from './config';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token ?? null;
}

export function getAuthToken() {
  return authToken;
}

function formatApiError(path: string, res: Response, body: { error?: string }) {
  const detail = body.error || res.statusText || `HTTP ${res.status}`;
  return `${detail} (${path})`;
}

/**
 * Authenticated API helper.
 *
 * Avoids auth.getSession() (better-fetch always attaches AbortController.signal)
 * and never forwards `signal` — Expo SDK 56's winter fetch + incomplete RN
 * AbortSignal has produced Hermes "undefined is not a function" on TestFlight
 * (items list, photo scan, and other apiFetch callers share this path).
 * Uses .then() for the network call so a broken native await path cannot
 * resolve the Response to undefined (expo/expo#45592).
 * RN XHR fetch is forced via EXPO_PUBLIC_USE_RN_FETCH (see fetch-guard / metro).
 */
export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = authToken;
  if (!token) {
    throw new Error(`Not authenticated (${path})`);
  }

  // Drop any AbortSignal — callers and wrappers must not pass one on RN.
  const { signal: _signal, headers: optionHeaders, ...rest } = options;
  const isFormData = rest.body instanceof FormData;
  const method = String(rest.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = {
    ...(optionHeaders as Record<string, string> | undefined),
    Authorization: `Bearer ${token}`,
  };
  if (!isFormData && rest.body != null && method !== 'GET' && method !== 'HEAD') {
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  let res: Response;
  try {
    res = await new Promise<Response>((resolve, reject) => {
      fetch(`${API_URL}${path}`, { ...rest, method, headers })
        .then((response) => {
          if (response == null) {
            reject(new Error(`Empty fetch response (${path})`));
            return;
          }
          resolve(response);
        })
        .catch(reject);
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Network error (${path}): ${msg}`);
  }

  if (__DEV__) {
    console.log(`[api] ${method} ${path} → ${res.status}`);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(formatApiError(path, res, body));
  }

  if (typeof res.json !== 'function') {
    throw new Error(`Invalid response object (${path})`);
  }

  try {
    return await res.json();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`JSON parse failed (${path}): ${msg}`);
  }
}

export async function apiFetchPublic(path: string, options: RequestInit = {}) {
  const { signal: _signal, headers: optionHeaders, ...rest } = options;
  const res = await new Promise<Response>((resolve, reject) => {
    fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(optionHeaders as Record<string, string> | undefined),
      },
    })
      .then((response) => {
        if (response == null) {
          reject(new Error(`Empty fetch response (${path})`));
          return;
        }
        resolve(response);
      })
      .catch(reject);
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
