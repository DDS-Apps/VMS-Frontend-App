---
name: Vehicle and parking display privacy
description: Durable product rule for vehicle data and parking state shown anywhere in the application.
---

Do not expose license plates, vehicle numbers, make/model/color, parking slot identifiers, parking location/floor, allocation status, or assigned-driver details in user-facing UI, notifications, or search behavior. Parking state must be presented only as the localized “Parking Required” or “Parking Not Required” decision.

**Why:** The user explicitly confirmed that this restriction applies across every role and screen, including valet, driver, and admin experiences, while underlying backend data must remain intact.

**How to apply:** Preserve the underlying data needed by backend and operational workflows, but never surface the restricted details through UI, notifications, or search. On request cards, show only the parking icon when parking is required; show neither parking text nor an icon when it is not required. Required/Not Required text belongs on detail views.