---
name: Mobile KPI column requirement
description: Preserve two KPI cards per row on iPhone 14 and newer phones.
---

The user explicitly requires two KPI cards per row on iPhone 14 and newer phones. Do not silently replace this with a single-column layout to address text clipping.

**Why:** The user reiterated on 2026-10-08 that this was already requested; a shared text-clipping fix had overridden the required layout.

**How to apply:** Keep multi-card phone layouts two-column, handle long labels and enlarged text within the cards, and preserve full-width rendering when there is only one card. Verify English and Arabic without treating one-column phone rendering as acceptable.
