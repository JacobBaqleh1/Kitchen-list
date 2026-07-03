import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing } from '@/src/theme';

const FEATURES = [
  { id: 'fridge', label: 'Fridge', emoji: '🧊', href: '/(tabs)/fridge?location=fridge' },
  { id: 'freezer', label: 'Freezer', emoji: '❄️', href: '/(tabs)/fridge?location=freezer' },
  { id: 'pantry', label: 'Pantry', emoji: '🥫', href: '/(tabs)/fridge?location=pantry' },
  { id: 'add', label: 'Add Item', emoji: '➕', href: '/(tabs)/fridge?focus=add' },
  { id: 'scan', label: 'Scan', emoji: '📷', href: '/(tabs)/fridge?focus=scan' },
  { id: 'meal', label: 'Meal Ideas', emoji: '🍽️', href: '/(tabs)/meal' },
  { id: 'share', label: 'Share', emoji: '👥', href: '/(tabs)/share' },
  { id: 'settings', label: 'Settings', emoji: '⚙️', href: '/(tabs)/settings' },
] as const;

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>MyKitchenList</Text>
        <Text style={styles.subtitle}>What would you like to do?</Text>
      </View>

      <View style={styles.grid}>
        {FEATURES.map(({ id, label, emoji, href }) => (
          <Pressable
            key={id}
            style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
            onPress={() => router.push(href)}
          >
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={styles.label}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.gray50,
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.green600,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.gray500,
    fontSize: 14,
    marginTop: 4,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tile: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.gray200,
    borderRadius: 12,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    justifyContent: 'center',
    maxHeight: '23%',
    minHeight: 88,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tilePressed: {
    backgroundColor: colors.gray50,
    borderColor: colors.green600,
  },
  emoji: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.gray900,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
