---
name: Time picker consistency
description: Time selection uses the spinner reference on mobile and editable dropdowns on web, with unchanged app styling.
---

All editable/displayed time-field values use 12-hour time with AM/PM (or the
Arabic equivalents); do not accept or advertise 24-hour typed input.

**Why:** The user explicitly replaced the earlier `14:30` input suggestion with
12-hour-only time before authorizing implementation.

**How to apply:** Format and validate fields consistently on both platforms.
Keep the existing API's internal time encoding unchanged.

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

An invalid typed draft must block saving instead of submitting the last
committed time. Valid drafts must commit before Save can read form state, and
the displayed value must reflect any existing scheduling clamp.

**Why:** Editable fields introduce a separate displayed draft; otherwise the
user can see one time while an older or policy-adjusted time is submitted.

**How to apply:** Preserve this distinction in every caller, including
office-hours settings and approval dialogs. Cancelling a mobile picker must
discard its temporary wheel selection.
