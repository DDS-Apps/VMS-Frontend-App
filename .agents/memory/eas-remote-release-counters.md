---
name: EAS remote release counters
description: Why native release numbers must be checked remotely before incrementing local metadata.
---

Use the authenticated EAS version commands to inspect the remote counters before
choosing new Android/iOS release numbers, then keep local metadata aligned.
Do not assume the checked-in numbers are the latest shipped values.

**Why:** During production release preparation, the remote counters were ahead
of the local configuration. Updating only local numbers would not update the
authoritative counters and could give the user an incorrect build-number report.

**How to apply:** Preserve remote version management and automatic increments
unless the user explicitly requests a change. Report updated counter values
separately from the numbers a later auto-incrementing build will receive.
The EAS version-setting command prompts interactively even though its read
command accepts non-interactive mode; in a headless session it requires a PTY.
Never start a paid remote build or store submission merely to inspect counters.

When replacing the interactive value in a PTY, send Backspace characters rather
than Ctrl+U. The iOS string prompt can retain Ctrl+U as an invisible invalid
character even though the Android numeric prompt accepts the resulting input.
**Why:** This caused iOS version validation to reject an otherwise valid integer.
