---
name: Test variant isolation
description: Production Babel console stripping can invalidate transport logging assertions in Jest.
---

Run transport log/privacy assertions with a command-scoped non-production app variant, not the workspace's production variant. Do not disable production console stripping to make the tests pass.

**Why:** Babel removes console calls for the production app variant even when Jest is running. Log spies then capture nothing, so assertions that require sanitized logs fail before they can establish privacy behavior. This is test/build isolation, not a transport regression.

**How to apply:** Use an explicit non-production variant for the isolated test command and keep production export checks separate. A command-scoped variant is not a request to change stored project configuration or the app's production backend policy.
