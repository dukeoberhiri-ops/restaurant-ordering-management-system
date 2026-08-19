// ==========================================================================
// FIREBASE CONFIG
// ==========================================================================
// 1. Go to https://console.firebase.google.com -> Create a project
// 2. Project settings (gear icon) -> General -> "Your apps" -> Web app (</>)
// 3. Copy the config object Firebase gives you and paste it below,
//    REPLACING the placeholder object entirely.
// 4. Enable in the Firebase console:
//    - Authentication -> Sign-in method -> Email/Password (enable)
//    - Firestore Database -> Create database (start in production mode)
//    - Storage -> Get started
// 5. Deploy the rules in /firebase/firestore.rules and /firebase/storage.rules
//    (see README.md "Firebase Setup" section for the exact CLI commands)
// ==========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile, updatePassword,
  EmailAuthProvider, reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, onSnapshot, serverTimestamp, increment, arrayUnion, arrayRemove,
  runTransaction, writeBatch, Timestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

// ⬇️⬇️⬇️  PASTE YOUR FIREBASE SDK CONFIG HERE  ⬇️⬇️⬇️
const firebaseConfig = {
apiKey: "AIzaSyCKmQqemECsLLa8eOPJHW78zAvNYudpc8s",
authDomain: "restaurant-7287b.firebaseapp.com",
projectId: "restaurant-7287b",
storageBucket: "restaurant-7287b.firebasestorage.app",
messagingSenderId: "257680278499",
appId: "1:257680278499:web:810d45cd5da53e2cabd6d6",
measurementId: "G-MNC37Z4T0N"
};;
// ⬆️⬆️⬆️  PASTE YOUR FIREBASE SDK CONFIG HERE  ⬆️⬆️⬆️

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export {
  app, auth, db, storage,
  // auth
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile, updatePassword,
  EmailAuthProvider, reauthenticateWithCredential,
  // firestore
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, onSnapshot, serverTimestamp, increment, arrayUnion, arrayRemove,
  runTransaction, writeBatch, Timestamp,
  // storage
  ref, uploadBytes, getDownloadURL, deleteObject
};
