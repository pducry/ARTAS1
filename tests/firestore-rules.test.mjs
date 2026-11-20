import { readFileSync } from 'node:fs';
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import {
  arrayRemove,
  arrayUnion,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  increment,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadString } from 'firebase/storage';

const projectId = process.env.GCLOUD_PROJECT || 'demo-artas';
let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8')
    },
    storage: {
      rules: readFileSync(new URL('../storage.rules', import.meta.url), 'utf8')
    }
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.clearStorage();
});

function authed(uid) {
  return testEnv.authenticatedContext(uid);
}

function anon() {
  return testEnv.unauthenticatedContext();
}

function artworkData(uid, extra = {}) {
  return {
    imageUrl: 'https://firebasestorage.googleapis.com/v0/b/demo/o/a.jpg?alt=media',
    title: 'Piece',
    tags: [],
    uploadedBy: uid,
    uploaderName: 'Artist',
    uploaderAvatar: '',
    savedBy: [],
    saveCount: 0,
    ...extra
  };
}

test('public profiles cannot store email and private email is owner-only', async () => {
  const alice = authed('alice');
  await assertFails(setDoc(doc(alice.firestore(), 'users', 'alice'), {
    displayName: 'Alice',
    email: 'alice@example.com'
  }));
  await assertSucceeds(setDoc(doc(alice.firestore(), 'users', 'alice'), {
    displayName: 'Alice',
    avatarUrl: '',
    bio: ''
  }));
  await assertSucceeds(setDoc(doc(alice.firestore(), 'users', 'alice', 'private', 'account'), {
    email: 'alice@example.com'
  }));

  await assertSucceeds(getDoc(doc(anon().firestore(), 'users', 'alice')));
  await assertFails(getDoc(doc(anon().firestore(), 'users', 'alice', 'private', 'account')));
  await assertFails(getDoc(doc(authed('bob').firestore(), 'users', 'alice', 'private', 'account')));
  await assertSucceeds(getDoc(doc(alice.firestore(), 'users', 'alice', 'private', 'account')));
  await assertFails(updateDoc(doc(authed('bob').firestore(), 'users', 'alice'), {
    followerCount: increment(1)
  }));
});

test('legacy public email must be removed before other profile updates', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users', 'alice'), {
      displayName: 'Alice',
      email: 'alice@example.com'
    });
  });

  const alice = authed('alice');
  await assertFails(updateDoc(doc(alice.firestore(), 'users', 'alice'), {
    displayName: 'Alice Updated'
  }));
  await assertSucceeds(updateDoc(doc(alice.firestore(), 'users', 'alice'), {
    email: deleteField()
  }));
  await assertSucceeds(updateDoc(doc(alice.firestore(), 'users', 'alice'), {
    displayName: 'Alice Updated'
  }));
  await assertFails(updateDoc(doc(alice.firestore(), 'users', 'alice'), {
    email: 'alice@example.com'
  }));

  const publicDoc = await getDoc(doc(anon().firestore(), 'users', 'alice'));
  assert.equal(publicDoc.data().email, undefined);
  assert.equal(publicDoc.data().displayName, 'Alice Updated');
});

test('artworks are owned by uploadedBy and that field cannot change', async () => {
  const alice = authed('alice');
  const bob = authed('bob');
  await assertFails(setDoc(doc(alice.firestore(), 'artworks', 'piece'), artworkData('bob')));
  await assertFails(setDoc(doc(anon().firestore(), 'artworks', 'piece'), artworkData('alice')));
  await assertFails(setDoc(doc(alice.firestore(), 'artworks', 'piece'), artworkData('alice', {
    imageUrl: 'javascript:alert(1)'
  })));
  await assertSucceeds(setDoc(doc(alice.firestore(), 'artworks', 'piece'), artworkData('alice')));

  await assertSucceeds(updateDoc(doc(alice.firestore(), 'artworks', 'piece'), { title: 'Renamed' }));
  await assertFails(updateDoc(doc(alice.firestore(), 'artworks', 'piece'), { uploadedBy: 'bob' }));
  await assertFails(updateDoc(doc(bob.firestore(), 'artworks', 'piece'), { title: 'Hijacked' }));
  await assertFails(deleteDoc(doc(bob.firestore(), 'artworks', 'piece')));
  await assertSucceeds(getDoc(doc(anon().firestore(), 'artworks', 'piece')));
  await assertSucceeds(deleteDoc(doc(alice.firestore(), 'artworks', 'piece')));
});

test('non-owners can only toggle their own save', async () => {
  const alice = authed('alice');
  const bob = authed('bob');
  await setDoc(doc(alice.firestore(), 'artworks', 'piece'), artworkData('alice'));

  await assertSucceeds(updateDoc(doc(bob.firestore(), 'artworks', 'piece'), {
    savedBy: arrayUnion('bob'),
    saveCount: increment(1)
  }));
  await assertFails(updateDoc(doc(bob.firestore(), 'artworks', 'piece'), {
    savedBy: arrayUnion('bob'),
    saveCount: increment(1),
    title: 'Nope'
  }));
  await assertFails(updateDoc(doc(bob.firestore(), 'artworks', 'piece'), {
    savedBy: arrayUnion('carol'),
    saveCount: increment(1)
  }));
  await assertFails(updateDoc(doc(bob.firestore(), 'artworks', 'piece'), {
    savedBy: arrayUnion('bob'),
    saveCount: increment(1)
  }));
  await assertSucceeds(updateDoc(doc(bob.firestore(), 'artworks', 'piece'), {
    savedBy: arrayRemove('bob'),
    saveCount: increment(-1)
  }));
});

test('the unsave path only removes the caller', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'artworks', 'piece'), artworkData('alice', {
      savedBy: ['bob'],
      saveCount: 1
    }));
  });
  await assertFails(updateDoc(doc(authed('carol').firestore(), 'artworks', 'piece'), {
    savedBy: arrayRemove('bob'),
    saveCount: increment(-1)
  }));
  await assertSucceeds(updateDoc(doc(authed('bob').firestore(), 'artworks', 'piece'), {
    savedBy: arrayRemove('bob'),
    saveCount: increment(-1)
  }));
});

test('boards stay with the owner', async () => {
  const alice = authed('alice');
  const bob = authed('bob');
  await assertFails(setDoc(doc(alice.firestore(), 'boards', 'board'), {
    name: 'Stolen',
    ownerId: 'bob'
  }));
  await assertSucceeds(setDoc(doc(alice.firestore(), 'boards', 'board'), {
    name: 'Mine',
    ownerId: 'alice',
    artworkIds: [],
    coverUrls: []
  }));
  await assertFails(updateDoc(doc(bob.firestore(), 'boards', 'board'), { name: 'Hijack' }));
  await assertFails(updateDoc(doc(alice.firestore(), 'boards', 'board'), { ownerId: 'bob' }));
  await assertSucceeds(updateDoc(doc(alice.firestore(), 'boards', 'board'), { name: 'Renamed' }));
  await assertFails(deleteDoc(doc(bob.firestore(), 'boards', 'board')));
  await assertSucceeds(deleteDoc(doc(alice.firestore(), 'boards', 'board')));
});

test('follows can only be created and deleted by the follower', async () => {
  const alice = authed('alice');
  const bob = authed('bob');

  await assertFails(setDoc(doc(alice.firestore(), 'follows', 'bob_alice'), {
    followerId: 'bob',
    followingId: 'alice',
    createdAt: new Date()
  }));
  await assertFails(setDoc(doc(alice.firestore(), 'follows', 'alice_bob'), {
    followerId: 'bob',
    followingId: 'alice',
    createdAt: new Date()
  }));
  await assertFails(setDoc(doc(alice.firestore(), 'follows', 'alice_alice'), {
    followerId: 'alice',
    followingId: 'alice',
    createdAt: new Date()
  }));
  await assertSucceeds(setDoc(doc(alice.firestore(), 'follows', 'alice_bob'), {
    followerId: 'alice',
    followingId: 'bob',
    createdAt: new Date()
  }));
  await assertFails(updateDoc(doc(alice.firestore(), 'follows', 'alice_bob'), {
    followingId: 'carol'
  }));
  await assertFails(deleteDoc(doc(bob.firestore(), 'follows', 'alice_bob')));
  await assertSucceeds(getDoc(doc(anon().firestore(), 'follows', 'alice_bob')));
  await assertSucceeds(deleteDoc(doc(alice.firestore(), 'follows', 'alice_bob')));
});

test('storage writes are limited to the owner and safe image types', async () => {
  const alice = authed('alice');
  const bob = authed('bob');
  const aliceFile = ref(alice.storage(), 'artworks/alice/pic.jpg');

  await assertSucceeds(uploadString(aliceFile, 'image-bytes', 'raw', { contentType: 'image/jpeg' }));
  await assertSucceeds(getDownloadURL(ref(anon().storage(), 'artworks/alice/pic.jpg')));
  await assertFails(uploadString(ref(bob.storage(), 'artworks/alice/other.jpg'), 'nope', 'raw', {
    contentType: 'image/jpeg'
  }));
  await assertFails(uploadString(ref(alice.storage(), 'artworks/bob/other.jpg'), 'nope', 'raw', {
    contentType: 'image/jpeg'
  }));
  await assertFails(uploadString(ref(alice.storage(), 'artworks/alice/evil.svg'), '<svg></svg>', 'raw', {
    contentType: 'image/svg+xml'
  }));
  await assertFails(uploadString(ref(alice.storage(), 'elsewhere/alice/pic.jpg'), 'nope', 'raw', {
    contentType: 'image/jpeg'
  }));
  await assertFails(deleteObject(ref(bob.storage(), 'artworks/alice/pic.jpg')));
  await assertSucceeds(deleteObject(aliceFile));
});
