---
name: SSO role editing scope
description: Admin overrides for SSO users are limited to Receptionist while synced profile fields remain protected.
---

Admin users may change an SSO user's role to Receptionist; do not enable other role choices for SSO users.

**Why:** On 2026-10-09, the user explicitly requested enabling previously locked SSO role changes with "just a receptionist option." This is a narrow role override, not permission to edit SSO-synchronized profile fields or expand all role assignments.

**How to apply:** Preserve the original role when no Receptionist change was selected, allow existing Auto Approval editing, and leave non-SSO user role behavior unchanged.
