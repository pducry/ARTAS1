# Firebase Rules - Apply in Firebase Console

## Firestore Rules
Go to: Firebase Console > Firestore Database > Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if true;
      allow create: if request.auth != null && request.auth.uid == uid;
      allow update: if request.auth != null && request.auth.uid == uid;
    }
    match /artworks/{artworkId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null && resource.data.uploadedBy == request.auth.uid;
    }
    match /boards/{boardId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null && resource.data.ownerId == request.auth.uid;
      allow delete: if request.auth != null && resource.data.ownerId == request.auth.uid;
    }
    match /follows/{followId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow delete: if request.auth != null;
    }
  }
}
```

## Storage Rules
Go to: Firebase Console > Storage > Rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /artworks/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /avatars/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Setup Checklist
1. Enable Authentication > Email/Password + Google
2. Create Firestore Database (test mode initially, then apply rules above)
3. Create Storage bucket (apply rules above)
4. Add authorized domain: pducry.github.io (Authentication > Settings > Authorized domains)
