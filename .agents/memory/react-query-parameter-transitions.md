---
name: React Query parameter transitions
description: Preserving visible data across parameter-key changes, failures, and retries with React Query v5.
---

React Query v5 `placeholderData` can bridge a successful response into the pending state for a new query key, but it does not guarantee that response remains available after the new-key request settles as an error. When the product requirement is to keep usable content visible even after that failure, retain an explicit last-successful display snapshot as well.

**Why:** A placeholder-only implementation looked correct while loading but still replaced the content with a full error when the parameterized request failed. Applying the newly selected client-side filter to old placeholder data could also empty the snapshot before the request settled.

**How to apply:** On parameterized list screens, distinguish active query state from displayed data. Keep the last successful response and its source parameter key together in commit-phase state, build that key with the exact same normalization as the real filters, label retained content with its source, avoid applying new server-owned filters to an old snapshot, show clear local progress/error feedback, and prioritize fetching feedback over a stale error during retries.