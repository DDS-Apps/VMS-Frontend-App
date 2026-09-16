---
name: Async form save revisions
description: Preventing local edits made during an asynchronous save from being overwritten by that save's older response.
---

When editable fields remain active during an asynchronous save, increment an edit revision on every local change and capture both the revision and exact draft snapshot submitted with the request. Clear dirty state only if the captured revision still matches when the request succeeds.

**Why:** A successful response represents the submitted draft, not changes made after submission. Unconditionally marking the form clean allows server-cache synchronization to replace those newer edits with the older saved version.

**How to apply:** Keep a synchronously updated draft reference when toggle/edit and Save can occur in one render batch. Build the payload from that draft and capture its matching revision; retain later edits while pending, then compare revisions before clearing dirty state or hydrating from refreshed server data.