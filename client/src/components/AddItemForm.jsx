import { useState, useEffect } from 'react';

export function AddItemForm({ onAdd, defaultLocation = 'fridge' }) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [expiryDate, setExpiryDate] = useState('');
  const [location, setLocation] = useState(defaultLocation);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setLocation(defaultLocation); }, [defaultLocation]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onAdd({ name: name.trim(), quantity: Number(quantity), expiryDate: expiryDate || null, location });
      setName('');
      setQuantity(1);
      setExpiryDate('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-form">
      <div className="add-form-title">Add item</div>
      <form onSubmit={submit}>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
            <label>Name *</label>
            <input
              className="input"
              placeholder="e.g. Milk"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Qty</label>
            <input
              type="number"
              className="input"
              style={{ width: 70 }}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              min="1"
            />
          </div>
          <div className="form-group">
            <label>Expiry (optional)</label>
            <input
              type="date"
              className="input"
              style={{ width: 148 }}
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Location</label>
            <select
              className="input"
              style={{ width: 105 }}
              value={location}
              onChange={e => setLocation(e.target.value)}
            >
              <option value="fridge">Fridge</option>
              <option value="freezer">Freezer</option>
              <option value="pantry">Pantry</option>
            </select>
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
