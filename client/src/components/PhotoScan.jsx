import { useState, useRef } from 'react';
import { apiFetch } from '../api';

const LOCATIONS = ['fridge', 'freezer', 'pantry'];

function LocationSelect({ value, onChange }) {
  return (
    <select
      className="input"
      style={{ width: 82, padding: '.25rem .4rem', fontSize: '.78rem' }}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {LOCATIONS.map(l => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
    </select>
  );
}

function DetectedItem({ item, index, onChange, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(item.quantity);

  const save = () => {
    if (!name.trim()) return;
    onChange(index, { ...item, name: name.trim(), quantity: Number(qty) || 1 });
    setEditing(false);
  };

  if (editing) {
    return (
      <li className="photo-item-row">
        <input
          className="input"
          style={{ flex: 1, minWidth: 0 }}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          autoFocus
        />
        <input
          type="number"
          className="input"
          style={{ width: 56 }}
          value={qty}
          onChange={e => setQty(e.target.value)}
          min="1"
        />
        <button className="btn btn-primary btn-sm" onClick={save}>Save</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
      </li>
    );
  }

  return (
    <li className="photo-item-row">
      <span className="item-qty">&times;{item.quantity}</span>
      <span style={{ flex: 1 }}>{item.name}</span>
      <LocationSelect value={item.location} onChange={loc => onChange(index, { ...item, location: loc })} />
      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>
      <button className="btn btn-danger btn-sm" onClick={() => onDelete(index)}>✕</button>
    </li>
  );
}

function AddItemRow({ onAdd, defaultLocation }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [qty, setQty] = useState(1);
  const [loc, setLoc] = useState(defaultLocation);

  const submit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), quantity: Number(qty) || 1, location: loc });
    setName('');
    setQty(1);
    setOpen(false);
  };

  if (!open) {
    return (
      <li style={{ paddingTop: '.25rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>+ Add item</button>
      </li>
    );
  }

  return (
    <li className="photo-item-row">
      <input
        className="input"
        style={{ flex: 1, minWidth: 0 }}
        placeholder="Item name"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        autoFocus
      />
      <input
        type="number"
        className="input"
        style={{ width: 56 }}
        value={qty}
        onChange={e => setQty(e.target.value)}
        min="1"
      />
      <LocationSelect value={loc} onChange={setLoc} />
      <button className="btn btn-primary btn-sm" onClick={submit}>Add</button>
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
    </li>
  );
}

export function PhotoScan({ onItemsConfirmed, location }) {
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const foodRef = useRef();
  const receiptRef = useRef();

  const handleFile = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setScanning(true);
    setDetected(null);
    setError('');

    try {
      const form = new FormData();
      form.append('image', file);
      form.append('type', type);
      const data = await apiFetch('/api/photos/scan', { method: 'POST', body: form });
      setDetected(data.items.map(i => ({ ...i, location })));
    } catch {
      setError('Could not read photo, please try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleChange = (index, updated) => {
    setDetected(prev => prev.map((item, i) => i === index ? updated : item));
  };

  const handleDelete = (index) => {
    setDetected(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = (item) => {
    setDetected(prev => [...prev, item]);
  };

  const confirmAdd = async () => {
    if (!detected?.length) return;
    setAdding(true);
    try {
      await onItemsConfirmed(detected.map(i => ({
        name: i.name,
        quantity: i.quantity || 1,
        location: i.location,
      })));
      setDetected(null);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="photo-scan add-form">
      <div className="add-form-title">Scan photo</div>
      <div className="scan-options">
        <button className="photo-scan-option" onClick={() => foodRef.current.click()} disabled={scanning}>
          <span className="photo-scan-icon">🥦</span>
          <span>
            <strong>Scan food items</strong>
            <small>Photo of groceries or produce</small>
          </span>
        </button>
        <button className="photo-scan-option" onClick={() => receiptRef.current.click()} disabled={scanning}>
          <span className="photo-scan-icon">🧾</span>
          <span>
            <strong>Scan receipt</strong>
            <small>Extract items from a receipt</small>
          </span>
        </button>
      </div>

      <input ref={foodRef} type="file" accept="image/*" capture="environment" hidden onChange={e => handleFile(e, 'food')} />
      <input ref={receiptRef} type="file" accept="image/*" capture="environment" hidden onChange={e => handleFile(e, 'receipt')} />

      {scanning && (
        <div className="photo-scan-loading">
          <div className="spinner" style={{ width: '1.2rem', height: '1.2rem', marginBottom: 0 }} />
          <span>Reading your photo...</span>
        </div>
      )}

      {error && <div className="alert alert-error" style={{ marginTop: '.75rem' }}>{error}</div>}

      {detected && (
        <div className="photo-confirm">
          <div className="photo-confirm-header">
            <strong>We found {detected.length} item{detected.length !== 1 ? 's' : ''}</strong>
            <span> — review and add to {location}:</span>
          </div>
          <ul className="photo-confirm-list">
            {detected.map((item, i) => (
              <DetectedItem
                key={i}
                item={item}
                index={i}
                onChange={handleChange}
                onDelete={handleDelete}
              />
            ))}
            <AddItemRow onAdd={handleAddItem} />
          </ul>
          <div className="photo-confirm-actions">
            <button className="btn btn-primary btn-sm" onClick={confirmAdd} disabled={adding || !detected.length}>
              {adding ? 'Adding...' : `Add all ${detected.length} item${detected.length !== 1 ? 's' : ''}`}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setDetected(null)}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
}
