import { useState, useEffect } from 'react';
import { subscribe, getLog, clearLog } from '../debug';

// Inline styles only — must render even if app CSS fails to load.
const fab = {
  position: 'fixed', bottom: 10, right: 10, zIndex: 99999,
  background: '#111827', color: '#fff', border: 'none', borderRadius: 999,
  padding: '8px 12px', fontSize: 13, fontFamily: 'monospace', cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(0,0,0,.3)',
};
const panel = {
  position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 99998,
  maxHeight: '55vh', background: '#0b1020', color: '#d1fae5',
  fontFamily: 'monospace', fontSize: 11, lineHeight: 1.45,
  borderTop: '2px solid #16a34a', display: 'flex', flexDirection: 'column',
};
const bar = {
  display: 'flex', gap: 8, padding: '8px 10px', background: '#111827',
  position: 'sticky', top: 0,
};
const barBtn = {
  background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6,
  padding: '6px 10px', fontSize: 12, fontFamily: 'monospace', cursor: 'pointer',
};

export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState(getLog());

  useEffect(() => subscribe(setLines), []);

  const copy = () => {
    const text = lines.join('\n');
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <>
      <button style={fab} onClick={() => setOpen(o => !o)}>
        🐞 {lines.length}
      </button>
      {open && (
        <div style={panel}>
          <div style={bar}>
            <button style={barBtn} onClick={clearLog}>Clear</button>
            <button style={barBtn} onClick={copy}>Copy</button>
            <button style={{ ...barBtn, marginLeft: 'auto', background: '#374151' }} onClick={() => setOpen(false)}>Close</button>
          </div>
          <pre style={{ margin: 0, padding: 10, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'text' }}>
            {lines.length ? lines.join('\n') : '(no log yet — try signing in)'}
          </pre>
        </div>
      )}
    </>
  );
}
