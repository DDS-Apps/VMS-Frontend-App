---
name: Startup session restore
description: Different failure policies for cached startup restoration and runtime token refresh.
---

Rule: a returning user renders from the cached profile immediately; the profile refresh runs behind it, and only a definitive server rejection (UNAUTHORIZED) signs the user out. Network errors, timeouts, 5xx and 403 keep the cached session.

Startup restoration explicitly preserves the session after transient refresh failures; rejection is definitive only for refresh 4xx other than 408/429. Runtime protected requests follow the user's newer policy: any failed refresh ends that session and shows a session-expired login message. Never silently apply the startup exception to normal runtime calls, or the runtime sign-out rule to cached startup restoration. All refresh waiters must settle.

Session identity is epoch-guarded: logout or a new login invalidates any refresh still in flight, so a late refresh result is discarded rather than applied or persisted, and a late refresh rejection never signs out the newer session.

**Why:** Waiting on the network before first paint bounced returning users with flaky connections to Login. The later API-failure requirements explicitly requested sign-out after failed runtime refresh, while preserving the separate startup contract. Without the epoch guard a refresh finishing after logout re-armed the ended session on the next launch.

**How to apply:** Any new startup or background auth refresh must classify errors with this rule and check the session generation/epoch before writing tokens or state. Test interceptor behaviour through a scripted axios adapter rather than a mocked auth service, otherwise these races are invisible.
