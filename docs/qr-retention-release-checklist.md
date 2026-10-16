# QR retention integration and release

## Contract confirmation still required

The supplied 2026-10-16 handoff names revocation pending but supplies no corresponding field/value or complete qrValidity example. Do not infer device cleanup state from lifecycle status, a checkout timestamp, or isExpired. The localized copy is prepared; **revocation-pending presentation is not connected yet**.

Obtain sanitized complete response bodies (including envelope) for:
- GET /api/v1/visits/:id and its movement-history endpoint while retained.
- The same endpoints while logically expired but device revocation remains pending.
- GET /api/v1/invites/:token while retained, including expiresAt and decision permissions.

The current history reader accepts an object containing requestId, timezone, data event array and optional qrValidity, either bare or inside the shared success/data envelope. Unsupported shapes fail explicitly. Confirm the deployed shape before release; metadata alongside an enveloped data array requires an envelope-specific adapter.

## Implemented behavior

- Backend isExpired drives expiry, independently of meeting end and completion status.
- The activation distinction is 60 minutes before the canonical start; date/time fallback uses the visit timezone (Asia/Riyadh default), never device-local time.
- retainedUntilCheckout plus passed meeting end selects “Valid until checkout or 9 PM.” The server cutoff is not a promise of uninterrupted validity.
- At a server-provided cutoff, the UI stops presenting valid access pending an authoritative read. It does not fabricate backend expiry.
- Missing validity/activation information and failed reads display unavailable rather than claiming valid access.
- Current invitation GET results and 410/403 failures override accepted snapshots; neither mutation responses nor cached QR values resurrect access.
- Display labels, QR effects and stable-ID corrections are supported. Actual IN/OUT mapping and gated summary activation are unchanged.
- Detail/history and public invite queries refresh on foreground/focus with 60-second polling while relevant; hidden/background views and failed/terminal states stop polling.

## Required release sequence

1. Backend team completes controlled QA and confirms the response contract, including device revocation.
2. Finish the unresolved frontend mapping and fixture coverage. Run TypeScript, focused rendered and query-lifecycle regressions, and the web export.
3. Verify authorized role views and the public invite flow in English/Arabic on browser and native devices. Confirm retained access never enables late acceptance and history 403 does not discard allowed detail content.
4. In an explicitly approved controlled setup, verify parking arrival, reception IN/OUT, checkout-before-end re-entry, after-end expiry, the server cutoff, delayed scan correction, and pending device cleanup against physical readers.
5. Publish/rebuild clients only after approval. No backend publication, native build, IIS configuration, physical-reader test, or production mutation is performed by the frontend implementation.

All current variants point to the production API. Local tests must mock APIs; do not reinterpret QA/staging build names as isolated backend environments.
