---
name: Date-only visit dates
description: Displaying visit date keys consistently across user timezones.
---

For display, prefer the explicit payload visit date. If it is absent, an
offset-bearing canonical scheduled start may supply the date in the visit's
timezone; never substitute the device's current date.

**Why:** Receptionist Today responses may omit the calendar-date field even
when the scheduled start is available. The user requires cards to show the
payload date consistently with table view, not an invented date.

**How to apply:** Share the date resolution and calendar-label formatter across
the card/table display paths. Missing schedule evidence stays empty; keep this
display fallback independent of expiration and permission decisions.

Treat an API `YYYY-MM-DD` visit date as a calendar date, not as a UTC timestamp.

**Why:** Passing a date-only ISO value to `new Date()` creates UTC midnight. On devices west of UTC, formatting that instant in the local timezone displays the prior calendar day, while the visit remains grouped under the original date key.

**How to apply:** Format date-only visit labels with explicit calendar parsing and a fixed timezone (or preserve the separate year, month, and day values). Apply this to date-group headers, filters, and other display-only visit dates.