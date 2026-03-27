import {
  db, auth,
  doc, setDoc, getDoc, serverTimestamp
} from './firebase-config.js';

import {
  collection, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit,
  getDocs, arrayUnion, arrayRemove, increment, startAfter
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── Users ──

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateUserProfile(uid, data) {
  await updateDoc(doc(db, 'users', uid), data);
}

export async function getUserByUsername(username) {
  const q = query(collection(db, 'users'), where('username', '==', username), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

// ── Artworks ──

export async function createArtwork(data) {
  const ref = await addDoc(collection(db, 'artworks'), {
    ...data,
    uploadedBy: auth.currentUser.uid,
    uploaderName: auth.currentUser.displayName || '',
    uploaderAvatar: auth.currentUser.photoURL || '',
    savedBy: [],
    saveCount: 0,
    createdAt: serverTimestamp()
  });
  // Increment user image count
  await updateDoc(doc(db, 'users', auth.currentUser.uid), {
    imageCount: increment(1)
  });
  return ref.id;
}

export async function getArtworks(pageSize = 40, lastDoc = null) {
  let q = query(
    collection(db, 'artworks'),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );
  if (lastDoc) {
    q = query(
      collection(db, 'artworks'),
      orderBy('createdAt', 'desc'),
      startAfter(lastDoc),
      limit(pageSize)
    );
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data(), _doc: d }));
}

export async function getUserArtworks(uid) {
  const q = query(
    collection(db, 'artworks'),
    where('uploadedBy', '==', uid),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteArtwork(artworkId) {
  await deleteDoc(doc(db, 'artworks', artworkId));
  await updateDoc(doc(db, 'users', auth.currentUser.uid), {
    imageCount: increment(-1)
  });
}

export async function saveArtwork(artworkId) {
  const uid = auth.currentUser.uid;
  await updateDoc(doc(db, 'artworks', artworkId), {
    savedBy: arrayUnion(uid),
    saveCount: increment(1)
  });
}

export async function unsaveArtwork(artworkId) {
  const uid = auth.currentUser.uid;
  await updateDoc(doc(db, 'artworks', artworkId), {
    savedBy: arrayRemove(uid),
    saveCount: increment(-1)
  });
}

// ── Boards ──

export async function createBoard(name, description = '') {
  const uid = auth.currentUser.uid;
  const ref = await addDoc(collection(db, 'boards'), {
    name,
    description,
    ownerId: uid,
    artworkIds: [],
    coverUrls: [],
    artworkCount: 0,
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, 'users', uid), {
    boardCount: increment(1)
  });
  return ref.id;
}

export async function getUserBoards(uid) {
  const q = query(
    collection(db, 'boards'),
    where('ownerId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getBoard(boardId) {
  const snap = await getDoc(doc(db, 'boards', boardId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function addArtworkToBoard(boardId, artworkId, imageUrl) {
  const boardRef = doc(db, 'boards', boardId);
  const boardSnap = await getDoc(boardRef);
  const data = boardSnap.data();
  const coverUrls = data.coverUrls || [];
  const updates = {
    artworkIds: arrayUnion(artworkId),
    artworkCount: increment(1)
  };
  if (coverUrls.length < 4) {
    updates.coverUrls = arrayUnion(imageUrl);
  }
  await updateDoc(boardRef, updates);
}

export async function removeArtworkFromBoard(boardId, artworkId) {
  await updateDoc(doc(db, 'boards', boardId), {
    artworkIds: arrayRemove(artworkId),
    artworkCount: increment(-1)
  });
}

export async function deleteBoard(boardId) {
  await deleteDoc(doc(db, 'boards', boardId));
  await updateDoc(doc(db, 'users', auth.currentUser.uid), {
    boardCount: increment(-1)
  });
}

export async function getBoardArtworks(boardId) {
  const board = await getBoard(boardId);
  if (!board || !board.artworkIds.length) return [];
  // Firestore 'in' query supports max 30 items
  const chunks = [];
  for (let i = 0; i < board.artworkIds.length; i += 30) {
    chunks.push(board.artworkIds.slice(i, i + 30));
  }
  const results = [];
  for (const chunk of chunks) {
    const q = query(
      collection(db, 'artworks'),
      where('__name__', 'in', chunk)
    );
    const snap = await getDocs(q);
    snap.docs.forEach(d => results.push({ id: d.id, ...d.data() }));
  }
  return results;
}

// ── Follow System ──

export async function followUser(targetUid) {
  const uid = auth.currentUser.uid;
  await setDoc(doc(db, 'follows', `${uid}_${targetUid}`), {
    followerId: uid,
    followingId: targetUid,
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, 'users', uid), { followingCount: increment(1) });
  await updateDoc(doc(db, 'users', targetUid), { followerCount: increment(1) });
}

export async function unfollowUser(targetUid) {
  const uid = auth.currentUser.uid;
  await deleteDoc(doc(db, 'follows', `${uid}_${targetUid}`));
  await updateDoc(doc(db, 'users', uid), { followingCount: increment(-1) });
  await updateDoc(doc(db, 'users', targetUid), { followerCount: increment(-1) });
}

export async function isFollowing(targetUid) {
  const uid = auth.currentUser.uid;
  const snap = await getDoc(doc(db, 'follows', `${uid}_${targetUid}`));
  return snap.exists();
}

export async function getFollowers(uid) {
  const q = query(collection(db, 'follows'), where('followingId', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data().followerId);
}

export async function getFollowing(uid) {
  const q = query(collection(db, 'follows'), where('followerId', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data().followingId);
}
