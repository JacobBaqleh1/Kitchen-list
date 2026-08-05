import { useState, useEffect, useCallback, useMemo } from 'react';
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

function mealKey(name, recipe) {
  return `${name.trim().toLowerCase()}::${JSON.stringify(recipe)}`;
}

function toMealCardShape(saved) {
  return {
    name: saved.name,
    recipe: saved.recipe,
    shopping_list: saved.shoppingList ?? [],
  };
}

export default function MealSuggest() {
  const [tab, setTab] = useState('suggest');
  const [prompt, setPrompt] = useState(() => loadStoredMeals().prompt);
  const [meals, setMeals] = useState(() => loadStoredMeals().meals);
  const [savedMeals, setSavedMeals] = useState([]);
  const [savingKey, setSavingKey] = useState(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [itemCount, setItemCount] = useState(0);
  const [kitchenItems, setKitchenItems] = useState([]);
  const [includedItemIds, setIncludedItemIds] = useState([]);
  const [excludedItemIds, setExcludedItemIds] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  const savedByKey = useMemo(() => {
    const map = new Map();
    for (const saved of savedMeals) {
      map.set(mealKey(saved.name, saved.recipe), saved.id);
    }
    return map;
  }, [savedMeals]);

  const fetchSavedMeals = useCallback(async () => {
    try {
      const data = await apiFetch('/api/saved-meals');
      setSavedMeals(data);
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    apiFetch('/api/items')
      .then(data => {
        const inStock = data.filter(i => !i.checked);
        setItemCount(inStock.length);
        setKitchenItems(inStock);
      })
      .catch(() => {});
    fetchSavedMeals();
  }, [fetchSavedMeals]);

  useEffect(() => {
    saveStoredMeals(prompt, meals);
  }, [prompt, meals]);

  const flashSaved = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const saveMeal = async (meal) => {
    const key = mealKey(meal.name, meal.recipe);
    setSavingKey(key);
    setError('');
    try {
      const saved = await apiFetch('/api/saved-meals', {
        method: 'POST',
        body: JSON.stringify({
          name: meal.name,
          recipe: meal.recipe,
          shopping_list: meal.shopping_list ?? [],
        }),
      });
      setSavedMeals(prev => {
        const without = prev.filter(s => s.id !== saved.id);
        return [saved, ...without];
      });
      flashSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingKey(null);
    }
  };

  const unsaveMeal = async (id) => {
    setSavingKey(id);
    setError('');
    try {
      await apiFetch(`/api/saved-meals/${id}`, { method: 'DELETE' });
      setSavedMeals(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingKey(null);
    }
  };

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

  const getItemMode = id => {
    if (includedItemIds.includes(id)) return 'include';
    if (excludedItemIds.includes(id)) return 'exclude';
    return 'neutral';
  };

  const cycleItemMode = id => {
    const mode = getItemMode(id);
    if (mode === 'neutral') {
      setIncludedItemIds(prev => [...prev, id]);
      return;
    }
    if (mode === 'include') {
      setIncludedItemIds(prev => prev.filter(x => x !== id));
      setExcludedItemIds(prev => [...prev, id]);
      return;
    }
    setExcludedItemIds(prev => prev.filter(x => x !== id));
  };

  return (
    <div className="mx-auto max-w-225 px-3 pb-8 pt-4 sm:px-4 sm:pb-12 sm:pt-6">
      <button className="btn btn-ghost btn-sm mb-4" onClick={() => navigate('/')}>
        &larr; Back to fridge
      </button>

      <h1 className="mb-5 text-2xl font-bold text-gray-900">AI Meal Ideas</h1>

      <div className="mb-6 flex gap-2">
        <button
          type="button"
          className={`btn btn-sm ${tab === 'suggest' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('suggest')}
        >
          Suggest
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tab === 'saved' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => {
            setTab('saved');
            fetchSavedMeals();
          }}
        >
          Saved{savedMeals.length > 0 ? ` (${savedMeals.length})` : ''}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-100 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {savedFlash && (
        <div className="mb-4 text-sm font-medium text-green-700">✓ Recipe saved to your account</div>
      )}

      {tab === 'suggest' && (
        <>
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="mb-1 block font-semibold text-gray-900">Custom request (optional)</label>
            <p className="mb-3 text-sm text-gray-500">
              The chef will suggest 3 meals based on your {itemCount} item{itemCount !== 1 ? 's' : ''} in stock.
              Add any extra preferences here.
            </p>
            {itemCount > 0 && (
              <div className="mb-3 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between"
                  onClick={() => setShowFilters(prev => !prev)}
                >
                  <p className="text-sm font-semibold text-gray-900">Kitchen filters</p>
                  <span className="text-xs font-semibold text-gray-500">
                    +{includedItemIds.length} / -{excludedItemIds.length} • {showFilters ? 'Hide' : 'Show'}
                  </span>
                </button>
                {showFilters && (
                  <>
                    <p className="text-xs text-gray-500">Click items to cycle: neutral → prioritize → exclude.</p>
                    <div className="flex gap-3 text-xs text-gray-500">
                      <span>Green = prioritize</span>
                      <span>Red = exclude</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {kitchenItems.map(item => {
                        const mode = getItemMode(item.id);
                        return (
                          <button
                            key={`filter-${item.id}`}
                            type="button"
                            onClick={() => cycleItemMode(item.id)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                              mode === 'include'
                                ? 'border-green-600 bg-green-100 text-green-700'
                                : mode === 'exclude'
                                  ? 'border-red-300 bg-red-100 text-red-700'
                                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                            }`}
                          >
                            {item.name}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
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

          {loading && (
            <div className="p-12 text-center text-gray-500">
              <div className="spinner mb-3 size-8" />
              <div>Let me cook...</div>
            </div>
          )}

          {meals && (
            <div className="grid gap-4">
              {meals.map((meal, i) => {
                const key = mealKey(meal.name, meal.recipe);
                const savedId = savedByKey.get(key) ?? null;
                return (
                  <MealCard
                    key={i}
                    meal={meal}
                    savedId={savedId}
                    saving={savingKey === key || savingKey === savedId}
                    onSave={() => saveMeal(meal)}
                    onUnsave={() => unsaveMeal(savedId)}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'saved' && (
        savedMeals.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
            No saved recipes yet — generate meal ideas and tap Save.
          </div>
        ) : (
          <div className="grid gap-4">
            {savedMeals.map(saved => (
              <MealCard
                key={saved.id}
                meal={toMealCardShape(saved)}
                savedId={saved.id}
                saving={savingKey === saved.id}
                onUnsave={() => unsaveMeal(saved.id)}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}
