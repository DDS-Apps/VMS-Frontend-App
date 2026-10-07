---
name: Firebase platform rollout boundaries
description: Scope and verification boundaries when web and native Firebase projects differ.
---
Treat a web Firebase configuration change as web-only unless a native/backend migration is explicitly requested. Never derive Android/iOS app IDs from a web app ID or assume a public client configuration establishes Firebase Admin or VAPID ownership.

**Why:** Web and native Firebase clients initialize from separate platform registrations, and browser-push keys and Admin credentials are project-specific. A shared project ID, a configured public key or a successful web build cannot prove token compatibility or delivery across platforms.

**How to apply:** Preserve independently configured platforms, report their project mismatch, and request matching native files and authorized per-platform delivery evidence in separately approved work. Do not run live notifications or device registration merely to verify static configuration.
