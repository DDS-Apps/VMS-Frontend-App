---
name: Git provider authentication boundaries
description: Distinguish connected GitHub app/API access from authentication used by Git pushes.
---

GitHub App access, source-control authorization, API access, and Git HTTPS pushes are separate checks. Do not conclude that Git push authentication works because a connected integration or repository API reports write permission.

**Why:** In this workspace, authorizing source control restored API access with push permission, but Git HTTPS still rejected its supplied credentials. Using the authenticated provider CLI as a credential helper demonstrated that repository access itself was valid.

**How to apply:** Verify a non-mutating Git push dry-run after authentication changes. Scope any credential-helper repair to the intended provider and repository; keep credentials out of URLs and project files. Report shell authentication verification separately from the Git panel UI and server-side policies enforced only by real pushes.
