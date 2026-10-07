---
name: Firebase platform rollout boundaries
description: Scope and verification boundaries when web and native Firebase projects differ.
---
Treat a web Firebase configuration change as web-only unless a native/backend migration is explicitly requested. Never derive Android/iOS app IDs from a web app ID or assume a public client configuration establishes Firebase Admin or VAPID ownership.

**Why:** Web and native Firebase clients initialize from separate platform registrations, and browser-push keys and Admin credentials are project-specific. A shared project ID, a configured public key or a successful web build cannot prove token compatibility or delivery across platforms.

**How to apply:** Preserve independently configured platforms, report their project mismatch, and request matching native files and authorized per-platform delivery evidence in separately approved work. Do not run live notifications or device registration merely to verify static configuration.

The user has withdrawn the dallah-vms migration and wants production builds to keep the earlier dallah-albaraka-vms Firebase project across platforms.

**Why:** The user explicitly requested reverting the recent Firebase changes while retaining production builds. Production backend selection is independent of Firebase project selection.

**How to apply:** Restore only Firebase-related changes, preserve production API/build defaults, and do not resume the new-project migration without fresh authorization. This records the requested direction, not confirmation that restoration is implemented.
