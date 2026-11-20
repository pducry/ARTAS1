# ARTASAS

ARTASAS is a static art social network. The HTML pages are hosted on GitHub Pages. Accounts, posts, boards, and follows are stored in Firebase Authentication, Cloud Firestore, and Cloud Storage.

## Pages

- `index.html` — public gallery
- `login.html` / `signup.html` — email and Google sign-in
- `home_logada.html` — logged-in feed and uploads
- `profile.html?uid=` — public profile, boards, and follow
- `board.html?id=` — one board

Sign-in checks in the browser are not access control. Firestore and Storage rules are what stop other people from writing your data.

## Firebase setup

1. Create a Firebase project and register a web app.
2. Enable Authentication providers: Email/Password and Google.
3. Create a Firestore database and a Storage bucket.
4. Put the web app config in `assets/js/firebase-config.js`. The client config is public; do not put Admin SDK keys or other secrets in this repo.
5. Add the GitHub Pages domain under Authentication → Settings → Authorized domains.

Client config in the repo is not a service-account secret. Keep `.env` files and Admin credentials out of git.

## Deploy rules

Changing `firestore.rules` or `storage.rules` in git does not change the live Firebase project. Deploy them from this directory after you review the diff:

```bash
firebase deploy --only firestore:rules,storage
```

Firestore rules alone:

```bash
firebase deploy --only firestore:rules
```

Until that deploy finishes, the previous rules stay in effect. See `firebase-rules.md` for what the current rules allow.

## Local checks

Sanitizer tests need Node.js:

```bash
npm install
npm test
```

Rules tests also need Java and the Firebase emulators. They talk to the local emulator only:

```bash
npm run test:rules
```
