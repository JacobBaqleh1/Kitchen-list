import { useState, useEffect } from 'react';
import { apiFetch } from '../api';

export default function Preferences() {
  const [allergies, setAllergies] = useState([]);
  const [dislikes, setDislikes] = useState([]);
  const [newAllergy, setNewAllergy] = useState('');
  const [newDislike, setNewDislike] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/preferences')
      .then(data => {
        setAllergies(data.allergies || []);
        setDislikes(data.dislikes || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Persist the current lists immediately (override carries the field that just
  // changed, since its setState hasn't flushed yet).
  const persist = async (override) => {
    try {
      await apiFetch('/api/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ allergies, dislikes, ...override }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
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
      <h1 className="mb-5 text-2xl font-bold text-gray-900">Preferences</h1>
      <p className="mb-6 text-sm text-gray-500">
        These preferences are sent to the chef when generating meal suggestions.
      </p>

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
          <button className="btn btn-secondary" onClick={() => addTag('allergies', newAllergy, setNewAllergy)}>Add</button>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
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
          <button className="btn btn-secondary" onClick={() => addTag('dislikes', newDislike, setNewDislike)}>Add</button>
        </div>
      </div>

      <div className="h-5">
        {saved && <span className="text-sm font-medium text-green-700">✓ Saved</span>}
      </div>
    </div>
  );
}
