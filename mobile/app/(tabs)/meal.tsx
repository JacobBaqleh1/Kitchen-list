import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '@/src/api';
import { MEALS_STORAGE_KEY } from '@/src/lib/app-settings';
import { MealCard } from '@/src/components/meal-card';
import { Button } from '@/src/components/button';
import { Input } from '@/src/components/input';
import { Card, ErrorBanner } from '@/src/components/card';
import { Spinner } from '@/src/components/spinner';
import { colors, spacing } from '@/src/theme';

type Meal = {
  name: string;
  recipe: string[];
  shopping_list?: string[];
};

type KitchenItem = {
  id: number;
  name: string;
  checked: boolean;
};

async function loadStoredMeals() {
  try {
    const raw = await AsyncStorage.getItem(MEALS_STORAGE_KEY);
    if (!raw) return { prompt: '', meals: null as Meal[] | null };
    const { prompt = '', meals = null } = JSON.parse(raw);
    return { prompt, meals: Array.isArray(meals) ? meals : null };
  } catch {
    return { prompt: '', meals: null };
  }
}

async function saveStoredMeals(prompt: string, meals: Meal[] | null) {
  if (!meals?.length) {
    await AsyncStorage.removeItem(MEALS_STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(MEALS_STORAGE_KEY, JSON.stringify({ prompt, meals }));
}

export default function MealScreen() {
  const [prompt, setPrompt] = useState('');
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [itemCount, setItemCount] = useState(0);
  const [kitchenItems, setKitchenItems] = useState<KitchenItem[]>([]);
  const [includedItemIds, setIncludedItemIds] = useState<number[]>([]);
  const [excludedItemIds, setExcludedItemIds] = useState<number[]>([]);

  useEffect(() => {
    loadStoredMeals().then(({ prompt: p, meals: m }) => {
      setPrompt(p);
      setMeals(m);
    });
    apiFetch('/api/items')
      .then((data: KitchenItem[]) => {
        const inStock = data.filter((i) => !i.checked);
        setKitchenItems(inStock);
        setItemCount(inStock.length);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    saveStoredMeals(prompt, meals);
  }, [prompt, meals]);

  const suggest = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/meal/suggest', {
        method: 'POST',
        body: JSON.stringify({
          userPrompt: prompt,
          includeItemIds: includedItemIds,
          excludeItemIds: excludedItemIds,
        }),
      });
      setMeals(data.meals);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate meals');
    } finally {
      setLoading(false);
    }
  };

  const includedSet = useMemo(() => new Set(includedItemIds), [includedItemIds]);
  const excludedSet = useMemo(() => new Set(excludedItemIds), [excludedItemIds]);
  const toggleInclude = (id: number) => {
    setIncludedItemIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setExcludedItemIds((prev) => prev.filter((x) => x !== id));
  };
  const toggleExclude = (id: number) => {
    setExcludedItemIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setIncludedItemIds((prev) => prev.filter((x) => x !== id));
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <Card style={styles.card}>
        <Text style={styles.label}>Custom request (optional)</Text>
        <Text style={styles.hint}>
          The chef will suggest 3 meals based on your {itemCount} item{itemCount !== 1 ? 's' : ''} in stock.
        </Text>
        {itemCount > 0 ? (
          <View style={styles.filters}>
            <Text style={styles.filterLabel}>Kitchen filters</Text>
            <Text style={styles.hint}>Choose items to prioritize or skip for this generation.</Text>
            <Text style={styles.sectionTitle}>Prioritize</Text>
            <View style={styles.chipWrap}>
              {kitchenItems.map((item) => (
                <Pressable
                  key={`include-${item.id}`}
                  onPress={() => toggleInclude(item.id)}
                  style={[styles.chip, includedSet.has(item.id) && styles.chipInclude]}
                >
                  <Text style={[styles.chipText, includedSet.has(item.id) && styles.chipIncludeText]}>
                    {item.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.sectionTitle}>Exclude</Text>
            <View style={styles.chipWrap}>
              {kitchenItems.map((item) => (
                <Pressable
                  key={`exclude-${item.id}`}
                  onPress={() => toggleExclude(item.id)}
                  style={[styles.chip, excludedSet.has(item.id) && styles.chipExclude]}
                >
                  <Text style={[styles.chipText, excludedSet.has(item.id) && styles.chipExcludeText]}>
                    {item.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        <Input
          multiline
          placeholder='e.g. "Something quick and easy"'
          value={prompt}
          onChangeText={setPrompt}
          editable={!loading}
        />
        <View style={styles.actions}>
          <Button
            title={loading ? 'Generating...' : 'Suggest Meals'}
            onPress={suggest}
            disabled={loading || itemCount === 0}
            loading={loading}
          />
          {itemCount === 0 ? (
            <Text style={styles.hint}>Add items to your fridge or pantry first</Text>
          ) : null}
        </View>
      </Card>

      {error ? <ErrorBanner message={error} /> : null}
      {loading ? <Spinner label="Let me cook..." /> : null}

      {meals?.map((meal, i) => (
        <View key={i} style={styles.mealWrap}>
          <MealCard meal={meal} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.gray50, flex: 1 },
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxl },
  card: { gap: spacing.md },
  label: { color: colors.gray900, fontSize: 15, fontWeight: '600' },
  hint: { color: colors.gray500, fontSize: 13 },
  filters: { gap: spacing.xs },
  filterLabel: { color: colors.gray900, fontSize: 14, fontWeight: '600' },
  sectionTitle: {
    color: colors.gray700,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    backgroundColor: colors.gray100,
    borderColor: colors.gray200,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { color: colors.gray700, fontSize: 12, fontWeight: '500' },
  chipInclude: { backgroundColor: colors.green100, borderColor: colors.green600 },
  chipIncludeText: { color: colors.green700, fontWeight: '600' },
  chipExclude: { backgroundColor: colors.red50, borderColor: colors.red200 },
  chipExcludeText: { color: colors.red700, fontWeight: '600' },
  actions: { gap: spacing.sm },
  mealWrap: { marginTop: spacing.sm },
});
