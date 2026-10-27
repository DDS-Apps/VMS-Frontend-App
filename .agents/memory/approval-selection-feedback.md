---
name: Pending approval selection feedback
description: Empty-selection feedback is on demand, not a permanent notice.
---

When Pending Approvals has no eligible selection, keep Select clickable and
show a localized informational message only after it is pressed. Do not show
the empty-selection message by default or enter selection mode.

**Why:** The user rejected the always-visible notice and disabled-button approach,
requesting feedback only in response to a selection attempt.

**How to apply:** Keep approval eligibility and expiry guards unchanged, evaluate
the current filtered records at click time, and always allow Cancel to exit an
existing selection even if its final eligible request expires.
