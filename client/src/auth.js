import { createAuthClient } from '@neondatabase/neon-js/auth';
import { BetterAuthReactAdapter } from '@neondatabase/auth/react';
import { dlog } from './debug';

const short = (url = '') => String(url).replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '');

// Safe structural dump: key names + string lengths + JWT-ness only (no values).
function shape(d) {
  if (d === null) return 'null';
  if (!d || typeof d !== 'object') return typeof d;
  return Object.keys(d).map(k => {
    const v = d[k];
    if (typeof v === 'string') return `${k}:str${v.length}${v.split('.').length === 3 ? '/JWT' : ''}`;
    if (v && typeof v === 'object') return `${k}:{${Object.keys(v).join(',')}}`;
    return `${k}:${typeof v}`;
  }).join(' ');
}

/**
 * Standalone PWA auth.
 *
 * In a standalone "Add as Web App" context, WebKit gives the app an isolated
 * cookie jar and ITP blocks third-party cookies. Neon Auth's session cookie
 * lives on its own (third-party) domain, so relying on `credentials: "include"`
 * breaks there. To survive, we persist the session as a BEARER TOKEN in the
 * app's own first-party localStorage and send it on every auth-client request,
 * removing the cross-site-cookie dependency entirely.
 */
const TOKEN_KEY = 'kl_session_token';

const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
const setToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ }
};

export const auth = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL, {
  adapter: BetterAuthReactAdapter({
    fetchOptions: {
      // Attach the stored bearer token so getSession() authenticates via the
      // Authorization header instead of the (blocked) cross-site cookie.
      onRequest: (ctx) => {
        const token = getToken();
        if (token) {
          if (ctx.headers instanceof Headers) ctx.headers.set('Authorization', `Bearer ${token}`);
          else ctx.headers = { ...(ctx.headers || {}), Authorization: `Bearer ${token}` };
        }
        dlog(`→ ${short(ctx?.url)} (bearer: ${token ? 'yes/' + token.length : 'no'})`);
        return ctx;
      },
      // Persist the session token on every successful auth response, and clear
      // it on sign-out. On iOS standalone the cross-site session cookie is
      // blocked, so we must capture the token directly from the sign-in
      // RESPONSE BODY (always readable) — not just the set-auth-token header,
      // which CORS may not expose. This token is then replayed as a Bearer.
      onSuccess: (ctx) => {
        const url = ctx?.request?.url || ctx?.response?.url || '';
        if (/sign-?out/.test(url)) { setToken(null); dlog(`✓ ${short(url)} → signed out, token cleared`); return; }
        const d = ctx?.data;
        const header = ctx?.response?.headers?.get?.('set-auth-token');
        const body = d?.token || d?.session?.token || d?.data?.session?.token || d?.data?.token;
        const tok = header || body;
        if (tok) setToken(tok);
        const src = header ? 'header' : (body ? 'body' : 'none');
        dlog(`✓ ${short(url)} ${ctx?.response?.status ?? ''} tokenFrom:${src}${tok ? '(' + tok.length + ')' : ''}`);
        if (/sign-in|sign-up|get-session/.test(url)) {
          dlog(`   body: ${shape(d)}`);
          if (d?.session) dlog(`   session: ${shape(d.session)}`);
        }
      },
      onError: (ctx) => {
        dlog(`✗ ${short(ctx?.request?.url)} ${ctx?.response?.status ?? ''} ${ctx?.error?.message || ''}`);
      },
    },
  }),
});

/**
 * Read the current session and keep the persisted bearer token in sync.
 * Use this everywhere instead of auth.getSession() so the token captured at
 * sign-in time survives app close/reopen in standalone mode.
 */
export async function getSession() {
  const result = await auth.getSession();
  const token = result?.data?.session?.token;
  if (token) setToken(token);
  else if (result?.data === null) setToken(null); // signed out / expired
  dlog(`getSession → ${result?.data ? 'SESSION ok, token:' + (token?.length || 0) : 'null (signed out)'}`);
  return result;
}

export { TOKEN_KEY };
