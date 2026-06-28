import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/src/theme';

type Meal = {
  name: string;
  recipe: string[];
  shopping_list?: string[];
};

export function MealCard({ meal }: { meal: Meal }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{meal.name}</Text>
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
        {meal.shopping_list && meal.shopping_list.length > 0 ? (
          <>
            <Text style={[styles.label, { marginTop: spacing.lg }]}>Shopping list</Text>
            <View style={styles.tags}>
              {meal.shopping_list.map((item, i) => (
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
    backgroundColor: colors.green600,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
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
