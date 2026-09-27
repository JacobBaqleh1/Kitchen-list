import { useEffect, useRef, useState } from 'react';
import { auth } from '../auth';

const DEFAULT_RETURN_TO = 'mykitchenlist://auth/callback';

function safeReturnTo(value) {
  if (!value || typeof value !== 'string') return DEFAULT_RETURN_TO;
  // Only allow our app deep links (custom scheme or Expo Go).
  if (
    value.startsWith('mykitchenlist://') ||
    value.startsWith('exp://') ||
    value.startsWith('exps://')
  ) {
    return value;
  }
  return DEFAULT_RETURN_TO;
}

function redirectToApp(returnTo, params) {
  const url = new URL(returnTo);
  for (const [key, val] of Object.entries(params)) {
    if (val != null && val !== '') url.searchParams.set(key, String(val));
  }
  window.location.replace(url.toString());
}

/**
 * HTTPS bridge for mobile social OAuth.
 * Neon Auth cannot redirect to custom schemes, so the mobile app uses this
 * page as callbackURL. Once the session JWT is available, we deep-link back
 * into the native app with the token.
 */
export default function MobileAuthCallback() {
  const [message, setMessage] = useState('Finishing sign-in…');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const returnTo = safeReturnTo(params.get('return_to'));
    const oauthError = params.get('error') || params.get('error_description');

    if (oauthError) {
      setMessage('Sign-in failed. Returning to the app…');
      redirectToApp(returnTo, { error: oauthError });
      return;
    }

    let cancelled = false;
    const started = Date.now();

    async function finish() {
      try {
        // Neon Auth injects neon_auth_session_verifier from the URL into
        // getSession when present (see @neondatabase/auth adapter).
        const result = await auth.getSession();
        const session = result?.data?.session;
        const user = result?.data?.user;
        const token = session?.token;

        if (token) {
          const payload = {
            token,
            expiresAt: session?.expiresAt ? String(session.expiresAt) : '',
          };
          if (user) {
            payload.user = JSON.stringify({
              id: user.id,
              email: user.email,
              name: user.name,
            });
          }
          setMessage('Success! Returning to the app…');
          redirectToApp(returnTo, payload);
          return;
        }

        // Session can lag the redirect by a beat — retry briefly.
        if (!cancelled && Date.now() - started < 8000) {
          setTimeout(finish, 400);
          return;
        }

        setMessage('Could not finish sign-in. Returning to the app…');
        redirectToApp(returnTo, {
          error: 'Sign-in completed but no session was available. Please try again.',
        });
      } catch (err) {
        if (!cancelled && Date.now() - started < 8000) {
          setTimeout(finish, 400);
          return;
        }
        setMessage('Sign-in failed. Returning to the app…');
        redirectToApp(returnTo, {
          error: err?.message || 'Social sign-in failed',
        });
      }
    }

    finish();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-6">
      <div className="spinner size-8" />
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  );
}
