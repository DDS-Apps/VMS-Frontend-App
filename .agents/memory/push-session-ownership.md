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
runtime refresh failure; failed cleanup must not retain a usable local session.
Treat removal failure explicitly rather than equating swallowed errors with
server-side detachment. This records required isolation, not a claim that the
current implementation already provides it.
