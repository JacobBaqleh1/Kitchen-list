import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { ItemCard } from '../components/ItemCard';
import { AddItemForm } from '../components/AddItemForm';
import { PhotoScan } from '../components/PhotoScan';

const tabBase = 'flex-1 sm:flex-initial rounded-md px-3 sm:px-5 py-1.5 text-sm font-medium cursor-pointer transition-colors';

export default function FridgeView() {
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('fridge');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchItems = async () => {
    try {
      const data = await apiFetch('/api/items');
      setItems(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

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
  const inStock = tabItems.filter(i => !i.checked);
  const used = tabItems.filter(i => i.checked);
  const uncheckedCount = items.filter(i => !i.checked).length;
  const hasUnchecked = uncheckedCount > 0;

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
        <button className={tabClass('fridge')} onClick={() => setActiveTab('fridge')}>Fridge</button>
        <button className={tabClass('freezer')} onClick={() => setActiveTab('freezer')}>Freezer</button>
        <button className={tabClass('pantry')} onClick={() => setActiveTab('pantry')}>Pantry</button>
      </div>

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
            In stock ({inStock.length})
          </div>
          {inStock.length ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {inStock.map(item => (
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
              No items in stock — add some above
            </div>
          )}

          {used.length > 0 && (
            <>
              <div className="mb-2.5 mt-5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Used / out ({used.length})
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {used.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onToggle={handleToggle}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
