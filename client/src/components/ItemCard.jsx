import { useState } from 'react';

export function ItemCard({ item, onToggle, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editQty, setEditQty] = useState(item.quantity);
  const [editExpiry, setEditExpiry] = useState(item.expiryDate || '');
  const [editLocation, setEditLocation] = useState(item.location);

  const saveEdit = async () => {
    if (!editName.trim()) return;
    await onEdit(item.id, {
      name: editName.trim(),
      quantity: Number(editQty),
      expiryDate: editExpiry || null,
      location: editLocation,
    });
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditName(item.name);
    setEditQty(item.quantity);
    setEditExpiry(item.expiryDate || '');
    setEditLocation(item.location);
    setEditing(false);
  };

  const expiryStatus = () => {
    if (!item.expiryDate) return null;
    const expiry = new Date(item.expiryDate + 'T00:00:00');
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = (expiry - now) / 86400000;
    if (diff < 0) return 'expired';
    if (diff <= 3) return 'soon';
    return 'ok';
  };

  const status = expiryStatus();
  const expirySoon = status === 'soon' || status === 'expired';

  if (editing) {
    return (
      <div className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
        <input
          className="input min-w-30 flex-1"
          value={editName}
          onChange={e => setEditName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && saveEdit()}
          autoFocus
        />
        <input
          type="number"
          className="input w-16"
          value={editQty}
          onChange={e => setEditQty(e.target.value)}
          min="1"
        />
        <input
          type="date"
          className="input w-full min-w-32.5 flex-1 sm:w-36 sm:flex-initial"
          value={editExpiry}
          onChange={e => setEditExpiry(e.target.value)}
        />
        <select
          className="input w-full sm:w-auto"
          value={editLocation}
          onChange={e => setEditLocation(e.target.value)}
        >
          <option value="fridge">Fridge</option>
          <option value="freezer">Freezer</option>
          <option value="pantry">Pantry</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save</button>
        <button className="btn btn-secondary btn-sm" onClick={cancelEdit}>Cancel</button>
      </div>
    );
  }

  return (
    <div
      className={`flex min-w-0 items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm transition-opacity ${item.checked ? 'opacity-60' : ''}`}
    >
      <input
        type="checkbox"
        className="size-4.25 shrink-0 cursor-pointer accent-green-600"
        checked={item.checked}
        onChange={() => onToggle(item.id)}
      />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
        <span
          className={`truncate text-sm font-medium ${item.checked ? 'text-gray-500 line-through' : 'text-gray-900'}`}
        >
          {item.name}
        </span>
        <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700">
          &times;{item.quantity}
        </span>
        {item.expiryDate && (
          <span className={`text-xs ${expirySoon ? 'font-semibold text-amber-600' : 'text-gray-500'}`}>
            {status === 'expired' ? 'Expired: ' : 'Exp: '}
            {new Date(item.expiryDate + 'T00:00:00').toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(item.id)}>Delete</button>
      </div>
    </div>
  );
}
