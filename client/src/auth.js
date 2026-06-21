import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { createAuthClient } from '@neondatabase/neon-js/auth';
import { BetterAuthReactAdapter } from '@neondatabase/auth/react';

export const auth = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL, {
  adapter: BetterAuthReactAdapter(),
});

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const IOS_STANDALONE_SESSION_KEY = 'mykitchenlist.iosStandaloneSession';
const EXPIRY_SKEW_MS = 30_000;

const explicitSignOut = {
  active: false,
  token: null,
  listeners: new Set(),
};

function isIOSDevice() {
  if (typeof window === 'undefined') return false;

  const { navigator } = window;
  const platform = navigator.platform || '';
  const userAgent = navigator.userAgent || '';

  return (
    /iPad|iPhone|iPod/.test(platform) ||
    /iPad|iPhone|iPod/.test(userAgent) ||
    (platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isIOSStandalone() {
  if (typeof window === 'undefined') return false;

  return (
    isIOSDevice() &&
    (window.navigator.standalone === true ||
      window.matchMedia?.('(display-mode: standalone)').matches === true)
  );
}

function hasUsableSession(sessionData) {
  const token = sessionData?.session?.token;
  if (!token) return false;

  const expiresAt = sessionData?.session?.expiresAt;
  if (!expiresAt) return true;

  const expiresAtMs = new Date(expiresAt).getTime();
  return Number.isFinite(expiresAtMs) && expiresAtMs > Date.now() + EXPIRY_SKEW_MS;
}

export function clearPersistedIOSStandaloneSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(IOS_STANDALONE_SESSION_KEY);
}

export function readPersistedIOSStandaloneSession() {
  if (!isIOSStandalone()) return null;

  try {
    const raw = window.localStorage.getItem(IOS_STANDALONE_SESSION_KEY);
    if (!raw) return null;

    const sessionData = JSON.parse(raw);
    if (!hasUsableSession(sessionData)) {
      clearPersistedIOSStandaloneSession();
      return null;
    }

    return sessionData;
  } catch {
    clearPersistedIOSStandaloneSession();
    return null;
  }
}

export function persistIOSStandaloneSession(sessionData) {
  if (!isIOSStandalone()) return;

  if (!hasUsableSession(sessionData)) {
    clearPersistedIOSStandaloneSession();
    return;
  }

  window.localStorage.setItem(IOS_STANDALONE_SESSION_KEY, JSON.stringify(sessionData));
}

// Server-confirmed status of the persisted token. A stored token is only ever
// treated as a real session once `/api/auth/session` accepts it, so a token
// left in localStorage on a shared device can't silently grant access to the
// UI. Held at module scope (with subscribers) so every usePersistentSession
// consumer shares a single validation round-trip instead of each firing one.
const persistedValidation = {
  status: 'idle', // 'idle' | 'validating' | 'valid' | 'rejected' | 'error'
  token: null,
  listeners: new Set(),
};

function notifyValidation() {
  for (const listener of persistedValidation.listeners) listener();
}

function subscribeValidation(listener) {
  persistedValidation.listeners.add(listener);
  return () => persistedValidation.listeners.delete(listener);
}

function getValidationStatus() {
  return persistedValidation.status;
}

function notifyExplicitSignOut() {
  for (const listener of explicitSignOut.listeners) listener();
}

function subscribeExplicitSignOut(listener) {
  explicitSignOut.listeners.add(listener);
  return () => explicitSignOut.listeners.delete(listener);
}

function getExplicitSignOutSnapshot() {
  return `${explicitSignOut.active ? '1' : '0'}:${explicitSignOut.token ?? ''}`;
}

function beginExplicitSignOut() {
  explicitSignOut.active = true;
  explicitSignOut.token = lastLiveToken;
  clearPersistedIOSStandaloneSession();
  resetPersistedValidation();
  notifyExplicitSignOut();
}

function finishExplicitSignOut() {
  clearPersistedIOSStandaloneSession();
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

// Confirm with the API that the persisted token resolves to a user server-side.
// Deduped per token. On an explicit auth rejection (401/403) the stored session
// is cleared; on a network/server error we fail closed (treat as not signed in)
// but keep the stored session so a later online launch can retry.
async function validatePersistedSession(token) {
  if (!token) return;
  if (persistedValidation.token === token && persistedValidation.status !== 'idle') return;

  persistedValidation.token = token;
  persistedValidation.status = 'validating';
  notifyValidation();

  let nextStatus;
  try {
    const res = await fetch(`${API_BASE}/api/auth/session`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) nextStatus = 'valid';
    else if (res.status === 401 || res.status === 403) nextStatus = 'rejected';
    else nextStatus = 'error';
  } catch {
    nextStatus = 'error';
  }

  // A newer token superseded this check while it was in flight — drop the result.
  if (persistedValidation.token !== token) return;

  persistedValidation.status = nextStatus;
  if (nextStatus === 'rejected') clearPersistedIOSStandaloneSession();
  notifyValidation();
}

const originalSignOut = auth.signOut.bind(auth);
let lastLiveToken = null;

auth.signOut = async (...args) => {
  beginExplicitSignOut();
  try {
    return await originalSignOut(...args);
  } finally {
    finishExplicitSignOut();
  }
};

export function usePersistentSession() {
  const liveSession = auth.useSession();
  const { data: liveSessionData, isPending: liveIsPending, refetch: liveRefetch } = liveSession;
  const validationStatus = useSyncExternalStore(
    subscribeValidation,
    getValidationStatus,
    () => 'idle',
  );
  useSyncExternalStore(
    subscribeExplicitSignOut,
    getExplicitSignOutSnapshot,
    () => '0:',
  );

  const liveIsUsable = hasUsableSession(liveSessionData);
  const liveToken = liveSessionData?.session?.token ?? null;

  useEffect(() => {
    lastLiveToken = liveToken;
  }, [liveToken]);

  useEffect(() => {
    if (!explicitSignOut.active || !liveToken) return;
    if (explicitSignOut.token && liveToken !== explicitSignOut.token) {
      clearExplicitSignOut();
    }
  }, [liveToken]);

  useEffect(() => {
    if (!isIOSStandalone()) return;
    if (explicitSignOut.active) {
      clearPersistedIOSStandaloneSession();
      return;
    }

    // A live session is the source of truth: persist it and drop any stale
    // validation state from a previously restored session.
    if (liveIsUsable) {
      persistIOSStandaloneSession(liveSessionData);
      resetPersistedValidation();
      return;
    }

    // Live session resolved with nothing. If a token was persisted (iOS dropped
    // the cookie, or someone else opened the installed app), ask the server to
    // confirm it before we ever render as signed in.
    if (liveIsPending) return;
    const token = readPersistedIOSStandaloneSession()?.session?.token;
    if (token) validatePersistedSession(token);
  }, [liveSessionData, liveIsUsable, liveIsPending]);

  const refetch = useCallback(
    async (...args) => {
      return liveRefetch?.(...args);
    },
    [liveRefetch],
  );

  if (explicitSignOut.active) {
    return { ...liveSession, data: null, isPending: false, refetch };
  }

  // A real live session always wins.
  if (liveIsUsable) {
    return { ...liveSession, refetch };
  }

  // Still loading the live session — let its own pending state flow through.
  if (liveIsPending) {
    return { ...liveSession, refetch };
  }

  const persistedSession = readPersistedIOSStandaloneSession();
  if (!persistedSession) {
    return { ...liveSession, refetch };
  }

  // We have a stored token but no live session. Never trust localStorage alone:
  // only report signed in once the server round-trip confirms it.
  if (validationStatus === 'valid') {
    return { ...liveSession, data: persistedSession, isPending: false, refetch };
  }

  // Confirmed unusable (rejected/error) — present as signed out so guards send
  // the visitor to the sign-in screen.
  if (validationStatus === 'rejected' || validationStatus === 'error') {
    return { ...liveSession, data: null, isPending: false, refetch };
  }

  // idle/validating — hold in a pending state until the server answers.
  return { ...liveSession, data: null, isPending: true, refetch };
}
