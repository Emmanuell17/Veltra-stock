import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './ItemList.css';
import SearchFilters from './SearchFilters';
import AnimatedList from './AnimatedList';
import { getItems, deleteItem } from '../services/firestoreService';
import {
  EMPTY_FILTERS,
  filterItems,
  formatDate,
  formatPrice,
  isExpiringSoon,
  isLowStock,
} from '../utils/inventory';

const activateOnKey = (handler) => (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handler();
  }
};

function ItemList() {
  const { currentUser } = useAuth();
  const userEmail = currentUser?.email;
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [activeOverview, setActiveOverview] = useState('items');

  useEffect(() => {
    if (!userEmail) return undefined;

    let cancelled = false;
    setLoading(true);
    getItems(userEmail)
      .then((data) => {
        if (cancelled) return;
        setItems(data);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to fetch items. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userEmail]);

  const filteredItems = useMemo(() => filterItems(items, filters), [items, filters]);
  const categories = useMemo(
    () => [...new Set(items.map((item) => item.category))].sort(),
    [items]
  );

  const toggleLowStockFilter = () => {
    setFilters((prev) => ({ ...prev, lowStock: !prev.lowStock }));
  };

  const toggleExpiringSoonFilter = () => {
    setFilters((prev) => ({ ...prev, expiringSoon: !prev.expiringSoon }));
  };

  const showOverview = (overview) => {
    setActiveOverview(overview);
    setSearchInput('');
    setFilters(EMPTY_FILTERS);
  };

  const handleSelectItem = useCallback((item) => navigate(`/edit/${item.id}`), [navigate]);

  const handleDelete = async (itemId, itemName) => {
    if (!window.confirm(`Are you sure you want to delete "${itemName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteItem(itemId, userEmail);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {
      alert(`Error deleting item: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="loading">Loading items...</div>;
  }

  if (error) {
    return (
      <div className="item-list-container">
        <div className="error">
          <h3>⚠️ Error</h3>
          <p>{error}</p>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
            Please check your Firebase configuration and try again.
          </p>
        </div>
      </div>
    );
  }

  const lowStockCount = items.filter((item) => isLowStock(item.quantity)).length;
  const expiringSoonCount = items.filter((item) => isExpiringSoon(item.expiration_date)).length;
  const categorySummary = categories.map((category) => ({
    category,
    count: items.filter((item) => item.category === category).length
  }));

  return (
    <div className="item-list-container">
      <div className="item-list-header">
        <div>
          <h2>Seller Dashboard</h2>
          <p className="dashboard-subtitle">Manage your grocery inventory</p>
        </div>
        <div className="header-actions">
          <Link to="/add" className="btn btn-primary">+ Add New Item</Link>
        </div>
      </div>

      {items.length > 0 && (
        <div className="dashboard-stats">
          <div
            role="button"
            tabIndex={0}
            aria-pressed={activeOverview === 'items'}
            aria-label="Show all items"
            className={`stat-card stat-card-interactive${activeOverview === 'items' ? ' stat-card-active' : ''}`}
            onClick={() => showOverview('items')}
            onKeyDown={activateOnKey(() => showOverview('items'))}
          >
            <span className="stat-label">Total Items</span>
            <span className="stat-value">{items.length}</span>
            <span className="stat-hint">{activeOverview === 'items' ? 'Showing all items' : 'Click to show all items'}</span>
          </div>
          <div
            role="button"
            tabIndex={0}
            aria-pressed={activeOverview === 'categories'}
            aria-label="Show total categories view"
            className={`stat-card stat-card-interactive${activeOverview === 'categories' ? ' stat-card-active' : ''}`}
            onClick={() => showOverview('categories')}
            onKeyDown={activateOnKey(() => showOverview('categories'))}
          >
            <span className="stat-label">Total Categories</span>
            <span className="stat-value">{categories.length}</span>
            <span className="stat-hint">{activeOverview === 'categories' ? 'Showing categories only' : 'Click to view categories'}</span>
          </div>
          {lowStockCount > 0 && (
            <div
              role="button"
              tabIndex={0}
              aria-pressed={filters.lowStock}
              aria-label={
                filters.lowStock
                  ? 'Showing low stock items only. Click to show all items.'
                  : 'Filter to low stock items only'
              }
              className={`stat-card warning stat-card-interactive${filters.lowStock ? ' stat-card-active' : ''}`}
              onClick={toggleLowStockFilter}
              onKeyDown={activateOnKey(toggleLowStockFilter)}
            >
              <span className="stat-label">Low Stock Alerts</span>
              <span className="stat-value">{lowStockCount}</span>
              <span className="stat-hint">{filters.lowStock ? 'Showing only · click to clear' : 'Click to filter'}</span>
            </div>
          )}
          <div
            role="button"
            tabIndex={0}
            aria-pressed={filters.expiringSoon}
            aria-label={
              filters.expiringSoon
                ? 'Showing items expiring soon only. Click to show all items.'
                : 'Filter to items expiring soon'
            }
            className={`stat-card danger stat-card-interactive${filters.expiringSoon ? ' stat-card-active' : ''}`}
            onClick={toggleExpiringSoonFilter}
            onKeyDown={activateOnKey(toggleExpiringSoonFilter)}
          >
            <span className="stat-label">Expiring Soon</span>
            <span className="stat-value">{expiringSoonCount}</span>
            <span className="stat-hint">{filters.expiringSoon ? 'Showing only · click to clear' : 'Click to filter'}</span>
          </div>
        </div>
      )}

      <SearchFilters 
        filters={filters} 
        setFilters={setFilters}
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        categories={categories}
      />

      {items.length === 0 ? (
        <div className="empty-state">
          <p>No items found. Add your first item to get started!</p>
        </div>
      ) : activeOverview === 'categories' ? (
        <div className="categories-overview">
          {categorySummary.map(({ category, count }) => (
            <div key={category} className="category-card">
              <span className="category-name">{category}</span>
              <span className="category-count">{count} item{count === 1 ? '' : 's'}</span>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state">
          <p>No items match the current filters.</p>
        </div>
      ) : (
        <div className="animated-items-container">
          <AnimatedList
            items={filteredItems}
            onItemSelect={handleSelectItem}
            renderItem={(item, index, isSelected) => (
              <div className={`animated-item-card ${isLowStock(item.quantity) ? 'low-stock' : ''} ${isSelected ? 'selected' : ''}`}>
                <div className="item-card-header">
                  <h3 className="item-name">{item.name}</h3>
                  {isLowStock(item.quantity) ? (
                    <span className="status warning">Low stock</span>
                  ) : (
                    <span className="status ok">In stock</span>
                  )}
                </div>
                <div className="item-card-details">
                  <div className="item-detail">
                    <span className="detail-label">Category:</span>
                    <span className="detail-value">{item.category}</span>
                  </div>
                  <div className="item-detail">
                    <span className="detail-label">Quantity:</span>
                    <span className={`detail-value ${isLowStock(item.quantity) ? 'quantity-low' : ''}`}>
                      {item.quantity}
                    </span>
                  </div>
                  <div className="item-detail">
                    <span className="detail-label">Price:</span>
                    <span className="detail-value">{formatPrice(item.price)}</span>
                  </div>
                  <div className="item-detail">
                    <span className="detail-label">Expiration:</span>
                    <span className="detail-value">{formatDate(item.expiration_date)}</span>
                  </div>
                </div>
                <div className="item-card-actions">
                  <Link 
                    to={`/edit/${item.id}`} 
                    className="btn btn-secondary btn-small"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Edit
                  </Link>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id, item.name);
                    }} 
                    className="btn btn-danger btn-small"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
            showGradients={true}
            enableArrowNavigation={true}
            displayScrollbar={true}
          />
        </div>
      )}
    </div>
  );
}

export default ItemList;


