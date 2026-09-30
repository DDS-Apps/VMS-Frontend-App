---
name: Admin count request budget
description: User rejected status-probe fan-out and count-driven full pagination.
---

Do not restore per-status API probes or fetch every visit merely to fill Admin
count tiles. Missing aggregate data must remain explicitly unavailable.

**Why:** The user observed a large request burst from the previous workaround and
rejected it as bad design. Their latest approved direction was a status breakdown
in the paginated visits response, rather than guessing from analytics metrics.

**How to apply:** Treat backend aggregation as a real dependency. Frontend type
support and mocked tests do not establish that the remote API supplies it.