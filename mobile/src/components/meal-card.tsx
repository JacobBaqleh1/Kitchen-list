import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors, spacing } from '@/src/theme';

type Meal = {
  name: string;
  recipe: string[];
  shopping_list?: string[];
  shoppingList?: string[];
};

type Props = {
  meal: Meal;
  savedId?: string | null;
  onSave?: () => void;
  onUnsave?: () => void;
  saving?: boolean;
};

export function MealCard({ meal, savedId, onSave, onUnsave, saving }: Props) {
  const showSave = onSave || onUnsave;
  const shoppingList = meal.shopping_list ?? meal.shoppingList;
  const label = saving ? (savedId ? 'Removing…' : 'Saving…') : savedId ? 'Saved' : 'Save';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{meal.name}</Text>
        {showSave ? (
          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              savedId && !saving && styles.saveBtnSaved,
              pressed && styles.saveBtnPressed,
            ]}
            onPress={savedId ? onUnsave : onSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityState={{ busy: !!saving, disabled: !!saving }}
            accessibilityLabel={savedId ? 'Remove saved recipe' : 'Save recipe'}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <SymbolView
                name={{ ios: savedId ? 'bookmark.fill' : 'bookmark', android: 'bookmark', web: 'bookmark' }}
                tintColor={savedId ? colors.green700 : colors.white}
                size={16}
              />
            )}
            <Text style={[styles.saveText, savedId && !saving && styles.saveTextSaved]}>{label}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>Recipe</Text>
        {meal.recipe.map((step, i) => (
          <View key={i} style={styles.step}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
        {shoppingList && shoppingList.length > 0 ? (
          <>
            <Text style={[styles.label, { marginTop: spacing.lg }]}>Shopping list</Text>
            <View style={styles.tags}>
              {shoppingList.map((item, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{item}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderColor: colors.gray200,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  header: {
    alignItems: 'flex-start',
    backgroundColor: colors.green600,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    color: colors.white,
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  saveBtn: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  saveBtnSaved: {
    backgroundColor: colors.white,
    borderColor: colors.white,
  },
  saveBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  saveText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  saveTextSaved: {
    color: colors.green700,
  },
  body: {
    gap: spacing.sm,
    padding: spacing.lg,
  },
  label: {
    color: colors.gray500,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  step: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stepNum: {
    alignItems: 'center',
    backgroundColor: colors.green100,
    borderRadius: 12,
    height: 22,
    justifyContent: 'center',
    marginTop: 2,
    width: 22,
  },
  stepNumText: {
    color: colors.green700,
    fontSize: 11,
    fontWeight: '700',
  },
  stepText: {
    color: colors.gray900,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: colors.amber100,
    borderColor: colors.amber200,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    color: colors.amber600,
    fontSize: 12,
    fontWeight: '500',
  },
});
