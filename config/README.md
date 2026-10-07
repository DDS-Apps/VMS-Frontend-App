# Environment configuration

**Production is the default** for publishing, web builds and every configured
Android/iOS EAS profile, including preview and development binaries. They target
`https://vms.dallah.com`. QA requires an explicit `qa`/`staging` variant and is
not selected by any standard build command. Missing or unrecognized variants
default to production, and production rejects non-production or HTTP targets.

Production targeting does not grant cross-origin access: the production API
currently permits the canonical `https://vms.dallah.com` web origin. A local or
Replit preview/published host needs explicit backend CORS approval before its
authenticated API calls can work. Do not use wildcard credentialed CORS or
switch a production build back to QA to bypass this requirement.

## Web Firebase project

Web builds for both QA and production use the original **dallah-albaraka-vms** project. The public
`public/firebase-web-config.js` supplies the same six client identifiers to the
app, Expo configuration and messaging worker. Old environment/file values cannot
replace that identity. Deploy the new config script alongside the worker; the
web build verifies both files are present.

Configure `EXPO_PUBLIC_FIREBASE_VAPID_KEY` with the web-push public key belonging
to **dallah-albaraka-vms**. The original public-key fallback is restored from history.
A configured key's presence is not proof of project ownership or push delivery.

**Native migration is not required:** Android/iOS keep their existing
`google-services.json` / `GoogleService-Info.plist` and native app IDs for
**dallah-albaraka-vms**, matching web. Native Crashlytics integration is unchanged.
Backend Firebase Admin/APNs settings were not changed; client configuration alone
does not verify backend credentials or actual push delivery.

Restoration verification uses resolved configuration, type checking and a clean
production web export, without running unit tests. No live notification,
device registration, deliberate crash or remote native build is part of this work.

The app has two environments. Their public values are committed in
`config/app-environments.js`, the single source of truth read by
`app.config.js`, `scripts/build-web.js` and the tests.

| | QA | Production |
|---|---|---|
| Web app / app domain | `vms-frontend-folio3.replit.app` (Replit deployment of this project) | `vms.dallah.com` (IIS) |
| API base URL | `https://vms-backend-app-qa.replit.app` | `https://vms.dallah.com` (`/api/*` proxied by IIS) |
| Microsoft SSO base URL | `https://vms-backend-app-qa.replit.app` | `https://vms.dallah.com` |
| Legal pages | `https://vms-frontend-folio3.replit.app` | `https://vms.dallah.com` |
| Outlook add-in | `a3f7c2d1-…` "VMS QA - Create Visit Request" | `c98d21ef-…` "VMS - Create Visit Request" |
| Firebase project | `dallah-albaraka-vms` | `dallah-albaraka-vms` (shared) |
| `APP_VARIANT` | `qa` / `staging` (explicit only) | `production` (default) |

Web and native builds use the same original Firebase project. Native Firebase
files in `config/qa/` remain unchanged.

## Files

| File | Purpose |
|------|---------|
| `app-environments.js` | Committed QA/production values, resolution rules, production guard (`assertProductionConfig`) |
| `environments.ts` | Runtime helpers used by the app (environment detection, env var validation) |
| `qa/google-services.json`, `qa/GoogleService-Info.plist` | Native Firebase configuration (shared by both environments) |

## How values are resolved

For `apiBaseUrl`, `microsoftAuthUrl`, `appDomain` and `legalPagesUrl`, highest
priority first:

1. `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_MICROSOFT_AUTH_URL`,
   `EXPO_PUBLIC_APP_DOMAIN`, `EXPO_PUBLIC_LEGAL_PAGES_URL` from the process
   environment (Replit shared env, CI). Values pointing at a `*.replit.dev`
   workspace are ignored. When `APP_VARIANT=production` this level is ignored
   entirely (with a warning), so production web and EAS builds can be started
    even when stale QA variables remain in the workspace or CI environment.
2. `API_BASE_URL`, `MICROSOFT_AUTH_URL`, `APP_DOMAIN`, `LEGAL_PAGES_URL` from
   the git-ignored variant file: `.env.production` when
   `APP_VARIANT=production`, otherwise `.env.staging`. Do **not** use
   `EXPO_PUBLIC_` names in these files - the Expo CLI loads `.env.production`
   for every `expo export` and would inline them into QA builds.
3. The committed defaults.

`microsoftAuthUrl` follows `apiBaseUrl` unless set explicitly.

If `APP_VARIANT=production` ends up pointing at HTTP or a non-production host (e.g. a
stale `.env.production`), `app.config.js` throws and the build stops. The app
reads `Constants.expoConfig.extra.*` before `process.env.EXPO_PUBLIC_*`, so the
resolved values are what the app uses at runtime.

## What is derived from the environment

- `extra.apiBaseUrl`, `extra.microsoftAuthUrl`, `extra.appDomain`,
  `extra.legalPagesUrl`, `extra.environment`
- iOS `associatedDomains` (`applinks:<appDomain>`) and Android `intentFilters`
  for `/requests/new`, `/invite/*`, `/requests/*`
- Outlook add-in manifest and task pane (`public/outlook-addin/`), rendered
  into `dist/` by the web build
- `dist/web.config` for IIS (production web build only)

## Firebase

Web/shared Firebase identity defaults to the original `dallah-albaraka-vms` configuration
in `public/firebase-web-config.js`, including when no environment variables are
provided. Neither process nor variant-file overrides can change the web identity.
VAPID, optional measurement ID and existing native app IDs can still be configured
with their respective environment or variant-file keys:

```
FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID,
FIREBASE_STORAGE_BUCKET, FIREBASE_MESSAGING_SENDER_ID, FIREBASE_MEASUREMENT_ID,
FIREBASE_APP_ID_WEB, FIREBASE_APP_ID_ANDROID, FIREBASE_APP_ID_IOS, FIREBASE_VAPID_KEY
```

## Building

| Target | Command |
|--------|---------|
| Production web (Replit publishing) | `npm run build:web` |
| Production web (IIS) | `VMS_BACKEND_ORIGIN=http://localhost:3000 npm run build:web:production` |
| Production iOS / Android | `npm run build:ios` / `npm run build:android` (EAS `production` profile) |
| Internal iOS / Android (production backend) | `npm run build:preview:ios` / `npm run build:preview:android` |

See `DEPLOY_WEB_IIS.md` and `docs/production-readiness-checklist.md`.
