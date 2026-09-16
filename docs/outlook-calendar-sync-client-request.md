# Outlook Calendar Sync — Information Required from Client

**Feature:** Automatic Outlook calendar events for visitor requests  
**Prepared for:** Client IT Admin / Azure AD Administrator  
**Status:** Backend and mobile app are fully implemented and waiting on this Azure AD configuration before the feature can be switched on.

---

## What the Feature Does

When an employee creates a visitor request in the VMS app, the system will automatically:

1. **Create** a calendar event in the host employee's Outlook calendar with the visitor's name, visit time, duration, meeting room, and purpose.
2. **Update** that event if the request is rescheduled or edited.
3. **Delete** the event if the request is cancelled.

The mobile app already shows a **"Synced to Outlook"** badge on the request detail screen once an event is created, and **"Calendar event cancelled"** when the visit is cancelled. All of this code is complete — it is simply waiting for the permission below to be granted.

---

## What We Need (Action Required)

The backend connects to Microsoft Graph API using the existing Azure AD App Registration (the same one already used for Microsoft SSO login). The three credentials for that app are already stored securely in our system:

| Secret | Where it lives | Status |
|--------|---------------|--------|
| `AZURE_AD_TENANT_ID` | Replit Secrets vault | ✅ Already present |
| `AZURE_AD_CLIENT_ID` | Replit Secrets vault | ✅ Already present |
| `AZURE_AD_CLIENT_SECRET` | Replit Secrets vault | ⚠️ Needs expiry check (see item 3 below) |

Only **three actions** are needed in Azure Portal:

---

### Action 1 — Add `Calendars.ReadWrite` Application Permission

**Where:** Azure Portal → App Registrations → VMS app → API Permissions → Add a permission → Microsoft Graph → **Application permissions** → `Calendars.ReadWrite`

**Why this permission specifically:**  
The backend creates/updates/deletes calendar events on behalf of host employees without those employees being logged in at the time. This requires an **Application** permission, not a Delegated one. Delegated permissions only work when the user is actively signed in — they cannot be used for background server-to-server calls.

**Why `Calendars.ReadWrite` and not something narrower:**  
Microsoft Graph does not offer a write-only calendar scope. `Calendars.ReadWrite` is the minimum permission that allows creating, updating, and deleting events. The backend only writes events it owns (events created by the VMS system for visitor bookings) and does not read or expose any other calendar data.

---

### Action 2 — Grant Admin Consent for the Permission

**Where:** Same API Permissions page → click **"Grant admin consent for [tenant name]"**

**Why this is a separate step:**  
Application permissions (as opposed to Delegated permissions) are blocked by Microsoft until a Global Administrator or Privileged Role Administrator explicitly approves them for the entire tenant. Adding the permission alone is not enough — without admin consent, every API call the backend makes will be rejected with a `403 Forbidden` error. The consent button must be clicked by someone with admin rights after the permission is added.

**How to confirm it worked:**  
After clicking Grant, the Status column next to `Calendars.ReadWrite` should show a green tick labelled **"Granted for [tenant name]"**.

---

### Action 3 — Confirm the Client Secret Has Not Expired

**Where:** Azure Portal → App Registrations → VMS app → Certificates & secrets → Client secrets

**Why this matters:**  
Azure AD client secrets have an expiry date (typically 1 or 2 years from creation). If the secret stored in our system has expired, all Microsoft Graph API calls — including both the existing SSO login flow and the new calendar sync — will fail silently. 

**What to check:**  
Find the secret whose Value was shared with us and check its **Expires** column. If it shows a past date, a new secret must be generated and the new value must be shared with us to update the Replit Secrets vault.

> **Security note:** Please share the new secret value via a secure channel (e.g. a password manager share link or an encrypted message) — not over email or chat in plain text.

---

## How the Backend Uses These Credentials

Once admin consent is granted, the backend will authenticate to Microsoft Graph using the **client credentials flow** (tenant ID + client ID + client secret) and make the following calls:

| Action | Graph API call |
|--------|---------------|
| Visit created / approved | `POST /v1.0/users/{host-email}/calendar/events` |
| Visit rescheduled or edited | `PATCH /v1.0/users/{host-email}/calendar/events/{eventId}` |
| Visit cancelled | `DELETE /v1.0/users/{host-email}/calendar/events/{eventId}` |

The `{host-email}` is the UPN (email address) of the employee who owns the visit request. The backend reads this from the employee's profile that is already stored in the VMS database.

If the host's mailbox is not hosted on Exchange Online (e.g. a shared mailbox or a user without an Exchange licence), the event creation call will return an error. The backend handles this gracefully — the visit is still created in VMS, only the calendar sync badge will not appear.

---

## Meeting Room Calendars (Optional, If Applicable)

Each meeting room in the VMS system has an optional `outlookRoomEmail` field. If this is filled in for a room, the backend will also add the room's Exchange resource mailbox as an attendee on the calendar event — this causes the room to appear as booked in Outlook's room calendar.

If the client wants this, they will need to provide the Exchange resource mailbox address for each room (e.g. `conf-room-101@dallah.com`). This can be done incrementally — rooms without an `outlookRoomEmail` simply will not be added as attendees; the rest of the sync still works.

---

## Summary Checklist for IT Admin

- [ ] In Azure Portal → App Registrations → VMS app → API Permissions:
  - [ ] Add **Application** permission: `Calendars.ReadWrite` (Microsoft Graph)
  - [ ] Click **"Grant admin consent for [tenant]"**
  - [ ] Confirm the status shows green ✓ for `Calendars.ReadWrite`
- [ ] In Certificates & secrets:
  - [ ] Confirm the client secret has **not expired**
  - [ ] If expired: generate a new one and share the value securely
- [ ] (Optional) Provide the Exchange resource mailbox address for each meeting room that should be bookable via Outlook

Once these steps are complete, please notify us and we will enable the feature on the backend. No app update or redeployment is required on the mobile side — the sync badge is already in the app waiting for the first synced event.
