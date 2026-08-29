import { useEffect } from 'react';
import { usePersistentSession } from '@/src/auth';
import { setAuthToken, apiFetch } from '@/src/api';
import { prefetchItems } from '@/src/lib/items-cache';

export function SessionTokenSync() {
  const { data } = usePersistentSession();
  const token = data?.session?.token ?? null;
  const userId = data?.user?.id != null ? String(data.user.id) : null;

  // Set during render so sibling/child effects can fetch immediately
  // (no getSession wait / useEffect race). Matches web SessionTokenSync.
  setAuthToken(token);

  useEffect(() => {
    if (token && userId) {
      prefetchItems(userId, () => apiFetch('/api/items'));
    }
  }, [token, userId]);

  return null;
}
