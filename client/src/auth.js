import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { createAuthClient } from '@neondatabase/neon-js/auth';
import { BetterAuthReactAdapter } from '@neondatabase/auth/react';

export const auth = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL, {
  adapter: BetterAuthReactAdapter(),
  fetchOptions: {
    // Detect the sign-out request and flip the app to signed-out immediately.
    // The auth client is a better-auth Proxy whose get-trap ignores assigned
    // properties, so we cannot wrap auth.signOut directly — this global hook is
    // the reliable interception point and runs no matter how sign-out fires.
    onRequest: (request) => {
      try {
        if (String(request?.url ?? '').includes('/sign-out')) beginExplicitSignOut();
      } catch {
        /* never let interception break the request */
      }
    },
    // iOS standalone PWAs frequently can't persist the cross-site auth cookie,
    // so the session token (delivered via set-auth-jwt and injected here) is the
    // only thing that keeps the user signed in. Capture it from every successful
    // auth response — login, sign-up, refresh. On other platforms
    // persistIOSStandaloneSession is a no-op, so this is harmless there.
    onSuccess: (ctx) => {
      try {
        const data = ctx?.data;
        if (data?.session?.token && data?.user) {
          // A fresh session supersedes any prior explicit sign-out. Without this
          // an iOS standalone re-login would stay suppressed (no live cookie
          // ever clears the flag) and lock the user out.
          clearExplicitSignOut();
          persistIOSStandaloneSession({ session: data.session, user: data.user });
          markPersistedValidationValid(data.session.token);
          notifyPersistedSession();
        }
        clearAuthError();
      } catch {
        /* never let session capture break the auth flow */
      }
    },
    // Surface auth request failures to the UI so they're visible (we render them
    // above the form). Without this, a failed sign-in on an iOS PWA can look like
    // a spinner that silently stops with no feedback.
    onError: (ctx) => {
      try {
        const status = ctx?.response?.status;
        const message =
          ctx?.error?.message ||
          ctx?.error?.statusText ||
          (status ? `Request failed (${status})` : 'Network request failed');
        notifyAuthError(message);
      } catch {
        /* never let error reporting break the auth flow */
      }
    },
  },
});

// Captured auth request error, surfaced above the sign-in form.
const authErrorStore = { message: null, listeners: new Set() };

function notifyAuthError(message) {
  authErrorStore.message = message;
  for (const listener of authErrorStore.listeners) listener();
}

export function clearAuthError() {
  if (authErrorStore.message === null) return;
  authErrorStore.message = null;
  for (const listener of authErrorStore.listeners) listener();
}

function subscribeAuthError(listener) {
  authErrorStore.listeners.add(listener);
  return () => authErrorStore.listeners.delete(listener);
}

function getAuthErrorSnapshot() {
  return authErrorStore.message;
}

export function useAuthError() {
  return useSyncExternalStore(subscribeAuthError, getAuthErrorSnapshot, () => null);
}

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

// In-memory mirror of the persisted session. Some iOS standalone PWAs (notably
// ones added from a Private tab) can fail to persist localStorage across the
// post-login navigation, so we also keep the just-captured session here as a
// fallback for the lifetime of the running app session.
let inMemorySession = null;

export function clearPersistedIOSStandaloneSession() {
  inMemorySession = null;
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

  inMemorySession = sessionData;
  try {
    window.localStorage.setItem(IOS_STANDALONE_SESSION_KEY, JSON.stringify(sessionData));
  } catch {
    // localStorage may be unavailable/ephemeral in some standalone contexts;
    // the in-memory mirror still keeps the user signed in for this session.
  }
}

// Effective stored session: localStorage first, falling back to the in-memory
// mirror when storage didn't persist (e.g. a Private-tab-added PWA).
function getStoredSession() {
  const persisted = readPersistedIOSStandaloneSession();
  if (persisted) return persisted;
  if (isIOSStandalone() && hasUsableSession(inMemorySession)) return inMemorySession;
  return null;
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

// Bumped whenever a session is captured/persisted from an auth response, so
// usePersistentSession consumers re-render and pick it up (e.g. an iOS login
// where no live cookie is set, so auth.useSession() never updates on its own).
const persistedSessionStore = { version: 0, listeners: new Set() };

function notifyPersistedSession() {
  persistedSessionStore.version += 1;
  for (const listener of persistedSessionStore.listeners) listener();
}

function subscribePersistedSession(listener) {
  persistedSessionStore.listeners.add(listener);
  return () => persistedSessionStore.listeners.delete(listener);
}

function getPersistedSessionVersion() {
  return persistedSessionStore.version;
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

// Mark a freshly issued token (just returned by the auth server on login/
// sign-up/refresh) as valid without a server round-trip — it was authenticated
// moments ago. The round-trip in validatePersistedSession is reserved for
// sessions restored from storage on a cold launch (the shared-device case).
function markPersistedValidationValid(token) {
  if (!token) return;
  persistedValidation.token = token;
  persistedValidation.status = 'valid';
  notifyValidation();
}

let lastLiveToken = null;

// Explicit, app-driven sign-out. We can't wrap auth.signOut (the better-auth
// Proxy ignores assigned properties), so callers must use this. It clears local
// session state synchronously — so sign-out is instant and the UI never depends
// on the network — then fires the real server sign-out in the background. In an
// iOS standalone PWA that cross-site request can stall indefinitely, so it must
// never be awaited on the UI path (that was the endless-spinner bug).
export function clientSignOut() {
  beginExplicitSignOut();
  return Promise.resolve()
    .then(() => auth.signOut())
    .catch(() => {})
    .finally(finishExplicitSignOut);
}

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
  useSyncExternalStore(
    subscribePersistedSession,
    getPersistedSessionVersion,
    () => 0,
  );

  const liveIsUsable = hasUsableSession(liveSessionData);
  const liveToken = liveSessionData?.session?.token ?? null;

  useEffect(() => {
    lastLiveToken = liveToken;
  }, [liveToken]);

  useEffect(() => {
    if (!explicitSignOut.active || !liveToken) return;
    // A fresh live token means a new sign-in completed, so lift the post-logout
    // suppression. Also clear when no token was captured at logout time (e.g. an
    // iOS session restored from storage had no live token), otherwise the flag
    // would stay stuck and lock the user out of a valid new session.
    if (!explicitSignOut.token || liveToken !== explicitSignOut.token) {
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

    // If a token was persisted (iOS dropped the cookie, or someone else opened
    // the installed app), ask the server to confirm it before we ever render as
    // signed in. We don't wait on liveIsPending here: the cross-site session
    // check can hang forever in an iOS Private-tab PWA, and validatePersistedSession
    // is deduped per token so this stays cheap.
    const token = getStoredSession()?.session?.token;
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

  const persistedSession = getStoredSession();

  // A freshly captured / server-confirmed token signs the user in even while
  // the live session check is still pending. In an iOS Private-tab PWA that
  // cross-site check can hang forever, so waiting on it (the old behavior) left
  // login stuck on an endless spinner with a perfectly valid token in hand.
  if (persistedSession && validationStatus === 'valid') {
    return { ...liveSession, data: persistedSession, isPending: false, refetch };
  }

  // No confirmed token yet — let the live session's own pending state flow
  // through while it (maybe) resolves.
  if (liveIsPending) {
    return { ...liveSession, refetch };
  }

  if (!persistedSession) {
    return { ...liveSession, refetch };
  }

  // Confirmed unusable (rejected/error) — present as signed out so guards send
  // the visitor to the sign-in screen.
  if (validationStatus === 'rejected' || validationStatus === 'error') {
    return { ...liveSession, data: null, isPending: false, refetch };
  }

  // idle/validating — hold in a pending state until the server answers.
  return { ...liveSession, data: null, isPending: true, refetch };
}
