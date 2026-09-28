---
name: Visit purpose choices
description: Why selectable visit purposes and historical purpose display mappings have different scopes.
---

Limit the visit-purpose picker to the approved creation choices, but preserve recognition and translation of previously saved purpose values. A route-provided purpose outside the current picker should not silently bypass the allowed choices on a new request.

**Why:** Old visits may still contain purposes that are no longer offered for new requests; deleting their display mappings would make those records harder to understand, while accepting an old route preselection would bypass the narrowed picker.

**How to apply:** When revising purpose choices, update the picker and creation prefill guard together; retain backward-compatible value-to-label normalization for historical records.