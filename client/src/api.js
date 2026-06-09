import { getSession } from './auth';
import { dlog } from './debug';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function apiFetch(path, options = {}) {
  const { data } = await getSession();
  const token = data?.session?.token;

  const isFormData = options.body instanceof FormData;
  const method = options.method || 'GET';
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    });
    dlog(`API ${method} ${path} → ${res.status}${token ? '' : ' (NO TOKEN)'}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error || `Request failed: ${res.status}`);
    }
    return res.json();
  } catch (e) {
    dlog(`API ${method} ${path} ✗ ${e.message}`);
    throw e;
  }
}
