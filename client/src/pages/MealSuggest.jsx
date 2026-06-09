import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { MealCard } from '../components/MealCard';

export default function MealSuggest() {
  const [prompt, setPrompt] = useState('');
  const [meals, setMeals] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [itemCount, setItemCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch('/api/items')
      .then(data => setItemCount(data.filter(i => !i.checked).length))
      .catch(() => {});
  }, []);

  const suggest = async () => {
    setLoading(true);
    setError('');
    setMeals(null);
    try {
      const data = await apiFetch('/api/meal/suggest', {
        method: 'POST',
        body: JSON.stringify({ userPrompt: prompt }),
      });
      setMeals(data.meals);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
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
