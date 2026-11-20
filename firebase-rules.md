# Firebase rules

The rules that should be deployed are the files in this repo:

- `firestore.rules`
- `storage.rules`

Rules checked into git do not change the live Firebase project. After reviewing a rules change, deploy it from this directory:

```bash
firebase deploy --only firestore:rules,storage
```

Firestore only:

```bash
firebase deploy --only firestore:rules
```

Do not paste an older copy of these rules from memory. The console editor should match the files above.

## What the rules enforce

- Public user profiles are readable, but they cannot contain an `email` field. Email is stored at `users/{uid}/private/account`, which only that user can read or write.
- Artworks can be created only with `uploadedBy` equal to the signed-in user. Only that owner can delete an artwork or edit it, and `uploadedBy` cannot be changed. Another signed-in user can only add or remove their own id in `savedBy` and move `saveCount` by 1.
- Boards can be created only with `ownerId` equal to the signed-in user. Only that owner can update or delete the board, and `ownerId` cannot be changed.
- A follow document id is `{followerUid}_{followedUid}`. Only the follower can create or delete it, and nobody can update it. Follower counts are not written onto another user's profile; the app counts `follows` documents.
- Storage writes are limited to `artworks/{uid}/...` and `avatars/{uid}/...` for that signed-in user, and only for JPEG, PNG, GIF, or WebP within the size cap. The owner can delete their own files.

## Setup checklist

1. Enable Authentication > Email/Password and Google.
2. Create Firestore and deploy `firestore.rules`.
3. Create Storage and deploy `storage.rules`.
4. Add the GitHub Pages domain under Authentication > Settings > Authorized domains.
