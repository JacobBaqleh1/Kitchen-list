import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { MealCard } from '../components/MealCard';

import { MEALS_STORAGE_KEY } from '../lib/appSettings';

function loadStoredMeals() {
  try {
    const raw = sessionStorage.getItem(MEALS_STORAGE_KEY);
    if (!raw) return { prompt: '', meals: null };
    const { prompt = '', meals = null } = JSON.parse(raw);
    return { prompt, meals: Array.isArray(meals) ? meals : null };
  } catch {
    return { prompt: '', meals: null };
  }
}

function saveStoredMeals(prompt, meals) {
  if (!meals?.length) {
    sessionStorage.removeItem(MEALS_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(MEALS_STORAGE_KEY, JSON.stringify({ prompt, meals }));
}

export default function MealSuggest() {
  const [prompt, setPrompt] = useState(() => loadStoredMeals().prompt);
  const [meals, setMeals] = useState(() => loadStoredMeals().meals);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [itemCount, setItemCount] = useState(0);
  const [kitchenItems, setKitchenItems] = useState([]);
  const [includedItemIds, setIncludedItemIds] = useState([]);
  const [excludedItemIds, setExcludedItemIds] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch('/api/items')
      .then(data => {
        const inStock = data.filter(i => !i.checked);
        setItemCount(inStock.length);
        setKitchenItems(inStock);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    saveStoredMeals(prompt, meals);
  }, [prompt, meals]);

  const suggest = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/meal/suggest', {
        method: 'POST',
        body: JSON.stringify({
          userPrompt: prompt,
          includeItemIds: includedItemIds,
          excludeItemIds: excludedItemIds,
        }),
      });
      setMeals(data.meals);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleInclude = id => {
    setIncludedItemIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    setExcludedItemIds(prev => prev.filter(x => x !== id));
  };

  const toggleExclude = id => {
    setExcludedItemIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    setIncludedItemIds(prev => prev.filter(x => x !== id));
  };

  return (
    <div className="mx-auto max-w-225 px-3 pb-8 pt-4 sm:px-4 sm:pb-12 sm:pt-6">
      <button className="btn btn-ghost btn-sm mb-4" onClick={() => navigate('/')}>
        &larr; Back to fridge
      </button>

      <h1 className="mb-5 text-2xl font-bold text-gray-900">AI Meal Ideas</h1>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <label className="mb-1 block font-semibold text-gray-900">Custom request (optional)</label>
        <p className="mb-3 text-sm text-gray-500">
          The chef will suggest 3 meals based on your {itemCount} item{itemCount !== 1 ? 's' : ''} in stock.
          Add any extra preferences here.
        </p>
        {itemCount > 0 && (
          <div className="mb-3 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Prioritize</p>
              <div className="flex flex-wrap gap-2">
                {kitchenItems.map(item => (
                  <button
                    key={`include-${item.id}`}
                    type="button"
                    onClick={() => toggleInclude(item.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      includedItemIds.includes(item.id)
                        ? 'border-green-600 bg-green-100 text-green-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Exclude</p>
              <div className="flex flex-wrap gap-2">
                {kitchenItems.map(item => (
                  <button
                    key={`exclude-${item.id}`}
                    type="button"
                    onClick={() => toggleExclude(item.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      excludedItemIds.includes(item.id)
                        ? 'border-red-300 bg-red-100 text-red-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <textarea
          className="min-h-20 w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-green-600"
          placeholder={`e.g. "Something quick and easy" or "High protein, vegetarian"`}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          disabled={loading}
        />
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <button className="btn btn-primary" onClick={suggest} disabled={loading || itemCount === 0}>
            {loading ? 'Generating...' : 'Suggest Meals'}
          </button>
          {itemCount === 0 && (
            <span className="text-sm text-gray-500">Add items to your fridge or pantry first</span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-100 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {loading && (
        <div className="p-12 text-center text-gray-500">
          <div className="spinner mb-3 size-8" />
          <div>Let me cook...</div>
        </div>
      )}

      {meals && (
        <div className="grid gap-4">
          {meals.map((meal, i) => (
            <MealCard key={i} meal={meal} />
          ))}
        </div>
      )}
    </div>
  );
}
