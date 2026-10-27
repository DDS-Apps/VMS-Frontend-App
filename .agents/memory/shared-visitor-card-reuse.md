---
name: Shared visitor card reuse
description: Reuse the existing visitor card for the Receptionist dashboard rather than building a matching duplicate.
---

Receptionist dashboard visitor cards must reuse the existing shared visitor card, not a separately maintained look-alike or dashboard-specific layout branch.

**Why:** The user explicitly corrected an implementation that recreated their reference even though that card already existed in the system. Their intent is consistent presentation through component reuse.

**How to apply:** Adapt the dashboard response into the existing shared card's data contract. Preserve role-specific navigation and backend movement semantics without inventing events or changing unrelated screens.

Historical time summaries must keep the existing card timing layout:
Scheduled Time, Actual In, then Actual Out, with matching label/value styles
and time-only values. Allow the existing responsive row to wrap. Retain the
original green Actual In, muted Actual Out, typography, spacing, and omission
of unrecorded movements when the supplied summary is valid.

**Why:** The user rejected the separate dated Actual In/Out block that appeared
above Scheduled Time when historical summaries were enabled. Correcting the
timestamps did not authorize redesigning the card. The user reiterated that
restoring order alone was insufficient: the full existing UI must be retained.

**How to apply:** Populate the existing timing cells from the shared historical
value renderer; keep the calendar date in the existing date row and preserve
API availability restrictions.

Keep host names and departments as separate display values. In cards and tables, a department stays beside the name when it fits and wraps below only when necessary; do not always force a second line. Align the icon and label with the first name line.

**Why:** The user supplied card and table examples where concatenated mixed-language host metadata collapsed the label and overlapped text. They subsequently clarified that short departments such as Operations should stay inline when space permits.

**How to apply:** Preserve separate name/department fields through card and table mappings, use bounded wrapping rows, and keep labels non-shrinking with consistent first-line heights. Request Detail Host Details retains the separately requested department line below the name; its Visitor Details host row wraps inline metadata within the available width instead of overflowing. Check English and Arabic.
