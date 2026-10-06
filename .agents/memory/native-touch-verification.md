---
name: Native touch verification
description: Evidence standard for iPhone RTL touch regressions and modal fixes.
---

Do not claim an iPhone touch regression is fixed from tests that invoke press handlers directly or mock native primitives. Distinguish press delivery, gesture cancellation, and modal presentation with native evidence before choosing a repair.

**Why:** The user reported an Arabic iPhone regression after a previous Status popup fix: other chips had worked before, then none responded. The user explicitly requested architect evidence instead of guesses. Static review and handler tests did not establish the native cause.

**How to apply:** Preserve the full list/header/filter-row hierarchy in reproduction. Compare a controlled modal-isolation case and record actual app/native RTL state. When native execution is unavailable, state that limitation and leave restoration unverified rather than describing a speculative patch as a confirmed fix.

For the affected non-dashboard iOS filter controls, prefer an explicitly directed, wrapping layout over restoring nested horizontal scrolling. Keep other platforms out of that change. Do not assume dashboards are a working control: on 2026-10-06 the user reported that some chips respond and others do not across all dashboards, superseding the earlier report that dashboards worked.

**Why:** This removes horizontal gesture competition and transformed touch ancestry rather than swapping touch components or undoing independent popup lifecycle corrections. It is an interaction-design mitigation, not evidence of the original runtime cause.

**How to apply:** Preserve all filters and clear actions; disclose that rows may become taller. Require native verification before claiming the reported iPhone failure is resolved, including both languages and short-width layouts.

**Dashboard scope:** Investigate interactive filter rows across the actual role-specific dashboard routes, separately from card carousels and informational badges. Do not preserve old dashboard behavior solely because earlier checks called it working.

**Why:** The newer user report invalidates that comparison; partial unresponsiveness needs differentiation between missing touch delivery and a successful state update with unchanged results.
