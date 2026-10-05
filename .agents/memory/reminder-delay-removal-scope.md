---
name: Reminder delay removal scope
description: Removing the configurable cancellation delay does not authorize changing cancellation lifecycle behavior.
---

Reminder Rules should refer only to reminders. On 2026-10-05 the user explicitly requested removing remaining Auto-Cancel wording, stating that Auto-Cancel functionality had been removed per the client's requirement. This supersedes the earlier field-only copy scope, but does not independently verify deployed backend behavior.

**Why:** The client no longer wants cancellation settings or wording in Reminder Rules; reminder delays, office hours, working days, and other settings must remain unchanged.

**How to apply:** Keep this screen reminder-only and frontend saves free of the retired setting. Do not infer permission to alter lifecycle/status behavior elsewhere from settings-copy requests; verify backend expiry behavior separately.