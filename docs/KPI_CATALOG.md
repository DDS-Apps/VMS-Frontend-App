# KPI Catalog by Accessible Module

This catalog documents user-facing KPIs and aggregate counts for the seven
operational modules explicitly requested below. This seven-module allowlist is
the primary scope: accessible roles outside it are intentionally not catalogued.
In particular, Visitor, Buffet Staff, and Valet Driver are excluded even though
they have their own home/sidebar surfaces. **Admin** means the current Building
Admin role (`building_admin`), not the legacy generic Admin dashboard.

**Inclusion rule within the seven requested modules.** A screen is included only
when it is the role's initial home/dashboard, appears in that role's sidebar, or
is opened by a direct dashboard action such as **View All**. A screen is
excluded when it is reachable only by selecting an individual record, by deep
link, or merely because it is registered in a navigation stack. Accessibility
does not add a role that is outside the explicit seven-module allowlist.

**Source categories.**

- **API summary** — an aggregate supplied by the server.
- **API pagination total** — the server's total for a paginated query.
- **Complete paginated query** — the client loads every page before counting.
- **Loaded filtered list** — the client counts only records currently loaded.
- **Local state** — interaction feedback such as a selection count.

Dates are described as **Riyadh** only when the implementation explicitly uses
`Asia/Riyadh`. Dates made with local `Date` getters or `toDateString()` are
described as **device-local**. Recommendations describe desired business logic,
not current behavior.

## 1. Admin

**Accessible screens:** All Requests (home/sidebar), Reports, Manage Users, and
Reminder Rules. Source:
[sidebar](../components/Sidebar.tsx#L132-L147),
[home route](../navigation/DashboardContainer.tsx#L171-L180).

### All Requests — `screens/BuildingAdmin/AllRequestsScreen.tsx`

#### All / Pending / Approved / Checked In / Checked Out / Cancelled / Rejected

- **Meaning:** counts rows for the selected All Visitors, Buffet, or Valet type
  by normalized status. Checked In maps to `inProgress`; Checked Out maps to
  `completed`.
- **Current calculation:** the selected type enables only its matching unified
  query. All is that type-scoped array length; the other cards filter it by
  exact normalized status.
- **Source:** **loaded type-scoped list** from the selected visitor, buffet, or
  valet query. The visitor query requests one page of at most 100 rows; there is
  no completion loop.
- **Period/timezone:** no selected range uses each API's default scope. Selected
  dates are serialized with device-local getters; backend timezone behavior is
  not declared here.
- **Statuses:** exact normalized status buckets; unknown source statuses fall
  into the mapper's fallback bucket.
- **Filters:** type selects the KPI source and date alters query inputs. Search
  and status filter the visible list after KPI calculation, so the cards remain
  type-scoped but do not describe the visible search/status result.
- **Pagination:** visitor counts can stop at 100; buffet and valet completeness
  depends on their endpoint response.
- **Interaction:** pressing a card toggles the matching status filter; pressing
  the active card returns to All.
- **Caveat:** All Visitors and Buffet cards are sourced from their selected-type
  query. In Valet mode only, the visible list is replaced with
  parking-dashboard data while the seven top cards still use the separate
  unified Valet-task query. Valet cards can therefore describe a different
  population from the Valet list.
- **Recommendation:** serve type-aware, date-scoped summary counts from the API,
  with one Riyadh business-date contract for all three services.

Sources:
[query inputs](../screens/BuildingAdmin/AllRequestsScreen.tsx#L525-L552),
[Valet source switch](../screens/BuildingAdmin/AllRequestsScreen.tsx#L590-L620),
[KPI cards](../screens/BuildingAdmin/AllRequestsScreen.tsx#L904-L1035),
[calculation](../hooks/queries/useAllRequestsQuery.ts#L260-L332).

#### Showing X of Y

- **Meaning/calculation:** X is the post-type/search/status visible row count.
  For All Visitors and Buffet, Y is the selected type's pre-search/pre-status
  loaded total. Valet instead uses the parking dashboard's `totalVisitors`
  summary.
- **Source:** X is a **loaded filtered list**; Y is loaded-list total or
  **API summary** in Valet mode.
- **Filters and interaction:** search, status, type, and date can change X.
  Search/status do not change Y. It is presentational.
- **Caveat:** “of Y” can imply that X is a subset of Y even when the two values
  come from different Valet sources.
- **Recommendation:** calculate both values from the same result population and
  label incomplete results as “shown.”

Source:
[result summary](../screens/BuildingAdmin/AllRequestsScreen.tsx#L1181-L1192).

**Current screen behavior relevant to interpretation:** the type chips are
**All Visitors**, **Buffet**, and **Valet**. Only All Visitors displays the
secondary status-chip row; switching to Buffet or Valet resets hidden status to
All. Visitor requests are sorted newest-created first and visitor cards display
Duration plus Scheduled Time. Sources:
[type/status controls](../screens/BuildingAdmin/AllRequestsScreen.tsx#L1040-L1160),
[visitor ordering](../hooks/queries/useAllRequestsQuery.ts#L297-L317),
[visitor card timing](../screens/BuildingAdmin/AllRequestsScreen.tsx#L267-L356).

### Reports — `screens/Reports/ReportsScreen.tsx`

#### Export row count

- **Meaning/calculation:** after a successful CSV/XLSX export, the success
  message shows the server's `x-row-count` response header.
- **Source:** export endpoint response; this is an audit-export row count, not a
  persistent KPI.
- **Period/timezone:** selected start/end dates; default is the previous 30
  device-local calendar days through today.
- **Filters/pagination:** date range and file format only; no UI pagination,
  search, service, role, or status filter.
- **Interaction:** appears only after Download succeeds.
- **Caveat:** exported rows can legitimately differ from dashboard KPI
  populations.
- **Recommendation:** continue labeling it as exported audit rows rather than
  visitors or requests.

Sources:
[date and response logic](../screens/Reports/ReportsScreen.tsx#L27-L137),
[audit note and success count](../screens/Reports/ReportsScreen.tsx#L261-L315).

### Manage Users — `screens/Admin/UsersRolesScreen.tsx`

#### N employees

- **Meaning/calculation:** API pagination total for the current role/search user
  query; despite the wording, the selected role may not be Employee.
- **Source:** **API pagination total**.
- **Period/timezone/statuses:** no date, timezone, or lifecycle-status scope.
- **Filters/pagination:** role and search alter the server total; pagination
  changes the displayed page but not the filtered result total.
- **Interaction:** filter/search feedback, not a clickable KPI.
- **Caveat:** the “employees” noun is inaccurate for non-employee role filters.
- **Recommendation:** use “users” or the selected role name.

Source:
[query total and display](../screens/Admin/UsersRolesScreen.tsx#L240-L279),
[header](../screens/Admin/UsersRolesScreen.tsx#L1345-L1353).

#### Role/organization group and selection counts

- **Meaning/calculation:** each section count is the loaded row count in that
  group; bulk mode shows selected user IDs.
- **Source:** **loaded filtered list** / **local state**.
- **Filters/pagination:** counts apply to the current page and can differ from
  the API pagination total.
- **Interaction:** search, role filters, pagination, and row selection change
  them.
- **Recommendation:** label section counts as page/loaded counts if retained.

Sources:
[group counts](../screens/Admin/UsersRolesScreen.tsx#L1105-L1168),
[selection count](../screens/Admin/UsersRolesScreen.tsx#L1660-L1670).

### Reminder Rules — `screens/Admin/ReminderRulesScreen.tsx`

**No KPI on this screen.** It is an accessible configuration form and does not
render a business aggregate.

## 2. Manager

**Accessible screens:** Dashboard, Reports, New Request, My Requests, All
Requests, and Pending Approvals. Source:
[sidebar](../components/Sidebar.tsx#L74-L92),
[routes](../navigation/DashboardContainer.tsx#L345-L403).

### Dashboard — `screens/Dashboard/OverviewScreen.tsx`

#### Total Visitors

- **Meaning/calculation:** current manager's visits in the current Riyadh month
  with `approvedAt`, `approved`, or `visitor_accepted`.
- **Source:** **complete paginated query**, 100 rows per page until exhausted.
- **Period/timezone:** current `Asia/Riyadh` calendar month.
- **Statuses:** lifecycle-advanced rows are included only when `approvedAt`
  remains populated; pending/rejected/cancelled are excluded.
- **Filters/interaction:** dashboard filters do not change the card; it is
  presentational.
- **Caveat:** approved visits can be undercounted if later statuses lose the
  approval timestamp.
- **Recommendation:** define a durable server-side “approved visit” predicate
  across the full lifecycle.

Sources:
[monthly query](../screens/Dashboard/OverviewScreen.tsx#L366-L400),
[Manager cards](../screens/Dashboard/OverviewScreen.tsx#L595-L621).

#### Pending Requests

- **Meaning/calculation:** number of pending-approval rows currently loaded by
  the dashboard query.
- **Source:** **loaded filtered list**, capped by the query limit of 10.
- **Period/timezone:** no date scope.
- **Interaction:** presentational.
- **Caveat:** it is not the complete pending-approval total.
- **Recommendation:** use API pagination metadata or a summary endpoint.

Sources:
[query limit](../screens/Dashboard/OverviewScreen.tsx#L93-L98),
[mapped count and card](../screens/Dashboard/OverviewScreen.tsx#L273-L275),
[card](../screens/Dashboard/OverviewScreen.tsx#L603-L608).

#### Today's Visitors / Checked In

- **Meaning/calculation:** Today's Visitors counts the first 50 loaded
  manager-owned requests whose parsed visit date matches the device-local date.
  Checked In counts loaded requests with exact status `checked_in`, without a
  date restriction.
- **Source:** **loaded filtered list**.
- **Period/timezone:** Today is device-local; Checked In has no explicit period.
- **Statuses:** Today includes every loaded status; Checked In is exact.
- **Filters/interaction:** presentational and independent of the Upcoming Visits
  chips.
- **Caveat:** both can be incomplete because the source query is limited to 50.
- **Recommendation:** use complete Riyadh-scoped server aggregates and label
  Checked In “Currently checked in” if no date scope is intended.

Sources:
[source query](../screens/Dashboard/OverviewScreen.tsx#L86-L92),
[calculations](../screens/Dashboard/OverviewScreen.tsx#L470-L503),
[cards](../screens/Dashboard/OverviewScreen.tsx#L609-L620).

#### Upcoming Visits date-group counts

- **Meaning/calculation:** each heading counts rows in that date group after the
  monthly current-user population is filtered to today-or-later, sorted, and
  limited to the first 10.
- **Source:** **complete paginated query** before the 10-row preview limit.
- **Period/timezone:** current Riyadh month, from Riyadh today onward.
- **Statuses/filters:** All, To Be Checked
  (`expected|pending|approved|visitor_accepted`), Checked In, and Checked Out
  (`completed`) alter the preview.
- **Interaction:** filter chips alter counts; View All opens My Requests.
- **Caveat:** headings are preview counts, not daily system totals.
- **Recommendation:** retain as section feedback and avoid presenting them as
  KPI cards.

Sources:
[filter and preview](../screens/Dashboard/OverviewScreen.tsx#L402-L467),
[group headings](../screens/Dashboard/OverviewScreen.tsx#L924-L934).

### My Requests — `screens/Employee/VisitorRequestsScreen.tsx`

#### Total Visitors / Today's Visitors

- **Meaning/calculation:** Total Visitors is the API pagination total for the
  current manager's query, falling back to loaded rows. Today's Visitors counts
  only loaded rows whose parsed visit date matches the device-local date.
- **Source:** **API pagination total with loaded-list fallback** / **loaded
  filtered list**.
- **Period/timezone:** Total has the query's date scope; Today is device-local.
- **Statuses/filters:** search/date alter the query or local list. Status tabs
  filter the list but do not change either card.
- **Pagination:** Total is normally complete server metadata; Today can
  undercount until pages load.
- **Interaction:** cards are presentational.
- **Recommendation:** rename Total to “All my requests” and provide a
  Riyadh-scoped server Today count.

Sources:
[calculations](../screens/Employee/VisitorRequestsScreen.tsx#L690-L717),
[cards](../screens/Employee/VisitorRequestsScreen.tsx#L742-L749).

### Pending Approvals — `screens/Manager/ManagerDashboardScreen.tsx`

**No business KPI on this screen.** The bulk-action bar displays the number of
selected loaded rows, which is **local state** and workflow feedback rather than
a business metric. The list uses infinite pagination and local search.
Sources:
[query and loaded list](../screens/Manager/ManagerDashboardScreen.tsx#L422-L467),
[selection count](../screens/Manager/ManagerDashboardScreen.tsx#L211-L215).

### All Requests — `screens/Manager/ManagerAllRequestsScreen.tsx`

**No KPI on this screen.** It renders approval-history records with status/date
filters and infinite pagination but no user-facing aggregate.
Source:
[query and filtering](../screens/Manager/ManagerAllRequestsScreen.tsx#L289-L346).

### New Request — `screens/Employee/VisitorRequestFormScreen.tsx`

**No KPI on this screen.** It is a request-entry form.

### Reports — `screens/Reports/ReportsScreen.tsx`

The only aggregate is the **Export row count**, with the same source, date
scope, limitations, and interaction documented under
[Admin > Reports](#reports--screensreportsreportsscreentsx).

## 3. Employee

**Accessible screens:** Dashboard, Reports, New Request, and My Requests.
Source:
[sidebar](../components/Sidebar.tsx#L58-L73),
[routes](../navigation/DashboardContainer.tsx#L313-L343).

### Dashboard — `screens/Dashboard/OverviewScreen.tsx`

#### Total Visitors

Same complete current-user, current-Riyadh-month approved population described
under Manager. It includes `approvedAt`, `approved`, or `visitor_accepted`,
auto-pages to completion, and is noninteractive. The lifecycle timestamp caveat
and recommendation are also the same. Sources:
[calculation](../screens/Dashboard/OverviewScreen.tsx#L366-L400),
[Employee card](../screens/Dashboard/OverviewScreen.tsx#L574-L594).

#### Today's Visitors / Checked In

Today's Visitors counts the first 50 loaded employee-owned requests on the
device-local date, all statuses. Checked In counts loaded exact `checked_in`
requests without date restriction. Both are **loaded filtered list** values,
noninteractive, and potentially incomplete. **Recommendation:** replace with
complete Riyadh-scoped server aggregates and clarify Checked In's period.
Sources:
[source and calculations](../screens/Dashboard/OverviewScreen.tsx#L86-L92),
[counts and cards](../screens/Dashboard/OverviewScreen.tsx#L470-L503),
[Employee cards](../screens/Dashboard/OverviewScreen.tsx#L574-L594).

#### Upcoming Visits date-group counts

Same current-Riyadh-month, today-or-later, first-10 preview-group counts and
status-chip behavior described under Manager. They are section feedback, not
daily KPIs. Sources:
[preview](../screens/Dashboard/OverviewScreen.tsx#L402-L467),
[headings](../screens/Dashboard/OverviewScreen.tsx#L924-L934).

### My Requests — `screens/Employee/VisitorRequestsScreen.tsx`

**Total Visitors** is the employee query's API pagination total with loaded-list
fallback. **Today's Visitors** is the device-local-date count from loaded pages.
Search/date alter the query or local list; status tabs do not change the cards.
The cards are noninteractive. **Recommendation:** label Total “All my requests”
and use a Riyadh-aware server Today aggregate. Sources:
[calculation and filters](../screens/Employee/VisitorRequestsScreen.tsx#L690-L727),
[cards](../screens/Employee/VisitorRequestsScreen.tsx#L742-L749).

### New Request — `screens/Employee/VisitorRequestFormScreen.tsx`

**No KPI on this screen.** It is a request-entry form.

### Reports — `screens/Reports/ReportsScreen.tsx`

The only aggregate is the **Export row count**, with the same source, date
scope, limitations, and interaction documented under
[Admin > Reports](#reports--screensreportsreportsscreentsx).

## 4. Receptionist

**Accessible screens:** Receptionist Dashboard, All Visitors, Walk-In
Registration, and Today's Visitors through the dashboard's View All action.
Sources:
[sidebar](../components/Sidebar.tsx#L93-L100),
[dashboard actions](../screens/Receptionist/ReceptionistDashboardScreen.tsx#L635-L728).

### Receptionist Dashboard — `screens/Receptionist/ReceptionistDashboardScreen.tsx`

#### Total Visitors

- **Meaning/calculation:** all fully paginated current-Riyadh-month records with
  `approvedAt`, `approved`, or `visitor_accepted`.
- **Source:** **complete paginated query**.
- **Period/timezone:** current Riyadh calendar month.
- **Statuses/filters:** pending/rejected/cancelled are excluded; card is
  independent of section filters.
- **Interaction:** presentational.
- **Caveat:** lifecycle-advanced approved visits require `approvedAt` to remain
  populated.
- **Recommendation:** define one durable approved-visit predicate.

Source:
[query and calculation](../screens/Receptionist/ReceptionistDashboardScreen.tsx#L249-L282).

#### Expected Today

- **Meaning/calculation:** all visible active requests scheduled for the Riyadh
  business date.
- **Source:** **loaded filtered list** from the Today API.
- **Statuses:** includes pending/pending-host-approval, expected, approved,
  visitor-accepted, checked-in, checked-out/completed; rejected and cancelled
  are excluded by the receptionist visibility rule.
- **Filters/interaction:** KPI is presentational; section filters do not change
  it.
- **Recommendation:** preserve this definition in the API contract.

Sources:
[visible population](../screens/Receptionist/ReceptionistDashboardScreen.tsx#L215-L228),
[card](../screens/Receptionist/ReceptionistDashboardScreen.tsx#L572-L584).

#### Checked In / Pending

- **Meaning/calculation:** Checked In is Today API `summary.checkedIn`, falling
  back to visible exact `checked_in` rows. Pending is `summary.pending`, falling
  back to visible `pending|expected` rows.
- **Source:** **API summary with loaded-list fallback**.
- **Period/timezone:** Riyadh business date.
- **Filters/interaction:** presentational.
- **Caveat:** Pending is narrower than the dashboard's To Be Checked section,
  which also includes approved and visitor-accepted.
- **Recommendation:** rename Pending “Pending host approval” or align it with To
  Be Checked; require API summaries to use the visible active population.

Sources:
[summary fallback and filters](../screens/Receptionist/ReceptionistDashboardScreen.tsx#L230-L247),
[cards](../screens/Receptionist/ReceptionistDashboardScreen.tsx#L585-L597).

The dashboard's visitor section is limited to ten rows. Its date headings show
preview group lengths, not complete daily KPIs. The status chips filter All / To
Be Checked / Checked In / Checked Out. Sources:
[section behavior](../screens/Receptionist/ReceptionistDashboardScreen.tsx#L635-L693),
[group counts](../screens/Receptionist/ReceptionistDashboardScreen.tsx#L763-L778).

### Today's Visitors — `screens/Receptionist/AllVisitorsTodayScreen.tsx`

- **N expected today / Expected Visitors:** count of visible rows in the current
  Today API response. With **All** selected, this is the full active
  Riyadh-today population, including pending host approval and excluding
  rejected/cancelled. With Expected, Checked In, or Completed selected, the
  screen refetches a status-scoped response, so this count changes to that
  response's visible population. **Source:** **loaded filtered list**.
- **Checked In:** current Today response `summary.checkedIn`. **Source:** **API
  summary**; it may be status-scoped after a status-chip refetch.
- **Checked Out:** current Today response `summary.completed`. **Source:** **API
  summary**; the naming assumes completed means checked out and it may be
  status-scoped after a status-chip refetch.
- **Filters:** Expected, Checked In, and Completed are sent as API status
  parameters and therefore can change all three cards. Walk-In is filtered
  client-side and does not change the API response or KPI cards. Text search is
  also client-side and narrows the list without changing the KPI cards. The
  cards themselves are noninteractive.
- **Pagination:** none exposed.
- **Caveat:** the same “Expected Visitors” label describes the full active
  population under All and a status-scoped population under API-backed filters.
  Summary fields may also use a broader population than the client visibility
  predicate.
- **Recommendation:** publish one Riyadh-day summary contract with exact
  active-status inclusion and keep the KPI cards independent of list filters,
  or relabel them clearly as filtered counts.

Sources:
[population and filtering](../screens/Receptionist/AllVisitorsTodayScreen.tsx#L258-L316),
[header and cards](../screens/Receptionist/AllVisitorsTodayScreen.tsx#L422-L454).

### All Visitors — `screens/Receptionist/AllVisitorsScreen.tsx`

- **N visitors found:** number of visible records across pages loaded so far,
  after receptionist visibility, search, date, status, and walk-in filters.
- **Date-group counts:** loaded visible rows in each date group.
- **Source:** **loaded filtered list** from an infinite query, 30 rows per page.
- **Period/timezone:** selected date preset/custom range; date construction is
  not documented here as an explicit Riyadh conversion.
- **Statuses/filters:** waiting acceptance; accepted
  (`accepted|visitor_accepted`); walk-in; search; and date filters.
- **Interaction:** filters and pagination change counts.
- **Caveat:** “found” can imply a complete total before all pages load.
- **Recommendation:** say “shown” or use API pagination totals.

Sources:
[query and filters](../screens/Receptionist/AllVisitorsScreen.tsx#L104-L201),
[header and pagination](../screens/Receptionist/AllVisitorsScreen.tsx#L411-L420),
[groups](../screens/Receptionist/AllVisitorsScreen.tsx#L569-L612).

### Walk-In Registration — `screens/Employee/VisitorRequestFormScreen.tsx`

**No KPI on this screen.** It is the receptionist's walk-in request form.
Route source:
[registration route](../navigation/DashboardContainer.tsx#L439-L451).

## 5. Buffet Admin

**Accessible screen:** Buffet All Requests, which is both sidebar item and home.
Registered Buffet dashboard, overview, locations, staff, create-location, and
detail routes are excluded because the role has no direct sidebar/dashboard path
to them. Sources:
[sidebar](../components/Sidebar.tsx#L122-L126),
[home route](../navigation/DashboardContainer.tsx#L171-L180).

### Buffet All Requests — `screens/BuffetAdmin/BuffetAllRequestsScreen.tsx`

#### Total Requests / Completed

- **Meaning/calculation:** Total Requests is all loaded selected-date rows after
  eligibility filtering. Completed is the exact `completed` subset.
- **Source:** **loaded filtered list**; no pagination completion.
- **Period/timezone:** selected device-local date. A Riyadh offset is used only
  for sorting, not for count scope.
- **Statuses:** includes only `visitor_accepted`, `checked_in`, `checked_out`,
  and `completed`; pending/awaiting/rejected/cancelled are excluded.
- **Filters/interaction:** date arrows/picker change both; cards are
  noninteractive.
- **Caveat:** Total Requests counts eligible visit/task rows, while the label
  does not clarify visit eligibility versus buffet workflow.
- **Recommendation:** define and label the counted entity, and use the Riyadh
  business date.

Sources:
[date and eligibility](../screens/BuffetAdmin/BuffetAllRequestsScreen.tsx#L324-L394),
[calculations](../screens/BuffetAdmin/BuffetAllRequestsScreen.tsx#L461-L462),
[cards](../screens/BuffetAdmin/BuffetAllRequestsScreen.tsx#L627-L634).

#### N on duty

- **Meaning/calculation:** assignment-modal count of loaded staff with exact
  duty status `on_duty`.
- **Source:** **loaded filtered list**; no period or pagination guarantee.
- **Interaction:** contextual assignment feedback, not a KPI card.
- **Caveat:** on duty is treated as available regardless of workload.
- **Recommendation:** use a complete assignable-staff count and distinguish
  duty from availability.

Source:
[staff count](../screens/BuffetAdmin/BuffetAllRequestsScreen.tsx#L396-L402),
[modal display](../screens/BuffetAdmin/BuffetAllRequestsScreen.tsx#L519-L521).

## 6. Valet Admin

**Accessible screen:** Valet All Requests/Parking Dashboard, which is both
sidebar item and home. Registered detail and legacy Parking/Valet screens are
excluded. Sources:
[sidebar](../components/Sidebar.tsx#L127-L131),
[home route](../navigation/DashboardContainer.tsx#L171-L180).

### Valet All Requests — `screens/ValetAdmin/ValetAllRequestsScreen.tsx`

#### Total Visitors / Needs Parking / No Parking

- **Meaning/calculation:** API summary fields `totalVisitors`, `withParking`,
  and `withoutParking` for the selected date.
- **Source:** **API summary**.
- **Period/timezone:** selected date serialized with device-local getters; no
  explicit Riyadh conversion.
- **Statuses:** the summary's exact lifecycle population is not declared in the
  screen. The visible list independently permits approved, expected,
  visitor-accepted, checked-in, and completed rows, then requires parking.
- **Filters/pagination:** date only; no search/status filter or client
  pagination handling.
- **Interaction:** cards are noninteractive; date picker changes values.
- **Caveat:** Total Visitors can differ from the eligible parking list. Do not
  assume with/without parking are exhaustive complements unless guaranteed by
  the API.
- **Recommendation:** document the server summary population, align it with the
  visible list, and use an explicit Riyadh business date.

Sources:
[summary and visible population](../screens/ValetAdmin/ValetAllRequestsScreen.tsx#L280-L325),
[cards and date control](../screens/ValetAdmin/ValetAllRequestsScreen.tsx#L345-L365).

## 7. Security

**Accessible screen:** Visitor Verification/Check In, which is both sidebar item
and home. Security detail and Gate Events Log are excluded because they are not
direct sidebar/dashboard surfaces. Sources:
[sidebar](../components/Sidebar.tsx#L100-L111),
[home route](../navigation/DashboardContainer.tsx#L171-L180).

### Visitor Verification — `screens/Security/SecurityCheckInScreen.tsx`

#### All / Expected / Checked In / Checked Out filter counts

- **Meaning/calculation:** All is the selected-date/range loaded list length;
  the others count exact mapped `expected`, `checked_in`, and `checked_out`
  statuses.
- **Source:** **loaded filtered list**, query limit 100 with no completion loop.
- **Period/timezone:** selected date/range serialized and compared using
  device-local dates.
- **Statuses:** upstream visible records allow approved, visitor-accepted,
  checked-in/on-site, and checked-out/completed; pending/rejected/cancelled are
  excluded.
- **Filters:** counts apply before local text search and selected status. Search
  and status then narrow the displayed list.
- **Interaction:** pressing a chip changes the visible list.
- **Caveat:** counts can be capped at 100 and can exceed the post-search visible
  count.
- **Recommendation:** label as loaded results or use complete, Riyadh-aware API
  totals.

Sources:
[query and visibility](../screens/Security/SecurityCheckInScreen.tsx#L176-L209),
[date/search/status filtering](../screens/Security/SecurityCheckInScreen.tsx#L246-L293),
[counts](../screens/Security/SecurityCheckInScreen.tsx#L330-L339),
[filter chips](../screens/Security/SecurityCheckInScreen.tsx#L670-L713).

#### Date-header visitor count

- **Meaning/calculation:** `filteredVisitors.length` after date, search, and
  selected status filtering.
- **Source:** **loaded filtered list**, capped at 100.
- **Interaction:** date, search, and status alter it.
- **Caveat/recommendation:** it is a visible-results count, not a complete
  security KPI; label accordingly or use API totals.

Sources:
[calculation](../screens/Security/SecurityCheckInScreen.tsx#L270-L293),
[header](../screens/Security/SecurityCheckInScreen.tsx#L670-L676).

---

**Cross-screen duplicate-label index**

| Label | Screens/modules | Important difference |
|---|---|---|
| Total Visitors | Manager/Employee Dashboard, Manager/Employee My Requests, Receptionist Dashboard, Valet Admin | Monthly approved current-user count; API request total; monthly approved building count; and selected-date valet API summary are different populations. |
| Today's Visitors / Expected Today | Manager/Employee Dashboard, Manager/Employee My Requests, Receptionist Dashboard/Today | Employee/Manager values are device-local loaded-list counts. Receptionist uses the active Riyadh Today population on the All filter, but the dedicated Today screen becomes status-scoped for API-backed status chips. |
| Checked In | Manager/Employee Dashboard, Receptionist Dashboard/Today, Security chips | No-date loaded current-user count; Riyadh Today API summary; and selected-device-date loaded security list are different. |
| Pending | Manager Dashboard, Receptionist Dashboard, Admin All Requests | Loaded pending approvals capped at 10; Today pending/expected summary; and unified normalized pending rows are different. |
| Total Requests / All | Buffet Admin, Admin All Requests, Security | Selected-date eligible buffet rows; unified loaded requests; and loaded security visitors are different entities. |

**Discrepancies and business risks**

1. Identical labels frequently count different entities, periods, statuses, and
   data completeness levels.
2. Several “Today” values use device-local dates while Receptionist business
   metrics use Riyadh, so users in other timezones can see conflicting totals.
3. Loaded-list counts are often presented without signaling page limits (50 or
   100) or incomplete infinite scrolling.
4. Admin All Requests top cards are not reliably aligned with the selected
   service, especially Valet.
5. Receptionist Expected Today is intentionally broader than approved visits
   under the All filter: it includes active requests awaiting host approval and
   excludes rejected/cancelled records. The dedicated Today screen's KPI
   population becomes status-scoped when an API-backed status chip is selected.

**Audit verification**

- The role allowlist comes from the requested catalog scope: Admin, Manager,
  Employee, Receptionist, Buffet Admin, Valet Admin, and Security only.
- Reachability within those seven roles was established from
  [Sidebar role menus](../components/Sidebar.tsx#L52-L155) and
  [role home routes](../navigation/DashboardContainer.tsx#L171-L230).
- Direct dashboard targets were included only when a visible dashboard action
  opens them; record-card destinations were excluded.
- Shared Notifications and Settings were excluded because they are utilities,
  not role KPI surfaces
  ([shared sidebar items](../components/Sidebar.tsx#L303-L315)).
- Explicitly excluded examples include the generic Admin dashboard, Building
  Admin Control Center, Buffet Admin dashboard/overview, legacy Buffet
  Administration/Settings, legacy Valet Tasks, record detail screens, and
  stack-registered-only routes.
- Visitor, Buffet Staff, and Valet Driver are excluded because they are outside
  the explicit module allowlist, not because their home/sidebar routes are
  inaccessible.
- The seven `##` module sections above are the complete **requested** catalog
  scope, not an inventory of every role defined by the application.