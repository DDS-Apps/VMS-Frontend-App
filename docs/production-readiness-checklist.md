# VMS production readiness and client handover checklist

**Target:** https://vms.dallah.com

**Document reviewed:** 16 September 2026

**Status:** Configuration reviewed against the frontend repository. Production infrastructure, Microsoft tenant settings, backend behavior and end-to-end acceptance remain subject to the checks below. This document is not a production sign-off.

## 1. Go-live responsibilities

| Owner | Responsibility | Required evidence |
|---|---|---|
| Release team | Approved source revision, production builds, deployment and rollback package | Commit ID, build IDs and release notes |
| Infrastructure team | DNS, TLS, IIS, reverse proxy, backend availability and monitoring | HTTPS and proxy checks |
| Backend team | API compatibility, SSO, permissions, notifications and calendar integration | API and integration test results |
| Microsoft 365 / Entra administrator | SSO registration, add-in deployment, Graph consent and mailbox access | Pilot assignment and consent confirmation |
| Firebase / mobile release owner | Firebase configuration, push credentials, app identifiers and signing | Push and app-link tests on signed builds |
| Business / QA owner | Role-based acceptance in English and Arabic | Signed acceptance record |

Do not mark a box complete merely because a file exists in the repository. Record the environment, tester, date and evidence for each production check. Use test visitors and do not include credentials or personal data in handover evidence.

## 2. Environment and build configuration

| Setting | QA | Production |
|---|---|---|
| App domain | `vms-frontend-folio3.replit.app` | `vms.dallah.com` |
| API / Microsoft SSO origin | `https://vms-backend-app-qa.replit.app` | `https://vms.dallah.com` |
| Native build variant | `APP_VARIANT=staging` (resolves to QA) | `APP_VARIANT=production` |
| Outlook add-in name | VMS QA - Create Visit Request | VMS - Create Visit Request |
| Firebase | Currently configured for `dallah-albaraka-vms` | Currently shares the same project; confirm client approval |

The environment map is in `config/app-environments.js`; `app.config.js` derives runtime URLs and native links. Production URL resolution ignores inherited process URL overrides and uses the production variant file, if provided, then committed defaults. QA can use process URL overrides, then its variant file, then defaults. Development workspace URLs are rejected/ignored as appropriate.

For variant-file overrides, use unprefixed `API_BASE_URL`, `MICROSOFT_AUTH_URL`, `APP_DOMAIN` and `LEGAL_PAGES_URL`. Although the resolver accepts prefixed aliases, avoid `EXPO_PUBLIC_*` in variant files because Expo can auto-load `.env.production` during QA exports. The production URL guard is **not** a blanket guarantee that all inherited Firebase or other public settings are ignored; verify those separately.

### Release commands

Run from the approved source revision after installing dependencies:

```bash
npm ci --include=dev
npx tsc --noEmit
npx jest --runInBand __tests__/webBuildEnvironments.test.js __tests__/serverStaticCaching.test.js
```

| Target | Command | Output / caveat |
|---|---|---|
| Production IIS web | `npm run build:web:production -- --backend-origin http://localhost:3000` | `dist/`, including generated `web.config`; replace the example origin with the actual internal backend |
| Replit publishing build | `bash scripts/build-and-verify.sh` | **Production**, not QA; no IIS `web.config`, precompressed assets for `server.js` |
| QA web export | `npm run build:web` | QA export; not the current Replit publishing command |
| Production Android | `npm run build:android` | EAS production profile |
| Production iOS | `npm run build:ios` | EAS production profile through the Apple authentication helper |
| QA native builds | `npm run build:preview:android` / `npm run build:preview:ios` | Preview profiles |

The public hostname alone does not identify an export's backend: the current Replit publishing command also embeds production URLs. Confirm the intended environment before publishing.

The build verifies required assets, template substitution, the expected API origin and known QA/development host leakage. It is not a security scan or proof of live API availability.

- [ ] Approved commit is merged and the lockfile matches the manifest; external build URLs contain no Replit-only package registry hosts.
- [ ] Clean dependency installation, TypeScript and release tests pass in the release environment.
- [ ] Build output resolves to the production API; archive the completed `dist/` and build logs.
- [ ] Correct production Android/iOS identifiers, signing profiles and store metadata confirmed.
- [ ] Previous working frontend and backend release retained; rollback owner and procedure agreed.

See [IIS deployment guide](../DEPLOY_WEB_IIS.md) and [store publishing checklist](store-publishing-checklist.md).

## 3. Infrastructure and backend gates

- [ ] DNS and valid TLS certificate configured for `vms.dallah.com`; HTTP redirects to HTTPS.
- [ ] IIS URL Rewrite and ARR proxy configured; generated `dist/` deployed with `web.config` and all static subdirectories, including `.well-known` and `outlook-addin`.
- [ ] Internal backend origin is correct, running and reachable by IIS; `/api/*` and `/auth/microsoft/*` reach the backend instead of the SPA.
- [ ] Backend public origin and frontend redirect origin explicitly configured as `https://vms.dallah.com`; proxy headers and allowed origins reviewed.
- [ ] API schema matches the released frontend. Verify `GET /api/v1/dashboard/kpis` with authorized users and each applicable role; do not assume QA and production have the same backend revision.
- [ ] Verify the backend's documented health endpoint (for example `/api/health` if implemented). `/health` on `server.js` checks the static frontend, not backend functionality.
- [ ] Authentication, authorization, validation and role permissions enforced by the backend; no production mock data or test accounts exposed.
- [ ] Database migrations, backups, restore procedure, service credentials, monitoring and alert recipients approved by the backend/infrastructure owners.
- [ ] Invitation and notification payloads use production HTTPS links, including `/invite/<token>` and `/requests/<id>`; access and expiry behavior tested.
- [ ] Static legal pages `/privacy-policy.html` and `/terms-conditions.html` contain client-approved content.

No dated backend outage or missing-endpoint claim is carried forward as a current fact: recheck the actual production release and record evidence.

## 4. Microsoft sign-in

- [ ] Client Entra tenant and application registration confirmed; backend credentials valid and stored securely.
- [ ] Actual backend HTTPS callback registered, expected to be `https://vms.dallah.com/auth/microsoft/callback`; confirm against backend configuration.
- [ ] `/auth/microsoft/login?platform=web` redirects to Microsoft and the callback returns to the production frontend.
- [ ] Backend token handoff matches the frontend's URL-hash handling; no tokens in query strings or logs.
- [ ] Mobile return to `dallahvms://auth/callback` tested on signed production builds. Confirm with the backend which redirects belong in Entra and which are post-login app handoffs; do not blindly register every URL as an Entra callback.
- [ ] Signed-out, session-expired, cancelled sign-in and unauthorized-user paths tested.

## 5. Push notifications and mobile links

- [ ] Client approves the currently shared Firebase project and verifies production web and native app registrations.
- [ ] Production web Firebase configuration and VAPID public configuration match the backend's intended FCM project; required authorized domains are checked where Firebase Authentication is used.
- [ ] HTTPS `/firebase-messaging-sw.js` loads as JavaScript with root scope, not an HTML fallback.
- [ ] Supported browser obtains notification permission, registers its token with the backend and receives a real notification; denied permission handled correctly.
- [ ] Android Firebase package registration and iOS bundle ID/APNs credentials match the signed production builds. Native Firebase files currently come from `config/qa/`; the folder name does not establish production correctness.
- [ ] Foreground, background and cold-launch push navigation tested on iOS and Android.
- [ ] `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` return JSON without login or SPA fallback.
- [ ] Apple team/bundle identifiers and Android signing fingerprints match the distributed builds, including Play App Signing where applicable.
- [ ] Invitation and request links tested with and without the native app installed.

## 6. Outlook: two separate capabilities

### A. Create a VMS visit from an email

The existing Outlook add-in reads the **sender name and email of an opened message**, then opens the VMS form in the browser at `/requests/new?name=...&email=...`. The user signs in if required, completes the form and submits it in VMS.

This is a message-read add-in with `ReadItem` permission. It does not submit visits inside Outlook, process compose-mode messages, or create calendar events. The current XML has no mobile command extension; do not promise Outlook mobile support without implementation and testing.

- [ ] Generated production manifest validated and hosted over HTTPS.
- [ ] Add-in deployed to a Microsoft 365 pilot group.
- [ ] Task pane opens in each supported Outlook client without frame-policy errors.
- [ ] Sender prefill and request submission pass both signed-in and signed-out tests.
- [ ] Business owner approves pilot before wider assignment.

Follow [Outlook add-in setup and manifest update guide](outlook-addin-production-guide.md).

### B. Outlook calendar synchronization

Installing the add-in **does not enable calendar synchronization**. This is a separate backend Microsoft Graph integration.

- [ ] Backend owner confirms calendar create/update/cancel behavior exists in the production backend.
- [ ] Client Entra administrator approves Microsoft Graph **Application** `Calendars.ReadWrite` permission and grants tenant admin consent.
- [ ] Restrict application access to intended mailboxes using the client's approved Exchange application-access controls; this permission must not be granted broadly without review.
- [ ] Backend tenant/client configuration and credential expiry checked securely; never add credentials to the manifest.
- [ ] Host accounts have suitable Exchange Online mailboxes; room resource addresses provided if room booking is required.
- [ ] Create, reschedule and cancel a test visit; confirm correct calendar event, attendees, Riyadh time, no duplicates, and appropriate VMS sync/error status.

See [calendar synchronization client request](outlook-calendar-sync-client-request.md). That document describes the backend integration contract, not proof that the deployed backend has passed these tests.

## 7. Acceptance and release decision

Test English and Arabic, supported desktop browsers and signed mobile builds:

- [ ] Sign in/out, session restore, and access restrictions for every deployed role.
- [ ] Create/edit/cancel a request, approval/rejection, invitation access and expiry.
- [ ] Receptionist walk-in, check-in/out and services; Manager, Security, Buffet and administrator workflows as applicable.
- [ ] KPI counts, filters, pagination, refresh and failure recovery.
- [ ] Riyadh date/time handling and boundary cases.
- [ ] Email delivery, push delivery, deep links, Outlook sender prefill and calendar synchronization tested separately.
- [ ] No blocker defects remain; accepted limitations documented with an owner.
- [ ] Monitoring and rollback checks complete before general availability.

| Sign-off | Name / team | Date | Evidence / open conditions |
|---|---|---|---|
| Infrastructure and backend | | | |
| Microsoft 365 / Entra | | | |
| QA and mobile release | | | |
| Business owner | | | |

**Go-live decision:** Pending completion and approval of the applicable checks above.