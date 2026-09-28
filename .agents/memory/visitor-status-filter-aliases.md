---
name: Visitor status filter aliases
description: Why precise request status filters must account for legacy visit states without flattening distinct outcomes
---

Canonical request status names are not always the exact strings returned by visit and approval-history APIs. A precise lifecycle choice should include equivalent legacy backend names, while Cancelled, Auto-Cancelled, and Expired must not be merged merely because a display mapping groups them.

**Why:** An exact raw-string filter passed static checks but silently excluded legacy Pending and Checked Out records from Building Admin results. Conversely, mapping Expired into Auto-Cancelled could show a different outcome under the selected label.

**How to apply:** When introducing a status filter for another request source, first identify its raw response values and decide per status whether the UI offers a raw state or a canonical lifecycle group. Test the alias cases against filtered results, not only the picker options.