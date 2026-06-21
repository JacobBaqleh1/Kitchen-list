import { useState, useEffect, useRef, useCallback } from 'react';
import { wsBase } from '../api';

// Real-time chat for a shared list, backed by the server's WebSocket room.
// Owners pass `authToken` (promotes them to the owner role); guests pass a
// display `name`. The hook handles reconnection with backoff and merges the
// history backfill with live messages (deduped by id).
export function useShareChat({ token, name, authToken, enabled = true }) {
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [status, setStatus] = useState('idle'); // idle|connecting|open|closed|error
  const [error, setError] = useState('');

  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const attemptsRef = useRef(0);
  const closedByUs = useRef(false);
  const connectRef = useRef(null);

  const mergeMessages = useCallback((incoming) => {
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      for (const m of incoming) byId.set(m.id, m);
      return [...byId.values()].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
    });
  }, []);

  const connect = useCallback(() => {
    if (!enabled || !token) return;
    if (!authToken && !name) return; // need an identity to join

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
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (data.type === 'history') mergeMessages(data.messages || []);
      else if (data.type === 'message') mergeMessages([data.message]);
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
      // Exponential backoff, capped at 10s. Call through a ref so the callback
      // doesn't reference itself before initialization.
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
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((body) => {
    const text = (body || '').trim();
    if (!text) return false;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify({ type: 'message', body: text }));
    return true;
  }, []);

  return { messages, participants, status, error, sendMessage };
}
