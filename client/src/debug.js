// Lightweight on-screen debug log so we can diagnose auth on devices that
// can't be connected to a desktop console. Persisted to sessionStorage so the
// log survives the post-sign-in redirect/re-render.
const KEY = 'kl_debug_log';
const MAX = 120;

let lines = [];
try { lines = JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch { /* ignore */ }
const subs = new Set();

function persist() {
  try { sessionStorage.setItem(KEY, JSON.stringify(lines.slice(-MAX))); } catch { /* ignore */ }
}

export function dlog(msg) {
  const time = new Date().toLocaleTimeString();
  lines.push(`${time}  ${msg}`);
  if (lines.length > MAX) lines = lines.slice(-MAX);
  persist();
  subs.forEach(fn => fn(lines));
}

export function clearLog() {
  lines = [];
  persist();
  subs.forEach(fn => fn(lines));
}

export function getLog() { return lines; }

export function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

// Capture uncaught errors so blank-screen crashes become visible.
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    dlog(`JS ERROR: ${e.message} @ ${(e.filename || '').split('/').pop()}:${e.lineno}`);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    dlog(`PROMISE REJECT: ${r?.message || r}`);
  });
}
