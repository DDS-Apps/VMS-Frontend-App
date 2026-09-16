---
name: Static server precompression
description: Production web serving policy: build-time compressed variants and cache rules.
---

Compressed variants are produced at build time and served as-is; nothing is compressed per request. Immutable caching applies only to hashed build-output paths; the HTML shell, service worker and any unhashed file are no-cache with ETag revalidation; the health endpoint is no-store.

**Why:** No dependency or CPU cost at request time, roughly a 5x smaller JS bundle, and unhashed files must revalidate or a deploy can strand clients on stale code.

**How to apply:** Encoding negotiation must honour Accept-Encoding q-values (a client sending br;q=0 must not receive brotli). New hashed asset directories must be added to the immutable list; anything unhashed stays no-cache.
