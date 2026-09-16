---
name: Approval-history date filters
description: How custom visit-date ranges must work with paginated manager approval history.
---

The approval-history API accepts inclusive `startDate` and `endDate` calendar keys. Manager date filters must send both values to the API and let ordinary pagination load the server-filtered result.

**Why:** Loading every unfiltered page before applying a client filter creates unnecessary sequential requests. Reusing retained rows from another date range can also show records that do not belong to the active filter.

**How to apply:** Serialize picker values as local `YYYY-MM-DD` keys, send a single date as the same start and end value, include dates in query keys and every paginated request, and retain prior rows only when the date range is unchanged.