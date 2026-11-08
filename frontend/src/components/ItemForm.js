import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './ItemForm.css';
import { GROCERY_CATEGORIES } from '../constants';
import { getItem, createItem, updateItem } from '../services/firestoreService';

function ItemForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const userEmail = currentUser?.email;
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: '',
    category: GROCERY_CATEGORIES[0],
    customCategory: '',
    quantity: '',
    price: '',
    expiration_date: ''
  });
  const [fetching, setFetching] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEdit || !userEmail) return undefined;

    let cancelled = false;
    setFetching(true);
    getItem(id, userEmail)
      .then((data) => {
        if (cancelled) return;
        const isPredefinedCategory = GROCERY_CATEGORIES.includes(data.category);
        setFormData({
          name: data.name || '',
          category: isPredefinedCategory ? data.category : 'Other',
          customCategory: isPredefinedCategory ? '' : data.category,
          quantity: data.quantity ?? '',
          price: data.price ?? '',
          expiration_date: data.expiration_date || ''
        });
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isEdit, userEmail]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resolvedCategory = formData.category === 'Other'
    ? formData.customCategory || ''
    : formData.category;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userEmail) {
      setError('You must be signed in to save items.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        category: resolvedCategory.trim(),
        quantity: parseInt(formData.quantity, 10),
        price: parseFloat(formData.price),
        expiration_date: formData.expiration_date || null,
      };

      if (isEdit) {
        await updateItem(id, payload, userEmail);
      } else {
        await createItem(payload, userEmail);
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (fetching) {
    return <div className="loading">Loading item...</div>;
  }

  return (
    <div className="item-form-container">
      <div className="form-header">
        <h2>{isEdit ? 'Edit Item' : 'Add New Item'}</h2>
        <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
          Cancel
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="item-form">
        <div className="form-group">
          <label htmlFor="name">Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="e.g., Milk, Bread, Apples"
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">Category *</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            {GROCERY_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {formData.category === 'Other' && (
            <input
              type="text"
              name="customCategory"
              value={formData.customCategory}
              onChange={handleChange}
              placeholder="Enter custom category name"
              required
              style={{ marginTop: '0.5rem' }}
            />
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="quantity">Quantity *</label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              required
              min="0"
              placeholder="0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="price">Price ($) *</label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="expiration_date">Expiration Date</label>
          <input
            type="date"
            id="expiration_date"
            name="expiration_date"
            value={formData.expiration_date}
            onChange={handleChange}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : (isEdit ? 'Update Item' : 'Add Item')}
          </button>
          <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default ItemForm;


