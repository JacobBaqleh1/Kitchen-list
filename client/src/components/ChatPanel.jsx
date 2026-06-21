import { useState, useRef, useEffect } from 'react';
import { useShareChat } from '../lib/useShareChat';

const statusLabel = {
  idle: 'Not connected',
  connecting: 'Connecting…',
  open: 'Live',
  closed: 'Reconnecting…',
  error: 'Connection issue',
};

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// Shared chat UI used by both the owner (SharePage) and guests (SharedListView).
// `selfRole` is 'owner' | 'guest'; for guests `name` also disambiguates "my"
// messages from other guests'.
export function ChatPanel({ token, name, authToken, selfRole, title = 'Chat' }) {
  const { messages, participants, status, error, sendMessage } = useShareChat({
    token,
    name,
    authToken,
    enabled: true,
  });
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isMine = (m) =>
    selfRole === 'owner'
      ? m.senderRole === 'owner'
      : m.senderRole === 'guest' && m.senderName === name;

  const submit = (e) => {
    e.preventDefault();
    if (sendMessage(draft)) setDraft('');
  };

  const online = participants.length;
  const live = status === 'open';

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-200 px-4 py-3">
        <div className="min-w-0">
          <div className="font-semibold text-gray-900">{title}</div>
          <div className="text-xs text-gray-500">
            {online > 0
              ? `${online} ${online === 1 ? 'person' : 'people'} here`
              : 'No one else here yet'}
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
            live ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${live ? 'bg-green-600' : 'bg-gray-400'}`}
          />
          {statusLabel[status] || status}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 sm:px-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-gray-400">
            No messages yet — say hello!
          </div>
        ) : (
          messages.map((m) => {
            const mine = isMine(m);
            return (
              <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                <div className="mb-0.5 flex items-center gap-1.5 px-1 text-xs text-gray-500">
                  <span className="font-medium text-gray-700">
                    {mine ? 'You' : m.senderName}
                  </span>
                  {m.senderRole === 'owner' && (
                    <span className="rounded-full bg-green-100 px-1.5 text-[0.65rem] font-semibold text-green-700">
                      host
                    </span>
                  )}
                  <span>{formatTime(m.createdAt)}</span>
                </div>
                <div
                  className={`max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm sm:max-w-[80%] ${
                    mine
                      ? 'rounded-br-sm bg-green-600 text-white'
                      : 'rounded-bl-sm bg-gray-100 text-gray-900'
                  }`}
                >
                  {m.body}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-2 border-t border-gray-200 p-3 sm:flex-row">
        <input
          className="input min-w-0 flex-1"
          placeholder="Type a message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
        />
        <button
          type="submit"
          className="btn btn-primary w-full sm:w-auto"
          disabled={!draft.trim() || !live}
        >
          Send
        </button>
      </form>
    </div>
  );
}
