// ==========================================================================
// AUTH — wraps Firebase Authentication + creates/reads the matching
// Firestore users/{uid} profile document.
// ==========================================================================
import {
  auth, db, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile,
  doc, getDoc, setDoc, serverTimestamp
} from '../firebase/config.js';

export function watchAuth(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return callback(null, null);
    const snap = await getDoc(doc(db, 'users', user.uid));
    callback(user, snap.exists() ? snap.data() : null);
  });
}

export async function registerCustomer({ name, email, password, phone }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await setDoc(doc(db, 'users', cred.user.uid), {
    name, email, phone: phone || '', role: 'customer',
    loyaltyPoints: 0, loyaltyTier: 'Bronze', favorites: [],
    status: 'active', createdAt: serverTimestamp()
  });
  return cred.user;
}

export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, 'users', cred.user.uid));
  const profile = snap.exists() ? snap.data() : null;
  if (profile?.status === 'suspended') {
    await signOut(auth);
    throw new Error('This account has been suspended. Please contact the restaurant.');
  }
  return { user: cred.user, profile };
}

export async function logoutUser() { return signOut(auth); }

export async function resetPassword(email) { return sendPasswordResetEmail(auth, email); }

/** Redirects to login if not authenticated. Redirects to /customer/account.html
 *  if authenticated but requireRole('admin') fails. Call at top of protected pages.
 *  Uses a synchronous "already handled" guard, not just unsubscribe() — the
 *  underlying listener's callback is async (it awaits a Firestore read), so
 *  if Firebase fires two auth-changed events close together (which happens
 *  after the demo flow's rapid sign-in/sign-out cycles settle), the second
 *  firing can start running before the first one's await finishes and reaches
 *  unsubscribe(). Both would otherwise complete and could redirect twice —
 *  once correctly, once on stale state, undoing the first. The flag below
 *  blocks any firing after the first one, regardless of timing. */
export function requireAuth({ role = null, redirectTo = '/customer/login.html' } = {}) {
  return new Promise((resolve) => {
    let handled = false;
    const unsubscribe = watchAuth((user, profile) => {
      if (handled) return;
      handled = true;
      unsubscribe();
      if (!user) { window.location.href = redirectTo; return; }
      if (role && profile?.role !== role) { window.location.href = '/index.html'; return; }
      resolve({ user, profile });
    });
  });
}
