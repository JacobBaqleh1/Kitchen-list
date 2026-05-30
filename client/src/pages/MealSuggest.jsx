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
    <div className="page">
      <button
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: '1rem' }}
        onClick={() => navigate('/')}
      >
        &larr; Back to fridge
      </button>

      <h1 className="page-title">AI Meal Ideas</h1>

      <div className="prompt-area">
        <label className="prompt-label">Custom request (optional)</label>
        <p className="prompt-sub">
          Claude will suggest 3 meals based on your {itemCount} item{itemCount !== 1 ? 's' : ''} in stock.
          Add any extra preferences here.
        </p>
        <textarea
          className="prompt-textarea"
          placeholder={`e.g. "Something quick and easy" or "High protein, vegetarian"`}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          disabled={loading}
        />
        <div className="prompt-footer">
          <button
            className="btn btn-primary"
            onClick={suggest}
            disabled={loading || itemCount === 0}
          >
            {loading ? 'Generating...' : 'Suggest Meals'}
          </button>
          {itemCount === 0 && (
            <span className="hint">Add items to your fridge or pantry first</span>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div className="loading">
          <div className="spinner" />
          <div>Claude is thinking...</div>
        </div>
      )}

      {meals && (
        <div className="meals-grid">
          {meals.map((meal, i) => (
            <MealCard key={i} meal={meal} />
          ))}
        </div>
      )}
    </div>
  );
}
