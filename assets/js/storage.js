import { storage, ref, uploadBytes, getDownloadURL } from './firebase-config.js';
import { auth } from './firebase-config.js';

export async function uploadImage(file) {
  const uid = auth.currentUser.uid;
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `artworks/${uid}/${timestamp}_${safeName}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, {
    contentType: file.type
  });

  const url = await getDownloadURL(storageRef);
  return { url, path };
}

export async function uploadAvatar(file) {
  const uid = auth.currentUser.uid;
  const path = `avatars/${uid}/avatar_${Date.now()}.${file.name.split('.').pop()}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, {
    contentType: file.type
  });

  return await getDownloadURL(storageRef);
}
