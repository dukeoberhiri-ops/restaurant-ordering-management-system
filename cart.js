// ==========================================================================
// CART — persisted to localStorage, works without login. Synced to
// Firestore under users/{uid}.cart on auth state change (see cart.html).
// ==========================================================================
import { showToast } from './ui.js';

const CART_KEY = 'es_cart_v1';

function readCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || { items: [], orderType: 'pickup', tableNumber: null }; }
  catch { return { items: [], orderType: 'pickup', tableNumber: null }; }
}
function writeCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
  window.dispatchEvent(new CustomEvent('cart:changed', { detail: cart }));
}

export function getCart() { return readCart(); }

export function addToCart(item) {
  // item: { mealId, name, price, imageUrl, qty, variant, notes }
  const cart = readCart();
  const key = item.mealId + '::' + (item.variant || '');
  const existing = cart.items.find(i => (i.mealId + '::' + (i.variant || '')) === key);
  if (existing) existing.qty += item.qty || 1;
  else cart.items.push({ ...item, qty: item.qty || 1, id: key });
  writeCart(cart);
  showToast(`${item.name} added to cart`, 'success');
}

export function updateQty(id, qty) {
  const cart = readCart();
  const line = cart.items.find(i => i.id === id);
  if (!line) return;
  if (qty <= 0) cart.items = cart.items.filter(i => i.id !== id);
  else line.qty = qty;
  writeCart(cart);
}

export function removeItem(id) {
  const cart = readCart();
  cart.items = cart.items.filter(i => i.id !== id);
  writeCart(cart);
  showToast('Item removed', 'info');
}

export function clearCart() {
  writeCart({ items: [], orderType: 'pickup', tableNumber: null, promo: null });
}

export function setOrderType(type) {
  const cart = readCart(); cart.orderType = type; writeCart(cart);
}
export function setTableNumber(num) {
  const cart = readCart(); cart.tableNumber = num; writeCart(cart);
}
export function setPromo(promo) {
  const cart = readCart(); cart.promo = promo; writeCart(cart);
}

export function cartCount() {
  return readCart().items.reduce((sum, i) => sum + i.qty, 0);
}
export function cartSubtotal() {
  return readCart().items.reduce((sum, i) => sum + i.qty * i.price, 0);
}

export const TAX_RATE = 0.0825;
export const DELIVERY_FEE = 4.99;

export function cartTotals() {
  const cart = readCart();
  const subtotal = cartSubtotal();
  let discount = 0;
  if (cart.promo) {
    if (cart.promo.type === 'percentage') discount = subtotal * (cart.promo.value / 100);
    else if (cart.promo.type === 'fixed') discount = Math.min(cart.promo.value, subtotal);
  }
  const deliveryFee = (cart.orderType === 'delivery' && !(cart.promo && cart.promo.type === 'free_delivery')) ? DELIVERY_FEE : 0;
  const taxable = Math.max(subtotal - discount, 0);
  const tax = taxable * TAX_RATE;
  const total = taxable + tax + deliveryFee;
  return { subtotal, discount, deliveryFee, tax, total };
}

export function updateCartBadge() {
  document.querySelectorAll('[data-cart-count]').forEach(el => {
    const count = cartCount();
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

window.addEventListener('storage', (e) => { if (e.key === CART_KEY) updateCartBadge(); });
document.addEventListener('DOMContentLoaded', updateCartBadge);
