---
name: Time picker consistency
description: Current iPhone reference is the native spinner, not the custom wheel or an approved dropdown redesign.
---

For existing iPhone time selection, the user identified the native iOS
hour/minute/AM–PM spinner in a centered dialog as the consistency reference,
rather than the custom bottom-sheet wheel.

**Why:** The user reported a blank native picker on one iPhone, a working
native spinner on another, and a different custom picker in creation. They
explicitly requested identifying the inconsistent screens.

**How to apply:** Distinguish native rendering failures from intentional
component differences. The editable-dropdown discussion was advice, not
authorization to implement it everywhere. Keep existing visual styling unless
the user approves a redesign, and require native evidence before declaring the
device-specific blank rendering fixed.
