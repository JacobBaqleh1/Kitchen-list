import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { auth, applySocialSession, clearAuthError } from '@/src/auth';
import { APP_WEB_ORIGIN } from '@/src/config';

WebBrowser.maybeCompleteAuthSession();

const DEEP_LINK_PATH = 'auth/callback';

type SocialProvider = 'google' | 'github' | 'apple';

type SocialResult = {
  data?: { url?: string; redirect?: boolean } | null;
  error?: { message?: string; code?: string; status?: number; error?: string } | null;
  url?: string;
};

function mobileCallbackURL(returnTo: string) {
  const url = new URL('/auth/mobile-callback', APP_WEB_ORIGIN);
  url.searchParams.set('return_to', returnTo);
  return url.toString();
}

function extractOAuthUrl(result: SocialResult) {
  return result?.data?.url || result?.url || null;
}

function extractErrorMessage(result: SocialResult) {
  const err = result?.error;
  if (!err) return null;
  return err.message || err.error || 'Social sign-in failed';
}

function friendlySocialError(message: string, provider?: SocialProvider) {
  if (/provider is not supported|PROVIDER_NOT_SUPPORTED/i.test(message)) {
    return 'That sign-in provider is not enabled yet. Try email or another provider.';
  }
  if (/invalid callbackurl|INVALID_CALLBACKURL/i.test(message)) {
    return 'Social sign-in is misconfigured. Please try email sign-in.';
  }
  if (/HTTP 400/i.test(message)) {
    if (provider === 'apple') {
      return 'Sign in with Apple is not enabled yet. Try Google, GitHub, or email.';
    }
    return 'That sign-in provider could not be started. Try email or another provider.';
  }
  return message;
}

/**
 * Neon Auth rejects custom-scheme callbackURLs (e.g. mykitchenlist://) and React
 * Native has no window.location redirect. Flow:
 * 1. Request OAuth URL with an https bridge callback on the web app
 * 2. Open it in an auth session browser
 * 3. Bridge page captures the session JWT and redirects to our deep link
 * 4. Persist that session in the app
 */
export async function signInWithSocialProvider(provider: SocialProvider) {
  clearAuthError();

  const returnTo = Linking.createURL(DEEP_LINK_PATH);
  const callbackURL = mobileCallbackURL(returnTo);

  let result: SocialResult;
  try {
    result = (await auth.signIn.social({
      provider,
      callbackURL,
      newUserCallbackURL: callbackURL,
      errorCallbackURL: callbackURL,
      disableRedirect: true,
    })) as SocialResult;
  } catch (err) {
    throw new Error(
      friendlySocialError(err instanceof Error ? err.message : 'Social sign-in failed', provider),
    );
  }

  const errorMessage = extractErrorMessage(result);
  if (errorMessage) {
    throw new Error(friendlySocialError(errorMessage, provider));
  }

  const oauthUrl = extractOAuthUrl(result);
  if (!oauthUrl) {
    throw new Error('No OAuth URL returned. Try again or use email sign-in.');
  }

  let authSession: WebBrowser.WebBrowserAuthSessionResult;
  try {
    authSession = await WebBrowser.openAuthSessionAsync(oauthUrl, returnTo);
  } catch (err) {
    throw new Error(
      friendlySocialError(
        err instanceof Error ? err.message : 'Could not open the sign-in browser.',
        provider,
      ),
    );
  }
  if (authSession.type !== 'success' || !authSession.url) {
    // User dismissed the browser — not an error banner case.
    return { cancelled: true as const };
  }

  const redirected = Linking.parse(authSession.url);
  const params = redirected.queryParams ?? {};
  const errorParam = typeof params.error === 'string' ? params.error : null;
  if (errorParam) {
    throw new Error(friendlySocialError(errorParam));
  }

  const token = typeof params.token === 'string' ? params.token : null;
  if (!token) {
    throw new Error('Sign-in completed but no session token was returned.');
  }

  let user: { id?: string | number; name?: string | null; email?: string } = {};
  const rawUser = typeof params.user === 'string' ? params.user : null;
  if (rawUser) {
    try {
      user = JSON.parse(decodeURIComponent(rawUser));
    } catch {
      try {
        user = JSON.parse(rawUser);
      } catch {
        /* ignore malformed user payload; token alone is enough to proceed */
      }
    }
  }

  const expiresAt =
    typeof params.expiresAt === 'string' && params.expiresAt
      ? params.expiresAt
      : undefined;

  await applySocialSession({
    session: { token, ...(expiresAt ? { expiresAt } : {}) },
    user,
  });

  return { cancelled: false as const };
}
