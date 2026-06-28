import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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

  useEffect(() => {
    loadStoredMeals().then(({ prompt: p, meals: m }) => {
      setPrompt(p);
      setMeals(m);
    });
    apiFetch('/api/items')
      .then((data: { checked: boolean }[]) => setItemCount(data.filter((i) => !i.checked).length))
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
        body: JSON.stringify({ userPrompt: prompt }),
      });
      setMeals(data.meals);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate meals');
    } finally {
      setLoading(false);
    }
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
  actions: { gap: spacing.sm },
  mealWrap: { marginTop: spacing.sm },
});
