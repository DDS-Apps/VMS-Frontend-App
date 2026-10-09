# VMS password recovery — backend implementation prompt

## Delivery boundary

Copy the prompt below to the team maintaining the **existing external VMS authentication API**. The frontend now calls these contracts, but configuration alone does not establish that these endpoints exist. This repository has not implemented a second authentication server, email delivery, token storage, account eligibility checks or session revocation.

Do not release this as working recovery until the authorized QA acceptance checklist below passes. Existing Microsoft SSO, invitation links, account roles and signed-in Change Password must remain unchanged.

---

## Copy-ready implementation prompt

Implement secure forgotten-password recovery for **active existing users with local email/password credentials** in the existing VMS backend, using its current user store, password hasher, mail service and session architecture. Inspect any existing forgot/reset endpoints first; coordinate deviations from the contracts below with the frontend rather than silently changing them.

Never create an account, attach local credentials to a Microsoft/AD/SSO account, change a role or generate a password for an administrator. Do not add a new identity provider.

### 1. Public API contracts

All three endpoints accept JSON over HTTPS without bearer authentication or existing session cookies. Do not redirect to login, return an HTML SPA fallback or require refresh-token rotation. Apply request size limits and server-side validation. Set `Cache-Control: no-store` on responses.

Use the existing `{success, message?, data}` envelope. The frontend also accepts the unwrapped data object, but the examples below are the preferred agreed contract.

#### Request a link

`POST /api/v1/auth/forgot-password`

Request:

```json
{"email":"person@example.com","locale":"en"}
```

`locale` is `en` or `ar`. Validate syntax and normalize the email according to the **existing account lookup rules**, not new case rules.

Successful acceptance: **HTTP 202**

```json
{
  "success": true,
  "message": "If an eligible account exists, password reset instructions will be sent.",
  "data": {"accepted": true}
}
```

Return exactly the same status and public body for active local users, unknown emails, inactive accounts and Microsoft/AD/SSO users. Do not expose account ID, source, status, name or eligibility. Do not create materially distinguishable timing behavior. Send mail only for eligible active accounts with local credentials.

`accepted:true` means the recovery request was safely accepted, **not proof of delivery**. Queue mail with durable bounded retries and operational failure monitoring. When the recovery service or queue is globally unavailable, return the same generic 503 behavior independent of whether the address exists. Do not report per-account SMTP or eligibility failures publicly.

The frontend shows general Microsoft recovery guidance to everyone. No account-source lookup endpoint is needed.

#### Check a link without consuming it

`POST /api/v1/auth/reset-password/validate`

This is a **proposed additional endpoint**, not confirmed existing functionality.

Request:

```json
{"token":"<opaque-reset-token>"}
```

Valid: **HTTP 200**

```json
{"success":true,"data":{"valid":true,"expiresAt":"2026-10-09T12:15:00.000Z"}}
```

The timestamp is an example; return the actual UTC expiry with an explicit timezone. Return validity/expiry only, never a profile or email.

Invalid, expired, consumed, superseded or ineligible account: **HTTP 400**

```json
{"success":false,"error":{"code":"RESET_LINK_INVALID","message":"This reset link is invalid or has expired."}}
```

The frontend also understands HTTP 200 `{success:true,data:{valid:false}}`, but prefer the uniform safe error above. Do not distinguish reasons publicly.

Validation must **not** consume, extend or replace a token. Mail scanners, preview fetchers, GET requests and repeated validation cannot alter credentials.

#### Redeem a link

`POST /api/v1/auth/reset-password`

Request:

```json
{"token":"<opaque-reset-token>","newPassword":"<user-entered-password>","confirmPassword":"<same-password>"}
```

Success: **HTTP 200**

```json
{"success":true,"message":"Password updated. Sign in with your new password.","data":{"reset":true}}
```

Do not return access/refresh tokens, a session cookie or a user profile. **Do not auto-login.**

Invalid, expired, already used, superseded or account no longer eligible: HTTP 400 with the same `RESET_LINK_INVALID` error above.

Password mismatch or policy failure: **HTTP 422**

```json
{
  "success": false,
  "error": {"code":"PASSWORD_POLICY_FAILED","message":"The password does not meet the password policy."},
  "details": {"fields":{"newPassword":["PASSWORD_POLICY_FAILED"]}}
}
```

Do not echo submitted passwords. The frontend uses a safe translated policy message rather than displaying raw server errors. Enforce the same policy as authenticated Change Password. The current frontend minimum is **six characters**, rejects whitespace-only passwords and requires an exact confirmation match. Passwords are sent without trimming. If the backend policy is stricter, explicitly coordinate the policy guidance and frontend validation before rollout; do not weaken the server policy to match a UI assumption.

#### Rate limiting and failure responses

All three endpoints: **HTTP 429**, `Retry-After: 120` (actual duration) and:

```json
{"success":false,"error":{"code":"RATE_LIMITED","message":"Please wait before trying again."}}
```

Support `Retry-After` seconds or an HTTP-date. Expose this header through CORS (`Access-Control-Expose-Headers: Retry-After`), or cross-origin web clients cannot read it. Allow the configured frontend origins, POST and Content-Type. No credentialed CORS is required for these public endpoints.

Service unavailable: **HTTP 503** with a safe code such as `RECOVERY_UNAVAILABLE`, no account-dependent details. Invalid email syntax can return 422 `INVALID_INPUT` without lookup. Unexpected statuses, missing endpoints, HTML bodies and malformed success envelopes fail explicitly in the frontend; they never simulate successful delivery or reset.

### 2. Ownership verification and token lifecycle

- Generate cryptographically secure random tokens with **at least 256 bits of entropy**; base64url encoding is suitable. Reset tokens are not access tokens.
- Store only token hashes with the user binding, creation time, expiry and consumed state. Never store plaintext tokens in the authentication database.
- Proposed validity: **15 minutes**, enforced using server time.
- Issuing a replacement invalidates older outstanding tokens for that account.
- At validation and redemption, check expiry, revocation and eligibility using the current account record.
- On redemption, atomically check and consume the token, update the password using the existing strong password hasher, and invalidate outstanding reset tokens. Concurrent submissions and replays must not both succeed.
- If password validation fails, do not consume the valid token. Never consume it on GET or validation.
- Apply per-IP and per-account request/redemption/validation limits with bounded resend behavior and abuse monitoring. Unknown-address limits must not enumerate accounts. Do not let unauthenticated recovery attempts lock an account out of ordinary login.

### 3. Email, destinations and privacy

Configure a separate, explicitly allowlisted **HTTPS frontend origin for each environment**. QA must link to QA; production must link to production. Resolve deployed origins from the environment's deployment configuration, not from a dev-preview URL. Do not trust arbitrary client return URLs or an inbound Host header.

Preferred browser link:

```text
https://<environment-frontend-origin>/reset-password?lang=en#token=<URL-encoded-token>
```

Use `lang=ar` for Arabic. `/forgot-password` is the public request page. Neither page requires an installed app. The frontend captures a reset token in memory, removes it from the address bar/history entry and suppresses referrers. It accepts query tokens for compatibility, but **do not generate query-token links**: proxies and access logs can record them before JavaScript runs.

Preserve fragments through email-link tooling; disable link tracking/rewriting for reset URLs when it cannot guarantee privacy. Do not add third-party analytics, tracking pixels or scripts to recovery flows. Sanitize application/proxy/APM/crash/email-provider logs: never capture tokens, passwords, Authorization headers, full reset URLs or raw reset request/response bodies. Infrastructure operators must enforce equivalent log suppression.

The frontend stores no reset token or password in AsyncStorage, localStorage, sessionStorage, a URL history state or navigation persistence. A full refresh **after URL scrubbing** intentionally loses the token and displays the invalid-link state; the recipient can reopen the original email link until expiry or request another. Do not restore secrets from durable browser storage.

Existing native link handlers preserve `/reset-password` intent when the OS delivers such a URL. New Universal Link/App Link provisioning and signing changes are not required for browser completion and are out of scope.

English email copy:

> Subject: Reset your VMS password  
> We received a request to reset your VMS password.  
> Use the secure link below to choose a new password. This link expires in 15 minutes and can be used once.  
> Reset password: [secure link]  
> If you did not request this, ignore this email. Your password has not changed. Contact your usual support team if you need help.

Arabic email copy (RTL layout):

> الموضوع: إعادة تعيين كلمة مرور VMS  
> تلقينا طلبًا لإعادة تعيين كلمة مرورك في VMS.  
> استخدم الرابط الآمن أدناه لاختيار كلمة مرور جديدة. تنتهي صلاحية الرابط خلال 15 دقيقة ويمكن استخدامه مرة واحدة فقط.  
> إعادة تعيين كلمة المرور: [الرابط الآمن]  
> إذا لم تطلب ذلك، فتجاهل هذه الرسالة. لم تتغير كلمة مرورك. تواصل مع فريق الدعم المعتاد إذا كنت بحاجة إلى المساعدة.

Use configured support details, not invented contacts. Never email an actual password. Escape template values and use the real configured expiry if it differs from 15 minutes.

### 4. Sessions and audit

After successful reset, revoke the affected account's refresh sessions and other password-derived credentials. Define how existing access tokens and biometric credentials are revoked in the current architecture; provide an explicit implementation and test, not a statement that refresh-token revocation instantly revokes all access tokens.

Send a password-changed notification without credentials or a reset token. Record safe audit events (request accepted, reset completed, rate limited, delivery failure) with appropriate internal identifiers and retention controls, but no reset secrets or public account disclosure.

Do not sign out unrelated users merely because a reset URL opened in their browser. The public recovery screen takes precedence over a restored dashboard and its completion button returns to login; security revocation belongs to the backend and affects the reset account.

### 5. QA acceptance checklist

Use authorized QA test accounts/mailboxes and test credentials only. Confirm:

- [ ] Active local, unknown, inactive and SSO request fixtures produce indistinguishable public 202 responses; only eligible local mail is sent.
- [ ] No local credential can be created for a Microsoft/AD/SSO user, including if account source or activation changes between issuance and redemption.
- [ ] A real email reaches the authorized QA mailbox, opens in desktop/mobile browsers, preserves its fragment and uses the correct environment and language.
- [ ] Valid token validation does not consume it, expose a profile or extend expiry; missing, malformed, expired, superseded and used tokens are handled safely.
- [ ] Repeat/concurrent redemption allows one password update only. Queue retries, resends and email-scanner visits do not break single-use semantics.
- [ ] Password policy/mismatch failures are safe; successful reset rejects the old password and permits ordinary login using the new password.
- [ ] Refresh, access and biometric credential revocation behave as documented; no automatic sign-in occurs.
- [ ] Rate limits/Retry-After work across all endpoints, including browser CORS header visibility. Failed requests and global queue outages do not reveal account existence.
- [ ] Offline/timeouts, 5xx, 404 and malformed responses show real errors in the frontend, with retry rather than fabricated success.
- [ ] English/Arabic/RTL, narrow-phone forms, password visibility, keyboard submission, cooldowns, expiry while backgrounded and accessibility are verified.
- [ ] Native iOS/Android cold and warm links preserve reset intent, including with an existing session; desktop/mobile browsers work without an installed app.
- [ ] Existing local login, Microsoft callback, invitation, signed-in Change Password and role routing still work.
- [ ] Inspect logs/APM/email-link tracking/referrers/history for secret leakage using synthetic tokens only.

Return the implemented endpoint contracts, mail/environment configuration requirements, session-revocation behavior and QA results to the frontend team. Do not return secrets or test passwords.

---

## Frontend verification scope

Automated fixtures cover request/validate/reset contracts, neutral responses, strict success-envelope handling, isolated unauthenticated transport, safe errors, expiry, invalid/replayed link responses, password matching, concurrent-submit guards, cooldown/retry, stale validation, English/Arabic labels and static recovery-route headers. These are frontend checks, **not proof that the backend enforces SSO exclusion, sends real mail or changes/revokes credentials**.

Real email delivery, backend single-use/race enforcement, old/new-password login and session revocation remain unverified until the external backend team runs the authorized QA checklist.
