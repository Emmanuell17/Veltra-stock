import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

const ITEMS_COLLECTION = 'grocery_items';

const requireEmail = (userEmail) => {
  if (!userEmail) {
    throw new Error('User email is required');
  }
};

const toIsoString = (value) => value?.toDate?.()?.toISOString() ?? value ?? null;

const toDateOnlyString = (value) => {
  const iso = toIsoString(value);
  return iso ? String(iso).split('T')[0] : null;
};

const fromFirestore = (id, data) => ({
  id,
  ...data,
  created_at: toIsoString(data.created_at),
  updated_at: toIsoString(data.updated_at),
  expiration_date: toDateOnlyString(data.expiration_date),
});

const toFirestoreFields = ({ name, category, quantity, price, expiration_date }) => ({
  name,
  category,
  quantity: parseInt(quantity, 10),
  price: parseFloat(price),
  expiration_date: expiration_date ? Timestamp.fromDate(new Date(expiration_date)) : null,
});

const friendlyError = (error, fallback) => {
  if (error?.code === 'permission-denied') {
    return new Error(
      'Permission denied. Sign in with Google and ensure Firestore rules are published in Firebase Console.'
    );
  }
  return new Error(error?.message || fallback);
};

/**
 * Get all items for a user, sorted by name.
 * Sorting is done client-side to avoid requiring a composite Firestore index.
 */
export const getItems = async (userEmail) => {
  try {
    requireEmail(userEmail);

    const q = query(
      collection(db, ITEMS_COLLECTION),
      where('user_email', '==', userEmail)
    );
    const querySnapshot = await getDocs(q);
    const items = querySnapshot.docs.map((snapshot) => fromFirestore(snapshot.id, snapshot.data()));

    return items.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  } catch (error) {
    console.error('Error fetching items:', error);
    throw friendlyError(error, 'Failed to fetch items.');
  }
};

/**
 * Get a single item by ID
 */
export const getItem = async (itemId, userEmail) => {
  try {
    requireEmail(userEmail);

    const snapshot = await getDoc(doc(db, ITEMS_COLLECTION, itemId));
    if (!snapshot.exists() || snapshot.data().user_email !== userEmail) {
      throw new Error('Item not found');
    }

    return fromFirestore(snapshot.id, snapshot.data());
  } catch (error) {
    console.error('Error fetching item:', error);
    throw friendlyError(error, 'Failed to fetch item.');
  }
};

/**
 * Create a new item
 */
export const createItem = async (itemData, userEmail) => {
  try {
    requireEmail(userEmail);

    const { name, category, quantity, price } = itemData;
    if (!name || !category || quantity === undefined || price === undefined) {
      throw new Error('Missing required fields');
    }

    const now = Timestamp.now();
    const firestoreData = {
      ...toFirestoreFields(itemData),
      user_email: userEmail,
      created_at: now,
      updated_at: now,
    };

    const docRef = await addDoc(collection(db, ITEMS_COLLECTION), firestoreData);
    return fromFirestore(docRef.id, firestoreData);
  } catch (error) {
    console.error('Error creating item:', error);
    throw friendlyError(error, 'Failed to save item to Firestore.');
  }
};

/**
 * Update an existing item
 */
export const updateItem = async (itemId, itemData, userEmail) => {
  try {
    const existingItem = await getItem(itemId, userEmail);

    const firestoreData = {
      ...toFirestoreFields(itemData),
      updated_at: Timestamp.now(),
    };

    await updateDoc(doc(db, ITEMS_COLLECTION, itemId), firestoreData);

    return {
      ...existingItem,
      ...fromFirestore(itemId, firestoreData),
      created_at: existingItem.created_at,
    };
  } catch (error) {
    console.error('Error updating item:', error);
    throw friendlyError(error, 'Failed to update item.');
  }
};

/**
 * Delete an item
 */
export const deleteItem = async (itemId, userEmail) => {
  try {
    await getItem(itemId, userEmail);
    await deleteDoc(doc(db, ITEMS_COLLECTION, itemId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting item:', error);
    throw friendlyError(error, 'Failed to delete item.');
  }
};
