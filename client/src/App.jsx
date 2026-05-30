import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import FridgeView from './pages/FridgeView';
import MealSuggest from './pages/MealSuggest';
import Preferences from './pages/Preferences';

function Nav() {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <span className="nav-brand">KitchenList</span>
        <div className="nav-links">
          <NavLink to="/" end>Fridge &amp; Pantry</NavLink>
          <NavLink to="/meal">Meal Ideas</NavLink>
          <NavLink to="/preferences">Preferences</NavLink>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<FridgeView />} />
        <Route path="/meal" element={<MealSuggest />} />
        <Route path="/preferences" element={<Preferences />} />
      </Routes>
    </BrowserRouter>
  );
}
