import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { auth, clientSignOut } from '../auth';
import { clearMealCache, loadItemSort, saveItemSort } from '../lib/appSettings';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Last entered' },
  { value: 'alpha', label: 'A–Z' },
];

export default function Settings() {
  const navigate = useNavigate();
  const [allergies, setAllergies] = useState([]);
  const [dislikes, setDislikes] = useState([]);
  const [newAllergy, setNewAllergy] = useState('');
  const [newDislike, setNewDislike] = useState('');
  const [defaultSort, setDefaultSort] = useState(() => loadItemSort());
  const [saved, setSaved] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState('');

  useEffect(() => {
    apiFetch('/api/preferences')
      .then(data => {
        setAllergies(data.allergies || []);
        setDislikes(data.dislikes || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const persist = async (override) => {
    try {
      await apiFetch('/api/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ allergies, dislikes, ...override }),
      });
      flashSaved();
    } catch {
      // best-effort; the list still reflects the user's intent locally
    }
  };

  const addTag = (field, value, inputSetter) => {
    const trimmed = value.trim();
    const current = field === 'allergies' ? allergies : dislikes;
    if (!trimmed || current.includes(trimmed)) { inputSetter(''); return; }
    const next = [...current, trimmed];
    (field === 'allergies' ? setAllergies : setDislikes)(next);
    inputSetter('');
    persist({ [field]: next });
  };

  const removeTag = (field, value) => {
    const current = field === 'allergies' ? allergies : dislikes;
    const next = current.filter(t => t !== value);
    (field === 'allergies' ? setAllergies : setDislikes)(next);
    persist({ [field]: next });
  };

  const handleSortChange = (value) => {
    setDefaultSort(value);
    saveItemSort(value);
    flashSaved();
  };

  const handleClearMeals = () => {
    clearMealCache();
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2000);
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    setDeleteNotice('');
    try {
      await apiFetch('/api/account', { method: 'DELETE' });
      const payload = deletePassword.trim()
        ? { password: deletePassword.trim(), callbackURL: '/auth/sign-in' }
        : { callbackURL: '/auth/sign-in' };
      const result = await auth.deleteUser(payload);
      const message = result?.data?.message;
      if (message === 'Verification email sent') {
        setDeleteNotice('Check your email to confirm account deletion.');
        setShowDeleteConfirm(false);
        return;
      }
      await clientSignOut();
      navigate('/auth/sign-in', { replace: true });
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Could not delete account');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-225 px-3 pb-8 pt-4 sm:px-4 sm:pb-12 sm:pt-6">
        <div className="p-12 text-center text-gray-500">
          <div className="spinner mb-3 size-8" />
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-225 px-3 pb-8 pt-4 sm:px-4 sm:pb-12 sm:pt-6">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Settings</h1>
      <p className="mb-6 text-sm text-gray-500">
        Manage your kitchen, meal planning, and app preferences.
      </p>

      {error && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Could not load meal preferences: {error}
        </div>
      )}

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Meal planning</h2>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-0.5 font-semibold text-gray-900">Allergies</div>
        <div className="mb-3 text-sm text-gray-500">Ingredients the chef will never include</div>
        <div className="mb-3 flex min-h-7 flex-wrap gap-1.5">
          {allergies.map(a => (
            <span
              key={a}
              className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-sm font-medium text-green-700"
            >
              {a}
              <button
                type="button"
                className="flex cursor-pointer items-center border-0 bg-transparent p-0 text-lg leading-none text-inherit opacity-65 hover:opacity-100"
                onClick={() => removeTag('allergies', a)}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Type an allergy and press Enter"
            value={newAllergy}
            onChange={e => setNewAllergy(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); addTag('allergies', newAllergy, setNewAllergy); }
            }}
          />
          <button type="button" className="btn btn-secondary" onClick={() => addTag('allergies', newAllergy, setNewAllergy)}>Add</button>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-0.5 font-semibold text-gray-900">Dislikes</div>
        <div className="mb-3 text-sm text-gray-500">Ingredients the chef will minimize or avoid</div>
        <div className="mb-3 flex min-h-7 flex-wrap gap-1.5">
          {dislikes.map(d => (
            <span
              key={d}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-sm font-medium text-amber-600"
            >
              {d}
              <button
                type="button"
                className="flex cursor-pointer items-center border-0 bg-transparent p-0 text-lg leading-none text-inherit opacity-65 hover:opacity-100"
                onClick={() => removeTag('dislikes', d)}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Type a dislike and press Enter"
            value={newDislike}
            onChange={e => setNewDislike(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); addTag('dislikes', newDislike, setNewDislike); }
            }}
          />
          <button type="button" className="btn btn-secondary" onClick={() => addTag('dislikes', newDislike, setNewDislike)}>Add</button>
        </div>
      </div>

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Display</h2>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-0.5 font-semibold text-gray-900">Default item sort</div>
        <div className="mb-3 text-sm text-gray-500">How items are ordered on the Fridge &amp; Pantry page</div>
        <select
          className="input w-full sm:w-48"
          value={defaultSort}
          onChange={e => handleSortChange(e.target.value)}
        >
          {SORT_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Data</h2>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-0.5 font-semibold text-gray-900">Saved meal suggestions</div>
        <div className="mb-3 text-sm text-gray-500">
          Clear cached AI meal ideas from this browser session
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleClearMeals}>
          Clear saved meals
        </button>
      </div>

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Account</h2>

      <div className="mb-6 rounded-xl border border-red-200 bg-white p-5 shadow-sm">
        <div className="mb-0.5 font-semibold text-red-700">Delete account</div>
        <p className="mb-3 text-sm text-gray-500">
          Permanently delete your account, inventory, preferences, and shared lists. This cannot be undone.
        </p>
        {!showDeleteConfirm ? (
          <button
            type="button"
            className="btn btn-sm border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            onClick={() => {
              setShowDeleteConfirm(true);
              setDeleteError('');
              setDeleteNotice('');
            }}
          >
            Delete my account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Type your password if you signed up with email, then confirm deletion.
            </p>
            <input
              className="input w-full"
              type="password"
              placeholder="Password (email accounts)"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              autoComplete="current-password"
            />
            {deleteError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {deleteError}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-sm border border-red-200 bg-red-600 text-white hover:bg-red-700"
                disabled={deleteLoading}
                onClick={handleDeleteAccount}
              >
                {deleteLoading ? 'Deleting...' : 'Confirm deletion'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={deleteLoading}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword('');
                  setDeleteError('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {deleteNotice && (
          <p className="mt-3 text-sm font-medium text-amber-800">{deleteNotice}</p>
        )}
      </div>

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">About</h2>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-0.5 font-semibold text-gray-900">MyKitchenList</div>
        <p className="text-sm text-gray-500">
          Track what&apos;s in your fridge, freezer, and pantry, then get AI meal ideas based on what you have on hand.
        </p>
        <Link
          to="/privacy"
          className="mt-3 inline-block text-sm font-semibold text-green-600 no-underline hover:text-green-700"
        >
          Privacy Policy
        </Link>
      </div>

      <div className="mt-4 h-5">
        {saved && <span className="text-sm font-medium text-green-700">✓ Saved</span>}
        {cacheCleared && <span className="text-sm font-medium text-green-700">✓ Saved meals cleared</span>}
      </div>
    </div>
  );
}
