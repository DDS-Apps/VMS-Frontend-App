---
name: Push session ownership
description: Session isolation must cover async SDK work and cleanup, not just dispatched HTTP requests.
---

Capture push-operation session ownership before asynchronous SDK initialization
or token acquisition. An HTTP request's session epoch cannot protect SDK work
that started under one identity but dispatches its request after another login.
Old-session cleanup must not clear listeners or initialized/token state belonging
to a newer session.

**Why:** Controlled shared-browser tests demonstrated late initialization running
after a new login, and a new login skipping registration while an older unregister
was pending. These are ownership boundaries, not simply transport-refresh races.

**How to apply:** Check an immutable session generation throughout initialization,
registration, and cleanup. Explicit logout removal needs the ended session's
authorization snapshot and matching device token, not whatever credentials happen
to exist when the HTTP interceptor runs. Preserve immediate local sign-out after
runtime refresh failure; cleanup failure during runtime expiry must never retain
a usable local session.
Treat removal failure explicitly rather than equating swallowed errors with
server-side detachment.

Manual web logout is ordered and fail-closed: detach this browser using captured
authorization, revoke only its refresh session, then clear local authentication.
A failed manual logout must retain the session for retry and show an explicit
failure, not pretend the browser was detached. This differs from forced runtime
expiry, which still clears local authentication immediately.

**Why:** The supplied backend contract says omitting the web refresh token revokes
other devices' sessions. It requires the authenticated singular device DELETE
before logout, not a public endpoint or a plural all-devices deletion.

**How to apply:** Never remove the refresh-token body or couple mobile logout to
web logout. Pending old SDK/queued work is invalidated; already-dispatched writes
are allowed to settle before DELETE and the next registration, because aborting
HTTP locally does not prove a server-side write was cancelled. Keep newer
initialization behind this cleanup boundary. Web Firebase has no token-refresh
callback: check on focus/online and periodically while the session is current.
Token rotation must register under that same session only.
