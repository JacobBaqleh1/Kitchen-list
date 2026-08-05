import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import * as SecureStore from 'expo-secure-store';
import { createAuthClient } from '@neondatabase/neon-js/auth';
import { BetterAuthReactAdapter } from '@neondatabase/auth/react/adapters';
import { API_URL, NEON_AUTH_URL } from './config';

const SESSION_KEY = 'mykitchenlist.session';
const SIGNED_OUT_TOKEN_KEY = 'mykitchenlist.signedOutToken';
const SIGNED_OUT_KEY = 'mykitchenlist.signedOut';
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
        const token = data?.session?.token;
        if (token && data?.user) {
          // Fresh login supersedes any prior explicit sign-out (matches web auth.js).
          clearExplicitSignOut();
          void clearSignedOutState();
          persistSession({ session: data.session, user: data.user });
          markPersistedValidationValid(token);
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
  deleteUser: (args?: { password?: string; callbackURL?: string }) => Promise<{ data?: { message?: string } }>;
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
let signedOutTokenCache: string | null | undefined;
let signedOutFlagCache: boolean | undefined;

function shouldIgnoreAuthSession(token: string) {
  if (explicitSignOut.active) {
    if (!explicitSignOut.token || explicitSignOut.token === token) return true;
  }
  if (signedOutFlagCache === true) {
    if (signedOutTokenCache && signedOutTokenCache === token) return true;
  }
  return false;
}

async function readSignedOutState() {
  if (signedOutTokenCache === undefined) {
    try {
      signedOutTokenCache = (await SecureStore.getItemAsync(SIGNED_OUT_TOKEN_KEY)) ?? null;
    } catch {
      signedOutTokenCache = null;
    }
  }
  if (signedOutFlagCache === undefined) {
    try {
      signedOutFlagCache = (await SecureStore.getItemAsync(SIGNED_OUT_KEY)) === '1';
    } catch {
      signedOutFlagCache = false;
    }
  }
  return { signedOutToken: signedOutTokenCache, signedOut: signedOutFlagCache };
}

async function persistSignedOutState(token: string | null) {
  signedOutTokenCache = token;
  signedOutFlagCache = true;
  try {
    if (token) {
      await SecureStore.setItemAsync(SIGNED_OUT_TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(SIGNED_OUT_TOKEN_KEY);
    }
    await SecureStore.setItemAsync(SIGNED_OUT_KEY, '1');
  } catch {
    /* in-memory fallback */
  }
}

async function clearSignedOutState() {
  signedOutTokenCache = null;
  signedOutFlagCache = false;
  try {
    await SecureStore.deleteItemAsync(SIGNED_OUT_TOKEN_KEY);
    await SecureStore.deleteItemAsync(SIGNED_OUT_KEY);
  } catch {
    /* ignore */
  }
}

function isSignedOutStateLoaded() {
  return signedOutTokenCache !== undefined && signedOutFlagCache !== undefined;
}

export async function clearPersistedSession() {
  inMemorySession = null;
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export async function readPersistedSession() {
  await readSignedOutState();
  if (signedOutFlagCache && !signedOutTokenCache) {
    await clearPersistedSession();
    return null;
  }
  if (inMemorySession && hasUsableSession(inMemorySession)) {
    const token = (inMemorySession as { session?: { token?: string } }).session?.token ?? null;
    if (token && signedOutTokenCache === token) {
      await clearPersistedSession();
      return null;
    }
    return inMemorySession;
  }
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;
    const sessionData = JSON.parse(raw);
    if (!hasUsableSession(sessionData)) {
      await clearPersistedSession();
      return null;
    }
    const token = sessionData?.session?.token ?? null;
    if (signedOutFlagCache && (!token || signedOutTokenCache === token)) {
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
  const token = (sessionData as { session?: { token?: string } }).session?.token ?? null;
  if (token && shouldIgnoreAuthSession(token)) return;
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
  const token =
    lastLiveToken ??
    (inMemorySession as { session?: { token?: string } } | null)?.session?.token ??
    (storedSessionCache as { session?: { token?: string } } | null | undefined)?.session?.token ??
    null;
  explicitSignOut.token = token;
  void persistSignedOutState(token);
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
  await readSignedOutState();
  if (shouldIgnoreAuthSession(token)) {
    if (persistedValidation.token !== token) {
      persistedValidation.token = token;
      persistedValidation.status = 'rejected';
      notifyValidation();
    }
    void clearPersistedSession();
    return;
  }
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
  const [signedOutStateReady, setSignedOutStateReady] = useState(false);

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
    void readSignedOutState().then(() => setSignedOutStateReady(true));
  }, []);

  useEffect(() => {
    void getStoredSession().then((stored) => setStoredSession(stored));
  }, [persistedVersion]);

  useEffect(() => {
    if (explicitSignOut.active) {
      void clearPersistedSession();
      setStoredSession(null);
      return;
    }
    if (!isSignedOutStateLoaded()) return;
    if (signedOutFlagCache && liveToken && signedOutTokenCache === liveToken) {
      return;
    }
    if (liveIsUsable && liveSessionData) {
      const token = liveToken;
      if (token && shouldIgnoreAuthSession(token)) return;
      void clearSignedOutState();
      void persistSession(liveSessionData as { session: unknown; user: unknown });
      setStoredSession(liveSessionData);
      resetPersistedValidation();
      invalidateStoredSessionCache();
      return;
    }
    const token = storedSession?.session?.token;
    if (token) validatePersistedSession(token);
  }, [liveSessionData, liveIsUsable, liveIsPending, liveToken, persistedVersion, storedSession?.session?.token]);

  const refetch = useCallback(
    async (...args: unknown[]) => liveRefetch?.(...(args as [])),
    [liveRefetch],
  );

  const base = { isPending: liveIsPending, refetch };

  if (!signedOutStateReady && (liveIsUsable || storedSession)) {
    return { ...base, data: null, isPending: true };
  }

  if (explicitSignOut.active) {
    return { ...base, data: null, isPending: false };
  }

  if (liveIsUsable) {
    if (liveToken && shouldIgnoreAuthSession(liveToken)) {
      return { ...base, data: null, isPending: false };
    }
    return { ...base, data: liveSessionData };
  }

  if (storedSession && validationStatus === 'valid') {
    const token = storedSession?.session?.token;
    if (token && shouldIgnoreAuthSession(token)) {
      return { ...base, data: null, isPending: false };
    }
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
