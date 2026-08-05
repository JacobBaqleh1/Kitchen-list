import { useEffect, useState } from 'react';
import { Alert, Link, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, clientSignOut } from '@/src/auth';
import { apiFetch } from '@/src/api';
import { loadItemSort, saveItemSort, clearMealCache } from '@/src/lib/app-settings';
import { Button } from '@/src/components/button';
import { Input } from '@/src/components/input';
import { Card, ErrorBanner, SectionLabel } from '@/src/components/card';
import { Spinner } from '@/src/components/spinner';
import { colors, spacing } from '@/src/theme';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Last entered' },
  { value: 'alpha', label: 'A–Z' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const [allergies, setAllergies] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [newAllergy, setNewAllergy] = useState('');
  const [newDislike, setNewDislike] = useState('');
  const [defaultSort, setDefaultSort] = useState('recent');
  const [saved, setSaved] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState('');

  useEffect(() => {
    loadItemSort().then(setDefaultSort);
    apiFetch('/api/preferences')
      .then((data) => {
        setAllergies(data.allergies || []);
        setDislikes(data.dislikes || []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const persist = async (override: object) => {
    try {
      await apiFetch('/api/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ allergies, dislikes, ...override }),
      });
      flashSaved();
    } catch {
      /* best-effort */
    }
  };

  const addTag = (field: 'allergies' | 'dislikes', value: string, clear: () => void) => {
    const trimmed = value.trim();
    const current = field === 'allergies' ? allergies : dislikes;
    if (!trimmed || current.includes(trimmed)) {
      clear();
      return;
    }
    const next = [...current, trimmed];
    (field === 'allergies' ? setAllergies : setDislikes)(next);
    clear();
    persist({ [field]: next });
  };

  const removeTag = (field: 'allergies' | 'dislikes', value: string) => {
    const current = field === 'allergies' ? allergies : dislikes;
    const next = current.filter((t) => t !== value);
    (field === 'allergies' ? setAllergies : setDislikes)(next);
    persist({ [field]: next });
  };

  const signOut = async () => {
    await clientSignOut();
    router.replace('/(auth)/sign-in');
  };

  const deleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    setDeleteNotice('');
    try {
      await apiFetch('/api/account', { method: 'DELETE' });
      const payload = deletePassword.trim()
        ? { password: deletePassword.trim(), callbackURL: 'mykitchenlist://' }
        : { callbackURL: 'mykitchenlist://' };
      const result = await auth.deleteUser(payload);
      if (result?.data?.message === 'Verification email sent') {
        setDeleteNotice('Check your email to confirm account deletion.');
        setShowDeleteConfirm(false);
        return;
      }
      await clientSignOut();
      router.replace('/(auth)/sign-in');
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Could not delete account');
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your inventory, preferences, and shared lists. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', style: 'destructive', onPress: () => setShowDeleteConfirm(true) },
      ],
    );
  };

  if (loading) return <Spinner label="Loading..." />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.intro}>Manage your kitchen, meal planning, and app preferences.</Text>
      {error ? <ErrorBanner message={`Could not load meal preferences: ${error}`} /> : null}

      <SectionLabel>Meal planning</SectionLabel>
      <TagEditor
        title="Allergies"
        hint="Ingredients the chef will never include"
        tags={allergies}
        value={newAllergy}
        onChange={setNewAllergy}
        onAdd={() => addTag('allergies', newAllergy, () => setNewAllergy(''))}
        onRemove={(t) => removeTag('allergies', t)}
        tagStyle={styles.allergyTag}
      />
      <TagEditor
        title="Dislikes"
        hint="Ingredients the chef will minimize or avoid"
        tags={dislikes}
        value={newDislike}
        onChange={setNewDislike}
        onAdd={() => addTag('dislikes', newDislike, () => setNewDislike(''))}
        onRemove={(t) => removeTag('dislikes', t)}
        tagStyle={styles.dislikeTag}
      />

      <SectionLabel>Display</SectionLabel>
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Default item sort</Text>
        <View style={styles.sortRow}>
          {SORT_OPTIONS.map(({ value, label }) => (
            <Pressable
              key={value}
              onPress={() => {
                setDefaultSort(value);
                saveItemSort(value);
                flashSaved();
              }}
              style={[styles.sortChip, defaultSort === value && styles.sortChipActive]}
            >
              <Text style={[styles.sortText, defaultSort === value && styles.sortTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <SectionLabel>Data</SectionLabel>
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Recent meal suggestions</Text>
        <Button
          title="Clear recent suggestions"
          variant="secondary"
          small
          onPress={async () => {
            await clearMealCache();
            setCacheCleared(true);
            setTimeout(() => setCacheCleared(false), 2000);
          }}
        />
      </Card>

      <SectionLabel>About</SectionLabel>
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>MyKitchenList</Text>
        <Text style={styles.hint}>
          Track what&apos;s in your fridge, freezer, and pantry, then get AI meal ideas based on what you have on hand.
        </Text>
        <Link href="/privacy" asChild>
          <Pressable style={styles.linkRow}>
            <Text style={styles.linkText}>Privacy Policy</Text>
          </Pressable>
        </Link>
      </Card>

      <SectionLabel>Account</SectionLabel>
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Sign out</Text>
        <Button title="Sign out" variant="secondary" onPress={signOut} />
      </Card>

      <Card style={[styles.card, styles.dangerCard]}>
        <Text style={styles.dangerTitle}>Delete account</Text>
        <Text style={styles.hint}>
          Permanently delete your account and all associated data. This cannot be undone.
        </Text>
        {!showDeleteConfirm ? (
          <Button title="Delete my account" variant="danger" onPress={confirmDeleteAccount} />
        ) : (
          <View style={styles.deleteForm}>
            <Text style={styles.hint}>
              Enter your password if you signed up with email, then confirm.
            </Text>
            <Input
              placeholder="Password (email accounts)"
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
              autoCapitalize="none"
            />
            {deleteError ? <ErrorBanner message={deleteError} /> : null}
            <Button
              title={deleteLoading ? 'Deleting...' : 'Confirm deletion'}
              variant="danger"
              loading={deleteLoading}
              onPress={deleteAccount}
            />
            <Button
              title="Cancel"
              variant="secondary"
              disabled={deleteLoading}
              onPress={() => {
                setShowDeleteConfirm(false);
                setDeletePassword('');
                setDeleteError('');
              }}
            />
          </View>
        )}
        {deleteNotice ? <Text style={styles.notice}>{deleteNotice}</Text> : null}
      </Card>

      {saved ? <Text style={styles.flash}>✓ Saved</Text> : null}
      {cacheCleared ? <Text style={styles.flash}>✓ Recent suggestions cleared</Text> : null}
    </ScrollView>
  );
}

function TagEditor({
  title,
  hint,
  tags,
  value,
  onChange,
  onAdd,
  onRemove,
  tagStyle,
}: {
  title: string;
  hint: string;
  tags: string[];
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (t: string) => void;
  tagStyle: object;
}) {
  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.hint}>{hint}</Text>
      <View style={styles.tags}>
        {tags.map((t) => (
          <Pressable key={t} style={[styles.tag, tagStyle]} onPress={() => onRemove(t)}>
            <Text style={styles.tagText}>{t} ×</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        <Input placeholder={`Type a ${title.toLowerCase().slice(0, -1)}`} value={value} onChangeText={onChange} style={styles.flex} />
        <Button title="Add" variant="secondary" onPress={onAdd} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.gray50, flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  intro: { color: colors.gray500, fontSize: 14, marginBottom: spacing.lg },
  card: { gap: spacing.sm, marginBottom: spacing.md },
  cardTitle: { color: colors.gray900, fontSize: 15, fontWeight: '600' },
  hint: { color: colors.gray500, fontSize: 13 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  allergyTag: { backgroundColor: colors.green100, borderColor: '#86efac', borderWidth: 1 },
  dislikeTag: { backgroundColor: colors.amber100, borderColor: colors.amber200, borderWidth: 1 },
  tagText: { color: colors.gray700, fontSize: 13 },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  sortRow: { flexDirection: 'row', gap: spacing.sm },
  sortChip: {
    borderColor: colors.gray200,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortChipActive: { backgroundColor: colors.green100, borderColor: colors.green600 },
  sortText: { color: colors.gray700, fontSize: 13 },
  sortTextActive: { color: colors.green700, fontWeight: '600' },
  linkRow: { marginTop: spacing.sm },
  linkText: { color: colors.green600, fontSize: 14, fontWeight: '600' },
  dangerCard: { borderColor: colors.red200, gap: spacing.sm },
  dangerTitle: { color: colors.red700, fontSize: 15, fontWeight: '600' },
  deleteForm: { gap: spacing.sm },
  notice: { color: colors.amber600, fontSize: 13, fontWeight: '600', marginTop: spacing.xs },
  flash: { color: colors.green700, fontSize: 14, fontWeight: '600', marginTop: spacing.md },
});
