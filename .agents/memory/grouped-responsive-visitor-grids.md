---
name: Grouped responsive visitor grids
description: How to preserve date sections and responsive card columns in the app's React Native list screens.
---

When a visitor card grid needs date grouping, render date groups as the items of a FlatList and wrap each group's cards in a responsive flex grid rather than using SectionList columns.

**Why:** The React Native SectionList types used by this project do not support `numColumns`, while the responsive visitor cards require one, two, or three columns.

**How to apply:** Use the filtered and sorted records as the source for date groups, render a full-width date header per group, then render that group's cards in a wrapped row. Keep filters and pagination on the outer FlatList.