import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
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
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await auth.signOut();
    navigate('/auth/sign-in', { replace: true });
  };

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
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            <UserButton />
            <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>
              Sign out
            </button>
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
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 1rem' }}>
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
    </BrowserRouter>
  );
}
