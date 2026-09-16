---
name: Startup session restore
description: Session-restore and sign-out policy for cold start and background token refresh.
---

Rule: a returning user renders from the cached profile immediately; the profile refresh runs behind it, and only a definitive server rejection (UNAUTHORIZED) signs the user out. Network errors, timeouts, 5xx and 403 keep the cached session.

Token refresh follows the same policy: a refresh failure is definitive only when the refresh endpoint answered 4xx (except 408/429). Anything else keeps the stored tokens and surfaces the transient cause, never UNAUTHORIZED. Requests queued behind an in-flight refresh must always be settled.

Session identity is epoch-guarded: logout or a new login invalidates any refresh still in flight, so a late refresh result is discarded rather than applied or persisted, and a late refresh rejection never signs out the newer session.

**Why:** Waiting on the network before first paint, and treating any refresh failure as a dead session, bounced users with flaky connections to Login. Without the epoch guard a refresh finishing after logout re-armed the ended session on the next launch.

**How to apply:** Any new startup or background auth refresh must classify errors with this rule and check the session generation/epoch before writing tokens or state. Test interceptor behaviour through a scripted axios adapter rather than a mocked auth service, otherwise these races are invisible.
