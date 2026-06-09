import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import {
  NeonAuthUIProvider, AuthView, UserButton,
  SignedIn, SignedOut, AuthCallback, RedirectToSignIn,
} from '@neondatabase/auth-ui';
import { auth } from './auth';
import FridgeView from './pages/FridgeView';
import MealSuggest from './pages/MealSuggest';
import Preferences from './pages/Preferences';

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
          KitchenList
        </Link>
        <SignedIn>
          <div className="order-3 flex w-full justify-between gap-1 sm:order-0 sm:w-auto sm:justify-start">
            <NavLink to="/" end className={navLinkClass}>Fridge &amp; Pantry</NavLink>
            <NavLink to="/meal" className={navLinkClass}>Meal Ideas</NavLink>
            <NavLink to="/preferences" className={navLinkClass}>Preferences</NavLink>
          </div>
          <div className="ml-auto">
            <UserButton />
          </div>
        </SignedIn>
      </div>
    </nav>
  );
}

function ProtectedRoute({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><RedirectToSignIn /></SignedOut>
    </>
  );
}

function AuthPage() {
  const location = useLocation();
  const path = location.pathname.replace('/auth/', '');
  return (
    <div className="flex justify-center px-4 py-12">
      <AuthView path={path} />
    </div>
  );
}

const RouterLink = ({ href, children, ...props }) => (
  <Link to={href ?? '/'} {...props}>{children}</Link>
);

function AppWithAuth() {
  const navigate = useNavigate();
  return (
    <NeonAuthUIProvider
      authClient={auth}
      navigate={navigate}
      replace={(path) => navigate(path, { replace: true })}
      Link={RouterLink}
      redirectTo="/"
      social={{ providers: ["google", "github"] }}
    >
      <Nav />
      <Routes>
        <Route path="/auth/*" element={<AuthPage />} />
        <Route path="/" element={<ProtectedRoute><FridgeView /></ProtectedRoute>} />
        <Route path="/meal" element={<ProtectedRoute><MealSuggest /></ProtectedRoute>} />
        <Route path="/preferences" element={<ProtectedRoute><Preferences /></ProtectedRoute>} />
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
