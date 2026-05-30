import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { ItemCard } from '../components/ItemCard';
import { AddItemForm } from '../components/AddItemForm';
import { PhotoScan } from '../components/PhotoScan';

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

  return (
    <div className="page">
      <div className="meal-cta">
        <div className="meal-cta-text">
          <div className="meal-cta-title">Get AI Meal Ideas</div>
          <div className="meal-cta-sub">
            {hasUnchecked
              ? `Based on ${uncheckedCount} item${uncheckedCount !== 1 ? 's' : ''} in your kitchen`
              : 'Add items to get meal suggestions'}
          </div>
        </div>
        <button
          className="btn btn-white"
          disabled={!hasUnchecked}
          onClick={() => navigate('/meal')}
        >
          Suggest Meals &rarr;
        </button>
      </div>

      <AddItemForm onAdd={handleAdd} defaultLocation={activeTab} />
      <PhotoScan onItemsConfirmed={handleBulkAdd} location={activeTab} />

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'fridge' ? 'active' : ''}`}
          onClick={() => setActiveTab('fridge')}
        >
          Fridge
        </button>
        <button
          className={`tab-btn ${activeTab === 'freezer' ? 'active' : ''}`}
          onClick={() => setActiveTab('freezer')}
        >
          Freezer
        </button>
        <button
          className={`tab-btn ${activeTab === 'pantry' ? 'active' : ''}`}
          onClick={() => setActiveTab('pantry')}
        >
          Pantry
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">
          <div className="spinner" />
          <div>Loading...</div>
        </div>
      ) : (
        <>
          <div className="section-header">In stock ({inStock.length})</div>
          {inStock.length ? (
            <div className="item-list">
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
            <div className="section-empty">
              No items in stock — add some above
            </div>
          )}

          {used.length > 0 && (
            <>
              <div className="section-header">Used / out ({used.length})</div>
              <div className="item-list">
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
