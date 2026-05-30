import { useState } from 'react';

export function ItemCard({ item, onToggle, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editQty, setEditQty] = useState(item.quantity);
  const [editExpiry, setEditExpiry] = useState(item.expiryDate || '');

  const saveEdit = async () => {
    if (!editName.trim()) return;
    await onEdit(item.id, {
      name: editName.trim(),
      quantity: Number(editQty),
      expiryDate: editExpiry || null,
    });
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditName(item.name);
    setEditQty(item.quantity);
    setEditExpiry(item.expiryDate || '');
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

  if (editing) {
    return (
      <div className="item-card editing">
        <div className="edit-row">
          <input
            className="input"
            style={{ flex: 1, minWidth: 120 }}
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveEdit()}
            autoFocus
          />
          <input
            type="number"
            className="input"
            style={{ width: 70 }}
            value={editQty}
            onChange={e => setEditQty(e.target.value)}
            min="1"
          />
          <input
            type="date"
            className="input"
            style={{ width: 145 }}
            value={editExpiry}
            onChange={e => setEditExpiry(e.target.value)}
          />
          <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save</button>
          <button className="btn btn-secondary btn-sm" onClick={cancelEdit}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`item-card ${item.checked ? 'checked' : ''}`}>
      <input
        type="checkbox"
        className="item-checkbox"
        checked={item.checked}
        onChange={() => onToggle(item.id)}
      />
      <div className="item-info">
        <span className="item-name">{item.name}</span>
        <span className="item-qty">&times;{item.quantity}</span>
        {item.expiryDate && (
          <span className={`item-expiry ${status === 'soon' || status === 'expired' ? 'soon' : ''}`}>
            {status === 'expired' ? 'Expired: ' : 'Exp: '}
            {new Date(item.expiryDate + 'T00:00:00').toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="item-actions">
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(item.id)}>Delete</button>
      </div>
    </div>
  );
}
