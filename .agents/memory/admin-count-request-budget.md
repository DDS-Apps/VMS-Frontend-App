---
name: Admin count request budget
description: User rejected status-probe fan-out and count-driven full pagination.
---

Do not restore per-status API probes or fetch every visit merely to fill Admin
count tiles. Missing aggregate data must not be presented as exact full totals.

**Why:** The user observed a large request burst from the previous workaround and
rejected it as bad design. On 2026-09-30 they subsequently requested numeric tiles
calculated from the returned rows, even without backend aggregates. Show these as
loaded-visit counts, with All retaining the server total, rather than withholding
numbers until all pages arrive.

**How to apply:** Prefer a validated backend breakdown if present; otherwise
calculate from loaded rows without more calls and disclose partial scope.
Frontend type support does not establish that the remote API supplies aggregates.