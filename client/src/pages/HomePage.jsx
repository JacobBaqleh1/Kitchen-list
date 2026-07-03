import { useNavigate } from 'react-router-dom';

const FEATURES = [
  { id: 'fridge', label: 'Fridge', emoji: '🧊', to: '/fridge?location=fridge' },
  { id: 'freezer', label: 'Freezer', emoji: '❄️', to: '/fridge?location=freezer' },
  { id: 'pantry', label: 'Pantry', emoji: '🥫', to: '/fridge?location=pantry' },
  { id: 'add', label: 'Add Item', emoji: '➕', to: '/fridge?focus=add' },
  { id: 'scan', label: 'Scan', emoji: '📷', to: '/fridge?focus=scan' },
  { id: 'meal', label: 'Meal Ideas', emoji: '🍽️', to: '/meal' },
  { id: 'share', label: 'Share', emoji: '👥', to: '/share' },
  { id: 'settings', label: 'Settings', emoji: '⚙️', to: '/settings' },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col bg-linear-to-b from-travertine-50 to-travertine-100 px-4 py-5 sm:px-6">
      <header className="mb-4 shrink-0 text-center">
        <h1 className="font-display text-2xl font-bold tracking-wide text-travertine-800 sm:text-3xl">
          MyKitchenList
        </h1>
        <p className="mt-1 text-sm font-medium text-travertine-600">
          What would you like to do?
        </p>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-4 gap-3 sm:gap-4">
        {FEATURES.map(({ id, label, emoji, to }) => (
          <button
            key={id}
            type="button"
            className="home-tile h-full min-h-0"
            onClick={() => navigate(to)}
          >
            <span className="home-tile-icon" aria-hidden="true">{emoji}</span>
            <span className="home-tile-label">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
