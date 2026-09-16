---
name: Debounced pre-submit checks
description: Convention for server checks that gate a form submit and are fed from debounced input (duplicate-visit check in the Create Visit form).
---

Rule: when a pre-submit server check is driven by debounced input, the submit guard must treat "latest typed value differs from the debounced value" as an in-flight check, in addition to the query's `isLoading || isFetching`. Compare the *built params* (validity-gated), not raw strings, so typing an incomplete value does not lock the button.

**Why:** Otherwise a submit in the gap between the last keystroke and the debounced request runs against the previous value's answer (or none). Previously every keystroke fired a request, so the in-flight state alone covered this gap.

**How to apply:** `utils/duplicateCheckParams.ts` (`buildDuplicateCheckParams` + `isDuplicateCheckPending`) with `hooks/useDebouncedValue.ts`. Gates must be no stricter than the form's own validators (email regex shared via `utils/validation.ts`, phone ≥ 7 digits) so anything the form accepts is also checked. Reuse this pair for any new debounced check instead of hand-rolling timers.
