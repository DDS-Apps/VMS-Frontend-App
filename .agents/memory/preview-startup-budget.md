---
name: Preview startup and production exports
description: Keep slow cold exports outside the preview workflow's port-opening deadline.
---
Do not require a clean production export before the workspace preview opens its port.

**Why:** Cold Expo exports exceeded the managed workflow's five-minute startup limit, so repeated restarts killed a still-progressing build. A responding HTML shell also did not prove the initial JavaScript bundle was ready.

**How to apply:** Keep workspace preview startup separate from production publishing. Let the preview server open its port before bundling, retain the production export/verification process for publishing, and verify the JavaScript bundle plus rendered page before declaring the preview healthy. Do not change backend or Firebase selection to address a startup timeout.
