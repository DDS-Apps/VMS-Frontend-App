---
name: React Query overlapping mutations
description: Safe per-invocation cleanup when multiple mutations share one observer and overlap.
---

Do not rely on per-call callbacks passed to repeated `mutate` calls for cleanup that must run once per invocation. Use each call's `mutateAsync` promise with its own `try`/`catch`/`finally`, or a hook-level settled callback keyed by mutation variables.

**Why:** Consecutive mutations replace the mutation observer used by per-call callbacks, so an earlier overlapping call may settle without running its local cleanup. This can leave loading IDs stuck or clear the wrong operation.

**How to apply:** Add pending state before starting each mutation, await that invocation independently, run success-only follow-up work after its promise resolves, and remove only that invocation's pending key in `finally`. Test both completion orders and mixed success/failure.