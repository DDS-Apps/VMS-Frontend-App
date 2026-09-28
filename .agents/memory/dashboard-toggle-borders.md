---
name: Dashboard toggle borders
description: Why the grid/list controls need per-button borders in Arabic.
---

Dashboard grid/list view buttons should keep a physical grid-left/list-right order in both languages and have independent full borders and corner radii rather than one clipped group border.

**Why:** The first RTL order fix left the unselected grid button looking partially borderless beside the selected orange list button. A shared outer border and clipping do not reliably convey each button's boundary in Arabic.

**How to apply:** When changing dashboard view toggles, keep both roles' and Receptionist controls visually consistent in Arabic and English, and avoid returning to a shared border around the pair.