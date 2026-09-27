import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

// Prefer EXPO_PUBLIC_* from .env so app.json "extra" defaults do not override
// production URLs during simulator/device testing.
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (extra.apiUrl as string | undefined) ||
  'http://localhost:3001';

export const NEON_AUTH_URL =
  process.env.EXPO_PUBLIC_NEON_AUTH_URL ||
  (extra.neonAuthUrl as string | undefined) ||
  '';

/** Public web origin used as the HTTPS OAuth bridge for mobile social sign-in. */
export const APP_WEB_ORIGIN =
  process.env.EXPO_PUBLIC_WEB_ORIGIN ||
  (extra.webOrigin as string | undefined) ||
  'https://mykitchenlist.app';
