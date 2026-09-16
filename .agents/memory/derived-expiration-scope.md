---
name: Derived expiration scope
description: How to add client-derived expiration without changing unrelated workflow states or leaving stale actions available.
---

Apply derived expiration only to the explicitly eligible workflow stage. Keep the existing expiration path and status presentation unchanged for every non-target state. Schedule UI refresh at the exact cutoff and recompute expiration inside mutation handlers rather than trusting rendered state.

**Why:** A broad derived-expiration result can correctly block one workflow while silently changing badges, action availability, or timing semantics for scheduled visits and other walk-in stages. Interval-based rendering can also leave actions usable briefly after the cutoff.

**How to apply:** Define eligibility separately from the time calculation and display override. Use the targeted result only on the affected screens, retain legacy behavior elsewhere, refresh at the next boundary and on foreground, and re-check current time at every approval or rejection sink.

Date-boundary subscriptions must invalidate memoized rows and render callbacks, not merely rerender the screen.

**Why:** A screen can receive the new business date while stable callbacks or memoized table items still carry yesterday's expiration state. Changing list keys would force updates but also reset scroll and local state.

**How to apply:** Include the business-date key in time-dependent memo/callback dependencies and use list extra data where necessary; keep list identity stable across midnight.

Expiration integration checks should mount the actual dashboard, not rely exclusively on source-string wiring assertions.

**Why:** Source assertions passed while a boundary dependency was read before initialization, crashing the dashboard; they also missed stale mutation closures.

**How to apply:** Render affected role screens and invoke captured actions across the cutoff alongside pure date-rule tests.