---
name: Grouped responsive visitor grids
description: How to preserve date sections and responsive card columns in the app's React Native list screens.
---

When a visitor card grid needs date grouping, render date groups as the items of a FlatList and wrap each group's cards in a responsive flex grid rather than using SectionList columns.

**Why:** The React Native SectionList types used by this project do not support `numColumns`, while the responsive visitor cards require one, two, or three columns.

**How to apply:** Use the filtered and sorted records as the source for date groups, render a full-width date header per group, then render that group's cards in a wrapped row. Keep filters and pagination on the outer FlatList.

Visitor card grids retain three columns on desktop, two on tablet, and one on
mobile, including groups or last rows with fewer records than columns.

**Why:** The user reiterated the agreed column counts after a single grouped
card stretched across the desktop row. Sparse data must not change card width.

**How to apply:** Reserve each card's responsive column instead of growing it
to consume an incomplete row. Keep date headers full-width and horizontal
carousels separate from grid behavior. Do not confuse this with KPI grids.

The Overview dashboard's date-grouped top visitor section is an explicit
exception: it must match Pending Approvals' card width, spacing, and horizontal
scrolling rather than use the 3/2/1 visitor grid.

**Why:** After the layout difference was explained, the user explicitly chose
"Match Pending Approvals" instead of applying 3/2/1 columns to both dashboard
sections. This supersedes the earlier grid rule for this section only.

**How to apply:** Retain full-width date headers and a separate matching carousel
per group. Keep card content, data limits, filters, and navigation intact; do not
change standalone request grids or KPI grids to match this dashboard exception.