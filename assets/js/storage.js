import { storage, ref, uploadBytes, getDownloadURL } from './firebase-config.js';
import { auth } from './firebase-config.js';

const MIME_EXTENSION = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp'
};

function normalizedContentType(file) {
  if (file.type === 'image/jpg') return 'image/jpeg';
  return file.type;
}

function assertImageFile(file, maxBytes) {
  const contentType = normalizedContentType(file);
  if (!Object.prototype.hasOwnProperty.call(MIME_EXTENSION, file.type)) {
    throw new Error('Only JPEG, PNG, GIF, and WebP images are allowed.');
  }
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(`Image must be ${mb}MB or smaller.`);
  }
  return contentType;
}

export async function uploadImage(file) {
  const contentType = assertImageFile(file, 20 * 1024 * 1024);
  const uid = auth.currentUser.uid;
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `artworks/${uid}/${timestamp}_${safeName}`;
  const storageRef = ref(storage, path);

  const timeoutMs = 15000;
  const uploadPromise = uploadBytes(storageRef, file, { contentType });
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Upload timed out after 15s — Firebase Storage may not be activated. Go to Firebase Console → Storage and click "Get Started".')), timeoutMs)
  );
  await Promise.race([uploadPromise, timeout]);

  const url = await getDownloadURL(storageRef);
  return { url, path };
}

export async function uploadAvatar(file) {
  const contentType = assertImageFile(file, 5 * 1024 * 1024);
  const uid = auth.currentUser.uid;
  const ext = MIME_EXTENSION[file.type] || 'jpg';
  const path = `avatars/${uid}/avatar_${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, { contentType });

  return await getDownloadURL(storageRef);
}
