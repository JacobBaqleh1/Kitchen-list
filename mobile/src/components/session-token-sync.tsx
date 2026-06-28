import { useEffect } from 'react';
import { usePersistentSession } from '@/src/auth';
import { setAuthToken, apiFetch } from '@/src/api';
import { prefetchItems } from '@/src/lib/items-cache';

export function SessionTokenSync() {
  const { data } = usePersistentSession();
  const token = data?.session?.token ?? null;
  const userId = data?.user?.id != null ? String(data.user.id) : null;

  // Parent effect runs before child effects so the API module has the token
  // before FridgeScreen fetches items.
  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  useEffect(() => {
    if (token && userId) {
      prefetchItems(userId, () => apiFetch('/api/items'));
    }
  }, [token, userId]);

  return null;
}
