import { WebSocketServer } from 'ws';
import { asc, eq } from 'drizzle-orm';
import { db } from '../db.js';
import { shares, shareMessages } from '../schema.js';
import { verifyToken } from '../middleware/auth.js';

const WS_PATH = '/ws/shares';
const MAX_BODY = 2000;
const HISTORY_LIMIT = 100;
const HEARTBEAT_MS = 30000;

// shareId -> Set<ws>. A "room" is everyone currently viewing one shared list.
const rooms = new Map();

function joinRoom(shareId, ws) {
  if (!rooms.has(shareId)) rooms.set(shareId, new Set());
  rooms.get(shareId).add(ws);
}

function leaveRoom(shareId, ws) {
  const room = rooms.get(shareId);
  if (!room) return;
  room.delete(ws);
  if (room.size === 0) rooms.delete(shareId);
}

function broadcast(shareId, payload) {
  const room = rooms.get(shareId);
  if (!room) return;
  const data = JSON.stringify(payload);
  for (const client of room) {
    if (client.readyState === 1) client.send(data);
  }
}

function presenceFor(shareId) {
  const room = rooms.get(shareId);
  if (!room) return [];
  return [...room].map((c) => ({ name: c.participant.name, role: c.participant.role }));
}

function broadcastPresence(shareId) {
  broadcast(shareId, { type: 'presence', participants: presenceFor(shareId) });
}

function send(ws, payload) {
  if (ws.readyState === 1) ws.send(JSON.stringify(payload));
}

// Resolve who is connecting from the upgrade query string. The share token is
// the gate; an optional auth JWT promotes the connection to the owner role.
async function resolveParticipant(query) {
  const token = query.get('token');
  if (!token) return { error: 'Missing share token' };

  const [share] = await db.select().from(shares).where(eq(shares.token, token));
  if (!share || share.status !== 'active') return { error: 'Share not found or revoked' };

  const authToken = query.get('auth');
  if (authToken) {
    const user = await verifyToken(authToken);
    if (user && user.id === share.ownerId) {
      return {
        share,
        participant: {
          role: 'owner',
          name: share.ownerName || user.name || 'Owner',
          userId: user.id,
        },
      };
    }
  }

  const guestName = (query.get('name') || '').trim().slice(0, 40);
  if (!guestName) return { error: 'A display name is required to join the chat' };
  return {
    share,
    participant: { role: 'guest', name: guestName, userId: null },
  };
}

async function persistMessage(share, participant, body) {
  const [row] = await db.insert(shareMessages).values({
    shareId: share.id,
    senderRole: participant.role,
    senderName: participant.name,
    senderUserId: participant.userId,
    body,
  }).returning();
  return row;
}

export function initShareChat(server) {
  const wss = new WebSocketServer({ server, path: WS_PATH });

  wss.on('connection', async (ws, req) => {
    let query;
    try {
      query = new URL(req.url, 'http://localhost').searchParams;
    } catch {
      send(ws, { type: 'error', error: 'Bad request' });
      return ws.close();
    }

    let resolved;
    try {
      resolved = await resolveParticipant(query);
    } catch (e) {
      // e.g. a transient DB failure while validating the token — don't leave
      // the socket hanging; report and close so the client can retry.
      console.error('Share chat connect error:', e.message);
      send(ws, { type: 'error', error: 'Could not join chat, please retry' });
      return ws.close();
    }
    if (resolved.error) {
      send(ws, { type: 'error', error: resolved.error });
      return ws.close();
    }

    const { share, participant } = resolved;
    ws.shareId = share.id;
    ws.participant = participant;
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    joinRoom(share.id, ws);

    // Backfill recent history, then confirm the join, then announce presence.
    try {
      const history = await db.select().from(shareMessages)
        .where(eq(shareMessages.shareId, share.id))
        .orderBy(asc(shareMessages.createdAt))
        .limit(HISTORY_LIMIT);
      send(ws, { type: 'history', messages: history });
    } catch (e) {
      send(ws, { type: 'error', error: 'Could not load chat history' });
    }

    send(ws, { type: 'joined', participant });
    broadcastPresence(share.id);

    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return send(ws, { type: 'error', error: 'Invalid message format' });
      }
      if (msg.type !== 'message') return;

      const body = String(msg.body || '').trim().slice(0, MAX_BODY);
      if (!body) return;

      try {
        const row = await persistMessage(share, participant, body);
        broadcast(share.id, { type: 'message', message: row });
      } catch (e) {
        send(ws, { type: 'error', error: 'Message could not be delivered' });
      }
    });

    ws.on('close', () => {
      leaveRoom(share.id, ws);
      broadcastPresence(share.id);
    });
  });

  // Render's proxy drops idle sockets; ping periodically and reap the dead ones.
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      try { ws.ping(); } catch { /* socket already gone */ }
    }
  }, HEARTBEAT_MS);

  wss.on('close', () => clearInterval(heartbeat));

  return wss;
}
