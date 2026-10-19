---
name: Dashboard visitor KPI scope
description: Role-specific scope for the monthly Total Visitors dashboard KPI.
---

Employee and Manager dashboard visitor totals count only the current user’s visits that were approved or visitor-accepted. Receptionist dashboard totals count all building visits with the same rule.

**Why:** The Total Visitors KPI is defined as visits approved in the current month, including records that advanced to visitor acceptance; Employees and Managers should compare it with their own requests, while Receptionists are responsible for the complete building visitor picture.

**How to apply:** Preserve the backend's authenticated role-specific KPI scope; do not rebuild counts from frontend lists just to change their labels.

Only Employee and Manager monthly KPI labels should append the reporting month
in parentheses, such as `(Oct)`; daily cards and other roles stay unchanged.

**Why:** The user requested a month abbreviation immediately after monthly
dashboard KPI labels. Using the device's current month can mislabel cached
counts from another reporting period.

**How to apply:** Use the backend month period (or its generation timestamp
when the optional period is absent), in the reporting timezone. Localize the
month with the Gregorian calendar in English and Arabic, without changing KPI
values, scopes, API requests, or the required two-column phone layout.