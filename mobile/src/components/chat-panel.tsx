import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useShareChat } from '@/src/lib/use-share-chat';
import { Button } from './button';
import { Input } from './input';
import { colors, spacing } from '@/src/theme';

const statusLabel: Record<string, string> = {
  idle: 'Not connected',
  connecting: 'Connecting…',
  open: 'Live',
  closed: 'Reconnecting…',
  error: 'Connection issue',
};

function formatTime(ts: string) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function ChatPanel({
  token,
  name,
  authToken,
  selfRole,
  title = 'Chat',
}: {
  token: string;
  name?: string | null;
  authToken?: string | null;
  selfRole: 'owner' | 'guest';
  title?: string;
}) {
  const { messages, participants, status, error, sendMessage } = useShareChat({
    token,
    name,
    authToken,
    enabled: true,
  });
  const [draft, setDraft] = useState('');
  const listRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (messages.length) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const isMine = (m: { senderRole: string; senderName: string }) =>
    selfRole === 'owner'
      ? m.senderRole === 'owner'
      : m.senderRole === 'guest' && m.senderName === name;

  const submit = () => {
    if (sendMessage(draft)) setDraft('');
  };

  const live = status === 'open';
  const online = participants.length;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.wrap}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>
            {online > 0 ? `${online} ${online === 1 ? 'person' : 'people'} here` : 'No one else here yet'}
          </Text>
        </View>
        <View style={[styles.badge, live && styles.badgeLive]}>
          <View style={[styles.dot, live && styles.dotLive]} />
          <Text style={[styles.badgeText, live && styles.badgeTextLive]}>
            {statusLabel[status] || status}
          </Text>
        </View>
      </View>

      <ScrollView
        ref={listRef}
        style={styles.list}
        contentContainerStyle={messages.length === 0 ? styles.emptyList : styles.listContent}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 ? (
          <Text style={styles.empty}>No messages yet — say hello!</Text>
        ) : (
          messages.map((m) => {
            const mine = isMine(m);
            return (
              <View key={m.id} style={[styles.msgWrap, mine ? styles.msgWrapMine : styles.msgWrapOther]}>
                <View style={styles.msgMeta}>
                  <Text style={styles.sender}>{mine ? 'You' : m.senderName}</Text>
                  {m.senderRole === 'owner' ? (
                    <Text style={styles.host}>host</Text>
                  ) : null}
                  <Text style={styles.time}>{formatTime(m.createdAt)}</Text>
                </View>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                  <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{m.body}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {error ? (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.composer}>
        <Input
          placeholder="Type a message…"
          value={draft}
          onChangeText={setDraft}
          maxLength={2000}
          style={styles.input}
        />
        <Button title="Send" onPress={submit} disabled={!draft.trim() || !live} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderColor: colors.gray200,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minHeight: 320,
    overflow: 'hidden',
  },
  header: {
    borderBottomColor: colors.gray200,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerText: { flex: 1 },
  title: { color: colors.gray900, fontSize: 15, fontWeight: '600' },
  sub: { color: colors.gray500, fontSize: 12, marginTop: 2 },
  badge: {
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeLive: { backgroundColor: colors.green100 },
  dot: { backgroundColor: colors.gray400, borderRadius: 4, height: 8, width: 8 },
  dotLive: { backgroundColor: colors.green600 },
  badgeText: { color: colors.gray500, fontSize: 11, fontWeight: '500' },
  badgeTextLive: { color: colors.green700 },
  list: { flex: 1 },
  listContent: { gap: spacing.md, padding: spacing.md },
  emptyList: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  empty: { color: colors.gray400, fontSize: 14, textAlign: 'center' },
  msgWrap: { marginBottom: spacing.sm },
  msgWrapMine: { alignItems: 'flex-end' },
  msgWrapOther: { alignItems: 'flex-start' },
  msgMeta: { alignItems: 'center', flexDirection: 'row', gap: 6, marginBottom: 4, paddingHorizontal: 4 },
  sender: { color: colors.gray700, fontSize: 12, fontWeight: '500' },
  host: {
    backgroundColor: colors.green100,
    borderRadius: 999,
    color: colors.green700,
    fontSize: 10,
    fontWeight: '600',
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  time: { color: colors.gray500, fontSize: 11 },
  bubble: { borderRadius: 16, maxWidth: '88%', paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: colors.green600, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.gray100, borderBottomLeftRadius: 4 },
  bubbleText: { color: colors.gray900, fontSize: 14 },
  bubbleTextMine: { color: colors.white },
  errorBar: {
    backgroundColor: colors.amber50,
    borderTopColor: colors.amber200,
    borderTopWidth: 1,
    padding: spacing.sm,
  },
  errorText: { color: colors.amber800, fontSize: 12 },
  composer: {
    borderTopColor: colors.gray200,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  input: { flex: 1 },
});
