# SKBC VMS – Replit Prompts for Filling Functional Gaps

> Use these prompts with Replit AI (Plan/Code modes) to implement the **missing modules & flows** identified in `SKBC_VMS_Gaps_Backlog.md`.  
> Each section is a **copy‑pasteable prompt**, scoped to a specific module.  
> Context (same for all prompts):  
> - Existing React Native app (iOS, Android, React Native Web)  
> - Roles: Employee (Staff), Manager/Approver, Receptionist, Security, Buffet Admin/Staff, Valet Admin/Driver, Building Admin/System Admin, Visitor (external)  
> - Shared in‑app data layer, DALLAH DIGITAL theme, EN + AR (RTL) support  
> - Do **not** scaffold a new app or break existing navigation/business logic.

---

## 1. Building Admin / System Admin

```text
You are working in an EXISTING React Native VMS codebase (SKBC Visitor Management System) targeting:
- iOS
- Android
- React Native Web

DO NOT scaffold a new app and DO NOT change existing navigation or business logic beyond what is needed to add the new functionality.

Goal: Extend the Building Admin / System Admin area to cover all missing configuration and ops views:

1) Meeting Room Catalog & Setup
- Create a Meeting Room Catalog screen for Building Admin/System Admin that allows:
  - Listing all meeting rooms with: name, floor, capacity, features, active/inactive.
  - Adding/editing/deactivating rooms.
- Use the shared data layer (in-memory for now) to store meeting room entities.

2) Meeting Room Calendar / Schedule
- Create a Meeting Room Schedule view:
  - Day/week view of bookings across rooms, based on existing visit/meeting data.
  - Ability to filter by room, date, and floor.
- This is read-only for now; it should read from the same data used for visitor requests + meeting room flag.

3) Ammam / Meeting Operations View
- Create an Ammam/Meeting Operations screen:
  - Focus on “today’s meetings”: room, time, host, visitors, status.
  - Highlight conflicts or unassigned rooms (if any).
- It can reuse the same data as the schedule view but in a list/table optimized for day-of operations.

4) Employee Parking Assignment
- Extend admin parking configuration with:
  - A view to map employees → parking bays.
  - At minimum: list of employees, list of bays, simple assignment UI.
  - Store assignments in the shared data layer (no real Oracle HCM integration yet).

5) Parking Occupancy & Availability Dashboard
- Add a Parking Overview/Occupancy screen for Building Admin:
  - Summaries for: total bays, bays assigned to employees, bays freed because employees are off, bays used by visitors, free bays.
  - Use existing visit + parking allocation data to compute counts.

6) Valet Zones / Locations Setup
- Extend parking/valet settings with:
  - Valet zones (e.g., SKBC basement, Red Sea Mall, other locations).
  - Each zone: name, type, capacity, priority order.
- Store in the shared data layer and ensure parking allocation logic can reference these zones later.

7) Notification Templates & Channels Configuration
- Create an Admin “Communication Settings” screen:
  - For each event type (request approved, parking assigned, valet assigned, buffet request created, visitor auto-cancel, etc.), allow toggling channels: QR (link + code), WhatsApp, SMS, Email.
  - Provide a simple template editor for subject/body with placeholder tokens (host name, visitor name, meeting time, parking info, room name).
- This is configuration-only; no real sending yet.

8) Reminder Rules & Auto-Cancel Settings
- Extend System Rules (or create a sub-screen) to configure:
  - First reminder delay (default 2 working hours).
  - Second reminder delay (default +2 hours).
  - Auto-cancel delay after second reminder (default 1 hour).
  - Working hours / office start time, used when meetings are after office hours.
- Store these values in the shared data layer; you only need to reflect them in UI and simulated scheduling logic, not real cron jobs.

9) Integrations Health & Status
- Create an Integrations Status screen for System Admin:
  - Entries for Outlook/Exchange, Oracle HCM, Speed Gate API, WhatsApp/SMS gateway, Email gateway.
  - For now, mock fields: status (OK/Degraded/Down), last sync time, last error message.
- No real external calls; this is a monitoring stub for the prototype.

10) Biometric Auth Settings
- Extend System Admin or global Settings:
  - Configuration flags for “Biometric login allowed” (global) and per-role if needed.
  - Show read-only info about whether the current device supports biometrics (can be mocked).
- Do NOT implement actual biometric auth here, only expose the settings and UI.

11) Global Analytics / KPIs
- Add an Analytics or Overview screen for admins that summarizes:
  - Visits per day (last 7/30 days).
  - No-show rate (invited vs checked-in).
  - Parking utilization rate.
  - Valet tasks per day.
  - Buffet events per day.
- Use the existing in-app data layer to compute and display basic charts or metric cards.

Implementation notes:
- Reuse the DALLAH DIGITAL theme (colors, typography, spacing).
- Use existing base components where possible (buttons, cards, lists).
- Keep everything mobile-first but ensure layouts remain usable on web.
```

---

## 2. Meeting Rooms / Ammam

```text
You are working in the existing SKBC VMS React Native app (iOS, Android, Web).

Goal: Complete the Meeting Rooms / Ammam flows on top of the shared data layer and existing request/meeting logic.

Tasks:

1) Meeting Room Detail Screen
- Create a MeetingRoomDetail screen that shows:
  - Room metadata: name, floor, capacity, features, active/inactive.
  - Upcoming bookings for this room (e.g., today + next few days).
- Data comes from:
  - Meeting room catalog (admin-defined).
  - Visit/meeting requests that have a room assigned.

2) Manual Room Override / Re-assign Flow
- On MeetingRoomDetail or VisitDetail screen, allow authorized roles (Ammam/Building Admin) to:
  - Change the assigned room for a given meeting.
- When reassigning:
  - Enforce basic checks (room is active, has capacity).
  - Update the visit record in the shared data layer.
  - Append a log entry in the internal notifications/event log describing the change.

3) Room Out-of-Service / Maintenance Toggle
- On MeetingRoomDetail or catalog edit screen:
  - Add a toggle to mark the room “out of service”.
  - When out-of-service:
    - Prevent new auto-assignments to that room.
    - Highlight existing future bookings so Ammam can move them manually.

4) Ammam-Focused View Integration
- Ensure Ammam’s “today’s meetings” view:
  - Uses the same room metadata.
  - Clearly indicates rooms that are out-of-service or over-booked.
- No real Outlook integration yet; treat Outlook as a future integration layer.

Keep changes localized:
- Use existing navigation entries for Ammam/Building Admin.
- Do not break staff/manager flows; only extend meeting-room-related capabilities.
```

---

## 3. Parking & Valet (System-Level)

```text
You are working in the existing SKBC VMS React Native app (iOS, Android, Web).

Goal: Complete the system-level Parking & Valet configuration and monitoring views.

Tasks:

1) Parking Spot List Management
- Create a ParkingSpots screen for Building Admin:
  - List all parking bays/spots with fields: ID, location/level, type (visitor/employee/valet/reserved), active flag.
  - Allow adding/editing/deactivating spots.
- Store parking spots in the shared data layer.

2) Parking Priority Rules UI
- Extend parking/valet settings with a simple UI to configure:
  - Priority order: SKBC basement → Red Sea Mall → Valet → None (default).
  - Optional thresholds (e.g., maximum occupancy % per location).
- Store these as configuration in the data layer; for now just ensure the allocation logic can read them.

3) Parking Utilization View
- Add a ParkingUtilization screen:
  - Show current snapshot (today): total spots, used, free, by location and type.
  - Optionally show a simple history (last X days) using in-app events/logs.

4) Valet Driver Fairness / Load View
- For Valet Admin, create a DriverLoad screen:
  - For each driver: number of tasks today, this week, status (busy/idle).
  - Data comes from existing valet tasks in the shared data layer.
- This is read-only; its purpose is to prove the “balanced sharing of assignments” requirement.

Note:
- Do NOT implement external hardware integration here.
- Keep it mobile-first but ensure layouts are still usable on web.
```

---

## 4. Employee (Staff Initiator)

```text
You are working in the existing SKBC VMS React Native app (iOS, Android, Web) with a Staff (Employee) role and a shared data layer.

Goal: Extend the Staff experience to cover employee self-valet requests and richer visit lifecycle management.

Tasks:

1) Employee Self-Valet (“Park My Car”) Screen
- Add a new screen accessible from Staff home (e.g., “My Valet Requests” or “Park My Car”):
  - Simple form for the employee’s own car: plate number, brand/model, color, drop-off location (default SKBC), and desired return time.
  - On submit, create a valet task in the shared data layer linked to the employee (not to a visitor).
- No approval is needed for these tasks.

2) My Valet Requests / History
- On the same or a separate screen, show:
  - A list of the employee’s valet tasks (today + recent history).
  - Status: requested, driver assigned, parked, ready for pickup, completed.
- Reuse existing valet task data structures where possible.

3) Visit Reschedule Flow
- Extend VisitDetail for Staff:
  - Add a “Reschedule” action allowing change of date/time (and optionally duration).
  - When rescheduled:
    - Update the visit record in the shared data layer.
    - Flag that meeting room/parking/buffet/valet allocations may need recalculation (you can simulate this by recomputing derived fields).
    - Append a log entry to the internal event log.

4) Visit Cancel Flow
- Extend VisitDetail for Staff:
  - Add a “Cancel Visit” action.
  - On cancel:
    - Mark the visit as canceled in the data layer.
    - Mark associated parking/buffet/valet tasks as canceled or inactive.
    - Append an event log entry for cancellation (no real notifications yet).

5) “Waiting on Visitor Acceptance” Filter
- On Staff request list:
  - Add a filter or tab to show visits:
    - Approved by manager (if required),
    - Sent to visitor,
    - But not yet accepted/rejected by the visitor.
- This filter should use the existing visit + visitor-decision fields in the data layer.

Do not change:
- Core Staff navigation structure.
- Existing request creation logic beyond adding reschedule/cancel and self-valet flows.
```

---

## 5. Manager / Approver

```text
You are working in the existing SKBC VMS React Native app (iOS, Android, Web) with a Manager/Approver role.

Goal: Enhance the Manager experience with bulk actions and better visibility into visitor response and walk-ins.

Tasks:

1) Bulk Approval/Reject
- On the Manager pending-requests list:
  - Add multi-select capability (checkboxes or selection mode).
  - Provide “Approve Selected” and “Reject Selected” actions.
- When triggered:
  - Update the status of all selected visits in the data layer.
  - Append an event log entry per visit (e.g., “Bulk approved by [manager]”).

2) “Pending Visitor Response” Tab/Filter
- Add a dedicated view or filter for visits:
  - Already approved by the manager (when approval is required).
  - Invitation sent to the visitor.
  - Visitor has not yet accepted or rejected.
- This helps managers see which meetings are blocked on visitor response.

3) Walk-in Approval Visibility
- Ensure Manager/Host sees walk-in requests initiated by Reception:
  - Add a filter or badge indicating “Walk-in pending approval”.
  - Manager can approve/reject from the same approval detail screen.

Notes:
- Reuse existing Manager list/detail screens; extend them rather than creating entirely separate stacks.
- Keep all logic in the in-app data layer (no real backend).
```

---

## 6. Receptionist

```text
You are working in the existing SKBC VMS React Native app (iOS, Android, Web) with a Receptionist role.

Goal: Enhance Reception tools for guiding visitors and handling exceptions when communication fails.

Tasks:

1) “Today’s Meetings by Room” Panel
- Add a view/panel in the Reception dashboard showing:
  - For today: list of rooms with upcoming meetings, time slots, host, visitor name(s), status.
- This is room-centric rather than visitor-centric and reuses meeting/room data from the shared data layer.

2) Manual Exception Handling Panel
- Extend Reception visitor detail or add a small “Exceptions” screen:
  - Allow the receptionist to mark a visit as “Manual override due to communication failure” or “QR issue”.
  - Record how visitor was guided (e.g., which floor/room).
- On marking an exception:
  - Append an event log entry for later review by Security/Admin.

3) Receptionost is only allowed to book the walkin visitor. not buffet, Parking and Meeting room

Keep changes minimal:
- Do not disturb existing receptionist flows for walk-in entry and check-in/out.
- Use existing theme/components.
```

---

## 7. Security

```text
You are working in the existing SKBC VMS React Native app (iOS, Android, Web) with a Security role.

Goal: Give Security a better operational view over visitors and gate events.

Tasks:

1) Security Dashboard – Today’s Visitors
- Create a SecurityDashboard screen:
  - Show today’s visitors grouped by status: expected, checked-in, left, canceled.
  - Show key info: visitor name, host, meeting time, room, parking/valet info.
- Use existing visit + check-in data from the shared data layer.

2) Gate Events Log
- Implement a GateEventsLog screen:
  - List recent gate scan events: timestamp, visitor/visit ID, result (allowed/denied), method (QR/manual).
  - For now, simulate events based on Security check-in/out actions and gate-screen interactions.

3) “No Parking / No Valet” Visibility
- On Security check-in and visitor detail:
  - Clearly display if the visitor’s record indicates:
    - parking available, valet available, or no parking.
- Use the same parking/valet allocation fields used by Staff/Visitor views.

Notes:
- No real speed gate integration yet; treat the events log as a simulation based on actions inside the app.
- Keep screens mobile-first and readable in web layout.
```

---

## 8. Buffet Admin & Buffet Staff

```text
You are working in the existing SKBC VMS React Native app (iOS, Android, Web) with Buffet Admin and Buffet Staff roles.

Goal: Complete the buffet details UI and provide capacity/load views per location.

Tasks:

1) Complete Buffet Request Details Screen
- Finish the BuffetRequestDetails screen:
  - Show linked visit(s): host, visitor, date/time, meeting room.
  - Show requested buffet details: location, number of guests, type (if applicable), time window.
  - Show current buffet status: new, in preparation, ready, served, completed.
- Allow Buffet Admin/Staff to update status with simple actions.

2) Buffet Capacity / Load Overview
- Add a BuffetOverview screen for Buffet Admin:
  - For each buffet location:
    - Number of events today.
    - Total expected guests.
    - Current status breakdown (e.g., preparing/ready/served).
- Data comes from buffet tasks/requests in the shared data layer.

Notes:
- Do not change existing buffet navigation; attach the new views where they make the most sense (e.g., from BuffetAdminDashboard).
- Keep flows consistent with DALLAH DIGITAL theme and existing components.
```

---

## 9. Visitor (External)

```text
You are working in the existing SKBC VMS React Native/Web app with an external Visitor invite view.

Goal: Improve the visitor invite experience to handle expired/invalid links and clearly show parking/valet expectations.

Tasks:

1) Expired / Auto-Cancel Invite State
- Extend the VisitorInvite screen:
  - Detect when the associated visit is in an auto-cancelled/expired status.
  - Show a distinct state: “This invitation has expired or has been cancelled” with explanation.
  - Hide accept/reject actions in this state.

2) Invalid / Unknown Invite Token State
- Handle the case where the invite link token or ID does not map to any visit:
  - Show a friendly error page: “We couldn’t find this invitation. It may be invalid or expired.”
  - Provide a suggestion: contact host or reception.

3) Clear Parking / Valet Expectation Text
- On valid invites:
  - Based on visit parking allocation:
    - Show one of: “Parking available at SKBC basement”, “Valet service available”, or “Parking is not available – please self-park elsewhere.”
  - Keep the language visitor-friendly and concise.

Notes:
- All logic should rely on the existing shared data layer; no external system calls.
- Ensure this works well in web (most visitors will open the invite on mobile browsers).
```

---

## 10. Notifications & Reminders (User-Level & System-Level)

```text
You are working in the existing SKBC VMS React Native app (iOS, Android, Web) with an internal notifications module and System Rules.

Goal: Extend notifications and reminders to include user-level preferences and better system-wide visibility.

Tasks:

1) Per-User Notification Preferences
- Extend the existing Settings screen:
  - For each internal role, expose preferences such as:
    - Enable/disable push notifications (future).
    - Email summaries (daily/weekly) – configuration only.
    - Optional toggles for particular event types (e.g., “request updates”, “buffet tasks”, “valet tasks”).
- Store these preferences in the shared data layer per user.

2) System-Wide Event Log
- Implement a SystemEventLog screen for Admin:
  - Show chronological events such as:
    - Visit created, approved, rejected, canceled.
    - Visitor accepted/rejected/expired.
    - Parking/valet/buffet tasks created or updated.
  - This should read from the same log source already used internally (extend it if needed).

3) Reminder Scheduler Visualization
- Add a simple ReminderSchedule view for System Admin:
  - List upcoming reminder events computed from:
    - Visitor invitations and system reminder rules (first reminder, second reminder, auto-cancel).
  - Each entry: visit ID, visitor, host, next reminder type, planned time.
- This is still in-app simulation; no real background jobs.

Notes:
- Do not implement real push/email sending; focus on configuration, logging, and visibility.
- Keep screens minimal yet clear enough for an admin to validate times and rules.
```

---

## 11. Integrations (Monitoring Surfaces)

```text
You are working in the existing SKBC VMS React Native app (iOS, Android, Web).

Goal: Provide monitoring UIs for major external integrations, matching the original scope.

Tasks:

1) Outlook / Meeting Room Sync Status
- In the Integrations Status or a dedicated Outlook section:
  - Show fields: connection status (mocked), last sync time, last sync result (OK/error), number of meetings synced.
- Data can be static/mock for now but should be structured for future real integration.

2) Oracle HCM Attendance / Vacation Sync Status
- Add an Oracle HCM section:
  - Fields: connection status, last sync time, number of employee records updated, any sync errors.
  - Optionally a quick link showing how many employees are currently marked as off/vacation (used for freeing parking bays).

3) Speed Gate API Status & Last Event
- Add a Speed Gate section:
  - Fields: connection status, last event time, last event type (allowed/denied), gate identifier.
- Tie this conceptually to your Gate Events Log (Security), but keep the integration-status view admin-oriented.

4) WhatsApp/SMS/Email Gateway Status
- Add communication gateways section:
  - For each channel (WhatsApp, SMS, Email):
    - Status (mock), last send attempt time, error count in last 24 hours.
- Use this only as a read-only monitoring surface for now.

Notes:
- All integration statuses can be mocked/simulated in the data layer.
- The main goal is to have the right UI surfaces and data shapes ready for future real API wiring.
```

---

You can save this file as `SKBC_VMS_Replit_Prompts_For_Gaps.md` in your repo and copy individual prompts into Replit AI as you work through each module.
