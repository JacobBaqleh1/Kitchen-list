import { useState, useEffect, useCallback } from 'react';
import { auth } from '../auth';
import { apiFetch } from '../api';
import { ChatPanel } from '../components/ChatPanel';

function ShareRow({ share, onCopy, onRevoke, onOpenChat, active, copied }) {
  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm transition-colors ${
        active ? 'border-green-500 ring-1 ring-green-500' : 'border-gray-200'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium text-gray-900">
            {share.invitedEmail || 'Anyone with the link'}
          </div>
          <div className="mt-0.5 text-xs text-gray-500">
            Created {new Date(share.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5">
        <span className="min-w-0 flex-1 truncate text-xs text-gray-500">{share.url}</span>
        <button className="btn btn-secondary btn-sm shrink-0" onClick={() => onCopy(share)}>
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <button className="btn btn-primary btn-sm" onClick={() => onOpenChat(share)}>
          {active ? 'Chatting' : 'Open chat'}
        </button>
        <button className="btn btn-danger btn-sm" onClick={() => onRevoke(share)}>
          Revoke
        </button>
      </div>
    </div>
  );
}

export default function SharePage() {
  const { data: sessionData } = auth.useSession();
  const authToken = sessionData?.session?.token ?? null;
  const ownerName = sessionData?.user?.name ?? null;

  const [shares, setShares] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [activeShare, setActiveShare] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/api/shares');
      setShares(data);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setNotice('');
    try {
      const created = await apiFetch('/api/shares', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), ownerName }),
      });
      setShares((prev) => [...prev, created]);
      setEmail('');
      if (created.invitedEmail) {
        setNotice(
          created.emailSent
            ? `Invitation emailed to ${created.invitedEmail}.`
            : `Share created. Email delivery is off on this server — copy the link below to send it yourself.`
        );
      } else {
        setNotice('Share link created — copy it below to send to anyone.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (share) => {
    try {
      await navigator.clipboard.writeText(share.url);
      setCopiedId(share.id);
      setTimeout(() => setCopiedId((id) => (id === share.id ? null : id)), 1500);
    } catch {
      setError('Could not copy — select the link and copy manually.');
    }
  };

  const handleRevoke = async (share) => {
    try {
      await apiFetch(`/api/shares/${share.id}`, { method: 'DELETE' });
      setShares((prev) => prev.filter((s) => s.id !== share.id));
      if (activeShare?.id === share.id) setActiveShare(null);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="mx-auto max-w-225 px-3 pb-8 pt-4 sm:px-4 sm:pb-12 sm:pt-6">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Share your list</h1>
      <p className="mb-6 text-sm text-gray-500">
        Invite someone to view your fridge, freezer, and pantry — read-only, like a
        shared doc. They can open the link without an account and chat with you live.
      </p>

      <form
        onSubmit={handleCreate}
        className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <label className="mb-1 block font-semibold text-gray-900">Invite by email</label>
        <p className="mb-3 text-sm text-gray-500">
          We'll email them a view link. Leave blank to just create a link you can
          share yourself.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            className="input flex-1"
            placeholder="friend@example.com (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={creating}
          />
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? 'Creating…' : 'Create share'}
          </button>
        </div>
      </form>

      {notice && (
        <div className="mb-4 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-100 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Active shares
          </h2>
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="spinner mb-3 size-8" />
              <div>Loading…</div>
            </div>
          ) : shares.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              No active shares yet — create one above.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {shares.map((share) => (
                <ShareRow
                  key={share.id}
                  share={share}
                  active={activeShare?.id === share.id}
                  copied={copiedId === share.id}
                  onCopy={handleCopy}
                  onRevoke={handleRevoke}
                  onOpenChat={setActiveShare}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Chat
          </h2>
          {activeShare ? (
            <div className="h-[32rem]">
              <ChatPanel
                key={activeShare.id}
                token={activeShare.token}
                authToken={authToken}
                selfRole="owner"
                title={`Chat · ${activeShare.invitedEmail || 'shared link'}`}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              Select “Open chat” on a share to message whoever is viewing it.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
