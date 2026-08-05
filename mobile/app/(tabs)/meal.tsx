import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

type SavedMeal = {
  id: string;
  name: string;
  recipe: string[];
  shoppingList?: string[];
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

function mealKey(name: string, recipe: string[]) {
  return `${name.trim().toLowerCase()}::${JSON.stringify(recipe)}`;
}

function toMealCardShape(saved: SavedMeal): Meal {
  return {
    name: saved.name,
    recipe: saved.recipe,
    shopping_list: saved.shoppingList ?? [],
  };
}

export default function MealScreen() {
  const [tab, setTab] = useState<'suggest' | 'saved'>('suggest');
  const [prompt, setPrompt] = useState('');
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [itemCount, setItemCount] = useState(0);
  const [kitchenItems, setKitchenItems] = useState<KitchenItem[]>([]);
  const [includedItemIds, setIncludedItemIds] = useState<number[]>([]);
  const [excludedItemIds, setExcludedItemIds] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const savedByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const saved of savedMeals) {
      map.set(mealKey(saved.name, saved.recipe), saved.id);
    }
    return map;
  }, [savedMeals]);

  const fetchSavedMeals = useCallback(async () => {
    try {
      const data = await apiFetch('/api/saved-meals');
      setSavedMeals(data);
    } catch {
      // non-fatal
    }
  }, []);

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
    fetchSavedMeals();
  }, [fetchSavedMeals]);

  useEffect(() => {
    saveStoredMeals(prompt, meals);
  }, [prompt, meals]);

  const flashSaved = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const saveMeal = async (meal: Meal) => {
    const key = mealKey(meal.name, meal.recipe);
    setSavingKey(key);
    setError('');
    try {
      const saved: SavedMeal = await apiFetch('/api/saved-meals', {
        method: 'POST',
        body: JSON.stringify({
          name: meal.name,
          recipe: meal.recipe,
          shopping_list: meal.shopping_list ?? [],
        }),
      });
      setSavedMeals((prev) => {
        const without = prev.filter((s) => s.id !== saved.id);
        return [saved, ...without];
      });
      flashSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save recipe');
    } finally {
      setSavingKey(null);
    }
  };

  const unsaveMeal = async (id: string) => {
    setSavingKey(id);
    setError('');
    try {
      await apiFetch(`/api/saved-meals/${id}`, { method: 'DELETE' });
      setSavedMeals((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove recipe');
    } finally {
      setSavingKey(null);
    }
  };

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
  const getItemMode = (id: number): 'include' | 'exclude' | 'neutral' => {
    if (includedSet.has(id)) return 'include';
    if (excludedSet.has(id)) return 'exclude';
    return 'neutral';
  };
  const cycleItemMode = (id: number) => {
    const currentMode = getItemMode(id);
    if (currentMode === 'neutral') {
      setIncludedItemIds((prev) => [...prev, id]);
      return;
    }
    if (currentMode === 'include') {
      setIncludedItemIds((prev) => prev.filter((x) => x !== id));
      setExcludedItemIds((prev) => [...prev, id]);
      return;
    }
    setExcludedItemIds((prev) => prev.filter((x) => x !== id));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSavedMeals();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      refreshControl={
        tab === 'saved' ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green600} />
        ) : undefined
      }
    >
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === 'suggest' && styles.tabActive]}
          onPress={() => setTab('suggest')}
        >
          <Text style={[styles.tabText, tab === 'suggest' && styles.tabTextActive]}>Suggest</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'saved' && styles.tabActive]}
          onPress={() => {
            setTab('saved');
            fetchSavedMeals();
          }}
        >
          <Text style={[styles.tabText, tab === 'saved' && styles.tabTextActive]}>
            Saved{savedMeals.length > 0 ? ` (${savedMeals.length})` : ''}
          </Text>
        </Pressable>
      </View>

      {error ? <ErrorBanner message={error} /> : null}
      {savedFlash ? <Text style={styles.flash}>✓ Recipe saved to your account</Text> : null}

      {tab === 'suggest' ? (
        <>
          <Card style={styles.card}>
            <Text style={styles.label}>Custom request (optional)</Text>
            <Text style={styles.hint}>
              The chef will suggest 3 meals based on your {itemCount} item{itemCount !== 1 ? 's' : ''} in stock.
            </Text>
            {itemCount > 0 ? (
              <View style={styles.filters}>
                <Pressable style={styles.filterHeader} onPress={() => setShowFilters((prev) => !prev)}>
                  <Text style={styles.filterLabel}>Kitchen filters</Text>
                  <Text style={styles.filterMeta}>
                    +{includedItemIds.length} / -{excludedItemIds.length} • {showFilters ? 'Hide' : 'Show'}
                  </Text>
                </Pressable>
                {showFilters ? (
                  <>
                    <Text style={styles.hint}>Tap items to cycle: neutral → prioritize → exclude.</Text>
                    <View style={styles.legendRow}>
                      <Text style={styles.legendText}>Green = prioritize</Text>
                      <Text style={styles.legendText}>Red = exclude</Text>
                    </View>
                    <View style={styles.chipWrap}>
                      {kitchenItems.map((item) => {
                        const mode = getItemMode(item.id);
                        return (
                          <Pressable
                            key={`filter-${item.id}`}
                            onPress={() => cycleItemMode(item.id)}
                            style={[
                              styles.chip,
                              mode === 'include' && styles.chipInclude,
                              mode === 'exclude' && styles.chipExclude,
                            ]}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                mode === 'include' && styles.chipIncludeText,
                                mode === 'exclude' && styles.chipExcludeText,
                              ]}
                            >
                              {item.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                ) : null}
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

          {loading ? <Spinner label="Let me cook..." /> : null}

          {meals?.map((meal, i) => {
            const key = mealKey(meal.name, meal.recipe);
            const savedId = savedByKey.get(key) ?? null;
            return (
              <View key={i} style={styles.mealWrap}>
                <MealCard
                  meal={meal}
                  savedId={savedId}
                  saving={savingKey === key || savingKey === savedId}
                  onSave={() => saveMeal(meal)}
                  onUnsave={() => savedId && unsaveMeal(savedId)}
                />
              </View>
            );
          })}
        </>
      ) : savedMeals.length === 0 ? (
        <Card style={styles.empty}>
          <Text style={styles.hint}>No saved recipes yet — generate meal ideas and tap Save.</Text>
        </Card>
      ) : (
        savedMeals.map((saved) => (
          <View key={saved.id} style={styles.mealWrap}>
            <MealCard
              meal={toMealCardShape(saved)}
              savedId={saved.id}
              saving={savingKey === saved.id}
              onUnsave={() => unsaveMeal(saved.id)}
            />
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.gray50, flex: 1 },
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxl },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tab: {
    backgroundColor: colors.gray100,
    borderColor: colors.gray200,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tabActive: {
    backgroundColor: colors.green600,
    borderColor: colors.green600,
  },
  tabText: {
    color: colors.gray700,
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.white,
  },
  card: { gap: spacing.md },
  empty: { paddingVertical: spacing.xl },
  label: { color: colors.gray900, fontSize: 15, fontWeight: '600' },
  hint: { color: colors.gray500, fontSize: 13 },
  filters: { gap: spacing.xs },
  filterHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterLabel: { color: colors.gray900, fontSize: 14, fontWeight: '600' },
  filterMeta: {
    color: colors.gray500,
    fontSize: 12,
    fontWeight: '600',
  },
  legendRow: { flexDirection: 'row', gap: spacing.sm },
  legendText: { color: colors.gray500, fontSize: 12 },
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
  flash: {
    color: colors.green700,
    fontSize: 14,
    fontWeight: '600',
  },
});
