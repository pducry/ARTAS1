import {
  auth, db, googleProvider,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, signOut, updateProfile,
  doc, setDoc, getDoc, serverTimestamp
} from './firebase-config.js';

// Sign in with email and password
export async function loginWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

// Register with email, password, and display name
export async function registerWithEmail(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await createUserProfile(cred.user);
  return cred;
}

// Sign in with Google
export async function loginWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  const profileDoc = await getDoc(doc(db, 'users', cred.user.uid));
  if (!profileDoc.exists()) {
    await createUserProfile(cred.user);
  }
  return cred;
}

// Sign out
export async function logout() {
  return signOut(auth);
}

// Create user profile in Firestore
async function createUserProfile(user) {
  await setDoc(doc(db, 'users', user.uid), {
    displayName: user.displayName || '',
    email: user.email,
    avatarUrl: user.photoURL || '',
    username: '',
    bio: '',
    imageCount: 0,
    boardCount: 0,
    followerCount: 0,
    followingCount: 0,
    createdAt: serverTimestamp()
  });
}

// Listen to auth state changes
export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// Get current user
export function getCurrentUser() {
  return auth.currentUser;
}
