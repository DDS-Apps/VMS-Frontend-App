---
name: Time picker consistency
description: Time selection uses the spinner reference on mobile and editable dropdowns on web, with unchanged app styling.
---

Time selection throughout the mobile app should follow the native iOS
hour/minute/AM–PM spinner reference in a centered dialog, rather than the custom
bottom-sheet wheel. Web should use an editable time dropdown.

**Why:** After reviewing the inconsistent pickers and blank iPhone rendering,
the user explicitly selected the spinner for mobile throughout the app and the
previously discussed editable dropdown for web. They want the existing visual
styling retained.

**How to apply:** Use shared platform-specific controls across creation,
editing, approval, and settings flows; preserve existing dates, scheduling
rules, permissions, and backend payloads. Keep current colors, fields, and
English/Arabic behavior. Distinguish native rendering failures from intentional
component differences, and require native evidence before declaring the
device-specific blank rendering fixed.
