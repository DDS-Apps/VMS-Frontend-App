---
name: RTL table column order
description: Keeping table headers, cells, and frozen columns aligned across native and web RTL.
---

Table header rows and data rows must use the same layout direction convention, including inside a horizontally scrolling region. On web, use an explicit left-to-right CSS direction with a reversed flex row for Arabic; render header and data columns inside the same kind of View container, even when the row itself is clickable. Native RTL mirrors a normal row without the web CSS rule.

**Why:** Inherited RTL direction and different host elements for headers and clickable data rows left ambiguity about their physical column order; matching style props alone did not prove the date value appeared under its Arabic heading.

**How to apply:** Keep the frozen/scrollable parent and both header and data row direction rules identical, with explicit web direction; conditional cells must be inserted in the same logical sequence on both sides. Test actual header/value mapping, not just equality of helper output. For controls that must remain physically grid-left/list-right, use a separate physical-order rule.