---
name: Mobile KPI layout requirement
description: Preserve two phone KPI columns, including iPhone 11, with content-driven heights and labels below numbers.
---

The user explicitly requires two KPI cards per row on phones, including
iPhone 11 and iPhone 14 and newer. Do not silently replace this with a
single-column layout to address text clipping.

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

Keep the complete KPI label below the number; do not move its first word
beside the value on mobile.

**Why:** The user rejected the inline first-word layout after seeing it and
requested restoring the previous arrangement.

**How to apply:** Keep number and complete label in separate text blocks,
preserve content-driven card heights, and do not reintroduce inline-word
measurement or split labels without a new request.

KPI numbers must use natural font-measured line height, not a fixed line box,
on every platform.

**Why:** After reporting clipped Arabic KPI numerals on iOS, the user explicitly
requested automatic line height rather than a fixed value. This supersedes
the earlier request for a 20px number line height.

**How to apply:** Keep the existing font size and clear inherited heading line
height for KPI values. Do not change global typography, card columns, or label
placement to solve numeric clipping.

KPI rows must start at the right edge in Arabic and the left edge in English,
including a single fixed-width card.

**Why:** The user reported the lone Buffet Admin KPI starting on the left in
Arabic. On web, inherited RTL plus a reversed flex row can reverse it twice.

**How to apply:** Verify actual placement under both LTR and RTL parent
directions, not just the flex-direction style. Keep web CSS direction handling
separate from native mirroring and preserve the established card widths.
