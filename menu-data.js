// ==========================================================================
// MENU DATA — Firestore access for categories & meals
// ==========================================================================
import { db, collection, getDocs, doc, getDoc, query, where, orderBy } from '../firebase/config.js';

export async function fetchCategories() {
  const snap = await getDocs(query(collection(db, 'categories'), orderBy('order', 'asc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchMeals({ categoryId = null, onlyAvailable = true } = {}) {
  let q = collection(db, 'meals');
  const clauses = [];
  if (categoryId) clauses.push(where('categoryId', '==', categoryId));
  if (onlyAvailable) clauses.push(where('available', '==', true));
  q = clauses.length ? query(collection(db, 'meals'), ...clauses) : collection(db, 'meals');
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchMeal(id) {
  const snap = await getDoc(doc(db, 'meals', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function filterMeals(meals, { search = '', categoryId = 'all', allergenExclude = [], priceMax = null } = {}) {
  const s = search.trim().toLowerCase();
  return meals.filter(m => {
    if (categoryId !== 'all' && m.categoryId !== categoryId) return false;
    if (s && !(m.name.toLowerCase().includes(s) || (m.description || '').toLowerCase().includes(s) || (m.ingredients || []).join(' ').toLowerCase().includes(s))) return false;
    if (allergenExclude.length && (m.allergens || []).some(a => allergenExclude.includes(a))) return false;
    if (priceMax && m.price > priceMax) return false;
    return true;
  });
}
