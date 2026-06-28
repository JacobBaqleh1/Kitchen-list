import { useState, useEffect, useCallback, useRef } from 'react';
import { usePersistentSession } from '../auth';
import { apiFetch } from '../api';
import { ChatPanel } from '../components/ChatPanel';

function ShareRow({ share, onCopy, onShare, onRevoke, onOpenChat, active, copied }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-colors sm:p-5 ${
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

      <div className="mt-4 flex flex-col gap-2 rounded-xl bg-gray-50 p-3 sm:flex-row sm:items-center">
        <span className="min-w-0 flex-1 break-all text-xs leading-relaxed text-gray-500 sm:truncate">
          {share.url}
        </span>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <button className="btn btn-secondary btn-sm w-full" onClick={() => onCopy(share)}>
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <button className="btn btn-primary btn-sm w-full" onClick={() => onShare(share)}>
            Share
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
        <button className="btn btn-secondary btn-sm w-full" onClick={() => onOpenChat(share)}>
          {active ? 'Chatting' : 'Open chat'}
        </button>
        <button className="btn btn-danger btn-sm w-full" onClick={() => onRevoke(share)}>
          Revoke
        </button>
      </div>
    </div>
  );
}

export default function SharePage() {
  const { data: sessionData } = usePersistentSession();
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
  const chatRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/api/shares');
      setShares(data.filter((s) => s.status !== 'revoked'));
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

  useEffect(() => {
    if (!activeShare || typeof window === 'undefined') return;
    if (!window.matchMedia('(max-width: 1023px)').matches) return;

    window.requestAnimationFrame(() => {
      chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [activeShare]);

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

  const handleShare = async (share) => {
    const shareData = {
      title: 'MyKitchenList shared kitchen',
      text: 'View this shared kitchen list on MyKitchenList.',
      url: share.url,
    };

    try {
      setError('');
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(share.url);
      setCopiedId(share.id);
      setNotice('Link copied — paste it into any message or app to share.');
      setTimeout(() => setCopiedId((id) => (id === share.id ? null : id)), 1500);
    } catch (e) {
      if (e?.name === 'AbortError') return;
      setError('Could not open sharing — copy the link manually.');
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
      <div className="mb-6 rounded-2xl bg-linear-to-br from-green-600 to-green-700 p-5 text-white shadow-md sm:p-6">
        <div className="text-sm font-medium text-white/80">Share your kitchen</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Share your list</h1>
        <p className="mt-2 max-w-150 text-sm leading-6 text-white/85">
          Invite someone to view your fridge, freezer, and pantry — read-only, like a
          shared doc. They can open the link without an account and chat with you live.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <label className="mb-1 block font-semibold text-gray-900">Invite by email</label>
        <p className="mb-3 text-sm text-gray-500">
          We'll email them a view link. Leave blank to just create a link you can
          share yourself.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            className="input min-w-0 flex-1"
            placeholder="friend@example.com (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={creating}
          />
          <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={creating}>
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
                  onShare={handleShare}
                  onRevoke={handleRevoke}
                  onOpenChat={setActiveShare}
                />
              ))}
            </div>
          )}
        </div>

        <div
          ref={chatRef}
          className={activeShare ? 'order-first scroll-mt-20 lg:order-none' : ''}
        >
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Chat
          </h2>
          {activeShare ? (
            <div className="h-[70svh] min-h-[28rem] max-h-[34rem] lg:h-[32rem]">
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
