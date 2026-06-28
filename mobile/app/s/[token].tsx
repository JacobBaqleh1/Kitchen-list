import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { usePersistentSession } from '@/src/auth';
import { apiFetchPublic } from '@/src/api';
import { ChatPanel } from '@/src/components/chat-panel';
import { Button } from '@/src/components/button';
import { Input } from '@/src/components/input';
import { Card, ErrorBanner } from '@/src/components/card';
import { Spinner } from '@/src/components/spinner';
import { colors, spacing } from '@/src/theme';

const LOCATIONS = [
  { key: 'fridge', label: 'Fridge' },
  { key: 'freezer', label: 'Freezer' },
  { key: 'pantry', label: 'Pantry' },
];

type Item = {
  id: number;
  name: string;
  quantity: number;
  location: string;
  checked: boolean;
};

function ReadOnlyItem({ item }: { item: Item }) {
  return (
    <View style={[styles.item, item.checked && styles.itemUsed]}>
      <Text style={[styles.itemName, item.checked && styles.itemNameUsed]} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.itemQty}>×{item.quantity}</Text>
    </View>
  );
}

export default function SharedListScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { data: sessionData } = usePersistentSession();
  const signedIn = !!sessionData?.user;
  const sessionName = sessionData?.user?.name ?? null;
  const authToken = sessionData?.session?.token ?? null;

  const [data, setData] = useState<{ share?: { ownerName?: string }; items?: Item[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatName, setChatName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    if (!token) return;
    apiFetchPublic(`/api/shares/view/${token}`)
      .then((res) => {
        setData(res);
        setError('');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [token]);

  const activeChatName = chatName || (signedIn ? sessionName : null);

  if (loading) return <Spinner label="Loading shared list…" />;

  if (error) {
    return (
      <View style={styles.center}>
        <ErrorBanner message={error} />
        <Button title="Go to MyKitchenList" onPress={() => router.replace('/(tabs)')} />
      </View>
    );
  }

  const owner = data?.share?.ownerName;
  const items = data?.items ?? [];
  const totalInStock = items.filter((i) => !i.checked).length;

  return (
    <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Shared kitchen list</Text>
        <Text style={styles.heroTitle}>{owner ? `${owner}'s kitchen` : 'A shared kitchen'}</Text>
        <Text style={styles.heroSub}>
          {totalInStock} item{totalInStock !== 1 ? 's' : ''} in stock · view only
        </Text>
      </View>

      {!signedIn ? (
        <Card style={styles.cta}>
          <Text style={styles.ctaText}>
            Like what you see? Create your own MyKitchenList to track your fridge and get AI meal ideas.
          </Text>
          <Link href="/(auth)/sign-up" asChild>
            <Button title="Create free account" small />
          </Link>
        </Card>
      ) : null}

      {items.length === 0 ? (
        <Text style={styles.empty}>This kitchen list is empty right now.</Text>
      ) : (
        LOCATIONS.map(({ key, label }) => {
          const locItems = items.filter((i) => i.location === key);
          if (!locItems.length) return null;
          return (
            <View key={key} style={styles.section}>
              <Text style={styles.sectionLabel}>
                {label} ({locItems.filter((i) => !i.checked).length})
              </Text>
              {locItems.map((item) => (
                <ReadOnlyItem key={item.id} item={item} />
              ))}
            </View>
          );
        })
      )}

      {activeChatName && token ? (
        <View style={styles.chat}>
          <ChatPanel
            token={token}
            name={activeChatName}
            authToken={authToken}
            selfRole="guest"
            title={owner ? `Chat with ${owner}` : 'Chat'}
          />
        </View>
      ) : (
        <Card style={styles.nameGate}>
          <Text style={styles.gateTitle}>Join the chat</Text>
          <Text style={styles.gateSub}>Enter a display name to message the list owner.</Text>
          <Input placeholder="Your name" value={nameInput} onChangeText={setNameInput} maxLength={40} />
          <Button
            title="Start chatting"
            disabled={!nameInput.trim()}
            onPress={() => setChatName(nameInput.trim())}
          />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, gap: spacing.lg, justifyContent: 'center', padding: spacing.xl },
  hero: {
    backgroundColor: colors.green600,
    borderRadius: 14,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  heroTitle: { color: colors.white, fontSize: 20, fontWeight: '700', marginTop: 4 },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
  cta: { gap: spacing.md, marginBottom: spacing.lg },
  ctaText: { color: colors.green700, fontSize: 14 },
  section: { marginBottom: spacing.lg },
  sectionLabel: {
    color: colors.gray500,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  item: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.gray200,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    padding: spacing.md,
  },
  itemUsed: { opacity: 0.6 },
  itemName: { color: colors.gray900, flex: 1, fontSize: 14, fontWeight: '500' },
  itemNameUsed: { color: colors.gray500, textDecorationLine: 'line-through' },
  itemQty: {
    backgroundColor: colors.green100,
    borderRadius: 999,
    color: colors.green700,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  empty: {
    color: colors.gray500,
    fontSize: 14,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  chat: { height: 400, marginTop: spacing.md },
  nameGate: { gap: spacing.sm, marginTop: spacing.md },
  gateTitle: { color: colors.gray900, fontSize: 15, fontWeight: '600' },
  gateSub: { color: colors.gray500, fontSize: 13 },
});
