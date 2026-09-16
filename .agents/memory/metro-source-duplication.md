---
name: Metro source duplication
description: Whole-file duplicated TypeScript modules can surface as arbitrary duplicate-identifier bundle failures.
---

When Metro reports a duplicate declaration, check whether the source file contains repeated module copies rather than only renaming the reported symbol.

**Why:** A repeated `PURPOSE_OPTIONS` declaration was the first syntax error, but removing only that would have left later duplicate exports. The same corruption also affected the dashboard module and surfaced only after the first file was repaired.

**How to apply:** Compare repeated import positions and restore the first verified canonical module copy. Verify with the exact publishing build command, including its cache-clearing option: a cached web export previously passed while a clean publishing build exposed repeated modules again. Do not assume a previous repair still holds after intervening source changes.