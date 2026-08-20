// ==========================================================================
// DEMO MODE — self-provisioning demo accounts + seed/reset engine.
//
// Two fixed, permanent accounts. Both auto-create themselves on first use
// (login, fall back to register) so a potential client can explore the app
// with zero setup:
//   - Demo Admin (role: admin)  — runs the restaurant side
//   - Demo User  (role: customer) — the guest whose real orders & reservations
//     the Demo Admin manages, so the two accounts demonstrate a real,
//     connected workflow instead of two disconnected sandboxes.
//
// IMPORTANT: demo controls (Seed/Reset buttons, nav link) must be gated by
// the exact email constants below, never by role — a real client's own
// admin account must never see these.
// ==========================================================================
import {
  auth, db, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile,
  doc, getDoc, setDoc, deleteDoc, collection, addDoc, getDocs, query, where, limit,
  serverTimestamp, Timestamp
} from '../firebase/config.js';

export const DEMO_ADMIN_EMAIL = 'admin@example.com';
export const DEMO_USER_EMAIL = 'user@example.com';
const DEMO_PASSWORD = 'Demo123!';

export function isDemoEmail(email) {
  return email === DEMO_ADMIN_EMAIL || email === DEMO_USER_EMAIL;
}

// ---- Low-level: sign in, or self-provision if the account doesn't exist yet ----
async function loginOrCreate(email, password, profileFields) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // Self-heal: the Auth account can exist from an earlier attempt that
    // signed in fine but never finished writing the Firestore profile (e.g.
    // it failed partway through seeding). Without this check, every future
    // login "succeeds" while isAdmin()/role checks quietly fail forever,
    // because the profile doc — and its role field — was never created.
    const profileSnap = await getDoc(doc(db, 'users', cred.user.uid));
    if (!profileSnap.exists()) {
      await setDoc(doc(db, 'users', cred.user.uid), {
        email, ...profileFields, isDemoAccount: true, createdAt: serverTimestamp()
      });
    }
    return { user: cred.user, isNew: false };
  } catch (err) {
    const notFound = ['auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-login-credentials'].includes(err.code);
    if (!notFound) throw err;
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: profileFields.name });
    await setDoc(doc(db, 'users', cred.user.uid), {
      email, ...profileFields, isDemoAccount: true, createdAt: serverTimestamp()
    });
    return { user: cred.user, isNew: true };
  }
}

/**
 * Ensures both demo accounts exist and demo data is seeded at least once.
 * Client-side Firebase Auth can only hold one active session at a time, so
 * this briefly signs in as Demo User first (to create/find their account and
 * capture their uid — orders/reservations need a real owner), signs out, then
 * signs in as Demo Admin (the session this leaves active, since seeding
 * writes require admin permissions). Runs regardless of which demo button
 * the person clicked, so either entry point results in a fully working demo.
 */
async function ensureBothDemoAccountsAndSeed() {
  const userResult = await loginOrCreate(DEMO_USER_EMAIL, DEMO_PASSWORD, {
    name: 'Jordan Ellis', phone: '(555) 019-4471', role: 'customer',
    loyaltyPoints: 0, favorites: [], status: 'active'
  });
  const demoUserUid = userResult.user.uid;
  await signOut(auth);

  const adminResult = await loginOrCreate(DEMO_ADMIN_EMAIL, DEMO_PASSWORD, {
    name: 'Alex Rivera', role: 'admin', status: 'active'
  });

  await ensureDemoDataSeeded(demoUserUid);
  return { adminUser: adminResult.user, demoUserUid };
}

export async function loginAsDemoAdmin() {
  const { adminUser } = await ensureBothDemoAccountsAndSeed();
  await waitForConfirmedAuth(adminUser.uid);
  sessionStorage.setItem('demoJustLoggedIn', 'admin');
  return adminUser;
}

export async function loginAsDemoUser() {
  await ensureBothDemoAccountsAndSeed();
  await signOut(auth);
  const cred = await signInWithEmailAndPassword(auth, DEMO_USER_EMAIL, DEMO_PASSWORD);
  await waitForConfirmedAuth(cred.user.uid);
  sessionStorage.setItem('demoJustLoggedIn', 'user');
  return cred.user;
}

/**
 * After several rapid sign-in/sign-out cycles (unavoidable while
 * provisioning both demo accounts from a single browser session), the auth
 * SDK's promise can resolve slightly before the session is fully persisted
 * to storage. Navigating away immediately after that — which every caller
 * of loginAsDemoAdmin/loginAsDemoUser does right away — can land on a page
 * that reads a stale, empty auth state and bounces straight back to login.
 * Waiting for one confirmed onAuthStateChanged firing for the expected uid
 * closes that gap before we hand control back to the caller.
 */
function waitForConfirmedAuth(expectedUid, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { unsubscribe(); resolve(); }, timeoutMs);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.uid === expectedUid) {
        clearTimeout(timer);
        unsubscribe();
        resolve();
      }
    });
  });
}

// ---- Welcome banner (shown once per browser session after a demo login) ----
export function maybeShowDemoWelcomeBanner(userEmail) {
  if (!isDemoEmail(userEmail)) return;
  if (sessionStorage.getItem('demoBannerShown')) return;
  sessionStorage.setItem('demoBannerShown', 'true');
  sessionStorage.removeItem('demoJustLoggedIn');

  const banner = document.createElement('div');
  banner.style.cssText = 'background:#1B1815;color:#F7F3EC;padding:16px 20px;' +
    'display:flex;align-items:center;justify-content:space-between;gap:16px;' +
    'font:14px/1.6 -apple-system,sans-serif;position:relative;z-index:400;flex-wrap:wrap';
  banner.innerHTML = `
    <span><strong>Welcome to the demo!</strong> Feel free to explore all features of the application using this demonstration account.
    Any changes you make are for testing purposes only and may be reset at any time.</span>
    <button style="background:#C1502E;color:#fff;border:none;padding:8px 14px;border-radius:999px;font-weight:700;font-size:13px;white-space:nowrap;cursor:pointer;flex-shrink:0">Dismiss</button>`;
  banner.querySelector('button').addEventListener('click', () => banner.remove());
  document.body.prepend(banner);
}

// ==========================================================================
// SEED / RESET DATA
// Every document this creates is tagged isDemo: true so Reset can find it
// precisely without touching a real client's own menu, orders, or bookings.
// ==========================================================================

const CATEGORIES = [
  { id: 'starters', name: 'Starters', description: 'Small plates from the hearth', order: 1 },
  { id: 'mains', name: 'Mains', description: 'Whole fish, roasts & bowls', order: 2 },
  { id: 'grill', name: 'From the Grill', description: 'Charred over live oak', order: 3 },
  { id: 'sides', name: 'Sides', description: 'Vegetables, grains & bread', order: 4 },
  { id: 'desserts', name: 'Desserts', description: 'Sweet endings', order: 5 },
  { id: 'drinks', name: 'Drinks', description: 'Wine, cocktails & more', order: 6 },
];

const MEALS = [
  { name: 'Charred Octopus', categoryId: 'starters', price: 18, imageUrl: 'https://images.pexels.com/photos/14885388/pexels-photo-14885388.jpeg?auto=compress&cs=tinysrgb&w=800', description: 'Oak-grilled octopus, smoked paprika, fingerling potato.', ingredients: ['octopus','potato','smoked paprika','olive oil'], allergens: ['shellfish'], nutrition: { calories: 320 }, available: true, featured: true },
  { name: 'Salt-Baked Beets', categoryId: 'starters', price: 12, imageUrl: 'https://images.pexels.com/photos/2097090/pexels-photo-2097090.jpeg?auto=compress&cs=tinysrgb&w=800', description: 'Whipped goat cheese, citrus, toasted hazelnut.', ingredients: ['beets','goat cheese','hazelnut','citrus'], allergens: ['dairy','tree nuts'], nutrition: { calories: 260 }, available: true, featured: false },
  { name: 'Whole Grilled Branzino', categoryId: 'mains', price: 34, imageUrl: 'https://images.pexels.com/photos/4013723/pexels-photo-4013723.jpeg?auto=compress&cs=tinysrgb&w=800', description: 'Whole fish over oak, lemon-herb oil, charred fennel.', ingredients: ['branzino','fennel','lemon','herbs'], allergens: ['fish'], nutrition: { calories: 540 }, available: true, featured: true },
  { name: 'Oak-Roasted Chicken', categoryId: 'mains', price: 28, imageUrl: 'https://images.pexels.com/photos/17462036/pexels-photo-17462036.jpeg?auto=compress&cs=tinysrgb&w=800', description: 'Half chicken, brined 24 hours, pan jus.', ingredients: ['chicken','herbs','butter'], allergens: ['dairy'], nutrition: { calories: 610 }, available: true, featured: false },
  { name: 'Dry-Aged Ribeye', categoryId: 'grill', price: 52, imageUrl: 'https://images.pexels.com/photos/36691313/pexels-photo-36691313.jpeg?auto=compress&cs=tinysrgb&w=800', description: '28-day dry-aged, bone marrow butter.', ingredients: ['beef','bone marrow','herbs'], allergens: ['dairy'], nutrition: { calories: 780 }, available: true, featured: true },
  { name: 'Grilled Corn', categoryId: 'sides', price: 9, imageUrl: 'https://images.pexels.com/photos/13398481/pexels-photo-13398481.jpeg?auto=compress&cs=tinysrgb&w=800', description: 'Chili-lime butter, cotija, cilantro.', ingredients: ['corn','cotija','chili','lime'], allergens: ['dairy'], nutrition: { calories: 210 }, available: true, featured: false },
  { name: 'Charred Bread & Butter', categoryId: 'sides', price: 7, imageUrl: 'https://images.pexels.com/photos/2661996/pexels-photo-2661996.jpeg?auto=compress&cs=tinysrgb&w=800', description: 'Sourdough, smoked sea salt butter.', ingredients: ['sourdough','butter','sea salt'], allergens: ['gluten','dairy'], nutrition: { calories: 240 }, available: true, featured: false },
  { name: 'Burnt Basque Cheesecake', categoryId: 'desserts', price: 11, imageUrl: 'https://images.pexels.com/photos/6607325/pexels-photo-6607325.jpeg?auto=compress&cs=tinysrgb&w=800', description: 'Caramelized top, molten center.', ingredients: ['cream cheese','eggs','sugar'], allergens: ['dairy','eggs'], nutrition: { calories: 430 }, available: true, featured: true },
  { name: 'Affogato', categoryId: 'desserts', price: 8, imageUrl: 'https://images.pexels.com/photos/9442600/pexels-photo-9442600.jpeg?auto=compress&cs=tinysrgb&w=800', description: 'Vanilla gelato, espresso.', ingredients: ['gelato','espresso'], allergens: ['dairy'], nutrition: { calories: 220 }, available: true, featured: false },
  { name: 'Coastal Negroni', categoryId: 'drinks', price: 14, imageUrl: 'https://images.pexels.com/photos/1304540/pexels-photo-1304540.jpeg?auto=compress&cs=tinysrgb&w=800', description: 'Gin, salted grapefruit, campari.', ingredients: ['gin','campari','grapefruit'], allergens: [], nutrition: { calories: 180 }, available: true, featured: false },
  { name: 'Oak-Aged Malbec', categoryId: 'drinks', price: 13, imageUrl: 'https://images.pexels.com/photos/391213/pexels-photo-391213.jpeg?auto=compress&cs=tinysrgb&w=800', description: 'By the glass, Argentina.', ingredients: ['red wine'], allergens: ['sulfites'], nutrition: { calories: 125 }, available: true, featured: false },
];

const PROMOS = [
  { code: 'WELCOME10', type: 'percentage', value: 10, description: '10% off your first order', usageLimit: 500, usedCount: 0, minOrderValue: 0 },
  { code: 'FREESHIP', type: 'free_delivery', value: 0, description: 'Free delivery', usageLimit: 1000, usedCount: 0, minOrderValue: 25 },
  { code: 'SAVE15', type: 'fixed', value: 15, description: '$15 off orders over $75', usageLimit: 200, usedCount: 0, minOrderValue: 75 },
];

const STATUSES_DINE = ['pending', 'accepted', 'preparing', 'ready', 'delivered', 'delivered', 'cancelled'];
const STATUSES_DELIVERY = ['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'delivered'];
const ORDER_TYPES = ['dine_in', 'pickup', 'delivery'];
const RES_TIMES = ['5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM'];
const RES_STATUSES = ['pending', 'confirmed', 'confirmed', 'confirmed', 'cancelled'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysAgoTimestamp(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(randInt(11, 21), randInt(0, 59));
  return Timestamp.fromDate(d);
}

async function isAlreadySeeded() {
  const snap = await getDocs(query(collection(db, 'categories'), where('isDemo', '==', true), limit(1)));
  return !snap.empty;
}

/** Idempotent — does nothing if demo data already exists. Used for automatic
 *  zero-setup provisioning on first demo login. */
export async function ensureDemoDataSeeded(demoUserUid) {
  if (await isAlreadySeeded()) return;
  await seedAllDemoData(demoUserUid);
}

/** Full seed, called both by the automatic first-run path and the manual
 *  "Seed Demo Data" / post-reset button in the admin Demo Tools page. */
export async function seedAllDemoData(demoUserUid, onProgress) {
  const log = onProgress || (() => {});

  for (const c of CATEGORIES) { await addDoc(collection(db, 'categories'), { ...c, isDemo: true }); log(`Category: ${c.name}`); }
  for (const m of MEALS) { await addDoc(collection(db, 'meals'), { ...m, isDemo: true }); log(`Meal: ${m.name}`); }
  for (const p of PROMOS) { await addDoc(collection(db, 'promoCodes'), { ...p, isDemo: true }); log(`Promo: ${p.code}`); }

  const mealsSnap = await getDocs(collection(db, 'meals'));
  const meals = mealsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  let totalSpend = 0;
  for (let i = 0; i < 15; i++) {
    const orderType = rand(ORDER_TYPES);
    const statusPool = orderType === 'delivery' ? STATUSES_DELIVERY : STATUSES_DINE;
    const status = rand(statusPool);
    const items = Array.from({ length: randInt(1, 4) }).map(() => {
      const m = rand(meals);
      return { mealId: m.id, name: m.name, price: m.price, imageUrl: m.imageUrl, qty: randInt(1, 3) };
    });
    const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    const deliveryFee = orderType === 'delivery' ? 4.99 : 0;
    const tax = subtotal * 0.0825;
    const total = subtotal + deliveryFee + tax;
    if (status !== 'cancelled') totalSpend += total;
    await addDoc(collection(db, 'orders'), {
      userId: demoUserUid,
      customerName: 'Jordan Ellis', customerEmail: DEMO_USER_EMAIL,
      items, orderType,
      tableNumber: orderType === 'dine_in' ? String(randInt(1, 20)) : null,
      deliveryAddress: orderType === 'delivery' ? '412 Harbor Row, Coastal City' : null,
      scheduledFor: null, notes: '', promo: null,
      subtotal, discount: 0, deliveryFee, tax, total,
      status, paymentStatus: status === 'delivered' ? 'paid' : 'unpaid',
      statusHistory: [{ status, at: new Date().toISOString() }],
      isDemo: true,
      createdAt: daysAgoTimestamp(randInt(0, 6))
    });
    log(`Order · ${items.length} item(s) · ${orderType} · ${status}`);
  }

  const today = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + randInt(0, 6));
    const date = d.toISOString().split('T')[0];
    const time = rand(RES_TIMES);
    await addDoc(collection(db, 'reservations'), {
      userId: demoUserUid,
      customerName: 'Jordan Ellis', customerEmail: DEMO_USER_EMAIL,
      date, time, slotKey: `${date}_${time}`,
      guests: randInt(2, 8),
      notes: rand(['', '', 'Window seat if possible', 'Celebrating an anniversary', 'Allergic to shellfish']),
      status: rand(RES_STATUSES),
      tableAssigned: null,
      isDemo: true,
      createdAt: serverTimestamp()
    });
    log(`Reservation · ${date} ${time}`);
  }

  // Give the Demo User realistic loyalty points reflecting their seeded spend.
  await setDoc(doc(db, 'users', demoUserUid), { loyaltyPoints: Math.floor(totalSpend) }, { merge: true });
  log('Awarded loyalty points to Demo User');

  const DEMO_MESSAGES = [
    { message: 'Do you have anything on the menu that\'s dairy-free? Planning to bring a friend with an allergy this weekend.', adminReply: 'Great question! The Grilled Corn, Whole Grilled Branzino, and Charred Octopus are all dairy-free as listed. Happy to walk through the rest of the menu with you or your friend when you arrive — just flag it to your server.', status: 'replied' },
    { message: 'Loved the ribeye last time — is it always dry-aged the same amount of days, or does that change seasonally?', adminReply: null, status: 'new' },
  ];
  for (const msg of DEMO_MESSAGES) {
    await addDoc(collection(db, 'messages'), {
      userId: demoUserUid, name: 'Jordan Ellis', email: DEMO_USER_EMAIL,
      message: msg.message, status: msg.status, adminReply: msg.adminReply,
      isDemo: true, createdAt: daysAgoTimestamp(randInt(0, 4)),
      ...(msg.adminReply ? { repliedAt: daysAgoTimestamp(randInt(0, 3)) } : {})
    });
  }
  log('Seeded demo messages');
}

/** Deletes every isDemo-tagged document across every collection this app
 *  seeds, then reseeds clean. Never touches a real client's own data, since
 *  everything is matched by the isDemo flag, not by owner or collection. */
export async function resetDemoData(onProgress) {
  const log = onProgress || (() => {});

  const demoUserSnap = await getDocs(query(collection(db, 'users'), where('email', '==', DEMO_USER_EMAIL), limit(1)));
  if (demoUserSnap.empty) throw new Error('Demo User account not found — log in as Demo User at least once first.');
  const demoUserUid = demoUserSnap.docs[0].id;

  const collections = ['categories', 'meals', 'promoCodes', 'orders', 'reservations', 'messages'];
  for (const col of collections) {
    const snap = await getDocs(query(collection(db, col), where('isDemo', '==', true)));
    for (const d of snap.docs) { await deleteDoc(doc(db, col, d.id)); }
    log(`Cleared ${snap.size} demo doc(s) from ${col}`);
  }

  await setDoc(doc(db, 'users', demoUserUid), { loyaltyPoints: 0, favorites: [] }, { merge: true });
  log('Reset Demo User loyalty & favorites');

  await seedAllDemoData(demoUserUid, log);
  log('Reseed complete');
}
