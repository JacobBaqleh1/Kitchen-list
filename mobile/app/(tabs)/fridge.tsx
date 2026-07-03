import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePersistentSession } from '@/src/auth';
import { apiFetch } from '@/src/api';
import {
  clearItemsInflight,
  readItemsCache,
  writeItemsCache,
  prefetchItems,
} from '@/src/lib/items-cache';
import { loadItemSort, saveItemSort } from '@/src/lib/app-settings';
import { AddItemForm } from '@/src/components/add-item-form';
import { PhotoScan } from '@/src/components/photo-scan';
import { ItemCard } from '@/src/components/item-card';
import { ItemListSkeleton } from '@/src/components/item-list-skeleton';
import { Button } from '@/src/components/button';
import { Input } from '@/src/components/input';
import { ErrorBanner, NoticeBanner, SectionLabel } from '@/src/components/card';
import { colors, fonts, spacing } from '@/src/theme';

type Item = {
  id: number;
  name: string;
  quantity: number;
  expiryDate: string | null;
  location: string;
  checked: boolean;
  createdAt: string;
};

const TABS = ['fridge', 'freezer', 'pantry'] as const;
type Tab = (typeof TABS)[number];
const SORT_OPTIONS = [
  { value: 'recent', label: 'Last entered' },
  { value: 'alpha', label: 'A–Z' },
];

function sortItems(list: Item[], sortBy: string) {
  const sorted = [...list];
  if (sortBy === 'alpha') {
    return sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }
  return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function parseLocation(value: string | string[] | undefined): Tab {
  const loc = Array.isArray(value) ? value[0] : value;
  return loc === 'freezer' || loc === 'pantry' ? loc : 'fridge';
}

export default function FridgeScreen() {
  const { location, focus } = useLocalSearchParams<{ location?: string; focus?: string }>();
  const { data: sessionData } = usePersistentSession();
  const userId = sessionData?.user?.id != null ? String(sessionData.user.id) : null;
  const authToken = sessionData?.session?.token ?? null;
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const addY = useRef(0);
  const scanY = useRef(0);

  const [items, setItems] = useState<Item[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>(() => parseLocation(location));
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [addError, setAddError] = useState('');

  useEffect(() => {
    setActiveTab(parseLocation(location));
  }, [location]);

  useEffect(() => {
    const target = focus === 'add' ? addY.current : focus === 'scan' ? scanY.current : null;
    if (target != null) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: Math.max(0, target - 12), animated: true });
      });
    }
  }, [focus]);

  useEffect(() => {
    loadItemSort().then(setSortBy);
  }, []);

  const fetchItems = useCallback(
    async ({ background = false }: { background?: boolean } = {}) => {
      if (!userId || !authToken) return;
      if (background) setRefreshing(true);
      else setInitialLoading(true);

      const load = () =>
        apiFetch('/api/items').then((data: Item[]) => {
          if (!Array.isArray(data)) throw new Error('Unexpected response from server');
          writeItemsCache(userId, data);
          return data;
        });

      try {
        let data: Item[];
        try {
          data = (await (prefetchItems(userId, load) ?? load())) as Item[];
        } catch {
          clearItemsInflight(userId);
          data = await load();
        }
        setItems(data);
        setError('');
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to load items';
        setError(
          background
            ? `Couldn’t refresh — showing saved items. ${message}`
            : message,
        );
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [userId, authToken],
  );

  useEffect(() => {
    if (!userId || !authToken) {
      setInitialLoading(!userId);
      return;
    }

    let cancelled = false;

    (async () => {
      const cached = await readItemsCache(userId);
      if (cancelled) return;
      if (cached !== null) {
        setItems(cached as Item[]);
        setInitialLoading(false);
        void fetchItems({ background: true });
      } else {
        void fetchItems();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, authToken, fetchItems]);

  const handleAdd = async (payload: object) => {
    setAddError('');
    try {
      await apiFetch('/api/items', { method: 'POST', body: JSON.stringify(payload) });
      await fetchItems({ background: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to add item';
      setAddError(message);
      throw e;
    }
  };

  const handleBulkAdd = async (newItems: object[]) => {
    await apiFetch('/api/items/bulk', { method: 'POST', body: JSON.stringify({ items: newItems }) });
    fetchItems({ background: true });
  };

  const handleToggle = async (id: number) => {
    await apiFetch(`/api/items/${id}/toggle`, { method: 'PATCH' });
    fetchItems({ background: true });
  };

  const handleEdit = async (id: number, payload: object) => {
    await apiFetch(`/api/items/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    fetchItems({ background: true });
  };

  const handleDelete = async (id: number) => {
    await apiFetch(`/api/items/${id}`, { method: 'DELETE' });
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const tabItems = items.filter((i) => i.location === activeTab);
  const searchQuery = search.trim().toLowerCase();
  const matchesSearch = (item: Item) =>
    !searchQuery || item.name.toLowerCase().includes(searchQuery);
  const inStock = sortItems(tabItems.filter((i) => !i.checked), sortBy);
  const used = sortItems(tabItems.filter((i) => i.checked), sortBy);
  const filteredInStock = inStock.filter(matchesSearch);
  const filteredUsed = used.filter(matchesSearch);
  const uncheckedCount = items.filter((i) => !i.checked).length;

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.cta}>
        <View style={styles.ctaText}>
          <Text style={styles.ctaTitle}>Get AI Meal Ideas</Text>
          <Text style={styles.ctaSub}>
            {uncheckedCount > 0
              ? `Based on ${uncheckedCount} item${uncheckedCount !== 1 ? 's' : ''} in your kitchen`
              : 'Add items to get meal suggestions'}
          </Text>
        </View>
        <Button
          title="Suggest Meals →"
          variant="white"
          disabled={uncheckedCount === 0}
          onPress={() => router.push('/(tabs)/meal')}
        />
      </View>

      <View onLayout={(e) => { addY.current = e.nativeEvent.layout.y; }}>
        <AddItemForm onAdd={handleAdd} defaultLocation={activeTab} error={addError} />
      </View>
      <View onLayout={(e) => { scanY.current = e.nativeEvent.layout.y; }}>
        <PhotoScan onItemsConfirmed={handleBulkAdd} location={activeTab} />
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => {
              setActiveTab(tab);
              setSearch('');
            }}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab[0].toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {!initialLoading && (inStock.length > 0 || used.length > 0) ? (
        <View style={styles.filters}>
          <Input
            placeholder={`Search ${activeTab}...`}
            value={search}
            onChangeText={setSearch}
            style={styles.search}
          />
          <View style={styles.sortRow}>
            {SORT_OPTIONS.map(({ value, label }) => (
              <Pressable
                key={value}
                onPress={() => {
                  setSortBy(value);
                  saveItemSort(value);
                }}
                style={[styles.sortChip, sortBy === value && styles.sortChipActive]}
              >
                <Text style={[styles.sortText, sortBy === value && styles.sortTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {refreshing && items.length > 0 ? (
        <NoticeBanner message="Updating your items…" />
      ) : null}

      {error ? <ErrorBanner message={error} onRetry={() => fetchItems()} /> : null}

      {initialLoading && items.length === 0 ? (
        <ItemListSkeleton count={4} />
      ) : (
        <>
          <SectionLabel>
            In stock ({searchQuery ? `${filteredInStock.length} of ${inStock.length}` : inStock.length})
          </SectionLabel>
          {filteredInStock.length ? (
            filteredInStock.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          ) : (
            <Text style={styles.empty}>
              {searchQuery ? `No items match "${search.trim()}"` : 'No items in stock — add some above'}
            </Text>
          )}

          {used.length > 0 || searchQuery ? (
            <>
              <SectionLabel>
                Used / out ({searchQuery ? `${filteredUsed.length} of ${used.length}` : used.length})
              </SectionLabel>
              {filteredUsed.length ? (
                filteredUsed.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onToggle={handleToggle}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))
              ) : searchQuery ? (
                <Text style={styles.empty}>No used items match "{search.trim()}"</Text>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.travertine50, flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  cta: {
    backgroundColor: colors.green600,
    borderRadius: 14,
    gap: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  ctaText: { gap: 4 },
  ctaTitle: { color: colors.white, fontFamily: fonts.sans, fontSize: 16, fontWeight: '700' },
  ctaSub: { color: 'rgba(255,255,255,0.8)', fontFamily: fonts.sans, fontSize: 13 },
  tabBar: {
    backgroundColor: colors.travertine200,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.lg,
    padding: 4,
  },
  tab: { borderRadius: 8, flex: 1, paddingVertical: 8 },
  tabActive: { backgroundColor: colors.white },
  tabText: { color: colors.travertine600, fontFamily: fonts.sans, fontSize: 13, fontWeight: '500', textAlign: 'center' },
  tabTextActive: { color: colors.travertine900, fontWeight: '600' },
  filters: { gap: spacing.sm, marginBottom: spacing.md },
  search: { width: '100%' },
  sortRow: { flexDirection: 'row', gap: spacing.sm },
  sortChip: {
    borderColor: colors.travertine300,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortChipActive: { backgroundColor: colors.green100, borderColor: colors.green600 },
  sortText: { color: colors.travertine700, fontFamily: fonts.sans, fontSize: 13 },
  sortTextActive: { color: colors.green700, fontWeight: '600' },
  empty: {
    backgroundColor: colors.white,
    borderColor: colors.travertine200,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    color: colors.travertine600,
    fontFamily: fonts.sans,
    fontSize: 14,
    marginBottom: spacing.lg,
    padding: spacing.xl,
    textAlign: 'center',
  },
});
