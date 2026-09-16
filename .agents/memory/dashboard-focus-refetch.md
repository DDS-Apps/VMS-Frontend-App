---
name: Dashboard focus refetch
description: Convention for refreshing dashboard queries on screen focus without duplicating the mount fetch.
---

Dashboards refresh on focus through the shared refocus hook: the first focus after mount is skipped (the mount fetch is already in flight and a bare refetch would cancel and restart it) and later focuses join an in-flight fetch instead of restarting it. Only queries enabled at mount belong in the hook; role guards stay with the caller because refetch bypasses enabled.

Upcoming Visits home sections query from today's Riyadh business date, not from the first of the month; the today-or-later client filter remains as a guard for cached pages across midnight.

**Why:** Every dashboard focus used to issue a second copy of every request, and whole-month ranges made auto-paging grow with the day of the month.

**How to apply:** Use the shared hook for focus refreshes on any new dashboard, keep mutation success paths on query invalidation rather than manual list refetches, and scope date ranges to what the section can show.
