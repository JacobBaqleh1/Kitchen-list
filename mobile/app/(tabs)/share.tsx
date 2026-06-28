import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { usePersistentSession } from '@/src/auth';
import { apiFetch } from '@/src/api';
import { Button } from '@/src/components/button';
import { Input } from '@/src/components/input';
import { Card, ErrorBanner, NoticeBanner, SectionLabel } from '@/src/components/card';
import { ChatPanel } from '@/src/components/chat-panel';
import { Spinner } from '@/src/components/spinner';
import { colors, spacing } from '@/src/theme';

type Share = {
  id: number;
  token: string;
  url: string;
  invitedEmail: string | null;
  status?: string;
  createdAt: string;
  emailSent?: boolean;
};

function ShareRow({
  share,
  active,
  copied,
  onCopy,
  onShare,
  onRevoke,
  onOpenChat,
}: {
  share: Share;
  active: boolean;
  copied: boolean;
  onCopy: (s: Share) => void;
  onShare: (s: Share) => void;
  onRevoke: (s: Share) => void;
  onOpenChat: (s: Share) => void;
}) {
  return (
    <Card style={[styles.shareCard, active && styles.shareCardActive]}>
      <Text style={styles.shareTitle}>{share.invitedEmail || 'Anyone with the link'}</Text>
      <Text style={styles.shareDate}>Created {new Date(share.createdAt).toLocaleDateString()}</Text>
      <Text style={styles.shareUrl} numberOfLines={2}>
        {share.url}
      </Text>
      <View style={styles.row}>
        <Button title={copied ? 'Copied!' : 'Copy link'} variant="secondary" small onPress={() => onCopy(share)} style={styles.flex} />
        <Button title="Share" small onPress={() => onShare(share)} style={styles.flex} />
      </View>
      <View style={styles.row}>
        <Button title={active ? 'Chatting' : 'Open chat'} variant="secondary" small onPress={() => onOpenChat(share)} style={styles.flex} />
        <Button title="Revoke" variant="danger" small onPress={() => onRevoke(share)} style={styles.flex} />
      </View>
    </Card>
  );
}

export default function ShareScreen() {
  const { data: sessionData } = usePersistentSession();
  const authToken = sessionData?.session?.token ?? null;
  const ownerName = sessionData?.user?.name ?? null;

  const [shares, setShares] = useState<Share[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [activeShare, setActiveShare] = useState<Share | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/api/shares');
      setShares(data.filter((s: Share) => s.status !== 'revoked'));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load shares');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleCreate = async () => {
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
            : 'Share created. Copy the link below to send it yourself.',
        );
      } else {
        setNotice('Share link created — copy it below to send to anyone.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create share');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (share: Share) => {
    await Clipboard.setStringAsync(share.url);
    setCopiedId(share.id);
    setTimeout(() => setCopiedId((id) => (id === share.id ? null : id)), 1500);
  };

  const handleShare = async (share: Share) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(share.url, {
          dialogTitle: 'Share your kitchen list',
        });
        return;
      }
      await handleCopy(share);
      setNotice('Link copied — paste it into any message or app to share.');
    } catch {
      setError('Could not share — copy the link manually.');
    }
  };

  const handleRevoke = async (share: Share) => {
    try {
      await apiFetch(`/api/shares/${share.id}`, { method: 'DELETE' });
      setShares((prev) => prev.filter((s) => s.id !== share.id));
      if (activeShare?.id === share.id) setActiveShare(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke share');
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Share your kitchen</Text>
        <Text style={styles.heroTitle}>Share your list</Text>
        <Text style={styles.heroSub}>
          Invite someone to view your fridge, freezer, and pantry — read-only. They can chat with you live.
        </Text>
      </View>

      <Card style={styles.form}>
        <Text style={styles.formTitle}>Invite by email</Text>
        <Text style={styles.formSub}>We'll email them a view link. Leave blank to just create a link.</Text>
        <Input
          placeholder="friend@example.com (optional)"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          editable={!creating}
        />
        <Button title={creating ? 'Creating…' : 'Create share'} onPress={handleCreate} disabled={creating} loading={creating} />
      </Card>

      {notice ? <NoticeBanner message={notice} /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      <SectionLabel>Active shares</SectionLabel>
      {loading ? (
        <Spinner label="Loading…" />
      ) : shares.length === 0 ? (
        <Text style={styles.empty}>No active shares yet — create one above.</Text>
      ) : (
        shares.map((share) => (
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
        ))
      )}

      <SectionLabel>Chat</SectionLabel>
      {activeShare ? (
        <View style={styles.chat}>
          <ChatPanel
            key={activeShare.id}
            token={activeShare.token}
            authToken={authToken}
            selfRole="owner"
            title={`Chat · ${activeShare.invitedEmail || 'shared link'}`}
          />
        </View>
      ) : (
        <Text style={styles.empty}>Select "Open chat" on a share to message viewers.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.gray50, flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  hero: {
    backgroundColor: colors.green600,
    borderRadius: 16,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  heroTitle: { color: colors.white, fontSize: 22, fontWeight: '700', marginTop: 4 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 20, marginTop: spacing.sm },
  form: { gap: spacing.sm, marginBottom: spacing.lg },
  formTitle: { color: colors.gray900, fontSize: 15, fontWeight: '600' },
  formSub: { color: colors.gray500, fontSize: 13 },
  shareCard: { gap: spacing.sm, marginBottom: spacing.md },
  shareCardActive: { borderColor: colors.green600 },
  shareTitle: { color: colors.gray900, fontSize: 15, fontWeight: '600' },
  shareDate: { color: colors.gray500, fontSize: 12 },
  shareUrl: { backgroundColor: colors.gray100, borderRadius: 8, color: colors.gray500, fontSize: 11, padding: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  chat: { height: 400, marginBottom: spacing.lg },
  empty: {
    backgroundColor: colors.white,
    borderColor: colors.gray200,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    color: colors.gray500,
    fontSize: 14,
    marginBottom: spacing.lg,
    padding: spacing.xl,
    textAlign: 'center',
  },
});
