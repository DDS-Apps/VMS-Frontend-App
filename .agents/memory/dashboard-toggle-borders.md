---
name: Dashboard toggle borders
description: Why the grid/list controls need per-button borders in Arabic.
---

Dashboard grid/list view buttons should keep a physical grid-left/list-right order in both languages and have independent full borders and corner radii rather than one clipped group border.

**Why:** The first RTL order fix left the unselected grid button looking partially borderless beside the selected orange list button. A shared outer border and clipping do not reliably convey each button's boundary in Arabic.

**How to apply:** When changing dashboard view toggles, keep both roles' and Receptionist controls visually consistent in Arabic and English, and avoid returning to a shared border around the pair.

Security, Buffet Admin, and Valet Admin dashboards must expose their card/table view controls on native apps as well as web.

**Why:** The user reported missing native dashboard controls on 2026-10-09; web-only visibility and crowding by date controls did not meet the product requirement.

**How to apply:** Do not platform-gate these controls to web. Let narrow headers and date controls wrap rather than pushing the toggle beyond the screen, and verify actual native tap delivery separately from handler wiring.