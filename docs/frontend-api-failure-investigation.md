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

The user-selected finite timeout is **3 minutes (180 seconds)** for ordinary
requests and token refresh. This replaces the previous 30-second cap so the
observed 31–42-second backend responses can complete, while preserving a finite
failure boundary. There is no unlimited wait or conversion of failed reads to
empty successes. Backend performance still needs its separate fix.

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

## Implemented result

- Protected reads wait during refresh, concurrent expired-token requests share refresh, and each original call replays at most once. Explicit session boundaries invalidate old calls even when a new login reuses a token string.
- Pending identical GETs share a subscriber-aware transport; last-subscriber cancellation aborts it, while rapid remounts start fresh rather than joining an aborted request.
- Affected queries forward cancellation signals and disable automatic retries to avoid multiplying slow requests. Notifications now have a single account-scoped 120-second polling owner; foreground, push and manual refresh join an existing request.
- Localized timeout/network/auth/server messages and Retry preserve existing data where appropriate. Duplicate checks and room availability, including the edit flow, block unsafe submission on failed checks.
- Runtime refresh failure clears the local session immediately with a session-expired login message. Startup transient restoration failures retain the cached session.
- Safe route-only timing diagnostics include duration, status, outcome, normalized cancellation reason and retry attempt. Query values, opaque path segments, raw Axios errors and form payloads are removed from the affected logging paths.

## Verification (17 September 2026)

- TypeScript: npx tsc --noEmit passed.
- QA web export, hostname validation and precompression passed; server listens on port 5000.
- Browser preview renders the login screen. Console includes the existing web notification support and password-form warnings, plus one unattributed 401 resource entry; this is not proof of an authenticated live flow passing. No authenticated live backend session was used.
- Full Jest run: 85 suites passed, 10 failed; 769 tests passed, 101 failed. A separately extracted pre-change baseline has the same 10 failing suites and 101 failed tests (739 passed). New/updated API, auth, concurrency, form guard, notification and diagnostic tests pass.
- Existing failures concern legacy upcoming-visit timer/indicator tests, BuffetBoard rendering, expired-footer/overview fixtures, and a Node-native test script collected by Jest. These are tracked separately rather than hidden or disabled.
- Real local HTTP adapter evidence and test-only bounded timeout measurements are in docs/api-transport-evidence.md. Historical baseline durations are supplied backend evidence, not invented before-change browser captures.
- No publishing, external backend changes, or store submissions were performed.

## Changed files

- `.agents/memory/startup-session-restore.md`
- `__tests__/authLogoutDuringRefresh.test.tsx`
- `__tests__/authStartupSession.test.tsx`
- `__tests__/dashboardKpis.test.ts`
- `__tests__/httpClientTokenRefresh.test.ts`
- `__tests__/httpClientTransport.test.ts`
- `__tests__/notificationListLoadingStates.test.ts`
- `__tests__/notificationPreferencesLoadingStates.test.ts`
- `__tests__/notificationScreens.rendered.test.tsx`
- `__tests__/notificationUnreadQueryConcurrency.test.tsx`
- `__tests__/queryCancellationPolicy.test.ts`
- `__tests__/requestCreationSorting.test.ts`
- `__tests__/requestTiming.test.ts`
- `__tests__/visitorRequestFormDuplicateCheck.test.tsx`
- `api/config.ts`
- `api/errors.ts`
- `api/httpClient.ts`
- `api/inFlightGet.ts`
- `api/requestTiming.ts`
- `components/DashboardLayout.tsx`
- `constants/i18n/ar.ts`
- `constants/i18n/en.ts`
- `constants/i18n/types.ts`
- `contexts/AuthContext.tsx`
- `contexts/NotificationContext.tsx`
- `docs/api-transport-evidence.md`
- `docs/frontend-api-failure-investigation.md`
- `hooks/queries/useAllRequestsQuery.ts`
- `hooks/queries/useApprovalQueries.ts`
- `hooks/queries/useMeetingRoomQueries.ts`
- `hooks/queries/useNotificationQueries.ts`
- `hooks/queries/useVisitorQueries.ts`
- `navigation/DashboardContainer.tsx`
- `providers/QueryProvider.tsx`
- `screens/Auth/LoginScreen.tsx`
- `screens/Common/NotificationsScreen.tsx`
- `screens/Dashboard/OverviewScreen.tsx`
- `screens/Employee/RequestDetailsScreen.tsx`
- `screens/Employee/VisitorRequestFormScreen.tsx`
- `screens/Employee/VisitorRequestsScreen.tsx`
- `screens/Manager/ManagerAllRequestsScreen.tsx`
- `screens/Manager/ManagerDashboardScreen.tsx`
- `screens/Receptionist/AllVisitorsScreen.tsx`
- `screens/Receptionist/ReceptionistDashboardScreen.tsx`
- `screens/Receptionist/UpcomingVisitorsListScreen.tsx`
- `services/api/authService.ts`
- `services/api/meetingRoomApiService.ts`
- `services/api/notificationApiService.ts`
- `services/api/requestApiService.ts`
- `utils/apiErrorMessage.ts`
