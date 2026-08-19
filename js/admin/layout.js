// ==========================================================================
// ADMIN LAYOUT — renders sidebar + topbar shell, guards the route to admins.
// ==========================================================================
import { requireAuth, logoutUser } from '../modules/auth.js';
import { initTheme } from '../modules/ui.js';
import { DEMO_ADMIN_EMAIL, maybeShowDemoWelcomeBanner } from '../modules/demo-auth.js';

const BASE_NAV = [
  { href: 'dashboard.html', icon: '📊', label: 'Dashboard' },
  { href: 'menu.html', icon: '🍽️', label: 'Menu' },
  { href: 'orders.html', icon: '🧾', label: 'Orders' },
  { href: 'reservations.html', icon: '📅', label: 'Reservations' },
  { href: 'customers.html', icon: '👥', label: 'Customers' },
  { href: 'reports.html', icon: '📈', label: 'Reports' },
];
// Gated by the exact Demo Admin email, never by role — a real client's own
// admin account must never see demo seed/reset controls.
const DEMO_NAV = { href: 'demo-data.html', icon: '✨', label: 'Demo Tools' };

export async function initAdminPage(activeHref) {
  initTheme();
  const { user, profile } = await requireAuth({ role: 'admin', redirectTo: 'login.html' });

  const nav = user.email === DEMO_ADMIN_EMAIL ? [...BASE_NAV, DEMO_NAV] : BASE_NAV;

  const shell = document.createElement('div');
  shell.className = 'admin-shell';
  shell.innerHTML = `
    <aside class="admin-sidebar">
      <div class="admin-logo"><a href="../index.html" class="logo" style="color:#F7F3EC">Ember<span class="accent">&</span>Salt</a><span class="badge badge-gold" style="margin-top:var(--sp-2)">Admin</span></div>
      <nav class="admin-nav">
        ${nav.map(n => `<a href="${n.href}" class="${n.href === activeHref ? 'active' : ''}"><span>${n.icon}</span>${n.label}</a>`).join('')}
      </nav>
      <div class="admin-user">
        <div style="font-weight:600;font-size:var(--text-sm)">${profile?.name || 'Admin'}</div>
        <button class="btn btn-ghost btn-sm" id="admin-logout" style="color:#F7F3EC;margin-top:var(--sp-2)">Sign out</button>
      </div>
    </aside>
    <div class="admin-main">
      <div class="admin-topbar">
        <button class="icon-btn admin-mobile-toggle" id="admin-mobile-toggle" aria-label="Menu">☰</button>
        <span class="admin-topbar-title">Ember<span class="accent">&</span>Salt</span>
        <div style="flex:1"></div>
        <button class="theme-toggle" data-theme-toggle>🌙</button>
      </div>
      <div class="admin-content container" id="admin-content"></div>
    </div>`;
  document.body.prepend(shell);
  maybeShowDemoWelcomeBanner(user.email);

  document.getElementById('admin-logout').addEventListener('click', async () => { await logoutUser(); window.location.href = 'login.html'; });
  document.getElementById('admin-mobile-toggle').addEventListener('click', (e) => { e.stopPropagation(); shell.classList.toggle('sidebar-open'); });
  document.addEventListener('click', (e) => {
    if (!shell.classList.contains('sidebar-open')) return;
    if (e.target.closest('.admin-sidebar') || e.target.closest('#admin-mobile-toggle')) return;
    shell.classList.remove('sidebar-open');
  });
  initTheme();

  return { user, profile, content: document.getElementById('admin-content') };
}
