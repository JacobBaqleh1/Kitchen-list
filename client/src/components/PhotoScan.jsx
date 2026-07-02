import { useState, useRef } from 'react';
import { apiFetch } from '../api';

const LOCATIONS = ['fridge', 'freezer', 'pantry'];

function LocationSelect({ value, onChange }) {
  return (
    <select
      className="input w-20 px-2 py-1 text-xs"
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
      <li className="flex flex-wrap items-center gap-1.5">
        <input
          className="input min-w-0 flex-1"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          autoFocus
        />
        <input
          type="number"
          className="input w-14"
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
    <li className="flex flex-wrap items-center gap-1.5 text-sm">
      <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700">
        &times;{item.quantity}
      </span>
      <span className="flex-1">{item.name}</span>
      <LocationSelect value={item.location} onChange={loc => onChange(index, { ...item, location: loc })} />
      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>
      <button className="btn btn-danger btn-sm" onClick={() => onDelete(index)}>✕</button>
    </li>
  );
}

function ManualAddForm({ onAdd, onCancel, defaultLocation }) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState(1);
  const [loc, setLoc] = useState(defaultLocation);

  const submit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), quantity: Number(qty) || 1, location: loc });
    setName('');
    setQty(1);
  };

  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
      <input
        className="input min-w-0 flex-1"
        placeholder="Item name"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        autoFocus
      />
      <input
        type="number"
        className="input w-14"
        value={qty}
        onChange={e => setQty(e.target.value)}
        min="1"
      />
      <LocationSelect value={loc} onChange={setLoc} />
      <button className="btn btn-primary btn-sm" onClick={submit}>Add</button>
      <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
    </div>
  );
}

export function PhotoScan({ onItemsConfirmed, location }) {
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [parsingText, setParsingText] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [manualAddOpen, setManualAddOpen] = useState(false);
  const foodRef = useRef();
  const receiptRef = useRef();

  const handleFile = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setScanning(true);
    setDetected(null);
    setManualAddOpen(false);
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
    setManualAddOpen(false);
  };

  const handleParseText = async () => {
    if (!textInput.trim()) return;
    setParsingText(true);
    setDetected(null);
    setManualAddOpen(false);
    setError('');

    try {
      const data = await apiFetch('/api/photos/parse-text', {
        method: 'POST',
        body: JSON.stringify({ text: textInput }),
      });
      setDetected(data.items.map(i => ({ ...i, location })));
    } catch {
      setError('Could not parse text, please try again.');
    } finally {
      setParsingText(false);
    }
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
    <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-gray-900">Scan photo or paste text</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition-colors cursor-pointer enabled:hover:border-green-600 enabled:hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => foodRef.current.click()}
          disabled={scanning}
        >
          <span className="shrink-0 text-2xl">🥦</span>
          <span>
            <strong className="block text-sm font-semibold text-gray-900">Scan food items</strong>
            <small className="mt-0.5 block text-xs text-gray-500">Photo of groceries or produce</small>
          </span>
        </button>
        <button
          className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition-colors cursor-pointer enabled:hover:border-green-600 enabled:hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => receiptRef.current.click()}
          disabled={scanning}
        >
          <span className="shrink-0 text-2xl">🧾</span>
          <span>
            <strong className="block text-sm font-semibold text-gray-900">Scan receipt</strong>
            <small className="mt-0.5 block text-xs text-gray-500">Extract items from a receipt</small>
          </span>
        </button>
      </div>

      {/* No `capture` attribute: lets mobile offer both the camera and the
          existing photo library / files, instead of forcing the camera. */}
      <input ref={foodRef} type="file" accept="image/*" hidden onChange={e => handleFile(e, 'food')} />
      <input ref={receiptRef} type="file" accept="image/*" hidden onChange={e => handleFile(e, 'receipt')} />

      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <label htmlFor="bulk-text-input" className="mb-1 block text-xs font-semibold text-gray-700">
          Paste a long receipt/list text
        </label>
        <textarea
          id="bulk-text-input"
          className="input min-h-24 w-full resize-y"
          placeholder="Example: SALMON SMKD WILD... BANANA EACH... SLCD TURKEY"
          value={textInput}
          onChange={e => setTextInput(e.target.value)}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleParseText}
            disabled={parsingText || scanning || !textInput.trim()}
          >
            {parsingText ? 'Parsing...' : 'Parse pasted text with AI'}
          </button>
          {textInput && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setTextInput('')}
              disabled={parsingText}
            >
              Clear text
            </button>
          )}
        </div>
      </div>

      {scanning && (
        <div className="mt-2 inline-flex items-center gap-2 text-sm text-gray-500">
          <span className="spinner size-5" />
          <span>Reading your photo...</span>
        </div>
      )}
      {parsingText && (
        <div className="mt-2 inline-flex items-center gap-2 text-sm text-gray-500">
          <span className="spinner size-5" />
          <span>Parsing your text...</span>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-300 bg-red-100 px-4 py-3 text-sm text-red-800">
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError('')}
            aria-label="Dismiss error"
            className="flex shrink-0 cursor-pointer items-center border-0 bg-transparent p-0 text-lg leading-none text-red-800 opacity-65 hover:opacity-100"
          >
            &times;
          </button>
        </div>
      )}

      {detected && (
        <div className="mt-3 rounded-xl border border-green-200 bg-green-100 p-4 text-gray-900">
          <div className="mb-2.5 text-sm">
            <strong>We found {detected.length} item{detected.length !== 1 ? 's' : ''}</strong>
            <span> — review and add to {location}:</span>
          </div>
          <ul className="mb-3 flex max-h-40 list-none flex-col gap-1.5 overflow-y-auto">
            {detected.map((item, i) => (
              <DetectedItem
                key={i}
                item={item}
                index={i}
                onChange={handleChange}
                onDelete={handleDelete}
              />
            ))}
          </ul>
          {manualAddOpen && (
            <ManualAddForm
              onAdd={handleAddItem}
              onCancel={() => setManualAddOpen(false)}
              defaultLocation={location}
            />
          )}
          <div className="flex flex-wrap gap-2">
            {!manualAddOpen && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setManualAddOpen(true)}
              >
                + Add item
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={confirmAdd} disabled={adding || !detected.length}>
              {adding ? 'Adding...' : `Add all ${detected.length} item${detected.length !== 1 ? 's' : ''}`}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setDetected(null); setManualAddOpen(false); }}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
