# AGENTS.md

## Cursor Cloud specific instructions

ARTASAS is a **static, client-side web app** (plain multi-page HTML/CSS/vanilla JS ES modules) with **Firebase as the only backend** (Auth + Firestore + Storage). There is no `package.json`, no bundler, and no build step. All third-party libraries (Firebase SDK v10.12.0, Google Fonts) are loaded from CDNs at runtime, so the app requires internet access to function.

### Running the app (development)
- Serve the repo root over HTTP (ES modules + the Firebase SDK do not work over `file://`):
  - `python3 -m http.server 8000` from the repo root, then open `http://localhost:8000/index.html`.
- Key pages (all served from the repo root): `index.html` (public immersive gallery, works logged-out), `signup.html`, `login.html`, `home_logada.html` (logged-in feed + upload), `profile*.html`, `board.html`. See `OPEN-BROWSER.md` for the page list.
- There is no lint/test/build tooling in this repo (no linter config, no test suite, no CI build). "Building" is just serving the static files.

### Production
- Public URL: **https://pducry.github.io/ARTAS1/** (project Pages site — note the `/ARTAS1/` base path; keep asset/`href`s relative).
- Publish checklist (GitHub Pages + Firebase Console): see `PUBLISH.md`.
- Deploy workflow: `.github/workflows/deploy-github-pages.yml` (requires Pages source = GitHub Actions). Legacy fallback branch: `abrir-o-artas`.

### Firebase backend (important gotchas)
- The Firebase config is **hardcoded** in `assets/js/firebase-config.js` and points at the shared **live** `artas-experience` project (not an emulator). Any signup/upload writes to real production Auth/Firestore/Storage.
- **Email/Password signup and login work from `localhost` out of the box.** Email/password auth does not depend on Firebase Authorized Domains.
- **Google sign-in requires the origin hostname to be a Firebase Authorized Domain.** For production that hostname is `pducry.github.io` (not the full path). Prefer the email/password flow for testing if Google fails with `auth/unauthorized-domain`.
- `firebase.json` only deploys Firestore/Storage security rules (`firestore.rules`, `storage.rules`) — it does not configure Firebase Hosting or an emulator suite. Deploying rules requires the Firebase CLI (not vendored) and project access.

### Dormant code
- `assets/js/main.js` + `assets/js/modules/*` are a Three.js "3D Spatial Navigation" experience that is **not wired into any HTML page** (no `<script>` include, no import map for the bare `three` specifier). The app runs fine without it; `fallback/index.html` is a 2D fallback.
