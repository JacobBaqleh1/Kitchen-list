import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fonts, spacing } from '@/src/theme';

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
            <View style={styles.iconWrap}>
              <Text style={styles.emoji}>{emoji}</Text>
            </View>
            <Text style={styles.label}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.travertine50,
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
    color: colors.travertine800,
    fontFamily: fonts.display,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: colors.travertine600,
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: colors.travertine100,
    borderColor: 'rgba(154, 127, 98, 0.35)',
    borderRadius: 24,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    flexShrink: 0,
    justifyContent: 'center',
    maxHeight: '23%',
    minHeight: 88,
    padding: spacing.md,
    shadowColor: colors.travertine500,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  tilePressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderColor: 'rgba(154, 127, 98, 0.3)',
    borderRadius: 16,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: 48,
  },
  emoji: {
    fontSize: 24,
  },
  label: {
    color: colors.travertine800,
    fontFamily: fonts.display,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
