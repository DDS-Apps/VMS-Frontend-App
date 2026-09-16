# Production readiness checklist (vms.dallah.com)

How the `main` branch produces production artifacts, what is committed, and
what still has to happen outside this repository before go-live.

## Environments at a glance

| | QA | Production |
|---|---|---|
| Web app / app domain | `vms-frontend-folio3.replit.app` (Replit deployment of this project) | `vms.dallah.com` (IIS) |
| API base URL | `https://vms-backend-app-qa.replit.app` | `https://vms.dallah.com` (`/api/*` proxied by IIS) |
| Microsoft SSO base URL | `https://vms-backend-app-qa.replit.app` | `https://vms.dallah.com` |
| Legal pages | `https://vms-frontend-folio3.replit.app/*.html` | `https://vms.dallah.com/*.html` |
| Outlook add-in id | `a3f7c2d1-…` "VMS QA - Create Visit Request" | `c98d21ef-…` "VMS - Create Visit Request" |
| Firebase project | `dallah-albaraka-vms` | `dallah-albaraka-vms` (shared) |
| `APP_VARIANT` | `staging` (default) | `production` |

All of these values are committed in `config/app-environments.js`. Nothing in
`app.json` names an environment any more; `app.config.js` derives the
Universal Links / App Links domain, `extra.apiBaseUrl`, `extra.microsoftAuthUrl`
and `extra.legalPagesUrl` from the selected variant.

## How a value is chosen

For each public URL, highest priority first:

1. `EXPO_PUBLIC_<KEY>` in the process environment (Replit shared env, CI).
   Ignored when it points at a `*.replit.dev` workspace URL. **Ignored
   entirely when `APP_VARIANT=production`** (web build and EAS production
   profiles), with a warning listing the skipped variables, so production
   builds can be started from this workspace even though its shared env holds
   the QA hosts.
2. `<KEY>` in the git-ignored variant file (`.env.production` for production,
   `.env.staging` otherwise). Keys: `API_BASE_URL`, `MICROSOFT_AUTH_URL`,
   `APP_DOMAIN`, `LEGAL_PAGES_URL`. Do not put `EXPO_PUBLIC_*` keys in these
   files: the Expo CLI loads `.env.production` for *every* export and would
   inline them into QA builds too.
3. The committed defaults.

The app reads `Constants.expoConfig.extra.*` (the values resolved by
`app.config.js`) before `process.env.EXPO_PUBLIC_*`, so a stray variable that
Metro inlines cannot override the resolved environment. `app.config.js` still
throws if `APP_VARIANT=production` resolves to a QA or Replit host (for example
through a stale `.env.production`), and every web build checks that the
`apiBaseUrl` inlined into the bundle matches the variant being built.

## Build commands

| Artifact | Command | Notes |
|---|---|---|
| QA web (Replit deployment) | `npm run build:web` (also `scripts/build-and-verify.sh`, used by `.replit`) | uses the shared env, pre-compresses for `server.js` |
| Production web (IIS) | `VMS_BACKEND_ORIGIN=http://localhost:3000 npm run build:web:production` | see `DEPLOY_WEB_IIS.md` |
| iOS / Android production | `npm run build:ios` / `npm run build:android` | `eas.json` production profile sets `APP_VARIANT=production` |
| iOS / Android QA | `npm run build:preview:ios` / `npm run build:preview:android` | `APP_VARIANT=staging` |

Every web build fails when the bundle contains a hostname from another
environment, a development workspace URL, or a leftover `%%PLACEHOLDER%%`.

## Frontend checklist (done in this repository)

- [x] Production defaults committed; QA hosts removed from `app.json`
- [x] Production build ignores inherited QA `EXPO_PUBLIC_*` values and fails on any leak
- [x] Service worker, legal pages, `.well-known` and Outlook add-in files ship with every export (`public/`)
- [x] Outlook add-in manifest / task pane rendered per environment with distinct ids
- [x] IIS `web.config` generated with API + Microsoft SSO reverse proxy, SPA fallback, caching, MIME types, frame headers
- [x] `server.js` (QA) serves `.well-known/*` as JSON and lets Outlook frame the task pane
- [x] Deployment guide (`DEPLOY_WEB_IIS.md`) and this checklist

## Outside this repository (before go-live)

Backend / infrastructure

- [ ] **Backend deployed** behind IIS on the host named by `VMS_BACKEND_ORIGIN`, configured with an explicit public base URL `https://vms.dallah.com` (it must not derive it from the proxied request) and CORS for `https://vms.dallah.com`
- [ ] **API contract** matches QA (`https://vms.dallah.com/api/docs-json`). As of 2026-09-16 production lacks `GET /api/v1/dashboard/kpis`, which the KPI cards on the Overview, Receptionist, Security and Buffet screens call; deploy the backend version that has it or those cards will show errors
- [ ] **Microsoft SSO through the proxy**: `https://vms.dallah.com/auth/microsoft/login?platform=web` redirects to Microsoft (it answered 504 on 2026-09-16 because the backend is not running) and `/auth/microsoft/callback` is reachable
- [ ] **Backend frontend-redirect URL** after SSO is `https://vms.dallah.com` with the tokens in the URL hash (`#access_token=…`); the web app reads them from `window.location.hash` and never from a query string
- [ ] **Backend e-mail / push links** use `https://vms.dallah.com/invite/<token>` and `https://vms.dallah.com/requests/<id>` so they open in the web app and, on phones with the app installed, in the app via Universal Links / App Links
- [ ] **TLS certificate** for `vms.dallah.com`, HTTP → HTTPS redirect

Azure AD

- [ ] Redirect URIs registered: web `https://vms.dallah.com/auth/microsoft/callback` (whatever the backend uses for its callback) and mobile `dallahvms://auth/callback`

Firebase (`dallah-albaraka-vms`)

- [ ] `vms.dallah.com` added to the authorised domains (web push / FCM web)
- [ ] Web push checked in a browser on `https://vms.dallah.com`: permission prompt appears, the device token registers with the backend, a test notification arrives (the service worker is served from `/firebase-messaging-sw.js`)

App links and add-in

- [ ] `https://vms.dallah.com/.well-known/apple-app-site-association` and `assetlinks.json` return JSON; the app ids / SHA-256 fingerprints in `public/.well-known/` match the store builds
- [ ] `https://vms.dallah.com/outlook-addin/manifest.xml` uploaded in the Microsoft 365 admin centre (Integrated apps → Upload custom apps → provide a link); the add-in opens `https://vms.dallah.com/requests/new` with the sender pre-filled

Store builds

- [ ] iOS / Android builds produced with the `production` EAS profile after the backend is live (they embed `https://vms.dallah.com`); see `docs/store-publishing-checklist.md`

Smoke test on `https://vms.dallah.com`

- [ ] `/api/health` answers from the backend
- [ ] Sign in with Microsoft completes and lands on the dashboard
- [ ] Create a request, open its invitation link in a private window
- [ ] Legal pages open from Settings (mobile build) and directly at `/privacy-policy.html`, `/terms-conditions.html`
- [ ] Web push notification received
- [ ] `.well-known` files and the add-in manifest load (section above)

## Verifying a production bundle without a server

```bash
VMS_BACKEND_ORIGIN=http://localhost:3000 npm run build:web:production
grep -o 'https://[a-z0-9.-]*' dist/_expo/static/js/web/index-*.js | sort | uniq -c   # only vms.dallah.com + third parties
node -e "require('./server.js').createApp('dist').listen(3999)" &                     # serve dist/ locally
curl -s http://localhost:3999/.well-known/apple-app-site-association | head -c 60
curl -sI http://localhost:3999/outlook-addin/taskpane.html | grep -i x-frame          # no output expected
```
