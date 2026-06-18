import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../auth';
import { apiFetch } from '../api';
import { readItemsCache, writeItemsCache, prefetchItems } from '../lib/itemsCache';
import { ItemCard } from '../components/ItemCard';
import { AddItemForm } from '../components/AddItemForm';
import { PhotoScan } from '../components/PhotoScan';
import { loadItemSort, saveItemSort } from '../lib/appSettings';

const tabBase = 'flex-1 sm:flex-initial rounded-md px-3 sm:px-5 py-1.5 text-sm font-medium cursor-pointer transition-colors';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Last entered' },
  { value: 'alpha', label: 'A–Z' },
];

function sortItems(list, sortBy) {
  const sorted = [...list];
  if (sortBy === 'alpha') {
    return sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }
  return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export default function FridgeView() {
  const { data: sessionData } = auth.useSession();
  const userId = sessionData?.user?.id ?? null;
  const cachedItems = userId ? readItemsCache(userId) : null;

  const [items, setItems] = useState(() => cachedItems ?? []);
  const [activeTab, setActiveTab] = useState('fridge');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState(() => loadItemSort());
  const [loading, setLoading] = useState(() => cachedItems === null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchItems = useCallback(async () => {
    if (!userId) return;
    try {
      const load = () => apiFetch('/api/items').then((data) => {
        writeItemsCache(userId, data);
        return data;
      });
      const data = await (prefetchItems(userId, load) ?? load());
      setItems(data);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const cached = readItemsCache(userId);
    if (cached) {
      setItems(cached);
      setLoading(false);
    }
    fetchItems();
  }, [userId, fetchItems]);

  const handleAdd = async (payload) => {
    await apiFetch('/api/items', { method: 'POST', body: JSON.stringify(payload) });
    fetchItems();
  };

  const handleBulkAdd = async (newItems) => {
    await apiFetch('/api/items/bulk', { method: 'POST', body: JSON.stringify({ items: newItems }) });
    fetchItems();
  };

  const handleToggle = async (id) => {
    await apiFetch(`/api/items/${id}/toggle`, { method: 'PATCH' });
    fetchItems();
  };

  const handleEdit = async (id, payload) => {
    await apiFetch(`/api/items/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    fetchItems();
  };

  const handleDelete = async (id) => {
    await apiFetch(`/api/items/${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const tabItems = items.filter(i => i.location === activeTab);
  const searchQuery = search.trim().toLowerCase();
  const matchesSearch = (item) =>
    !searchQuery || item.name.toLowerCase().includes(searchQuery);
  const inStock = sortItems(tabItems.filter(i => !i.checked), sortBy);
  const used = sortItems(tabItems.filter(i => i.checked), sortBy);
  const filteredInStock = inStock.filter(matchesSearch);
  const filteredUsed = used.filter(matchesSearch);
  const uncheckedCount = items.filter(i => !i.checked).length;
  const hasUnchecked = uncheckedCount > 0;

  const tabLabel = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);

  const tabClass = (tab) =>
    `${tabBase} ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'bg-transparent text-gray-500'}`;

  return (
    <div className="mx-auto max-w-225 px-3 pb-8 pt-4 sm:px-4 sm:pb-12 sm:pt-6">
      <div className="mb-6 flex flex-col gap-3 rounded-xl bg-linear-to-br from-green-600 to-green-700 p-4 shadow-md sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:sticky sm:top-18 sm:z-9">
        <div className="text-white">
          <div className="text-base font-bold">Get AI Meal Ideas</div>
          <div className="mt-0.5 text-sm text-white/80">
            {hasUnchecked
              ? `Based on ${uncheckedCount} item${uncheckedCount !== 1 ? 's' : ''} in your kitchen`
              : 'Add items to get meal suggestions'}
          </div>
        </div>
        <button
          className="btn btn-white w-full sm:w-auto"
          disabled={!hasUnchecked}
          onClick={() => navigate('/meal')}
        >
          Suggest Meals &rarr;
        </button>
      </div>

      <AddItemForm onAdd={handleAdd} defaultLocation={activeTab} />
      <PhotoScan onItemsConfirmed={handleBulkAdd} location={activeTab} />

      <div className="mb-6 flex w-full gap-1 rounded-lg bg-gray-200 p-1 sm:w-fit">
        <button className={tabClass('fridge')} onClick={() => { setActiveTab('fridge'); setSearch(''); }}>Fridge</button>
        <button className={tabClass('freezer')} onClick={() => { setActiveTab('freezer'); setSearch(''); }}>Freezer</button>
        <button className={tabClass('pantry')} onClick={() => { setActiveTab('pantry'); setSearch(''); }}>Pantry</button>
      </div>

      {!loading && (inStock.length > 0 || used.length > 0) && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <input
              type="text"
              role="searchbox"
              inputMode="search"
              className="input w-full pr-9"
              placeholder={`Search ${tabLabel.toLowerCase()}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label={`Search items in ${tabLabel.toLowerCase()}`}
            />
            {search && (
              <button
                type="button"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded px-1.5 text-lg leading-none text-gray-400 hover:text-gray-600"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>
          <select
            className="input w-full shrink-0 sm:w-40"
            value={sortBy}
            onChange={e => {
              const value = e.target.value;
              setSortBy(value);
              saveItemSort(value);
            }}
            aria-label="Sort items"
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-100 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {loading ? (
        <div className="p-12 text-center text-gray-500">
          <div className="spinner mb-3 size-8" />
          <div>Loading...</div>
        </div>
      ) : (
        <>
          <div className="mb-2.5 mt-5 text-xs font-semibold uppercase tracking-wider text-gray-500">
            In stock ({searchQuery ? `${filteredInStock.length} of ${inStock.length}` : inStock.length})
          </div>
          {filteredInStock.length ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {filteredInStock.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              {searchQuery
                ? `No items match "${search.trim()}"`
                : 'No items in stock — add some above'}
            </div>
          )}

          {(used.length > 0 || searchQuery) && (
            <>
              <div className="mb-2.5 mt-5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Used / out ({searchQuery ? `${filteredUsed.length} of ${used.length}` : used.length})
              </div>
              {filteredUsed.length ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {filteredUsed.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onToggle={handleToggle}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
                  No used items match &ldquo;{search.trim()}&rdquo;
                </div>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}
