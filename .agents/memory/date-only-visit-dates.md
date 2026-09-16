---
name: Date-only visit dates
description: Displaying visit date keys consistently across user timezones.
---

Treat an API `YYYY-MM-DD` visit date as a calendar date, not as a UTC timestamp.

**Why:** Passing a date-only ISO value to `new Date()` creates UTC midnight. On devices west of UTC, formatting that instant in the local timezone displays the prior calendar day, while the visit remains grouped under the original date key.

**How to apply:** Format date-only visit labels with explicit calendar parsing and a fixed timezone (or preserve the separate year, month, and day values). Apply this to date-group headers, filters, and other display-only visit dates.