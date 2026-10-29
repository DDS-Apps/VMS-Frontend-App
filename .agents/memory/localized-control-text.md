---
name: Localized control text
description: Script-specific fonts and preserving geometry during Arabic alignment fixes.
---

Alignment corrections must preserve existing control dimensions, padding,
icon positions, and behavior unless the user requests a layout change.
Latin-only content, such as CSV/Excel format labels and calling codes, should
not acquire Arabic font metrics solely because the interface is Arabic.

**Why:** The user reported top-aligned Latin export labels on web and iOS in
Arabic mode. A previous phone-font correction also shortened the field,
prompting an explicit reminder not to change its established height.

**How to apply:** Match fonts to the displayed script and preserve the existing
effective text-box metrics when removing language-based font substitution.
Do not fix a baseline issue by increasing button padding or changing control
height. Keep English and export/validation behavior intact.
