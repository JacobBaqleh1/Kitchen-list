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
      <div className="page">
        <div className="loading"><div className="spinner" /><div>Loading...</div></div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Preferences</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1.5rem', fontSize: '.9rem' }}>
        These preferences are sent to Claude when generating meal suggestions.
      </p>

      <div className="pref-section">
        <div className="pref-section-title">Allergies</div>
        <div className="pref-section-sub">Ingredients Claude will never include</div>
        <div className="tags-container">
          {allergies.map(a => (
            <span key={a} className="tag">
              {a}
              <button className="tag-remove" onClick={() => removeTag(a, setAllergies)}>&times;</button>
            </span>
          ))}
        </div>
        <div className="tag-input-row">
          <input
            className="input"
            style={{ flex: 1 }}
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

      <div className="pref-section">
        <div className="pref-section-title">Dislikes</div>
        <div className="pref-section-sub">Ingredients Claude will minimize or avoid</div>
        <div className="tags-container">
          {dislikes.map(d => (
            <span key={d} className="tag tag-amber">
              {d}
              <button className="tag-remove" onClick={() => removeTag(d, setDislikes)}>&times;</button>
            </span>
          ))}
        </div>
        <div className="tag-input-row">
          <input
            className="input"
            style={{ flex: 1 }}
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

      <div className="pref-actions">
        {saved && <div className="alert alert-success" style={{ margin: 0 }}>Preferences saved!</div>}
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save preferences'}
        </button>
      </div>
    </div>
  );
}
