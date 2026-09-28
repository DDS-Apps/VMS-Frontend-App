---
name: Issue verification cadence
description: User-requested verification scope while working through reported issues.
---

Do not take screenshots for each issue unless the user specifically asks. Do not run the entire unit-test suite for each issue; run the full suite after all reported issues are addressed. Focused checks such as typecheck remain appropriate during individual fixes.

**Why:** The user explicitly requested this cadence while reviewing multiple issues.

**How to apply:** For each individual fix, verify narrowly without creating snapshots; reserve the full regression run for the end of the issue list.