import { useState, useEffect } from 'react';
import { apiFetch } from '../api';

export default function Preferences() {
  const [allergies, setAllergies] = useState([]);
  const [dislikes, setDislikes] = useState([]);
  const [newAllergy, setNewAllergy] = useState('');
  const [newDislike, setNewDislike] = useState('');
  const [saving, setSaving] = useState(false);
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

  const addTag = (value, setter, inputSetter) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setter(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
    inputSetter('');
  };

  const removeTag = (value, setter) => setter(prev => prev.filter(t => t !== value));

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await apiFetch('/api/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ allergies, dislikes }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // user will see no feedback — acceptable for skeleton
    } finally {
      setSaving(false);
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
      <h1 className="mb-5 text-2xl font-bold text-gray-900">Preferences</h1>
      <p className="mb-6 text-sm text-gray-500">
        These preferences are sent to Claude when generating meal suggestions.
      </p>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-0.5 font-semibold text-gray-900">Allergies</div>
        <div className="mb-3 text-sm text-gray-500">Ingredients Claude will never include</div>
        <div className="mb-3 flex min-h-7 flex-wrap gap-1.5">
          {allergies.map(a => (
            <span
              key={a}
              className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-sm font-medium text-green-700"
            >
              {a}
              <button
                className="flex cursor-pointer items-center border-0 bg-transparent p-0 text-lg leading-none text-inherit opacity-65 hover:opacity-100"
                onClick={() => removeTag(a, setAllergies)}
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
              if (e.key === 'Enter') { e.preventDefault(); addTag(newAllergy, setAllergies, setNewAllergy); }
            }}
          />
          <button className="btn btn-secondary" onClick={() => addTag(newAllergy, setAllergies, setNewAllergy)}>Add</button>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-0.5 font-semibold text-gray-900">Dislikes</div>
        <div className="mb-3 text-sm text-gray-500">Ingredients Claude will minimize or avoid</div>
        <div className="mb-3 flex min-h-7 flex-wrap gap-1.5">
          {dislikes.map(d => (
            <span
              key={d}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-sm font-medium text-amber-600"
            >
              {d}
              <button
                className="flex cursor-pointer items-center border-0 bg-transparent p-0 text-lg leading-none text-inherit opacity-65 hover:opacity-100"
                onClick={() => removeTag(d, setDislikes)}
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
              if (e.key === 'Enter') { e.preventDefault(); addTag(newDislike, setDislikes, setNewDislike); }
            }}
          />
          <button className="btn btn-secondary" onClick={() => addTag(newDislike, setDislikes, setNewDislike)}>Add</button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        {saved && (
          <div className="rounded-xl border border-green-200 bg-green-100 px-4 py-3 text-sm text-green-700">
            Preferences saved!
          </div>
        )}
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save preferences'}
        </button>
      </div>
    </div>
  );
}
