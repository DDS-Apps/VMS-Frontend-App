---
name: Native touch verification
description: Evidence standard for iPhone RTL touch regressions and modal fixes.
---

Do not claim an iPhone touch regression is fixed from tests that invoke press handlers directly or mock native primitives. Distinguish press delivery, gesture cancellation, and modal presentation with native evidence before choosing a repair.

**Why:** The user reported an Arabic iPhone regression after a previous Status popup fix: other chips had worked before, then none responded. The user explicitly requested architect evidence instead of guesses. Static review and handler tests did not establish the native cause.

**How to apply:** Preserve the full list/header/filter-row hierarchy in reproduction. Compare a controlled modal-isolation case and record actual app/native RTL state. When native execution is unavailable, state that limitation and leave restoration unverified rather than describing a speculative patch as a confirmed fix.
