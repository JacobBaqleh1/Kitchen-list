const STORAGE_PREFIX = 'mykitchenlist:items:';

let memory = { userId: null, items: null };
let inflight = null;

function storageKey(userId) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function readItemsCache(userId) {
  if (!userId) return null;
  if (memory.userId === userId && memory.items) return memory.items;
  try {
    const raw = sessionStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) return null;
    memory = { userId, items };
    return items;
  } catch {
    return null;
  }
}

export function writeItemsCache(userId, items) {
  if (!userId || !Array.isArray(items)) return;
  memory = { userId, items };
  try {
    sessionStorage.setItem(storageKey(userId), JSON.stringify(items));
  } catch {
    // sessionStorage full or unavailable
  }
}

export function clearItemsCache(userId) {
  memory = { userId: null, items: null };
  if (userId) {
    try { sessionStorage.removeItem(storageKey(userId)); } catch { /* ignore */ }
  }
}

/** Start fetching items as soon as auth is ready (deduped per user). */
export function prefetchItems(userId, fetchFn) {
  if (!userId) return null;
  if (inflight?.userId === userId) return inflight.promise;

  const promise = fetchFn()
    .then((items) => {
      writeItemsCache(userId, items);
      return items;
    })
    .finally(() => {
      if (inflight?.userId === userId) inflight = null;
    });

  inflight = { userId, promise };
  return promise;
}
