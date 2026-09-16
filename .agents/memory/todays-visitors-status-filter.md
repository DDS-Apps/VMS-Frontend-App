---
name: Receptionist Today's Visitors status filter
description: History and current rule for which visit statuses show in the Receptionist dashboard's Today's Visitors list.
---

The Receptionist dashboard's "Today's Visitors" list (`todaysVisitors` in `screens/Receptionist/ReceptionistDashboardScreen.tsx`) filters `/api/v1/reception/today` results by status before display:
- Walk-ins show for: `pending`, `expected`, `checked_in`, `checked_out`, `completed`.
- Scheduled (non-walk-in) visits show only for: `accepted`, `visitor_accepted`, `checked_in`, `checked_out`, `completed` — i.e. not `pending_approval`/awaiting-acceptance visits.

**Why:** This same filter was added once before (Jul 14, 2026), then deliberately reverted the same day ("Restore receptionist view to show all visitors, including those pending acceptance") because hiding pending/awaiting-acceptance visits made receptionists lose track of them. It was reapplied later at explicit user request with the exact status list above. If asked to change this again, surface that history rather than assuming either direction is obviously correct — confirm the desired behavior first.

**How to apply:** The KPI summary counts (`todayResponse.summary`) come straight from the API and are unaffected by this client-side filter. A separate "All Visitors" list on the same screen (`allVisitors`, historical/grouped-by-date) intentionally has no such filter — it was not part of this request and was left unfiltered.
