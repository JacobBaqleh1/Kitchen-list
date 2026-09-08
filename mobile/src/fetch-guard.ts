/**
 * Runs after Expo installs globals. Strips AbortSignal from every fetch call:
 * better-auth/better-fetch always attaches one, and RN's AbortSignal polyfill
 * is incomplete (Hermes can throw "undefined is not a function").
 *
 * Forces React Native's XHR fetch (EXPO_PUBLIC_USE_RN_FETCH) before Expo boots —
 * Expo SDK 56's winter/native fetch has caused iOS production await/fetch bugs
 * and breaks `{ uri, name, type }` FormData photo uploads.
 */
import './rn-fetch-env';
import 'expo';

const g = globalThis as typeof globalThis & { fetch: typeof fetch };
const originalFetch = g.fetch.bind(g);

g.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  if (init && Object.prototype.hasOwnProperty.call(init, 'signal')) {
    const { signal: _signal, ...rest } = init;
    return originalFetch(input, rest);
  }
  return originalFetch(input, init);
}) as typeof fetch;
