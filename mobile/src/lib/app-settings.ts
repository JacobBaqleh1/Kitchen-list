import AsyncStorage from '@react-native-async-storage/async-storage';

export const SORT_STORAGE_KEY = 'mykitchenlist:item-sort';
export const MEALS_STORAGE_KEY = 'kitchenlist:meal-suggestions';

export async function loadItemSort() {
  const value = await AsyncStorage.getItem(SORT_STORAGE_KEY);
  return value === 'alpha' ? 'alpha' : 'recent';
}

export async function saveItemSort(value: string) {
  await AsyncStorage.setItem(SORT_STORAGE_KEY, value);
}

export async function clearMealCache() {
  await AsyncStorage.removeItem(MEALS_STORAGE_KEY);
}
