import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'mykitchenlist:items:';

let memory: { userId: string | null; items: unknown[] | null } = { userId: null, items: null };
let inflight: { userId: string; promise: Promise<unknown[]> } | null = null;

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export async function readItemsCache(userId: string | null) {
  if (!userId) return null;
  if (memory.userId === userId && memory.items) return memory.items;
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) return null;
    memory = { userId, items };
    return items;
  } catch {
    return null;
  }
}

export async function writeItemsCache(userId: string, items: unknown[]) {
  if (!userId || !Array.isArray(items)) return;
  memory = { userId, items };
  try {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

/** Synchronous read from in-memory cache (AsyncStorage is async-only). */
export function readItemsCacheSync(userId: string | null) {
  if (!userId) return null;
  if (memory.userId === userId && memory.items) return memory.items;
  return null;
}

export function clearItemsInflight(userId?: string | null) {
  if (!userId || inflight?.userId === userId) inflight = null;
}

export function prefetchItems<T>(userId: string | null, fetchFn: () => Promise<T[]>) {
  if (!userId) return null;
  if (inflight?.userId === userId) return inflight.promise as Promise<T[]>;

  const promise = fetchFn()
    .then((items) => {
      if (!Array.isArray(items)) throw new Error('Unexpected response from server');
      writeItemsCache(userId, items);
      return items;
    })
    .catch((err) => {
      if (inflight?.userId === userId) inflight = null;
      throw err;
    })
    .finally(() => {
      if (inflight?.userId === userId) inflight = null;
    });

  inflight = { userId, promise };
  return promise;
}
