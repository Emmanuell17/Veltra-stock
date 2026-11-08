export const LOW_STOCK_THRESHOLD = 10;
const EXPIRING_SOON_DAYS = 14;

export const EMPTY_FILTERS = {
  search: '',
  category: '',
  lowStock: false,
  expiringSoon: false,
};

/**
 * Expiration dates are stored as "YYYY-MM-DD" strings. `new Date("YYYY-MM-DD")`
 * parses as UTC midnight, which shows the previous day west of UTC, so build
 * the date in local time instead.
 */
export const parseDateOnly = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = String(dateString).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

export const formatDate = (dateString) => {
  const date = parseDateOnly(dateString);
  return date ? date.toLocaleDateString() : 'N/A';
};

export const formatPrice = (price) => `$${Number(price || 0).toFixed(2)}`;

export const isLowStock = (quantity) => quantity < LOW_STOCK_THRESHOLD;

export const isExpiringSoon = (expirationDate) => {
  const expDate = parseDateOnly(expirationDate);
  if (!expDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(today.getDate() + EXPIRING_SOON_DAYS);
  return expDate >= today && expDate <= limit;
};

export const filterItems = (items, filters) => {
  const search = filters.search.trim().toLowerCase();
  return items.filter((item) => {
    if (search) {
      const name = (item.name || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      if (!name.includes(search) && !category.includes(search)) return false;
    }
    if (filters.category && item.category !== filters.category) return false;
    if (filters.lowStock && !isLowStock(item.quantity)) return false;
    if (filters.expiringSoon && !isExpiringSoon(item.expiration_date)) return false;
    return true;
  });
};
