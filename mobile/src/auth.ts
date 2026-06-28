import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import * as SecureStore from 'expo-secure-store';
import { createAuthClient } from '@neondatabase/neon-js/auth';
import { BetterAuthReactAdapter } from '@neondatabase/auth/react/adapters';
import { API_URL, NEON_AUTH_URL } from './config';

const SESSION_KEY = 'mykitchenlist.session';
const EXPIRY_SKEW_MS = 30_000;

export type SessionData = {
  session?: { token?: string; expiresAt?: string | Date };
  user?: { id?: string | number; name?: string | null; email?: string };
} | null;

export const auth = createAuthClient(NEON_AUTH_URL, {
  adapter: BetterAuthReactAdapter(),
  fetchOptions: {
    onRequest: (request: { url?: string }) => {
      try {
        if (String(request?.url ?? '').includes('/sign-out')) beginExplicitSignOut();
      } catch {
        /* ignore */
      }
    },
    onSuccess: (ctx: { data?: { session?: { token?: string; expiresAt?: string }; user?: unknown } }) => {
      try {
        const data = ctx?.data;
        if (data?.session?.token && data?.user) {
          clearExplicitSignOut();
          persistSession({ session: data.session, user: data.user });
          markPersistedValidationValid(data.session.token);
          notifyPersistedSession();
        }
        clearAuthError();
      } catch {
        /* ignore */
      }
    },
    onError: (ctx: { response?: { status?: number }; error?: { message?: string; statusText?: string } }) => {
      try {
        const status = ctx?.response?.status;
        const message =
          ctx?.error?.message ||
          ctx?.error?.statusText ||
          (status ? `Request failed (${status})` : 'Network request failed');
        notifyAuthError(message);
      } catch {
        /* ignore */
      }
    },
  },
} as Parameters<typeof createAuthClient>[1]) as ReturnType<typeof createAuthClient> & {
  signIn: { email: (args: { email: string; password: string }) => Promise<unknown>; social: (args: { provider: string; callbackURL: string }) => Promise<unknown> };
  signUp: { email: (args: { email: string; password: string; name: string }) => Promise<unknown> };
  signOut: () => Promise<unknown>;
  useSession: () => { data: unknown; isPending: boolean; refetch?: (...args: unknown[]) => Promise<unknown> };
  getSession: () => Promise<{ data: { session?: { token?: string }; user?: unknown } | null }>;
};

const authErrorStore = { message: null as string | null, listeners: new Set<() => void>() };

function notifyAuthError(message: string) {
  authErrorStore.message = message;
  for (const listener of authErrorStore.listeners) listener();
}

export function clearAuthError() {
  if (authErrorStore.message === null) return;
  authErrorStore.message = null;
  for (const listener of authErrorStore.listeners) listener();
}

function subscribeAuthError(listener: () => void) {
  authErrorStore.listeners.add(listener);
  return () => authErrorStore.listeners.delete(listener);
}

function getAuthErrorSnapshot() {
  return authErrorStore.message;
}

export function useAuthError() {
  return useSyncExternalStore(subscribeAuthError, getAuthErrorSnapshot, () => null);
}

function hasUsableSession(sessionData: unknown) {
  const data = sessionData as { session?: { token?: string; expiresAt?: string | Date } } | null;
  const token = data?.session?.token;
  if (!token) return false;
  const expiresAt = data?.session?.expiresAt;
  if (!expiresAt) return true;
  const expiresAtMs = new Date(expiresAt).getTime();
  return Number.isFinite(expiresAtMs) && expiresAtMs > Date.now() + EXPIRY_SKEW_MS;
}

let inMemorySession: { session: unknown; user: unknown } | null = null;

export async function clearPersistedSession() {
  inMemorySession = null;
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export async function readPersistedSession() {
  if (inMemorySession && hasUsableSession(inMemorySession)) return inMemorySession;
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;
    const sessionData = JSON.parse(raw);
    if (!hasUsableSession(sessionData)) {
      await clearPersistedSession();
      return null;
    }
    inMemorySession = sessionData;
    return sessionData;
  } catch {
    await clearPersistedSession();
    return null;
  }
}

export async function persistSession(sessionData: { session: unknown; user: unknown }) {
  if (!hasUsableSession(sessionData)) {
    await clearPersistedSession();
    return;
  }
  inMemorySession = sessionData;
  try {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(sessionData));
  } catch {
    /* in-memory fallback */
  }
}

const persistedValidation = {
  status: 'idle' as 'idle' | 'validating' | 'valid' | 'rejected' | 'error',
  token: null as string | null,
  listeners: new Set<() => void>(),
};

function notifyValidation() {
  for (const listener of persistedValidation.listeners) listener();
}

function subscribeValidation(listener: () => void) {
  persistedValidation.listeners.add(listener);
  return () => persistedValidation.listeners.delete(listener);
}

function getValidationStatus() {
  return persistedValidation.status;
}

const persistedSessionStore = { version: 0, listeners: new Set<() => void>() };

function notifyPersistedSession() {
  persistedSessionStore.version += 1;
  for (const listener of persistedSessionStore.listeners) listener();
}

function subscribePersistedSession(listener: () => void) {
  persistedSessionStore.listeners.add(listener);
  return () => persistedSessionStore.listeners.delete(listener);
}

function getPersistedSessionVersion() {
  return persistedSessionStore.version;
}

const explicitSignOut = {
  active: false,
  token: null as string | null,
  listeners: new Set<() => void>(),
};

function notifyExplicitSignOut() {
  for (const listener of explicitSignOut.listeners) listener();
}

function subscribeExplicitSignOut(listener: () => void) {
  explicitSignOut.listeners.add(listener);
  return () => explicitSignOut.listeners.delete(listener);
}

function getExplicitSignOutSnapshot() {
  return `${explicitSignOut.active ? '1' : '0'}:${explicitSignOut.token ?? ''}`;
}

function beginExplicitSignOut() {
  explicitSignOut.active = true;
  explicitSignOut.token = lastLiveToken;
  void clearPersistedSession();
  resetPersistedValidation();
  notifyExplicitSignOut();
}

function finishExplicitSignOut() {
  void clearPersistedSession();
  resetPersistedValidation();
}

function clearExplicitSignOut() {
  if (!explicitSignOut.active) return;
  explicitSignOut.active = false;
  explicitSignOut.token = null;
  notifyExplicitSignOut();
}

function resetPersistedValidation() {
  if (persistedValidation.status === 'idle' && persistedValidation.token === null) return;
  persistedValidation.status = 'idle';
  persistedValidation.token = null;
  notifyValidation();
}

async function validatePersistedSession(token: string) {
  if (!token) return;
  if (persistedValidation.token === token && persistedValidation.status !== 'idle') return;

  persistedValidation.token = token;
  persistedValidation.status = 'validating';
  notifyValidation();

  let nextStatus: 'valid' | 'rejected' | 'error';
  try {
    const res = await fetch(`${API_URL}/api/auth/session`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) nextStatus = 'valid';
    else if (res.status === 401 || res.status === 403) nextStatus = 'rejected';
    else nextStatus = 'error';
  } catch {
    nextStatus = 'error';
  }

  if (persistedValidation.token !== token) return;
  persistedValidation.status = nextStatus;
  if (nextStatus === 'rejected') void clearPersistedSession();
  notifyValidation();
}

function markPersistedValidationValid(token: string) {
  if (!token) return;
  persistedValidation.token = token;
  persistedValidation.status = 'valid';
  notifyValidation();
}

let lastLiveToken: string | null = null;
let storedSessionCache: Awaited<ReturnType<typeof readPersistedSession>> | undefined;

async function getStoredSession() {
  if (storedSessionCache !== undefined) return storedSessionCache;
  storedSessionCache = await readPersistedSession();
  return storedSessionCache;
}

export function invalidateStoredSessionCache() {
  storedSessionCache = undefined;
}

export function clientSignOut() {
  beginExplicitSignOut();
  invalidateStoredSessionCache();
  return Promise.resolve()
    .then(() => auth.signOut())
    .catch(() => {})
    .finally(finishExplicitSignOut);
}

export function usePersistentSession() {
  const [storedSession, setStoredSession] = useState<SessionData>(null);

  const liveSession = auth.useSession();
  const liveSessionData = liveSession.data as SessionData;
  const { isPending: liveIsPending, refetch: liveRefetch } = liveSession;
  const validationStatus = useSyncExternalStore(
    subscribeValidation,
    getValidationStatus,
    () => 'idle' as const,
  );
  useSyncExternalStore(subscribeExplicitSignOut, getExplicitSignOutSnapshot, () => '0:');
  const persistedVersion = useSyncExternalStore(
    subscribePersistedSession,
    getPersistedSessionVersion,
    () => 0,
  );

  const liveIsUsable = hasUsableSession(liveSessionData);
  const liveToken = (liveSessionData as { session?: { token?: string } } | null)?.session?.token ?? null;

  useEffect(() => {
    lastLiveToken = liveToken;
  }, [liveToken]);

  useEffect(() => {
    if (!explicitSignOut.active || !liveToken) return;
    if (!explicitSignOut.token || liveToken !== explicitSignOut.token) {
      clearExplicitSignOut();
    }
  }, [liveToken]);

  useEffect(() => {
    void getStoredSession().then((stored) => setStoredSession(stored));
  }, [persistedVersion]);

  useEffect(() => {
    if (explicitSignOut.active) {
      void clearPersistedSession();
      setStoredSession(null);
      return;
    }
    if (liveIsUsable && liveSessionData) {
      void persistSession(liveSessionData as { session: unknown; user: unknown });
      setStoredSession(liveSessionData);
      resetPersistedValidation();
      invalidateStoredSessionCache();
      return;
    }
    const token = storedSession?.session?.token;
    if (token) validatePersistedSession(token);
  }, [liveSessionData, liveIsUsable, liveIsPending, persistedVersion, storedSession?.session?.token]);

  const refetch = useCallback(
    async (...args: unknown[]) => liveRefetch?.(...(args as [])),
    [liveRefetch],
  );

  const base = { isPending: liveIsPending, refetch };

  if (explicitSignOut.active) {
    return { ...base, data: null, isPending: false };
  }

  if (liveIsUsable) {
    return { ...base, data: liveSessionData };
  }

  if (storedSession && validationStatus === 'valid') {
    return { ...base, data: storedSession, isPending: false };
  }

  if (liveIsPending) {
    return { ...base, data: null };
  }

  if (!storedSession) {
    return { ...base, data: null };
  }

  if (validationStatus === 'rejected' || validationStatus === 'error') {
    return { ...base, data: null, isPending: false };
  }

  return { ...base, data: null, isPending: true };
}
