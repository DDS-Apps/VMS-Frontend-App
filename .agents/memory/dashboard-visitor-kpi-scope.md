---
name: Dashboard visitor KPI scope
description: Role-specific scope for the monthly Total Visitors dashboard KPI.
---

Employee and Manager dashboard visitor totals count only the current user’s visits that were approved or visitor-accepted. Receptionist dashboard totals count all building visits with the same rule.

**Why:** The Total Visitors KPI is defined as visits approved in the current month, including records that advanced to visitor acceptance; Employees and Managers should compare it with their own requests, while Receptionists are responsible for the complete building visitor picture.

**How to apply:** Keep `myRequestsOnly: true` for Employee/Manager monthly dashboard queries and `myRequestsOnly: false` for Receptionist monthly dashboard queries. Count records with `approvedAt`, or fall back to `status === 'approved'` or `status === 'visitor_accepted'` when that timestamp is absent.