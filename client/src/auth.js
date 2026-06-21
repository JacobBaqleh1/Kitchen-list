import { useCallback, useEffect } from 'react';
import { createAuthClient } from '@neondatabase/neon-js/auth';
import { BetterAuthReactAdapter } from '@neondatabase/auth/react';

export const auth = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL, {
  adapter: BetterAuthReactAdapter(),
});

const IOS_STANDALONE_SESSION_KEY = 'mykitchenlist.iosStandaloneSession';
const EXPIRY_SKEW_MS = 30_000;

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

const originalSignOut = auth.signOut.bind(auth);
auth.signOut = async (...args) => {
  try {
    return await originalSignOut(...args);
  } finally {
    clearPersistedIOSStandaloneSession();
  }
};

export function usePersistentSession() {
  const liveSession = auth.useSession();
  const { data: liveSessionData, refetch: liveRefetch } = liveSession;

  useEffect(() => {
    if (!isIOSStandalone()) return;

    if (hasUsableSession(liveSessionData)) {
      persistIOSStandaloneSession(liveSessionData);
    }
  }, [liveSessionData]);

  const refetch = useCallback(
    async (...args) => {
      return liveRefetch?.(...args);
    },
    [liveRefetch],
  );

  if (liveSessionData) {
    return { ...liveSession, refetch };
  }

  const persistedSession = readPersistedIOSStandaloneSession();

  if (persistedSession) {
    return {
      ...liveSession,
      data: persistedSession,
      isPending: false,
      refetch,
    };
  }

  return { ...liveSession, refetch };
}
