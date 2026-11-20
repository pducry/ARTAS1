import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, updateProfile } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js';
import {
  getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, addDoc,
  query, where, orderBy, limit, getDocs, arrayUnion, arrayRemove, increment,
  startAfter, serverTimestamp, deleteField, getCountFromServer
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-storage.js';

const firebaseConfig = {
  apiKey: "AIzaSyBf3QmZ5zK4yczX04rlKWChoGFlxp7tKqE",
  authDomain: "artas-experience.firebaseapp.com",
  projectId: "artas-experience",
  storageBucket: "artas-experience.firebasestorage.app",
  messagingSenderId: "579894688656",
  appId: "1:579894688656:web:e8c227613e883e6c001115",
  measurementId: "G-MD2YG0G4T6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export {
  auth, db, storage, googleProvider,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, signInWithRedirect, getRedirectResult, signOut, updateProfile,
  GoogleAuthProvider,
  doc, setDoc, getDoc, updateDoc, deleteDoc, collection, addDoc,
  query, where, orderBy, limit, getDocs, arrayUnion, arrayRemove, increment,
  startAfter, serverTimestamp, deleteField, getCountFromServer,
  ref, uploadBytes, getDownloadURL
};
