# Ember & Salt — Restaurant Ordering, Reservation & Management System

A static HTML/CSS/vanilla-JS restaurant platform on Firebase (Auth + Firestore + Storage). No build step, no backend server — deploy the folder as-is.

**This is Phase 1** of the full spec: it's a real, working foundation, not every single feature in the original brief. See [What's built vs. Phase 2](#whats-built-vs-phase-2) below.

## Project structure

```
restaurant-app/
├── index.html                 # Public marketing site (hero, menu preview, story, chef, testimonials, gallery, contact, FAQ)
├── customer/
│   ├── login.html              register.html          (auth)
│   ├── menu.html                                       (browse/search/filter, QR table support via ?table=12)
│   ├── cart.html                                       (cart + checkout: promo codes, order types, scheduling)
│   ├── reservations.html                                (booking, double-booking prevention, my reservations)
│   ├── order-track.html                                 (live status via Firestore onSnapshot)
│   ├── orders.html                                      (order history + invoices)
│   └── account.html                                     (profile, password, favorites, loyalty)
├── admin/
│   ├── login.html                dashboard.html
│   ├── menu.html                 (meal CRUD)
│   ├── orders.html               (kanban order pipeline, real-time)
│   ├── reservations.html         (accept/reject/assign table)
│   ├── customers.html            (search, suspend, view history)
│   ├── reports.html              (sales summary + CSV export)
│   └── demo-data.html            (one-click sample menu, orders & reservations for demos)
├── css/                        tokens.css · base.css · components.css · admin.css
├── js/
│   ├── firebase/config.js      ⬅ PASTE YOUR FIREBASE CONFIG HERE
│   ├── modules/                ui.js · auth.js · cart.js · menu-data.js
│   └── admin/layout.js         shared admin sidebar shell
└── firebase/
    ├── firestore.rules
    ├── firestore.indexes.json
    └── storage.rules
```

## Firebase setup

1. Create a project at https://console.firebase.google.com
2. **Authentication** → Sign-in method → enable **Email/Password**
3. **Firestore Database** → Create database → start in production mode → pick a region
4. **Storage** → Get started
5. Project settings → General → "Your apps" → add a **Web app** → copy the config object
6. Open `js/firebase/config.js` and paste your config into the `firebaseConfig` object (clearly marked with ⬇️/⬆️ comments)
7. Deploy rules and indexes with the Firebase CLI:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init firestore storage   # point at existing project, use the files in /firebase
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```
   Or paste `firebase/firestore.rules` and `firebase/storage.rules` directly into the console's Rules editors.

### Create your first admin account

There's no public admin signup (by design). To make yourself an admin:
1. Register a normal account at `customer/register.html` (or via `admin/login.html` won't work yet — register as a customer first).
2. In the Firestore console, open `users/{your-uid}` and change `role` from `"customer"` to `"admin"`.
3. Sign in at `admin/login.html`.

### Sample data for a client demo

Sign in at `admin/login.html` (see "Create your first admin account" below), then open **Demo Data** in the admin sidebar (`admin/demo-data.html`). From there you can:
- **Seed Menu** — 6 categories, 11 dishes with real stock photography, and 3 promo codes
- **Seed Orders** — 15 randomized orders spread across every status and order type, so the Orders kanban board and Dashboard aren't empty
- **Seed Reservations** — 8 sample bookings across the coming week
- **Seed Everything** — all three at once
- **Clear demo orders & reservations** — removes everything the tool created (tagged `isDemo: true`), without touching your real menu or customer accounts

No rule changes or console fiddling required — it writes through the normal admin permissions already defined in `firestore.rules`.

## Firestore collections

| Collection | Purpose |
|---|---|
| `users` | `{ name, email, phone, role: 'customer'\|'admin', loyaltyPoints, favorites[], status }` |
| `categories` | `{ name, description, order }` |
| `meals` | `{ name, categoryId, price, description, ingredients[], allergens[], nutrition{}, emoji, available, featured }` |
| `orders` | `{ userId, items[], orderType, status, statusHistory[], subtotal, discount, tax, deliveryFee, total, paymentStatus }` |
| `reservations` | `{ userId, date, time, slotKey, guests, notes, status, tableAssigned }` |
| `promoCodes` | `{ code, type: 'percentage'\|'fixed'\|'free_delivery', value, usageLimit, usedCount, minOrderValue, expiryDate }` |
| `reviews` | `{ userId, mealId/orderId, rating, foodRating, deliveryRating, serviceRating, comment, photos[] }` — schema ready, UI is Phase 2 |
| `tables` | QR-code table records — schema ready, generator UI is Phase 2 |

## Deploying to Netlify

1. Push this folder to a GitHub repo
2. Netlify → **Add new site** → Import from Git → pick the repo
3. Build command: *(leave blank)* — Publish directory: `/` (repo root, since this is a static site)
4. Deploy. Every page loads Firebase directly from the CDN, so there's nothing to build.
5. Add your Netlify domain to Firebase → Authentication → Settings → **Authorized domains**.

## What's built vs. Phase 2

**Built and working now:** public site, full auth (register/login/forgot password), menu browse/search/filter with QR table entry point, cart + checkout (dine-in/pickup/delivery, promo codes, tax, delivery fee, scheduling), reservations with double-booking prevention, live order tracking, order history + invoices, customer account (profile/password/favorites/loyalty points+redemption), admin dashboard analytics, admin menu CRUD, admin order kanban with real-time updates, admin reservation management, admin customer management, CSV sales export.

**Not yet built (Phase 2 — ask your dev to pick this back up):** customer reviews UI (schema exists), QR code *generator* for tables (ordering via `?table=` already works, generating/printing the codes doesn't yet), push/toast notifications for order updates and low stock, dedicated daily/weekly/monthly/annual report breakdowns beyond the current summary, PDF export (CSV is done), dark mode polish pass across every page, and Stripe/Paystack integration (the checkout flow and data model are already shaped for it — see the note on `cart.html`).

## Notes

- Payments are intentionally **not implemented**. Orders are created with `paymentStatus: 'unpaid'`; wire Stripe or Paystack into the "Place Order" handler in `customer/cart.html` when ready.
- Tax rate (8.25%) and delivery fee ($4.99) are constants at the top of `js/modules/cart.js` — change them there.
- Table capacity per reservation slot (12) is a constant in `customer/reservations.html` — tune to your actual seating.
