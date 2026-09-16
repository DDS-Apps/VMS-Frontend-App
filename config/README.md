# Environment configuration

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
| `APP_VARIANT` | `staging` (default) | `production` |

Both environments use the same Firebase project and the native Firebase files
in `config/qa/`.

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
   from this workspace despite its QA shared env.
2. `API_BASE_URL`, `MICROSOFT_AUTH_URL`, `APP_DOMAIN`, `LEGAL_PAGES_URL` from
   the git-ignored variant file: `.env.production` when
   `APP_VARIANT=production`, otherwise `.env.staging`. Do **not** use
   `EXPO_PUBLIC_` names in these files - the Expo CLI loads `.env.production`
   for every `expo export` and would inline them into QA builds.
3. The committed defaults.

`microsoftAuthUrl` follows `apiBaseUrl` unless set explicitly.

If `APP_VARIANT=production` ends up pointing at a QA or Replit host (e.g. a
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

Public Firebase values default to the `dallah-albaraka-vms` project in
`app.config.js` and can be overridden with `EXPO_PUBLIC_FIREBASE_*` variables
or the same keys (without the prefix) in the variant file:

```
FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID,
FIREBASE_STORAGE_BUCKET, FIREBASE_MESSAGING_SENDER_ID, FIREBASE_MEASUREMENT_ID,
FIREBASE_APP_ID_WEB, FIREBASE_APP_ID_ANDROID, FIREBASE_APP_ID_IOS, FIREBASE_VAPID_KEY
```

## Building

| Target | Command |
|--------|---------|
| QA web (Replit deployment) | `npm run build:web` |
| Production web (IIS) | `VMS_BACKEND_ORIGIN=http://localhost:3000 npm run build:web:production` |
| Production iOS / Android | `npm run build:ios` / `npm run build:android` (EAS `production` profile) |
| QA iOS / Android | `npm run build:preview:ios` / `npm run build:preview:android` |

See `DEPLOY_WEB_IIS.md` and `docs/production-readiness-checklist.md`.
