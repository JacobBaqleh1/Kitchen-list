import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { auth } from '../auth';
import { apiFetchPublic } from '../api';
import { ChatPanel } from '../components/ChatPanel';

const LOCATIONS = [
  { key: 'fridge', label: 'Fridge' },
  { key: 'freezer', label: 'Freezer' },
  { key: 'pantry', label: 'Pantry' },
];

function ReadOnlyItem({ item }) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm ${
        item.checked ? 'opacity-60' : ''
      }`}
    >
      <span
        className={`min-w-0 flex-1 truncate font-medium ${
          item.checked ? 'text-gray-500 line-through' : 'text-gray-900'
        }`}
      >
        {item.name}
      </span>
      <span className="shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700">
        &times;{item.quantity}
      </span>
    </div>
  );
}

function LocationSection({ label, items }) {
  if (!items.length) return null;
  const inStock = items.filter((i) => !i.checked);
  const used = items.filter((i) => i.checked);
  return (
    <div className="mb-5">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label} ({inStock.length})
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {[...inStock, ...used].map((item) => (
          <ReadOnlyItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function NameGate({ onJoin }) {
  const [name, setName] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onJoin(name.trim());
      }}
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-0.5 font-semibold text-gray-900">Join the chat</div>
      <p className="mb-3 text-sm text-gray-500">
        Enter a display name to message the list owner.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="input flex-1"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoFocus
        />
        <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
          Start chatting
        </button>
      </div>
    </form>
  );
}

export default function SharedListView() {
  const { token } = useParams();
  const { data: sessionData } = auth.useSession();
  const signedIn = !!sessionData?.user;
  const sessionName = sessionData?.user?.name ?? null;
  const authToken = sessionData?.session?.token ?? null;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatName, setChatName] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiFetchPublic(`/api/shares/view/${token}`)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError('');
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Signed-in viewers chat under their account name with no extra prompt;
  // everyone else picks a display name via the gate. Derived during render so
  // no extra effect/state churn is needed.
  const activeChatName = chatName || (signedIn ? sessionName : null);

  if (loading) {
    return (
      <div className="mx-auto max-w-225 px-3 pt-10 text-center text-gray-500">
        <div className="spinner mb-3 size-8" />
        <div>Loading shared list…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-150 px-4 pt-12 text-center">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-red-800">
          <div className="mb-1 text-lg font-semibold">List unavailable</div>
          <p className="text-sm">{error}</p>
        </div>
        <Link to="/" className="btn btn-primary mt-6">
          Go to MyKitchenList
        </Link>
      </div>
    );
  }

  const owner = data?.share?.ownerName;
  const items = data?.items ?? [];
  const totalInStock = items.filter((i) => !i.checked).length;

  return (
    <div className="mx-auto max-w-275 px-3 pb-12 pt-4 sm:px-4 sm:pt-6">
      <div className="mb-6 rounded-xl bg-linear-to-br from-green-600 to-green-700 p-5 text-white shadow-md">
        <div className="text-sm text-white/80">Shared kitchen list</div>
        <div className="text-xl font-bold">
          {owner ? `${owner}'s kitchen` : 'A shared kitchen'}
        </div>
        <div className="mt-1 text-sm text-white/80">
          {totalInStock} item{totalInStock !== 1 ? 's' : ''} in stock · view only
        </div>
      </div>

      {!signedIn && (
        <div className="mb-6 flex flex-col items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-green-900">
            Like what you see? Create your own MyKitchenList to track your fridge and
            get AI meal ideas.
          </div>
          <Link to="/auth/sign-up" className="btn btn-primary btn-sm shrink-0">
            Create free account
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              This kitchen list is empty right now.
            </div>
          ) : (
            LOCATIONS.map(({ key, label }) => (
              <LocationSection
                key={key}
                label={label}
                items={items.filter((i) => i.location === key)}
              />
            ))
          )}
        </div>

        <div className="lg:sticky lg:top-20 lg:h-[34rem]">
          {activeChatName ? (
            <ChatPanel
              token={token}
              name={activeChatName}
              authToken={authToken}
              selfRole="guest"
              title={owner ? `Chat with ${owner}` : 'Chat'}
            />
          ) : (
            <NameGate onJoin={setChatName} />
          )}
        </div>
      </div>
    </div>
  );
}
