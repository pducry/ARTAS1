import {
  auth, db, googleProvider,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, signInWithRedirect, getRedirectResult, signOut, updateProfile,
  doc, setDoc, getDoc, updateDoc, serverTimestamp, deleteField
} from './firebase-config.js';

const PRIVATE_EMAIL_FLAG = 'artasPrivateEmail';

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

// Ensure user profile exists in Firestore and that email is not on the public doc.
export async function ensureUserProfile(user) {
  const profileRef = doc(db, 'users', user.uid);
  const profileDoc = await getDoc(profileRef);
  if (!profileDoc.exists()) {
    await createUserProfile(user);
    return;
  }

  const data = profileDoc.data() || {};
  const hasPublicEmail = Object.prototype.hasOwnProperty.call(data, 'email');
  if (hasPublicEmail) {
    await storePrivateEmail(user.uid, typeof data.email === 'string' ? data.email : user.email);
    await updateDoc(profileRef, { email: deleteField() });
    return;
  }

  if (user.email && !privateEmailSaved(user.uid)) {
    await storePrivateEmail(user.uid, user.email);
  }
}

// Sign out
export async function logout() {
  return signOut(auth);
}

// Public profile fields only. Email lives on users/{uid}/private/account.
async function createUserProfile(user) {
  await setDoc(doc(db, 'users', user.uid), {
    displayName: user.displayName || '',
    avatarUrl: user.photoURL || '',
    username: '',
    bio: '',
    imageCount: 0,
    boardCount: 0,
    createdAt: serverTimestamp()
  });
  await storePrivateEmail(user.uid, user.email);
}

function privateEmailSaved(uid) {
  try {
    return localStorage.getItem(`${PRIVATE_EMAIL_FLAG}:${uid}`) === '1';
  } catch {
    return false;
  }
}

function markPrivateEmailSaved(uid) {
  try {
    localStorage.setItem(`${PRIVATE_EMAIL_FLAG}:${uid}`, '1');
  } catch {
    // Ignore storage failures; the private doc write is the source of truth.
  }
}

async function storePrivateEmail(uid, email) {
  if (typeof email !== 'string' || !email) return;
  try {
    await setDoc(doc(db, 'users', uid, 'private', 'account'), {
      email,
      updatedAt: serverTimestamp()
    }, { merge: true });
    markPrivateEmailSaved(uid);
  } catch (err) {
    console.warn('Private profile email was not saved. Deploy Firestore rules with: firebase deploy --only firestore:rules', err);
  }
}

// Listen to auth state changes
export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// Get current user
export function getCurrentUser() {
  return auth.currentUser;
}
