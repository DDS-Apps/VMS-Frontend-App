# Outlook add-in: production setup and manifest updates

**Audience:** Client Microsoft 365 administrators and the VMS release team

**Production site:** https://vms.dallah.com

**Reviewed:** 16 September 2026

## 1. What is being installed?

The VMS Outlook add-in is already implemented in this repository. There is no need to generate another Outlook project or a new Entra registration just to install this message-read add-in.

Open an email → open **VMS - Create Visit Request** from Outlook's apps/add-ins menu → review the sender → choose the task-pane button → complete the prefilled VMS form in the browser.

The XML manifest tells Outlook where the hosted task pane is and what message access it requires. It contains no passwords, client secrets or backend credentials. Existing VMS sign-in remains separate. Calendar synchronization requires separate backend/Graph setup described in the [readiness checklist](production-readiness-checklist.md#6-outlook-two-separate-capabilities).

## 2. Prerequisites

- A working production HTTPS site and backend, including VMS sign-in and request creation.
- Client-approved Microsoft 365 tenant with Exchange Online mailboxes and supported Outlook clients.
- Administrator permissions to centrally deploy Office add-ins and assign users/groups.
- Tenant policies permit the custom add-in; a small pilot group is identified.
- Network policy permits the VMS task pane and Microsoft's Office.js CDN.
- Confirm intended desktop/web clients in the pilot. The existing manifest does not declare Outlook mobile commands.

## 3. Create the production manifest

The release build generates it from committed sources:

| File | Purpose |
|---|---|
| `config/app-environments.js` | Production/QA domains, separate add-in IDs, names and versions |
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

Do not upload `public/outlook-addin/manifest.xml`: its `%%...%%` values are placeholders. Do not hand-edit `dist/` as the source of truth; the next build overwrites it. Keep the QA identity separate.

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

## 5. Install for a pilot group

1. Sign in to the **Microsoft 365 admin center** with an authorized administrator.
2. Open **Settings → Integrated apps → Upload custom apps** (labels may vary by tenant).
3. Select the **Office add-in** / XML manifest option, not a Teams/unified-manifest package.
4. Upload the validated `dist/outlook-addin/manifest.xml`. If the portal offers a manifest URL, use:
   `https://vms.dallah.com/outlook-addin/manifest.xml`
5. Review the name, publisher, URLs and requested `ReadItem` permission.
6. Assign only the approved pilot users/group and complete deployment.
7. Allow deployment propagation, then restart or refresh Outlook. Microsoft notes that add-ins can take up to 72 hours to appear.
8. Open a received email and locate the add-in in the message's **Apps / Add-ins / More apps** menu. Exact placement varies; the current manifest does not define a custom ribbon command.

If Integrated apps is unavailable, follow Microsoft's documented centralized-deployment add-in portal alternative. Do not uninstall an existing production add-in merely to work around portal navigation.

## 6. Pilot acceptance

- [ ] Assigned user sees the expected production add-in, not the QA one.
- [ ] Task pane loads without Office.js, framing or certificate errors.
- [ ] Email sender name/email appear correctly.
- [ ] Button opens the production `/requests/new` form; sender values are prefilled and editable.
- [ ] Repeat while signed out; confirm sign-in preserves the request destination and sender prefill. Record any loss of context as a release defect.
- [ ] Request submits successfully and enters the correct approval workflow.
- [ ] Test names containing spaces, apostrophes and Arabic characters, and messages with incomplete sender details.
- [ ] Repeat in each approved Outlook web/desktop client. Do not infer mobile support from desktop success.
- [ ] Confirm calendar create/update/cancel separately if calendar synchronization is in scope.

Only expand assignment after the client accepts the pilot.

## 7. Update an existing manifest

### Manifest change: version, domain, name, permissions or activation settings

1. Change the committed source, not the deployed XML alone.
2. **Keep the production `<Id>` unchanged** so this is an update rather than a second add-in.
3. Increase `production.outlookAddin.version` in `config/app-environments.js`, for example `1.0.0` → `1.0.1`. Change XML structure in the template if needed.
4. Rebuild production, validate the generated XML, and archive old/new manifests and matching web assets.
5. Deploy the matching hosted assets first. Confirm all new URLs are reachable.
6. In the admin center, select the **existing VMS add-in** and its update/upload-new-manifest action. Supply the new XML (or updated URL if supported) and review any new permission approvals.
7. Retain intended assignments. Do not create a new ID or install a duplicate production entry.
8. Verify the admin portal shows the new version; allow propagation, refresh Outlook and repeat the pilot tests.

Updating a file at the same URL is **not a substitute** for updating the centrally deployed manifest. Follow the tenant's update flow.

### Hosted HTML/JavaScript-only change

If the manifest's metadata, URLs, permissions and activation remain unchanged, redeploy the updated task-pane web assets at the same URLs. Microsoft distinguishes these web-app updates from manifest updates: they do not require a new manifest deployment. Check caching and repeat the pilot tests.

### Rollback

Retain a matching manifest/web-asset release pair. Restore known-working hosted assets if needed. If manifest rollback is required, coordinate with the tenant administrator: republish the previous settings under an appropriately increased version rather than assuming a version downgrade will be accepted. Revalidate and retest.

## 8. Troubleshooting

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