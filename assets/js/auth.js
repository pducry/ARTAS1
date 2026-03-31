import {
  auth, db, googleProvider,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, signInWithRedirect, getRedirectResult, signOut, updateProfile,
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

// Sign in with Google - tries popup first, falls back to redirect
export async function loginWithGoogle() {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    await ensureUserProfile(cred.user);
    return cred;
  } catch (err) {
    // If popup is blocked or fails, use redirect
    if (err.code === 'auth/popup-blocked' ||
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request') {
      throw err; // Let the UI handle these
    }
    // For unauthorized-domain or other errors, try redirect
    console.warn('Popup failed, trying redirect:', err.code, err.message);
    await signInWithRedirect(auth, googleProvider);
    return null; // Page will redirect
  }
}

// Handle redirect result (call on page load)
export async function handleGoogleRedirect() {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      await ensureUserProfile(result.user);
      return result;
    }
  } catch (err) {
    console.error('Redirect result error:', err.code, err.message);
    throw err;
  }
  return null;
}

// Ensure user profile exists in Firestore
export async function ensureUserProfile(user) {
  const profileDoc = await getDoc(doc(db, 'users', user.uid));
  if (!profileDoc.exists()) {
    await createUserProfile(user);
  }
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
