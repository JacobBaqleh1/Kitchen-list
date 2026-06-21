import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import {
  NeonAuthUIProvider, AuthView, UserButton,
  SignedIn, SignedOut, RedirectToSignIn,
} from '@neondatabase/auth-ui';
import { auth, usePersistentSession, clientSignOut, useAuthError, clearAuthError } from './auth';
import { setAuthToken, apiFetch } from './api';
import { prefetchItems } from './lib/itemsCache';
import FridgeView from './pages/FridgeView';
import MealSuggest from './pages/MealSuggest';
import Settings from './pages/Settings';
import SharePage from './pages/SharePage';
import SharedListView from './pages/SharedListView';

const navLinkBase =
  'flex-1 sm:flex-initial text-center sm:text-left rounded-md px-2 sm:px-3 py-1.5 text-sm font-medium no-underline cursor-pointer select-none transition-colors';
const navLinkClass = ({ isActive }) =>
  isActive
    ? `${navLinkBase} bg-green-100 text-green-600`
    : `${navLinkBase} text-gray-500 hover:bg-green-100 hover:text-green-700`;

function Nav() {
  return (
    <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-225 flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:gap-8">
        <Link
          to="/"
          className="select-none text-xl font-bold tracking-tight text-green-600 no-underline"
        >
          MyKitchenList
        </Link>
        <div className="order-3 flex w-full justify-between gap-1 sm:order-0 sm:w-auto sm:justify-start">
          <NavLink to="/" end className={navLinkClass}>Fridge &amp; Pantry</NavLink>
          <NavLink to="/meal" className={navLinkClass}>Meal Ideas</NavLink>
          <NavLink to="/share" className={navLinkClass}>Share</NavLink>
          <NavLink to="/settings" className={navLinkClass}>Settings</NavLink>
        </div>
        <div className="ml-auto">
          <UserButton disableDefaultLinks />
        </div>
      </div>
    </nav>
  );
}

function AppChrome() {
  const location = useLocation();
  const isAuthRoute =
    location.pathname === '/auth' || location.pathname.startsWith('/auth/');

  if (isAuthRoute) return null;

  return (
    <SignedIn>
      <Nav />
    </SignedIn>
  );
}

// Keeps api.js's cached token in sync with the live session, so requests skip
// the per-call auth.getSession() round trip. Handles refresh, logout, and
// user-switch automatically since it tracks the reactive session.
function SessionTokenSync() {
  const { data } = usePersistentSession();
  const token = data?.session?.token ?? null;
  const userId = data?.user?.id ?? null;

  // Set during render so child effects can fetch immediately (no getSession wait).
  setAuthToken(token);

  useEffect(() => {
    if (token && userId) {
      prefetchItems(userId, () => apiFetch('/api/items'));
    }
  }, [token, userId]);

  return null;
}

function ProtectedRoute({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><RedirectToSignIn /></SignedOut>
    </>
  );
}

function BrandMark({ className = '', light = false }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span
        className={`flex size-9 items-center justify-center rounded-xl ${
          light ? 'bg-white/15 ring-1 ring-white/25 backdrop-blur-sm' : 'bg-green-50 ring-1 ring-green-100'
        }`}
      >
        <img src="/favicon.svg" alt="" className="size-6" />
      </span>
      <span className={`text-lg font-bold tracking-tight ${light ? 'text-white' : 'text-green-600'}`}>
        MyKitchenList
      </span>
    </div>
  );
}

function FeatureItem({ children }) {
  return (
    <li className="flex items-center gap-3 text-[15px] text-white/90">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
        <svg viewBox="0 0 20 20" fill="none" className="size-3.5 text-white" aria-hidden="true">
          <path
            d="M4 10.5 8 14.5 16 5.5"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {children}
    </li>
  );
}

function AuthArtPanel() {
  return (
    <section className="relative hidden overflow-hidden lg:block">
      <img
        src="/auth-hero.png"
        alt="A bright kitchen counter with fresh produce, herbs, and pantry jars"
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/40 to-black/15" />
      <div className="absolute inset-0 bg-linear-to-br from-green-900/45 via-transparent to-transparent" />
      <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
        <BrandMark light />
        <div className="max-w-md">
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white xl:text-5xl">
            Your kitchen,
            <br />
            perfectly organized.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-white/80">
            Keep track of what&apos;s in your fridge, freezer, and pantry — get AI meal ideas, and
            share lists with the people you cook with.
          </p>
          <ul className="mt-8 space-y-3.5">
            <FeatureItem>Track your fridge, freezer &amp; pantry</FeatureItem>
            <FeatureItem>AI meal ideas from what you already have</FeatureItem>
            <FeatureItem>Share lists &amp; chat in real time</FeatureItem>
          </ul>
        </div>
        <p className="text-xs text-white/45">Fresh ideas for whatever&apos;s in your kitchen.</p>
      </div>
    </section>
  );
}

function SignOutHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    // clientSignOut clears local state synchronously and fires the server
    // sign-out in the background (never awaited), so we can redirect right away.
    clientSignOut();
    navigate('/auth/sign-in', { replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="spinner size-8" />
    </div>
  );
}

function AuthPage() {
  const location = useLocation();
  const path = location.pathname.replace('/auth/', '');
  const { data, isPending } = usePersistentSession();
  const authError = useAuthError();
  const isSignOut = path === 'sign-out';

  useEffect(() => {
    clearAuthError();
  }, [path]);

  if (!isSignOut && data?.user) {
    return <Navigate to="/" replace />;
  }

  // The library's sign-out view waits on a cross-site network call before
  // redirecting, which hangs forever in an iOS standalone PWA. Drive sign-out
  // ourselves instead: clear local session state and redirect immediately.
  if (isSignOut) {
    return <SignOutHandler />;
  }

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="spinner size-8" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <AuthArtPanel />
      <section className="flex flex-col bg-gray-50">
        {/* Compact branded hero for small screens (art panel is hidden there). */}
        <div className="relative h-44 overflow-hidden lg:hidden">
          <img src="/auth-hero.png" alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/45 to-black/20" />
          <div className="relative flex h-full flex-col justify-end gap-2 p-6">
            <BrandMark light />
            <p className="text-sm text-white/85">Your kitchen, perfectly organized.</p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <BrandMark className="mb-8 hidden lg:flex" />
            {authError && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                {authError}
              </div>
            )}
            <AuthView path={path} />
          </div>
        </div>
      </section>
    </div>
  );
}

const RouterLink = ({ href, children, ...props }) => (
  <Link to={href ?? '/'} {...props}>{children}</Link>
);

const authHooks = { useSession: usePersistentSession };

function AppWithAuth() {
  const navigate = useNavigate();
  return (
    <NeonAuthUIProvider
      authClient={auth}
      hooks={authHooks}
      navigate={navigate}
      replace={(path) => navigate(path, { replace: true })}
      Link={RouterLink}
      redirectTo="/"
      social={{ providers: ["google", "github"] }}
      localization={{ SIGN_IN_WITH: 'Continue with' }}
    >
      <SessionTokenSync />
      <AppChrome />
      <Routes>
        <Route path="/auth/*" element={<AuthPage />} />
        <Route path="/s/:token" element={<SharedListView />} />
        <Route path="/" element={<ProtectedRoute><FridgeView /></ProtectedRoute>} />
        <Route path="/meal" element={<ProtectedRoute><MealSuggest /></ProtectedRoute>} />
        <Route path="/share" element={<ProtectedRoute><SharePage /></ProtectedRoute>} />
        <Route path="/preferences" element={<Navigate to="/settings" replace />} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      </Routes>
    </NeonAuthUIProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppWithAuth />
      <Analytics />
      <SpeedInsights />
    </BrowserRouter>
  );
}
