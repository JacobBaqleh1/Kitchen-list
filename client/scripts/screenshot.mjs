// Browser agent: capture screenshots of the running app so the UI can be
// visually inspected (catches layout/contrast bugs that build/lint can't).
//
// Usage:
//   node scripts/screenshot.mjs [baseUrl] [path1,path2,...]
//
// Defaults to the Vite dev server and a few key routes, capturing each at
// desktop and mobile widths into ./screenshots.
//
// Authenticated pages: provide credentials via environment variables and the
// script will sign in once through the UI and reuse the session.
//   SCREENSHOT_EMAIL=you@example.com SCREENSHOT_PASSWORD=… npm run screenshot
// The session is cached in .auth/state.json (gitignored). Credentials are read
// only from the environment — never hardcoded, logged, or written to disk.
// Set SCREENSHOT_FRESH=1 to ignore a cached session and sign in again.
import { chromium } from 'playwright';
import { mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const baseUrl = (process.argv[2] || 'http://localhost:5173').replace(/\/$/, '');
const paths = (process.argv[3] || '/,/meal,/settings').split(',');

const viewports = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844, isMobile: true },
];

const outDir = fileURLToPath(new URL('../screenshots/', import.meta.url));
const authDir = fileURLToPath(new URL('../.auth/', import.meta.url));
const statePath = `${authDir}state.json`;
await mkdir(outDir, { recursive: true });

// Sign in through the UI (once) and persist the session, returning a path to a
// Playwright storageState file — or undefined to capture the signed-out state.
async function ensureAuth(browser) {
  if (process.env.SCREENSHOT_FRESH && existsSync(statePath)) {
    await rm(statePath, { force: true });
  }
  if (existsSync(statePath)) return statePath;

  const email = process.env.SCREENSHOT_EMAIL;
  const password = process.env.SCREENSHOT_PASSWORD;
  if (!email || !password) {
    console.warn('⚠ No saved session and SCREENSHOT_EMAIL/SCREENSHOT_PASSWORD not set — capturing signed-out state.');
    return undefined;
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/auth/sign-in`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.getByPlaceholder('m@example.com').fill(email);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    // Success = redirected away from the /auth/* routes.
    await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15000 });
    await mkdir(authDir, { recursive: true });
    await context.storageState({ path: statePath });
    console.log('✓ signed in — session cached in .auth/state.json');
    return statePath;
  } catch {
    console.warn('⚠ Sign-in did not complete (check credentials / dev server) — capturing signed-out state.');
    return undefined;
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch();
try {
  const storageState = await ensureAuth(browser);
  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      isMobile: vp.isMobile ?? false,
      storageState,
    });
    for (const path of paths) {
      const page = await context.newPage();
      const url = baseUrl + path;
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      } catch {
        // networkidle can time out on auth redirects — capture what rendered.
        await page.waitForTimeout(1500);
      }
      const slug = path === '/' ? 'home' : path.replace(/\//g, '-').replace(/^-/, '');
      const file = `${outDir}${slug}.${vp.name}.png`;
      await page.screenshot({ path: file, fullPage: true });
      console.log(`✓ ${vp.name.padEnd(7)} ${url} -> screenshots/${slug}.${vp.name}.png`);
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}
