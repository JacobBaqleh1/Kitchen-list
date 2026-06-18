export const SORT_STORAGE_KEY = 'mykitchenlist:item-sort';
export const MEALS_STORAGE_KEY = 'kitchenlist:meal-suggestions';

export function loadItemSort() {
  const value = localStorage.getItem(SORT_STORAGE_KEY);
  return value === 'alpha' ? 'alpha' : 'recent';
}

export function saveItemSort(value) {
  localStorage.setItem(SORT_STORAGE_KEY, value);
}

export function clearMealCache() {
  sessionStorage.removeItem(MEALS_STORAGE_KEY);
}
