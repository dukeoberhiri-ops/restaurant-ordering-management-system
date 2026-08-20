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
 *  Unsubscribes from the auth listener after the first decision — otherwise a
 *  later auth event (token refresh, or the settling effects of rapid demo
 *  sign-in/sign-out) could redirect a page away after it already loaded
 *  successfully, which is exactly the "loads then jumps back" symptom this
 *  was causing. */
export function requireAuth({ role = null, redirectTo = '/customer/login.html' } = {}) {
  return new Promise((resolve) => {
    const unsubscribe = watchAuth((user, profile) => {
      if (!user) { unsubscribe(); window.location.href = redirectTo; return; }
      if (role && profile?.role !== role) { unsubscribe(); window.location.href = '/index.html'; return; }
      unsubscribe();
      resolve({ user, profile });
    });
  });
}
