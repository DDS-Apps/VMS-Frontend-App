---
name: Deployment runtime assets
description: Keep the web export deployable without committing generated files.
---

Keep the web export out of Git, but do not exclude it from deployment packaging.
Only disposable reports and test outputs belong in both ignore files.

**Why:** Publishing built the web export successfully, but the runtime root
returned 503 after the export directory was added to the deployment ignore file.
The web server needs the generated HTML and assets at runtime; a passing export
does not establish that those files reach the published instance.

**How to apply:** For missing-export startup failures, inspect deployment
exclusions and compare them with the last successful publish. Preserve Git
exclusions for generated files without excluding files required by the runtime.
