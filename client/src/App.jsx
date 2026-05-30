import { BrowserRouter, Routes, Route, NavLink, useNavigate, Link } from 'react-router-dom';
import {
  NeonAuthUIProvider, AuthView, UserButton,
  SignedIn, SignedOut, AuthCallback, RedirectToSignIn,
} from '@neondatabase/auth-ui';
import '@neondatabase/auth-ui/css';
import { auth } from './auth';
import FridgeView from './pages/FridgeView';
import MealSuggest from './pages/MealSuggest';
import Preferences from './pages/Preferences';

function Nav() {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <span className="nav-brand">KitchenList</span>
        <SignedIn>
          <div className="nav-links">
            <NavLink to="/" end>Fridge &amp; Pantry</NavLink>
            <NavLink to="/meal">Meal Ideas</NavLink>
            <NavLink to="/preferences">Preferences</NavLink>
          </div>
          <div style={{ marginLeft: 'auto' }}>
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

function AuthPage({ path }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 1rem' }}>
      <AuthView path={path} />
    </div>
  );
}

function AppWithAuth() {
  const navigate = useNavigate();
  return (
    <NeonAuthUIProvider
      authClient={auth}
      navigate={navigate}
      replace={(path) => navigate(path, { replace: true })}
      Link={Link}
      redirectTo="/"
    >
      <Nav />
      <Routes>
        <Route path="/sign-in" element={<AuthPage path="sign-in" />} />
        <Route path="/sign-up" element={<AuthPage path="sign-up" />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
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
    </BrowserRouter>
  );
}
