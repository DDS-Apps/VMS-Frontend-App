---
name: SSO role editing scope
description: Admin overrides for SSO users are limited to Receptionist while synced profile fields remain protected.
---

Admin users may change an SSO user's role to Receptionist; do not enable other role choices for SSO users.

Keep all the existing role options visible in the SSO edit form, with every option except Receptionist disabled. Do not hide the other options.

**Why:** On 2026-10-09, the user requested enabling previously locked SSO role changes with "just a receptionist option," then clarified that other roles must remain visible but disabled. This is a narrow role override, not permission to edit SSO-synchronized profile fields or expand all role assignments.

**How to apply:** Preserve the original role when no Receptionist change was selected, allow existing Auto Approval editing, and leave non-SSO user role behavior unchanged.
