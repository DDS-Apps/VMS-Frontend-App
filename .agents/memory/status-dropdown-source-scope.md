---
name: Status dropdown source scope
description: Why status choices must be constrained by each request list's data source and verified mapping.
---

Offer only statuses a screen's data source can return and its filter can match. A full request history, a today-only visitor list, and a walk-in list do not share the same status vocabulary. Keep Cancelled and Auto-Cancelled distinct when both are supported.

**Why:** Reusing the global request lifecycle as the dropdown options on today-only screens produced choices that could only lead to empty results. The frontend response type alone cannot prove what a private backend endpoint accepts as a status query.

**How to apply:** Check the endpoint's query contract, the raw response mapping, and any local filtering before exposing a choice. If backend access or a schema is unavailable, say so; don't describe frontend-only evidence as live backend verification.