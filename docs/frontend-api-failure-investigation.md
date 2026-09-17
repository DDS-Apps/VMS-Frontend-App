# Frontend API failure investigation

## Evidence and limits

The incident report describes backend responses taking 31–42 seconds for visits
and awaiting-visitor approvals, 16–21.5 seconds for unread counts, 9.4 seconds for
pending-host approvals, and 10.8 seconds for room availability. It also reports
one expired-token 401. These are supplied backend observations, not measurements
made against the live backend during this investigation.

The frontend's ordinary Axios timeout is **30,000 ms**, defined in
`api/config.ts` and applied in `api/httpClient.ts`. Uploads have a separate
120,000 ms limit. A backend may finish processing and record HTTP 200 after the
browser has already stopped waiting. That explains the mechanism consistent with
the reported 31–42 second responses; it does **not** prove that every historical
red row had that cause. In particular, the supplied sub-30-second durations
cannot be explained by this timeout alone.

No historical HAR, client error codes, request correlation IDs or authenticated
browser session were supplied. Exact attribution of those shorter failures
remains unresolved. A browser's red/cancelled presentation alone cannot
distinguish timeout, navigation abort, connectivity/CORS failure or HTTP 401.
Controlled transport evidence is recorded separately in
`docs/api-transport-evidence.md`; it is not live production evidence.

## Baseline request triggers

| Endpoint | Consumers and triggers | Timer / baseline retry |
|---|---|---|
| `/api/v1/approvals/pending` | Manager overview, approval lists; mount, focus, refresh and approval invalidations | No polling; 30s freshness; inherited up to two retries except unauthorized |
| `/api/v1/approvals/awaiting-visitor` | Employee/Manager overview, `limit=10`; mount, focus, refresh and request invalidations | No polling; 30s freshness; inherited retry |
| `/api/v1/approvals/pending-host` | Employee/Manager overview, `limit=10`; mount, focus, refresh and request invalidations | No polling; 30s freshness; inherited retry |
| `/api/v1/visits` (lists) | Overview upcoming range uses today through month end, `myRequestsOnly=true`, `limit=100`; list filters/pages, focus, refresh and mutation invalidations | No endpoint polling; 30s freshness; inherited retry; additional pages are separate calls |
| `/api/v1/visits` (duplicate check) | Create Visit date and valid email/phone changes, excluding walk-ins | Email/phone debounce **450 ms**; 30s freshness; no polling |
| `/api/v1/visits/rooms/availability` | Create Visit and edit details date/start/end/capacity selection | No polling or debounce; 30s freshness; automatic retry disabled |
| `/api/v1/notifications/unread-count` | Dashboard badge query plus NotificationProvider; mount, foreground, push, read/delete actions | Two separate **120s** polling paths before this change; query freshness 60s |

The global query defaults also allow browser window-focus refetch and reconnect
refetch. Freshness is not a polling interval. The shared navigation-focus helper
skips initial focus and joins active refetches rather than cancelling them.
Distinct list parameters/pages legitimately require distinct requests.

Relevant source: `hooks/queries/useApprovalQueries.ts`,
`hooks/queries/useMeetingRoomQueries.ts`,
`hooks/queries/useNotificationQueries.ts`,
`contexts/NotificationContext.tsx`, `navigation/DashboardContainer.tsx`,
`screens/Dashboard/OverviewScreen.tsx`,
`screens/Employee/VisitorRequestFormScreen.tsx`,
`screens/Employee/RequestDetailsScreen.tsx`,
`utils/duplicateCheckParams.ts`, `providers/QueryProvider.tsx`.

## Baseline confirmed gaps

- The affected query functions did not forward React Query's cancellation
  signal to Axios. Component rerenders alone were not a transport abort source.
- Identical query keys shared query work, but the notification context issued
  separate direct requests outside that sharing. Its interval and event
  callbacks did not share an in-flight guard. A 120-second interval alone does
  not explain overlap for a 21-second request; independent consumers/events can.
- The HTTP client already coordinated concurrent 401 responses and marked
  requests for one replay. Newly initiated protected requests did not wait for
  an ongoing refresh before being sent with the old token.
- Runtime temporary refresh failures retained the session, unlike the requested
  failed-refresh sign-out policy.
- `ECONNABORTED` was mapped to timeout, while timing diagnostics also recognized
  `ETIMEDOUT`; UI error classification did not cover the latter consistently.
- HTTP URL logs and raw Axios error logs could expose query values, credentials
  or request payloads. The existing timing store's query stripping did not
  protect those separate logs.

## Policy

The default finite timeout stays at **30 seconds**. There is no timeout increase,
unlimited wait, or conversion of failed reads to empty successes. Backend
performance still needs its separate fix.

Runtime refresh failures must end only the session that initiated that refresh,
settle waiting calls, and show a session-expired login message. Startup cached
profile restoration remains a separate policy: a transient restoration failure
does not prove the saved session invalid. Logout or a new login invalidates old
async work.

Only pending identical reads may be shared; successful responses are not cached
by the HTTP transport. Cancellation belongs to each subscriber, so leaving one
screen must not abort work still needed by another. Form checks fail closed on
errors rather than interpreting them as no duplicate or available room.

Replit/local web remains QA. IIS and EAS production continue targeting
`https://vms.dallah.com`. No backend, version, deployment or store configuration
is changed by this investigation.