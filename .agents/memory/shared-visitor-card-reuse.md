---
name: Shared visitor card reuse
description: Reuse the existing visitor card for the Receptionist dashboard rather than building a matching duplicate.
---

Receptionist dashboard visitor cards must reuse the existing shared visitor card, not a separately maintained look-alike or dashboard-specific layout branch.

**Why:** The user explicitly corrected an implementation that recreated their reference even though that card already existed in the system. Their intent is consistent presentation through component reuse.

**How to apply:** Adapt the dashboard response into the existing shared card's data contract. Preserve role-specific navigation and backend movement semantics without inventing events or changing unrelated screens.
