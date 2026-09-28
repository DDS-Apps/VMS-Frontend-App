---
name: RTL table column order
description: Keeping table headers, cells, and frozen columns aligned across native and web RTL.
---

Table header rows and data rows must use the same layout direction convention, including inside a horizontally scrolling region. On web, `direction: rtl` with `flexDirection: row` gives Arabic ordering; adding `row-reverse` to a child under RTL direction reverses it a second time. Native RTL mirrors a normal row without the web CSS rule.

**Why:** A shared header used RTL CSS direction while its data cells used row-reverse, causing headings to sit above unrelated values in Arabic.

**How to apply:** Keep the frozen/scrollable parent and both header and data row direction rules identical; conditional cells must be inserted in the same logical sequence on both sides. For controls that must remain physically grid-left/list-right, use a separate physical-order rule rather than table RTL ordering.