// ==========================================================================
// UI UTILITIES — toasts, modals, confirm dialogs, formatting, theme
// ==========================================================================

/* ---------- Toasts ---------- */
function ensureToastStack() {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    stack.setAttribute('aria-live', 'polite');
    document.body.appendChild(stack);
  }
  return stack;
}

export function showToast(message, type = 'info', duration = 3500) {
  const stack = ensureToastStack();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✓', error: '⚠', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${escapeHtml(message)}</span>`;
  stack.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

/* ---------- Confirm dialog ---------- */
export function confirmDialog({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" style="max-width:420px" role="dialog" aria-modal="true">
        <h3 class="font-display" style="font-size:1.3rem;margin-bottom:.75rem">${escapeHtml(title)}</h3>
        <p class="text-muted" style="margin-bottom:1.5rem">${escapeHtml(message)}</p>
        <div class="flex gap-3" style="justify-content:flex-end">
          <button class="btn btn-ghost" data-act="cancel">Cancel</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="ok">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop || e.target.dataset.act === 'cancel') { backdrop.remove(); resolve(false); }
      if (e.target.dataset.act === 'ok') { backdrop.remove(); resolve(true); }
    });
  });
}

/* ---------- Generic modal ---------- */
export function openModal(innerHtml, { onClose } = {}) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${innerHtml}</div>`;
  document.body.appendChild(backdrop);
  const close = () => { backdrop.remove(); onClose && onClose(); };
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click', close));
  return { close, el: backdrop };
}

/* ---------- Formatting ---------- */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}
export function formatDate(date) {
  const d = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
export function formatDateTime(date) {
  const d = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
export function escapeHtml(str = '') {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
export function debounce(fn, wait = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

/* ---------- Theme (dark/light) ---------- */
export function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    updateToggleIcon(btn, saved);
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      document.querySelectorAll('[data-theme-toggle]').forEach(b => updateToggleIcon(b, next));
    });
  });
}
function updateToggleIcon(btn, mode) { btn.textContent = mode === 'dark' ? '☀️' : '🌙'; }

/* ---------- Skeleton helper ---------- */
export function skeletonCards(n = 6, height = '280px') {
  return Array.from({ length: n }).map(() => `<div class="skeleton" style="height:${height};border-radius:var(--radius-lg)"></div>`).join('');
}

/* ---------- Mobile nav ---------- */
export function initMobileNav() {
  const btn = document.querySelector('.mobile-menu-btn');
  const links = document.querySelector('.nav-links');
  if (!btn || !links) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = links.classList.toggle('mobile-open');
    btn.textContent = open ? '✕' : '☰';
  });
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    links.classList.remove('mobile-open');
    btn.textContent = '☰';
  }));
  document.addEventListener('click', (e) => {
    if (!links.classList.contains('mobile-open')) return;
    if (e.target.closest('.nav-links') || e.target.closest('.mobile-menu-btn')) return;
    links.classList.remove('mobile-open');
    btn.textContent = '☰';
  });
}
