# AGENTS.md

## Cursor Cloud specific instructions

ARTASAS is a **static, client-side web app** (plain multi-page HTML/CSS/vanilla JS ES modules) with **Firebase as the only backend** (Auth + Firestore + Storage). There is no `package.json`, no bundler, and no build step. All third-party libraries (Firebase SDK v10.12.0, Google Fonts) are loaded from CDNs at runtime, so the app requires internet access to function.

### Running the app (development)
- Serve the repo root over HTTP (ES modules + the Firebase SDK do not work over `file://`):
  - `python3 -m http.server 8000` from the repo root, then open `http://localhost:8000/index.html`.
- Key pages (all served from the repo root): `index.html` (public immersive gallery, works logged-out), `signup.html`, `login.html`, `home_logada.html` (logged-in feed + upload), `profile*.html`, `board.html`. See `OPEN-BROWSER.md` for the page list.
- There is no lint/test/build tooling in this repo (no linter config, no test suite, no CI build). "Building" is just serving the static files.

### Firebase backend (important gotchas)
- The Firebase config is **hardcoded** in `assets/js/firebase-config.js` and points at the shared **live** `artas-experience` project (not an emulator). Any signup/upload writes to real production Auth/Firestore/Storage.
- **Email/Password signup and login work from `localhost` out of the box** (verified end-to-end). Email/password auth does not depend on Firebase Authorized Domains.
- **Google sign-in requires the origin to be a Firebase Authorized Domain.** From `localhost` this typically fails with `auth/unauthorized-domain` unless `localhost` is added under Firebase Console > Authentication > Settings > Authorized domains. Prefer the email/password flow for testing.
- `firebase.json` only deploys Firestore/Storage security rules (`firestore.rules`, `storage.rules`) — it does not configure Firebase Hosting or an emulator suite. Deploying rules requires the Firebase CLI (not vendored) and project access.

### Dormant code
- `assets/js/main.js` + `assets/js/modules/*` are a Three.js "3D Spatial Navigation" experience that is **not wired into any HTML page** (no `<script>` include, no import map for the bare `three` specifier). The app runs fine without it; `fallback/index.html` is a 2D fallback.
