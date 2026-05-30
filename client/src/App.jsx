import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { NeonAuthUIProvider, AuthView, UserButton, SignedIn, SignedOut, AuthCallback } from '@neondatabase/auth-ui';
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
        <div className="nav-links">
          <SignedIn>
            <NavLink to="/" end>Fridge &amp; Pantry</NavLink>
            <NavLink to="/meal">Meal Ideas</NavLink>
            <NavLink to="/preferences">Preferences</NavLink>
          </SignedIn>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </div>
    </nav>
  );
}

function AuthPage({ path }) {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 1rem' }}>
      <AuthView path={path} />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const session = auth.useSession();
  if (session.isPending) return null;
  if (!session.data) return <Navigate to="/sign-in" replace />;
  return children;
}

function AppRoutes() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/sign-in" element={<AuthPage path="sign-in" />} />
        <Route path="/sign-up" element={<AuthPage path="sign-up" />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/" element={<ProtectedRoute><FridgeView /></ProtectedRoute>} />
        <Route path="/meal" element={<ProtectedRoute><MealSuggest /></ProtectedRoute>} />
        <Route path="/preferences" element={<ProtectedRoute><Preferences /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <NeonAuthUIProvider authClient={auth} redirectTo="/">
        <AppRoutes />
      </NeonAuthUIProvider>
    </BrowserRouter>
  );
}
