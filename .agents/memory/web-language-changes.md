---
name: Web language changes
description: Why web locale switching should not reload into a cached profile.
---

Web language and direction changes should update the active locale in React and the web document without a page reload. Keep the cached authenticated profile's language aligned with a successful server preference change; on web, show the chosen language while the server saves and restore the previous choice if saving fails. Native direction changes still require a restart, so finish persistence before restarting there.

**Why:** Reloading immediately after a web direction switch can remount startup synchronization while the cached user still reports the previous language. The first selection then appears to have no effect; a second selection works after the server profile catches up.

**How to apply:** When changing language selection or startup synchronization, avoid restoring stale profile language over a locally selected web locale and test both directions from the first selection.