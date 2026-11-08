import React from 'react';
import './SearchFilters.css';
import { EMPTY_FILTERS } from '../utils/inventory';

function SearchFilters({ filters, setFilters, searchInput, setSearchInput, categories }) {
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setFilters(prev => ({
        ...prev,
        search: searchInput
      }));
    }
  };

  const handleChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="search-filters">
      <div className="filter-group">
        <label htmlFor="search">Search</label>
        <input
          type="text"
          id="search"
          placeholder="Search by name or category... (Press Enter)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleSearchKeyDown}
        />
      </div>

      <div className="filter-group">
        <label htmlFor="category">Category</label>
        <select
          id="category"
          value={filters.category}
          onChange={(e) => handleChange('category', e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={filters.lowStock}
            onChange={(e) => handleChange('lowStock', e.target.checked)}
          />
          <span>Low Stock Only</span>
        </label>
      </div>

      {(searchInput || filters.search || filters.category || filters.lowStock || filters.expiringSoon) && (
        <button
          className="btn-clear"
          onClick={() => {
            setSearchInput('');
            setFilters(EMPTY_FILTERS);
          }}
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}

export default SearchFilters;


