---
name: Receptionist Today scope
description: Confirmation boundary for Receptionist Today visitor lists.
---

Receptionist Today lists should not expose scheduled invitation requests before the visitor accepts. Walk-ins have no visitor-response step, so active walk-ins can still appear while host/manager approval is pending. Visitor-accepted and later visits are visible.

**Why:** The earlier requirement to show all active Today requests conflicts with the later explicit requirement that operational roles, including Receptionist, not see unconfirmed invitations. The exception preserves the earlier walk-in workflow without exposing unconfirmed scheduled invitations. Backend-provided KPI totals require separate verification because client-side list filtering cannot change their membership.

**How to apply:** Apply the confirmation boundary on all Receptionist list surfaces, including Today and historical views; preserve walk-in visibility separately. Verify server-provided counts against this same boundary before treating them as confirmed-visitor totals.