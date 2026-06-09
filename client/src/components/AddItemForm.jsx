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
    <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-gray-900">Add item</div>
      <form onSubmit={submit}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex w-full min-w-35 flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Name *</label>
            <input
              className="input w-full"
              placeholder="e.g. Milk"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex w-full flex-col gap-1 sm:w-auto">
            <label className="text-xs font-medium text-gray-500">Qty</label>
            <input
              type="number"
              className="input w-full sm:w-17.5"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              min="1"
            />
          </div>
          <div className="flex w-full flex-col gap-1 sm:w-auto">
            <label className="text-xs font-medium text-gray-500">Expiry (optional)</label>
            <input
              type="date"
              className="input w-full sm:w-37"
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
            />
          </div>
          <div className="flex w-full flex-col gap-1 sm:w-auto">
            <label className="text-xs font-medium text-gray-500">Location</label>
            <select
              className="input w-full sm:w-26.25"
              value={location}
              onChange={e => setLocation(e.target.value)}
            >
              <option value="fridge">Fridge</option>
              <option value="freezer">Freezer</option>
              <option value="pantry">Pantry</option>
            </select>
          </div>
          <div className="flex w-full flex-col justify-end sm:w-auto">
            <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={loading || !name.trim()}>
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
