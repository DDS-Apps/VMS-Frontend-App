---
name: Mobile KPI column requirement
description: Preserve two KPI cards per row on iPhone 14 and newer phones.
---

The user explicitly requires two KPI cards per row on iPhone 14 and newer phones. Do not silently replace this with a single-column layout to address text clipping.

**Why:** The user reiterated on 2026-10-08 that this was already requested; a shared text-clipping fix had overridden the required layout.

**How to apply:** Keep multi-card phone layouts two-column, handle long labels and enlarged text within the cards, and preserve full-width rendering when there is only one card. Verify English and Arabic without treating one-column phone rendering as acceptable.

KPI icons must align to the top. Cards within a row should stretch to the
tallest sibling while retaining natural content-driven height.

**Why:** After adding reporting-month labels, the user pointed out that a
shorter Total Visitors card left an inconsistent gap below it. They explicitly
requested responsive growth, not a fixed or increased height.

**How to apply:** Stretch row wrappers and card surfaces, top-align their
contents, and allow wrapping without fixed height or minimum-height patches.
Keep shorter rows compact instead of imposing one height on every grid row.
