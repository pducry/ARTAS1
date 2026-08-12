# Publicar o ARTASAS (checklist)

URL pública atual: **https://pducry.github.io/ARTAS1/**

## 1. GitHub Pages

Hoje o Pages está em modo *legacy*, servindo a branch `abrir-o-artas`.

**Opção recomendada (uma vez):**
1. Repo → **Settings → Pages**
2. **Build and deployment → Source:** `GitHub Actions`
3. Faça merge na `master` — o workflow `.github/workflows/deploy-github-pages.yml` publica automaticamente

**Opção alternativa (sem mudar Settings):**
- Mantenha `abrir-o-artas` igual à `master` e faça push nessa branch para republicar:
  ```bash
  git checkout abrir-o-artas
  git reset --hard master
  git push origin abrir-o-artas --force-with-lease
  ```

## 2. Firebase Console (projeto `artas-experience`)

Abra: https://console.firebase.google.com/project/artas-experience

### Authentication
1. **Sign-in method:** habilitar **Email/Password** e **Google**
2. **Settings → Authorized domains:** garantir que existam:
   - `localhost` (dev)
   - `artas-experience.firebaseapp.com` (padrão)
   - `pducry.github.io` (produção GitHub Pages) ← **obrigatório** para login Google no site público

### Firestore
1. Database criado (modo produção)
2. **Rules:** colar o conteúdo de `firestore.rules` (ou o bloco em `firebase-rules.md`) e **Publish**

### Storage
1. Bucket ativo
2. **Rules:** colar o conteúdo de `storage.rules` e **Publish**

### (Opcional) Deploy das rules via CLI
```bash
npm i -g firebase-tools
firebase login
firebase use artas-experience
firebase deploy --only firestore:rules,storage:rules
```

## 3. Smoke test em produção

Depois dos passos acima, abra https://pducry.github.io/ARTAS1/ e valide:

| Fluxo | OK? |
| --- | --- |
| Gallery em `/ARTAS1/` e `/ARTAS1/index.html` | |
| Sign up em `/ARTAS1/signup.html` (email/senha) | |
| Redirect para `home_logada.html` logado | |
| Upload de uma imagem | |
| Log in em `/ARTAS1/login.html` | |
| Google sign-in (só depois do domínio autorizado) | |

## 4. Homepage do repositório (opcional)

Em **Settings → General → Website**, coloque: `https://pducry.github.io/ARTAS1/`
