# Deploying the VMS web app to IIS (https://vms.dallah.com)

The production web frontend is a static bundle served by IIS at
`https://vms.dallah.com`. The backend runs on the same host behind IIS and is
reached through the same domain: IIS forwards `/api/*` and `/auth/microsoft/*`
to it, so the browser only ever talks to `vms.dallah.com`.

Both frontend and backend must use that single origin. The frontend bundle is
built with `https://vms.dallah.com` as its API and Microsoft SSO base URL; the
mobile apps built with the `production` EAS profile use the same URL.

---

## 1. Build the production bundle

On any machine with Node.js 20+ and the repository checked out:

```bash
npm ci
VMS_BACKEND_ORIGIN=http://localhost:3000 npm run build:web:production
```

PowerShell:

```powershell
npm ci
$env:VMS_BACKEND_ORIGIN = "http://localhost:3000"
npm run build:web:production
```

`VMS_BACKEND_ORIGIN` is the address IIS should forward API traffic to, as seen
from the IIS server (the port the backend listens on). It is written into
`dist/web.config`. If the IT team maintains their own `web.config` on the
server, build with `npm run build:web:production -- --no-web-config` and keep
theirs; sections 3 and 4 list what it must contain.

The build:

1. Ignores any `EXPO_PUBLIC_*` variables in the shell so a QA setup can never
   leak into production. Production values live in
   `config/app-environments.js`; a git-ignored `.env.production` can override
   them (see `docs/production-readiness-checklist.md`).
2. Runs `expo export --platform web` with `APP_VARIANT=production`.
3. Fills in the Outlook add-in manifest and task pane for `vms.dallah.com` and
   writes `dist/web.config`.
4. Scans every text file in `dist/` and **fails** if it finds a QA or
   development hostname, a leftover placeholder, or no reference to
   `vms.dallah.com` in the JS bundle.

The output is `dist/`:

```
dist/
├── index.html                      SPA shell (never cached)
├── web.config                      IIS rules (section 3)
├── favicon.ico
├── firebase-messaging-sw.js        web push service worker (must stay at the site root)
├── privacy-policy.html             legal pages opened by the mobile apps
├── terms-conditions.html
├── .well-known/
│   ├── apple-app-site-association  iOS Universal Links
│   └── assetlinks.json             Android App Links
├── outlook-addin/                  Outlook add-in (manifest, task pane, icons)
├── _expo/static/js/web/*.js        content-hashed JS bundle
└── assets/                         content-hashed fonts and images
```

## 2. IIS prerequisites (one-off)

Install on the server:

- **IIS** with Static Content, Default Document, HTTP Compression (static + dynamic)
- **URL Rewrite 2.1** (https://www.iis.net/downloads/microsoft/url-rewrite)
- **Application Request Routing 3.0** (https://www.iis.net/downloads/microsoft/application-request-routing)
  - IIS Manager → server node → *Application Request Routing Cache* →
    *Server Proxy Settings* → tick **Enable proxy** → Apply.
- A TLS certificate for `vms.dallah.com` bound to the site on 443, with an
  HTTP → HTTPS redirect on 80.

`web.config` uses `<rewrite>`; if URL Rewrite is not installed IIS answers
every request with **500.19**.

## 3. What the shipped web.config does

`web/web.config` (template) → `dist/web.config` (rendered). Rules, in order:

| Rule | Match | Result |
|------|-------|--------|
| API Reverse Proxy | `/api/*` | forwarded to `VMS_BACKEND_ORIGIN/api/*` |
| Microsoft SSO Reverse Proxy | `/auth/microsoft/*` | forwarded to `VMS_BACKEND_ORIGIN/auth/microsoft/*` |
| SPA Fallback | anything that is not an existing file or folder | `/index.html` |

Microsoft sign-in on web is a full-page redirect to
`https://vms.dallah.com/auth/microsoft/login` followed by Azure AD calling
`https://vms.dallah.com/auth/microsoft/callback`; both paths are outside `/api`
and would otherwise be swallowed by the SPA fallback.

Static behaviour:

- `Cache-Control: no-cache` for everything by default (HTML shell, service
  worker, legal pages, `.well-known`, add-in files), so a new deployment is
  picked up on the next load.
- `Cache-Control: public, max-age=31536000, immutable` for `_expo/static/*`
  and `assets/*` (content-hashed file names).
- MIME types for `.js`, `.mjs`, `.json`, `.woff2`, `.webmanifest`, and
  `application/json` for the extension-less
  `.well-known/apple-app-site-association`.
- Security headers `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, with `X-Frame-Options`
  removed under `/outlook-addin/` because Outlook loads the task pane in a
  frame.
- Static and dynamic compression enabled; the build does not ship
  pre-compressed files for IIS.

## 4. Deploy

1. Stop the site (or use an app-offline file) and clear the previous contents
   of the site root - stale hashed bundles are harmless, but stale
   `index.html`, `firebase-messaging-sw.js` or `web.config` are not.
2. Copy **everything** in `dist/` to the site root, including the hidden
   `.well-known` folder and `web.config`.
3. Give the application pool identity read access to the folder.
4. Start the site.

Deploying the backend is a separate step (its own site or a Windows service on
the port named in `VMS_BACKEND_ORIGIN`). Until it is running, the SPA loads but
every API call returns 502 from IIS.

## 5. Verify

From any machine:

```bash
curl -sI https://vms.dallah.com/                                  # 200 text/html, Cache-Control: no-cache
curl -sI https://vms.dallah.com/requests/new                      # 200 text/html (SPA fallback)
curl -sI https://vms.dallah.com/firebase-messaging-sw.js          # 200 application/javascript, no-cache
curl -s  https://vms.dallah.com/.well-known/apple-app-site-association | head -c 80   # JSON, not HTML
curl -s  https://vms.dallah.com/.well-known/assetlinks.json | head -c 80              # JSON
curl -sI https://vms.dallah.com/outlook-addin/taskpane.html       # 200, no X-Frame-Options header
curl -sI https://vms.dallah.com/privacy-policy.html               # 200 text/html
curl -sI "https://vms.dallah.com/_expo/static/js/web/$(curl -s https://vms.dallah.com/ | grep -o 'index-[a-f0-9]*\.js' | head -1)"  # immutable
curl -si https://vms.dallah.com/api/health | head -5             # answered by the backend (once deployed)
```

In a browser: open the site, sign in with Microsoft, create a request, and
confirm that the Network panel shows only `vms.dallah.com` requests.

Then submit `https://vms.dallah.com/outlook-addin/manifest.xml` in the
Microsoft 365 admin centre (Integrated apps → Upload custom apps → provide a
link). The production add-in id differs from the QA one, so both can be
installed side by side.

## 6. Common errors

| Symptom | Cause | Fix |
|---------|-------|-----|
| 500.19 on every request | URL Rewrite module missing | install URL Rewrite, restart IIS |
| `/api/*` returns 404 with an IIS page | ARR proxy not enabled | enable proxy in ARR Server Proxy Settings |
| `/api/*` returns 502.3 | backend not running / wrong `VMS_BACKEND_ORIGIN` | start the backend, rebuild or edit `web.config` |
| Sign in with Microsoft shows the app instead of the Microsoft page | `/auth/microsoft` rule missing (custom `web.config`) | add the rule from section 3 |
| Deep link `/requests/123` 404s | SPA fallback missing | restore `web.config` |
| `.well-known/*` returns HTML | SPA fallback matched before static file / hidden folder not copied | copy `.well-known`, check `IsFile` condition |
| `apple-app-site-association` downloads as octet-stream | mimeMap for `.` missing | keep the `<location>` block from `web.config` |
| Fonts return 404 | `.woff2`/`.ttf` MIME missing | keep the `staticContent` block |
| Old UI after deployment | `index.html` cached | check `Cache-Control: no-cache` on `/`; hard refresh |
| Web push registration fails | service worker not at site root or served as HTML | check `curl -sI /firebase-messaging-sw.js` |
| Outlook shows a blank task pane | `X-Frame-Options` applied under `/outlook-addin/` | keep the `<location path="outlook-addin">` block |

## 7. Backend expectations

For the single-origin setup the backend must:

- accept `https://vms.dallah.com` as a CORS origin (same-origin in practice,
  but the mobile apps and Outlook add-in also call it),
- register `https://vms.dallah.com/auth/microsoft/callback` as the Azure AD
  redirect URI,
- be configured with `https://vms.dallah.com` as its **explicit** public base
  URL for OAuth redirects, invitation links, e-mails and push payloads. Behind
  ARR the backend sees `http://localhost:3000` as its own address; ARR adds
  `X-Forwarded-For` but does not reliably provide `X-Forwarded-Proto` or the
  original `Host`, so the backend must not derive its public URL from the
  incoming request. If a forwarded-proto header is required, add a
  `<serverVariables>` entry (`HTTP_X_FORWARDED_PROTO` = `https`) to the two
  proxy rules and allow that variable in ARR.

Backend deployment itself is outside this repository.
