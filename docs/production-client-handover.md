# VMS — Complete Production Deployment and Client Handover Guide

**Target:** https://vms.dallah.com

**Document reviewed:** 16 September 2026

**Purpose:** Instructions for configuring, deploying and maintaining the production VMS application and Outlook integration.

## Document contents

- Part I: Production configuration and prerequisites
- Part II: Outlook add-in creation, installation, manifest updates and troubleshooting
- Part III: IIS deployment, mobile release, calendar integration and operational handover

## Part I — Production configuration

## 1. Environment and build configuration

| Setting | Production |
|---|---|
| App domain | vms.dallah.com |
| API / Microsoft SSO origin | https://vms.dallah.com |
| Native build variant | APP_VARIANT=production |
| Outlook add-in name | VMS - Create Visit Request |
| Firebase | Currently uses dallah-albaraka-vms; configure the intended production registrations |

The environment map is in `config/app-environments.js`; `app.config.js` derives runtime URLs and native links. Production URL resolution ignores inherited process URL overrides and uses the production variant file, if provided, then committed defaults. Development workspace URLs are rejected/ignored as appropriate.

For variant-file overrides, use unprefixed `API_BASE_URL`, `MICROSOFT_AUTH_URL`, `APP_DOMAIN` and `LEGAL_PAGES_URL`. Although the resolver accepts prefixed aliases, avoid `EXPO_PUBLIC_*` in variant files because Expo can auto-load `.env.production` during exports for other environments. The production URL guard is **not** a blanket guarantee that all inherited Firebase or other public settings are ignored; verify those separately.

### Release commands

Run from the approved source revision after installing dependencies:

```bash
npm ci --include=dev
```

| Target | Command | Output / caveat |
|---|---|---|
| Production IIS web | `npm run build:web:production -- --backend-origin http://localhost:3000` | `dist/`, including generated `web.config`; replace the example origin with the actual internal backend |
| Replit publishing build | `bash scripts/build-and-verify.sh` | **Production**; no IIS `web.config`, precompressed assets for `server.js` |
| Production Android | `npm run build:android` | EAS production profile |
| Production iOS | `npm run build:ios` | EAS production profile through the Apple authentication helper |

The public hostname alone does not identify an export's backend: the current Replit publishing command also embeds production URLs. Confirm the intended environment before publishing.

The build verifies required assets, template substitution, the expected API origin and known non-production host leakage. It does not establish live API availability.

- [ ] Approved commit is merged and the lockfile matches the manifest; external build URLs contain no Replit-only package registry hosts.
- [ ] Build output resolves to the production API; archive the completed `dist/` and build logs.
- [ ] Correct production Android/iOS identifiers, signing profiles and store metadata confirmed.
- [ ] Previous working frontend and backend release retained; rollback owner and procedure agreed.

Detailed IIS deployment and mobile release procedures are included in Part III below.

## 2. Infrastructure and backend gates

- [ ] DNS and valid TLS certificate configured for `vms.dallah.com`; HTTP redirects to HTTPS.
- [ ] IIS URL Rewrite and ARR proxy configured; generated `dist/` deployed with `web.config` and all static subdirectories, including `.well-known` and `outlook-addin`.
- [ ] Internal backend origin is correct, running and reachable by IIS; `/api/*` and `/auth/microsoft/*` reach the backend instead of the SPA.
- [ ] Backend public origin and frontend redirect origin explicitly configured as `https://vms.dallah.com`; proxy headers and allowed origins reviewed.
- [ ] API schema matches the released frontend. Deploy the backend version supporting `GET /api/v1/dashboard/kpis` and the other API endpoints used by the released frontend.
- [ ] Verify the backend's documented health endpoint (for example `/api/health` if implemented). `/health` on `server.js` checks the static frontend, not backend functionality.
- [ ] Authentication, authorization, validation and role permissions enforced by the backend; no production mock data or test accounts exposed.
- [ ] Database migrations, backups, restore procedure, service credentials, monitoring and alert recipients approved by the backend/infrastructure owners.
- [ ] Invitation and notification payloads use production HTTPS links, including `/invite/<token>` and `/requests/<id>`.
- [ ] Static legal pages `/privacy-policy.html` and `/terms-conditions.html` contain client-approved content.

## 3. Microsoft sign-in

- [ ] Client Entra tenant and application registration confirmed; backend credentials valid and stored securely.
- [ ] Actual backend HTTPS callback registered, expected to be `https://vms.dallah.com/auth/microsoft/callback`; confirm against backend configuration.
- [ ] `/auth/microsoft/login?platform=web` redirects to Microsoft and the callback returns to the production frontend.
- [ ] Backend token handoff matches the frontend's URL-hash handling; no tokens in query strings or logs.
- [ ] Configure the mobile return to `dallahvms://auth/callback`. Confirm with the backend which redirects belong in Entra and which are post-login app handoffs; do not blindly register every URL as an Entra callback.

## 4. Push notifications and mobile links

- [ ] Client approves the currently shared Firebase project and verifies production web and native app registrations.
- [ ] Production web Firebase configuration and VAPID public configuration match the backend's intended FCM project; required authorized domains are checked where Firebase Authentication is used.
- [ ] HTTPS `/firebase-messaging-sw.js` loads as JavaScript with root scope, not an HTML fallback.
- [ ] Enable browser notification permission and device-token registration with the production backend.
- [ ] Android Firebase package registration and iOS bundle ID/APNs credentials match the signed production builds. Native Firebase files currently come from `config/qa/`; the folder name does not establish production correctness.
- [ ] `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` return JSON without login or SPA fallback.
- [ ] Apple team/bundle identifiers and Android signing fingerprints match the distributed builds, including Play App Signing where applicable.

## 5. Outlook: two separate capabilities

### A. Create a VMS visit from an email

The existing Outlook add-in reads the **sender name and email of an opened message**, then opens the VMS form in the browser at `/requests/new?name=...&email=...`. The user signs in if required, completes the form and submits it in VMS.

This is a message-read add-in with `ReadItem` permission. It does not submit visits inside Outlook, process compose-mode messages, or create calendar events. The current XML has no mobile command extension; Outlook mobile support is not included.

- [ ] Generated production manifest validated and hosted over HTTPS.
- [ ] Add-in deployed to a intended Microsoft 365 users/group.
- [ ] Task pane opens in each supported Outlook client without frame-policy errors.

Follow the complete Outlook add-in setup and manifest update instructions in Part II below.

### B. Outlook calendar synchronization

Installing the add-in **does not enable calendar synchronization**. This is a separate backend Microsoft Graph integration.

- [ ] Backend owner confirms calendar create/update/cancel behavior exists in the production backend.
- [ ] Client Entra administrator approves Microsoft Graph **Application** `Calendars.ReadWrite` permission and grants tenant admin consent.
- [ ] Restrict application access to intended mailboxes using the client's approved Exchange application-access controls; this permission must not be granted broadly without review.
- [ ] Backend tenant/client configuration and credential expiry checked securely; never add credentials to the manifest.
- [ ] Host accounts have suitable Exchange Online mailboxes; room resource addresses provided if room booking is required.

The calendar integration procedure is included in Part III below. It describes the required backend configuration and event operations.

---

# Part II — Outlook add-in setup and manifest updates

**Audience:** Client Microsoft 365 administrators and the VMS release team

**Production site:** https://vms.dallah.com

**Reviewed:** 16 September 2026

## 1. What is being installed?

The VMS Outlook add-in is already implemented in this repository. There is no need to generate another Outlook project or a new Entra registration just to install this message-read add-in.

Open an email → open **VMS - Create Visit Request** from Outlook's apps/add-ins menu → review the sender → choose the task-pane button → complete the prefilled VMS form in the browser.

The XML manifest tells Outlook where the hosted task pane is and what message access it requires. It contains no passwords, client secrets or backend credentials. Existing VMS sign-in remains separate. Calendar synchronization requires separate backend/Graph setup described in the readiness checklist in Part I, section 5.

## 2. Prerequisites

- A working production HTTPS site and backend, including VMS sign-in and request creation.
- Client-approved Microsoft 365 tenant with Exchange Online mailboxes and supported Outlook clients.
- Administrator permissions to centrally deploy Office add-ins and assign users/groups.
- Tenant policies permit the custom add-in; identify the users/groups who need access.
- Network policy permits the VMS task pane and Microsoft's Office.js CDN.
- Use supported Outlook desktop/web clients. The existing manifest does not declare Outlook mobile commands.

## 3. Create the production manifest

The release build generates it from committed sources:

| File | Purpose |
|---|---|
| `config/app-environments.js` | Environment domains, separate add-in IDs, names and versions |
| `public/outlook-addin/manifest.xml` | XML template; not suitable for uploading directly |
| `public/outlook-addin/taskpane.html` and `.js` | Hosted add-in interface and sender-prefill behavior |
| `scripts/lib/web-dist.js` | Replaces template placeholders during the build |
| `dist/outlook-addin/manifest.xml` | Finished XML to validate and upload |

From the approved release revision:

```bash
npm ci --include=dev
npm run build:web:production -- --backend-origin http://localhost:3000
```

Replace `http://localhost:3000` with the internal backend origin used by IIS. It is not the public task-pane URL. The existing Replit publishing build also renders production add-in assets, but deliberately omits IIS configuration.

Expected current production values:

| Field | Expected value |
|---|---|
| ID | `c98d21ef-3c3e-464d-8f7a-d69538b59b5b` |
| Version | `1.0.0` initially; increase when releasing manifest changes |
| Name | `VMS - Create Visit Request` |
| Permission | `ReadItem` |
| Task pane | `https://vms.dallah.com/outlook-addin/taskpane.html` |
| App domain | `https://vms.dallah.com` |

Do not upload `public/outlook-addin/manifest.xml`: its `%%...%%` values are placeholders. Do not hand-edit `dist/` as the source of truth; the next build overwrites it. Keep the non-production add-in identity separate.

Validate the generated file using Microsoft's validator (this command downloads/runs the validator if not already available):

```bash
npx office-addin-manifest validate dist/outlook-addin/manifest.xml
```

Save the validator output. Resolve any errors before deployment; repository template checks alone do not establish Microsoft manifest acceptance.

## 4. Host and check the add-in

Deploy the full `dist/` output to production. Confirm these URLs return HTTP 200 with their actual file contents, without authentication or redirects to a login/SPA page:

- `https://vms.dallah.com/outlook-addin/manifest.xml`
- `https://vms.dallah.com/outlook-addin/taskpane.html`
- `https://vms.dallah.com/outlook-addin/taskpane.js`
- `https://vms.dallah.com/outlook-addin/icon-16.png`
- `https://vms.dallah.com/outlook-addin/icon-32.png`
- `https://vms.dallah.com/outlook-addin/icon-80.png`

Check the deployed XML has production URLs and no placeholders. Check the task pane's injected app URL is production too.

The generated IIS configuration removes `X-Frame-Options` for `/outlook-addin/`; the static Node server does the equivalent. Verify effective headers at the public URL: a parent IIS site, CDN or security gateway can reintroduce restrictions. A restrictive CSP `frame-ancestors` policy can also block Outlook. Have the security owner allow the required Outlook embedding origins for the add-in path only; do not disable protection globally.

Opening the HTML directly in a browser is only a hosting check. Sender access requires running inside Outlook.

## 5. Install for users or groups

1. Sign in to the **Microsoft 365 admin center** with an authorized administrator.
2. Open **Settings → Integrated apps → Upload custom apps** (labels may vary by tenant).
3. Select the **Office add-in** / XML manifest option, not a Teams/unified-manifest package.
4. Upload the validated `dist/outlook-addin/manifest.xml`. If the portal offers a manifest URL, use:
   `https://vms.dallah.com/outlook-addin/manifest.xml`
5. Review the name, publisher, URLs and requested `ReadItem` permission.
6. Assign the intended users/group and complete deployment.
7. Allow deployment propagation, then restart or refresh Outlook. Microsoft notes that add-ins can take up to 72 hours to appear.
8. Open a received email and locate the add-in in the message's **Apps / Add-ins / More apps** menu. Exact placement varies; the current manifest does not define a custom ribbon command.

If Integrated apps is unavailable, follow Microsoft's documented centralized-deployment add-in portal alternative. Do not uninstall an existing production add-in merely to work around portal navigation.

## 6. Update an existing manifest

### Manifest change: version, domain, name, permissions or activation settings

1. Change the committed source, not the deployed XML alone.
2. **Keep the production `<Id>` unchanged** so this is an update rather than a second add-in.
3. Increase `production.outlookAddin.version` in `config/app-environments.js`, for example `1.0.0` → `1.0.1`. Change XML structure in the template if needed.
4. Rebuild production, validate the generated XML, and archive old/new manifests and matching web assets.
5. Deploy the matching hosted assets first. Confirm all new URLs are reachable.
6. In the admin center, select the **existing VMS add-in** and its update/upload-new-manifest action. Supply the new XML (or updated URL if supported) and review any new permission approvals.
7. Retain intended assignments. Do not create a new ID or install a duplicate production entry.
8. Verify the admin portal shows the new version; allow propagation, refresh Outlook and refresh the add-in.

Updating a file at the same URL is **not a substitute** for updating the centrally deployed manifest. Follow the tenant's update flow.

### Hosted HTML/JavaScript-only change

If the manifest's metadata, URLs, permissions and activation remain unchanged, redeploy the updated task-pane web assets at the same URLs. Microsoft distinguishes these web-app updates from manifest updates: they do not require a new manifest deployment. Ensure the updated assets are not retained in stale caches.

### Rollback

Retain a matching manifest/web-asset release pair. Restore known-working hosted assets if needed. If manifest rollback is required, coordinate with the tenant administrator: republish the previous settings under an appropriately increased version rather than assuming a version downgrade will be accepted. Validate the replacement manifest.

## 7. Troubleshooting

| Symptom | Check |
|---|---|
| Add-in absent | User/group assignment, tenant policy, mailbox/client eligibility, propagation and Outlook restart |
| Manifest rejected | Generated rather than template XML; validator result; schema, ID/version and public HTTPS resources |
| Blank/blocked pane | TLS, Office.js network access, JavaScript errors, effective `X-Frame-Options` and CSP |
| Sender unavailable | Open a received message; this implementation is read-mode, not compose-mode |
| Browser form does not open | Supported Outlook client/API, blocked navigation and task-pane error text |
| Wrong environment | Generated manifest and task-pane app URL, plus the deployed frontend build |
| Prefill lost after login | VMS redirect/context handling; capture non-sensitive reproduction steps for the application team |
| No calendar event | Separate backend Graph permissions, admin consent, credential validity and mailbox access; not the add-in manifest |

## Microsoft references

- [Deploy Office Add-ins in the Microsoft 365 admin center](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/manage-deployment-of-add-ins)
- [Validate an Office Add-in manifest](https://learn.microsoft.com/en-us/office/dev/add-ins/testing/troubleshoot-manifest)
- [Update and maintain an Office Add-in](https://learn.microsoft.com/en-us/office/dev/add-ins/publish/maintain-breaking-changes)
- [Manage add-ins in the admin center](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/manage-addins-in-the-admin-center)
---

# Part III — Deployment and operational procedures

## 1. IIS production deployment

### Server preparation

1. Confirm the approved release revision and back up the current site and backend deployment. Record any database migration dependencies before changing either release.
2. Install IIS Static Content, Default Document and HTTP Compression; install URL Rewrite 2.1 and Application Request Routing (ARR) 3.0.
3. In IIS Manager, select the server → Application Request Routing Cache → Server Proxy Settings → Enable proxy.
4. Configure the site binding for vms.dallah.com on HTTPS port 443 with a valid certificate, plus an HTTP-to-HTTPS redirect.
5. Confirm the backend is running as a managed service and is reachable from the IIS server. Restrict its internal port to the intended network access.

### Build and deploy

The following command works in Bash and PowerShell; replace the example backend origin with the actual internal address:

```bash
npm ci --include=dev
npm run build:web:production -- --backend-origin http://localhost:3000
```

Copy the complete contents of dist/ to the IIS site directory. Include index.html, web.config, assets/, _expo/, outlook-addin/, .well-known/, firebase-messaging-sw.js, privacy-policy.html and terms-conditions.html. Do not copy only the JavaScript bundle. Use the client's controlled deployment process to avoid mixing old HTML with new assets.

If IT owns web.config separately, use the following only after confirming its configuration supplies the same required behavior:

```bash
npm run build:web:production -- --no-web-config
```

### Required routing and response behavior

| Request | Required behavior |
|---|---|
| /api/* | Proxy to the internal backend, preserving the API path |
| /auth/microsoft/* | Proxy to the backend, including login and callback |
| Existing static files | Serve the actual file, not index.html |
| Other frontend routes | SPA fallback to index.html |
| /.well-known/* | Public JSON responses for native app association |
| /outlook-addin/* | Public add-in resources; permit required Outlook framing on this path |
| HTML / manifest / service worker | Avoid long-lived stale caching |
| Content-hashed assets | Long-lived immutable caching is appropriate |

Verify inherited headers at the public URL. Protect the main application against unwanted framing while allowing the Outlook task pane. Verify MIME types, especially JSON association files, XML manifest and JavaScript service worker.

### Infrastructure troubleshooting

| Failure | First checks |
|---|---|
| IIS 500.19 | Missing URL Rewrite module or invalid/locked configuration section |
| Proxy 502/504 | Backend process, address/port, network reachability and timeouts |
| API returns HTML | SPA fallback incorrectly intercepting API routes |
| Microsoft sign-in returns to a non-production site | Backend public/redirect URL and Entra callback configuration |
| Browser receives old app | HTML/service-worker caching and mixed release files |
| Outlook pane blocked | Effective frame headers, CSP and tenant network policy |

For Replit-hosted output, the existing publishing build produces production-targeted assets for server.js and omits IIS web.config. Its hostname does not change the production API target embedded in the build.

## 2. Mobile production build and store release

### Configuration and credentials

- Confirm approved source revision, application version and production identifiers in app.config.js and the signing/store records.
- The production EAS profile sets APP_VARIANT=production, uses store distribution, increments build numbers and builds an Android app bundle. The production-preview profile is for internal distribution; it is not the store release profile.
- Validate the Firebase files actually selected by app.config.js. The current native configuration uses files under config/qa/; the directory name alone is not a reason to substitute another file.
- Confirm Apple Developer and Google Play organization access, app records, signing ownership, APNs configuration, Android Firebase package registration and Play signing fingerprints.
- Store credentials and signing material belong in approved secure credential systems, never in this document or the Outlook manifest.

### Build commands

Authenticate with the authorized Expo account when required:

```bash
npx eas login
npx eas whoami
npm run build:android
npm run build:ios
```

Use the project iOS command because it runs the dedicated Apple authentication helper. Record each EAS build ID and the source revision. Retain the resulting signed build artifacts for store submission.

### Submit after approval

Submission requires correctly configured store access and app records. Explicitly select the intended production build rather than assuming the newest build is the correct release:

```bash
npx eas submit --platform android --profile production --id APPROVED_ANDROID_BUILD_ID
npx eas submit --platform ios --profile production --id APPROVED_IOS_BUILD_ID
```

Replace the uppercase placeholders with the actual approved EAS build IDs. Submission uploads the binary; it does not guarantee store approval or public release.

### Store readiness

- [ ] Client-approved name, description, screenshots, support contacts and legal URLs supplied.
- [ ] Privacy labels and Google Data Safety answers reflect actual production collection, SDK behavior, sharing, retention and deletion procedures. Do not copy generic privacy answers without legal/security review.
- [ ] Permission purpose text accurately explains camera/photo/notification access where used.
- [ ] Review access and clear login instructions provided through the stores' secure review fields; do not add fixed OTP bypasses or weaken production authentication.
- [ ] Content rating, audience, encryption/export declarations and branding rights reviewed by the client.
- [ ] App Store / Play review status monitored and client release approval obtained before rollout.
- [ ] Use controlled rollout where available and monitor crash/error rates after release.

## 3. Microsoft Graph calendar integration setup

This is independent of the email task-pane manifest. The backend owner must confirm which Entra application the production calendar integration uses; the existing integration specification expects the VMS application used by the backend. Confirm rather than creating a duplicate registration unnecessarily.

### Client administrator actions

1. In Microsoft Entra admin center / Azure App registrations, open the confirmed VMS application in the correct tenant.
2. Open API permissions → Add a permission → Microsoft Graph → Application permissions.
3. Add Calendars.ReadWrite. Delegated permission alone is not sufficient for the documented server-to-server client-credentials integration.
4. Have an appropriately privileged tenant administrator grant admin consent; verify the granted status.
5. Agree and apply Exchange mailbox access restrictions for the application's intended hosts. Coordinate Entra and Exchange permissions to avoid unintentionally retaining tenant-wide access.
6. Check the configured backend credential expiry and rotate it through the approved secure configuration process when necessary. The backend owner must update and verify the running service; do not assume rotation takes effect automatically.
7. Confirm host mailbox identifiers and Exchange Online availability. Shared/resource mailbox support must be verified for the chosen mailbox and access configuration, not inferred from a mailbox label alone.
8. For room booking, provide each intended Exchange room resource mailbox address and confirm room auto-processing/conflict policy.

### Backend verification contract

The documented integration uses Microsoft Graph client credentials and these event operations:

| Business action | Graph operation |
|---|---|
| Create calendar event at the approved workflow stage | POST /v1.0/users/{host-email}/calendar/events |
| Update/reschedule | PATCH /v1.0/users/{host-email}/calendar/events/{eventId} |
| Cancel/remove | DELETE /v1.0/users/{host-email}/calendar/events/{eventId} |

The backend team must confirm the precise creation trigger, retain the Graph event identifier, avoid duplicate events during retries, handle Riyadh timezone correctly and report synchronization failures appropriately. Confirm host identity mapping, attendee behavior, room processing, and whether cancellation notices are sent as the business expects.

Configure handling for permission denial, expired credentials, inaccessible mailboxes and Graph outages. Report synchronization failures separately from visit creation; a saved visit does not establish successful calendar delivery.

## 4. Deployment order and rollback

### Deployment order

1. Retain backups of the current frontend/backend releases and database before changing production.
2. Deploy the compatible backend and required database migrations using the approved deployment procedure.
3. Deploy the production web assets and configure SSO, API routing and public static resources.
4. Configure Firebase notifications and native app association files.
5. Deploy the Outlook manifest to the intended users/groups; configure Microsoft Graph calendar integration separately.
6. Submit the selected mobile builds to the stores and complete the store release process.
7. Enable operational monitoring for server errors, sign-in failures, notifications and calendar synchronization.

### Rollback rules

Restore a compatible known-working frontend/backend pair using the approved procedure. Database restoration or reversal requires backend/infrastructure approval and a plan for data created after release; never blindly restore a backup. Follow Part II for Outlook manifest versioning and rollback. Store releases may require a new corrective binary, so do not assume server rollback reverts installed mobile apps.
