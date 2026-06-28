import { useState, useEffect, useRef, useCallback } from 'react';
import { wsBase } from '../api';

export function useShareChat({
  token,
  name,
  authToken,
  enabled = true,
}: {
  token: string;
  name?: string | null;
  authToken?: string | null;
  enabled?: boolean;
}) {
  const [messages, setMessages] = useState<
    { id: string; body: string; senderName: string; senderRole: string; createdAt: string }[]
  >([]);
  const [participants, setParticipants] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'open' | 'closed' | 'error'>('idle');
  const [error, setError] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  const closedByUs = useRef(false);
  const connectRef = useRef<(() => void) | null>(null);

  const mergeMessages = useCallback(
    (incoming: { id: string; body: string; senderName: string; senderRole: string; createdAt: string }[]) => {
      setMessages((prev) => {
        const byId = new Map(prev.map((m) => [m.id, m]));
        for (const m of incoming) byId.set(m.id, m);
        return [...byId.values()].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      });
    },
    [],
  );

  const connect = useCallback(() => {
    if (!enabled || !token) return;
    if (!authToken && !name) return;

    closedByUs.current = false;
    setStatus('connecting');

    const params = new URLSearchParams({ token });
    if (authToken) params.set('auth', authToken);
    if (name) params.set('name', name);

    const ws = new WebSocket(`${wsBase()}/ws/shares?${params.toString()}`);
    wsRef.current = ws;

    ws.onopen = () => {
      attemptsRef.current = 0;
      setStatus('open');
      setError('');
    };

    ws.onmessage = (event) => {
      let data: {
        type: string;
        messages?: typeof messages;
        message?: (typeof messages)[0];
        participants?: string[];
        error?: string;
      };
      try {
        data = JSON.parse(event.data as string);
      } catch {
        return;
      }
      if (data.type === 'history') mergeMessages(data.messages || []);
      else if (data.type === 'message' && data.message) mergeMessages([data.message]);
      else if (data.type === 'presence') setParticipants(data.participants || []);
      else if (data.type === 'error') setError(data.error || 'Chat error');
    };

    ws.onerror = () => setStatus('error');

    ws.onclose = () => {
      if (closedByUs.current) {
        setStatus('closed');
        return;
      }
      setStatus('closed');
      const delay = Math.min(1000 * 2 ** attemptsRef.current, 10000);
      attemptsRef.current += 1;
      reconnectRef.current = setTimeout(() => connectRef.current?.(), delay);
    };
  }, [enabled, token, authToken, name, mergeMessages]);

  useEffect(() => {
    connectRef.current = connect;
    connect();
    return () => {
      closedByUs.current = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((body: string) => {
    const text = (body || '').trim();
    if (!text) return false;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify({ type: 'message', body: text }));
    return true;
  }, []);

  return { messages, participants, status, error, sendMessage };
}
