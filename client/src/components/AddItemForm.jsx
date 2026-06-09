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

  const setQty = (n) => setQuantity(Math.max(1, n));
  const incQty = () => setQty((Number(quantity) || 0) + 1);
  const decQty = () => setQty((Number(quantity) || 1) - 1);

  const LOCATIONS = ['fridge', 'freezer', 'pantry'];

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
            <div className="flex items-stretch">
              <button
                type="button"
                onClick={decQty}
                disabled={Number(quantity) <= 1}
                aria-label="Decrease quantity"
                className="flex h-9 w-9 items-center justify-center rounded-l-lg border border-gray-200 bg-white text-lg leading-none text-gray-600 select-none transition-colors enabled:hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                &minus;
              </button>
              <input
                type="number"
                className="h-9 w-12 border-y border-gray-200 bg-white text-center text-sm text-gray-900 outline-none focus:border-green-600 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                min="1"
              />
              <button
                type="button"
                onClick={incQty}
                aria-label="Increase quantity"
                className="flex h-9 w-9 items-center justify-center rounded-r-lg border border-gray-200 bg-white text-lg leading-none text-gray-600 select-none transition-colors enabled:hover:bg-gray-50"
              >
                +
              </button>
            </div>
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
            <span className="text-xs font-medium text-gray-500">Location</span>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1.5">
              {LOCATIONS.map(loc => (
                <label key={loc} className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-900">
                  <input
                    type="radio"
                    name="location"
                    value={loc}
                    checked={location === loc}
                    onChange={() => setLocation(loc)}
                    className="accent-green-600"
                  />
                  {loc[0].toUpperCase() + loc.slice(1)}
                </label>
              ))}
            </div>
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
