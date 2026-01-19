# Notification Localization - Backend Implementation Guide

## Overview

To enable frontend localization of notifications, the backend API needs to include a `params` object in the notification response. This allows the mobile app to construct localized messages using translation templates while keeping dynamic values (names, dates, etc.) from the server.

**Important:** The existing `title` and `message` fields should remain unchanged for backward compatibility. The mobile app will use them as fallback when `params` is not available.

---

## API Response Format

### Current Format
```json
{
  "id": "F34BC6CF-1D51-4C0B-8C5C-1FFB5E2CFCAA",
  "type": "request_approved",
  "title": "Visit Request Approved",
  "message": "Your visit request for Employee Approve has been approved by John Manager.",
  "timestamp": "2026-01-18T23:15:02.910Z",
  "read": true,
  "requestId": "C2656A10-69EE-4B16-B0CF-9CA59457D65E",
  "actionRequired": false,
  "priority": "high"
}
```

### Updated Format (Add `params` field)
```json
{
  "id": "F34BC6CF-1D51-4C0B-8C5C-1FFB5E2CFCAA",
  "type": "request_approved",
  "title": "Visit Request Approved",
  "message": "Your visit request for Employee Approve has been approved by John Manager.",
  "params": {
    "visitorName": "Employee Approve",
    "managerName": "John Manager"
  },
  "timestamp": "2026-01-18T23:15:02.910Z",
  "read": true,
  "requestId": "C2656A10-69EE-4B16-B0CF-9CA59457D65E",
  "actionRequired": false,
  "priority": "high"
}
```

---

## Notification Types and Required Params

### Visit Request Notifications

| Type | Description | Required Params | Example Message |
|------|-------------|-----------------|-----------------|
| `request_created` | New visit request created | `visitorName`, `hostName` | "New visit request created for {visitorName} to meet {hostName}" |
| `request_approved` | Visit request approved by manager | `visitorName`, `managerName` | "Your visit request for {visitorName} has been approved by {managerName}" |
| `request_rejected` | Visit request rejected by manager | `visitorName`, `managerName`, `reason` | "Your visit request for {visitorName} has been rejected by {managerName}. Reason: {reason}" |
| `request_cancelled` | Visit request cancelled | `visitorName`, `cancelledBy` | "Visit request for {visitorName} has been cancelled by {cancelledBy}" |
| `request_updated` | Visit request updated | `visitorName`, `updatedBy` | "Visit request for {visitorName} has been updated by {updatedBy}" |
| `request_modified` | Meeting room booked/failed | `roomName` OR `error` | Success: "Meeting room \"{roomName}\" has been booked for your visit" / Error: "Unable to book a meeting room: {error}. Please update your request" |
| `pending_approval` | Visit awaiting approval | `visitorName`, `hostName` | "Visit request from {visitorName} to {hostName} is awaiting your approval" |

### Visitor Response Notifications

| Type | Description | Required Params | Example Message |
|------|-------------|-----------------|-----------------|
| `visitor_accepted` | Visitor accepted the invitation | `visitorName` | "{visitorName} has accepted the visit invitation" |
| `visitor_rejected` | Visitor declined the invitation | `visitorName` | "{visitorName} has declined the visit invitation" |
| `visitor_arrival` | Visitor has arrived | `visitorName` | "{visitorName} has arrived at reception" |
| `visitor_no_show` | Visitor did not show up | `visitorName` | "{visitorName} did not arrive for the scheduled visit" |

### Walk-in Notifications

| Type | Description | Required Params | Example Message |
|------|-------------|-----------------|-----------------|
| `walk_in_registered` | Walk-in visitor at reception | `visitorName`, `company` | "{visitorName} from {company} is at reception to see you. Please approve or reject this visit" |

### Check-in/Check-out Notifications

| Type | Description | Required Params | Example Message |
|------|-------------|-----------------|-----------------|
| `check_in` | Visitor checked in | `visitorName` | "{visitorName} has checked in" |
| `check_out` | Visitor checked out | `visitorName` | "{visitorName} has checked out" |

### Reminder Notifications

| Type | Description | Required Params | Example Message |
|------|-------------|-----------------|-----------------|
| `reminder_tomorrow` | Visit reminder for tomorrow | `visitorName`, `visitDate` | "Reminder: {visitorName} is scheduled to visit tomorrow ({visitDate})" |
| `reminder_2hours` | Visit reminder - 2 hours before | `visitorName`, `visitTime` | "Reminder: {visitorName} is arriving in 2 hours at {visitTime}" |
| `reminder_30min` | Visit reminder - 30 minutes before | `visitorName`, `visitTime` | "Reminder: {visitorName} is arriving in 30 minutes at {visitTime}" |
| `reminder_now` | Visitor arriving now | `visitorName` | "{visitorName} should be arriving now" |
| `expected_today` | Daily agenda notification | `visitorCount` | "You have {visitorCount} visitor(s) expected today" |
| `visitor_reminder` | Reminder sent to visitor | `visitorName`, `reminderType` | "{reminderType} reminder sent to {visitorName}" |

**Note:** `reminderType` should be either `"first"` or `"final"`

### Auto-Cancellation Notifications

| Type | Description | Required Params | Example Message |
|------|-------------|-----------------|-----------------|
| `auto_cancelled` | Visit auto-cancelled due to no response | `visitorName` | "Visit request for {visitorName} was auto-cancelled due to no response. Resources have been released" |

### Meeting Room Notifications

| Type | Description | Required Params | Example Message |
|------|-------------|-----------------|-----------------|
| `room_booked` | Meeting room booked | `roomName`, `visitDate`, `visitTime` | "Meeting room {roomName} has been booked for {visitDate} at {visitTime}" |
| `room_reminder` | Meeting room reminder | `roomName`, `visitTime` | "Reminder: Meeting in {roomName} at {visitTime}" |
| `room_cancelled` | Room booking cancelled | `roomName` | "Meeting room booking for {roomName} has been cancelled" |
| `room_conflict` | Room booking conflict | `roomName`, `conflictTime` | "Conflict detected for {roomName} at {conflictTime}" |
| `room_reassigned` | Room reassigned | `oldRoom`, `newRoom` | "Your meeting has been moved from {oldRoom} to {newRoom}" |

### Parking Notifications

| Type | Description | Required Params | Example Message |
|------|-------------|-----------------|-----------------|
| `parking_assigned` | Parking spot assigned | `visitorName`, `spotNumber` | "Parking spot {spotNumber} has been assigned for {visitorName}" |
| `parking_full` | Parking is full | `visitorName` | "Parking is currently full. Visitor {visitorName} will need alternative arrangements" |

### Buffet Service Notifications

| Type | Description | Required Params | Example Message |
|------|-------------|-----------------|-----------------|
| `buffet_new_request` | New buffet request | `hostName`, `guestCount` | "New buffet request from {hostName} for {guestCount} guests" |
| `buffet_request_created` | Buffet request created | `hostName` | "Buffet request created by {hostName}" |
| `buffet_task_assigned` | Task assigned to staff | `taskType`, `location` | "New {taskType} task assigned at {location}" |
| `buffet_scheduled` | Buffet scheduled | `scheduledTime`, `location` | "Buffet service scheduled for {scheduledTime} at {location}" |
| `buffet_status_update` | Buffet status changed | `status`, `location` | "Buffet at {location} status updated to {status}" |
| `buffet_staff_update` | Staff assignment updated | `staffName`, `location` | "{staffName} assigned to buffet at {location}" |
| `buffet_completed` | Buffet service completed | `location` | "Buffet service at {location} has been completed" |

### Valet Service Notifications

| Type | Description | Required Params | Example Message |
|------|-------------|-----------------|-----------------|
| `valet_new_request` | New valet request | `visitorName`, `vehicleInfo` | "New valet request for {visitorName} - {vehicleInfo}" |
| `valet_task_assigned` | Valet task assigned | `visitorName`, `driverName` | "Valet task for {visitorName} assigned to {driverName}" |
| `valet_scheduled` | Valet scheduled | `visitorName`, `scheduledTime` | "Valet service for {visitorName} scheduled at {scheduledTime}" |
| `valet_completed` | Valet service completed | `visitorName` | "Valet service for {visitorName} has been completed" |
| `valet_cancelled` | Valet service cancelled | `visitorName` | "Valet service for {visitorName} has been cancelled" |

### Security Notifications

| Type | Description | Required Params | Example Message |
|------|-------------|-----------------|-----------------|
| `security_access_update` | Access permissions updated | `visitorName`, `accessLevel` | "Access level for {visitorName} updated to {accessLevel}" |
| `security_gate_pass` | Gate pass issued | `visitorName`, `gateNumber` | "Gate pass issued for {visitorName} at Gate {gateNumber}" |

---

## Implementation Notes

1. **Backward Compatibility:** Always include the existing `title` and `message` fields. The mobile app will use them as fallback.

2. **Null Handling:** If a param value is not available, either:
   - Omit the param from the object
   - Set it to an empty string `""`
   - The mobile app will handle missing params gracefully

3. **Param Types:** All param values should be strings for consistency.

4. **Names Format:** Use the full display name format (e.g., "John Smith" not just "John").

5. **Date/Time Format:** Use ISO 8601 format or a human-readable format that works in both languages (e.g., "Jan 18, 2026" or "18 Jan 2026").

---

## Example Responses

### Request Approved
```json
{
  "type": "request_approved",
  "title": "Visit Request Approved",
  "message": "Your visit request for Ahmed Hassan has been approved by John Manager.",
  "params": {
    "visitorName": "Ahmed Hassan",
    "managerName": "John Manager"
  }
}
```

### Request Rejected
```json
{
  "type": "request_rejected",
  "title": "Visit Request Rejected",
  "message": "Your visit request for Sarah Ahmed has been rejected by John Manager. Reason: Schedule conflict.",
  "params": {
    "visitorName": "Sarah Ahmed",
    "managerName": "John Manager",
    "reason": "Schedule conflict"
  }
}
```

### Walk-in Registered
```json
{
  "type": "walk_in_registered",
  "title": "Walk-in Visitor",
  "message": "Mohammed Ali from ABC Company is at reception to see you. Please approve or reject this visit.",
  "params": {
    "visitorName": "Mohammed Ali",
    "company": "ABC Company"
  }
}
```

### Auto-Cancelled
```json
{
  "type": "auto_cancelled",
  "title": "Visit Auto-Cancelled",
  "message": "Visit request for Fatima Ahmed was auto-cancelled due to no response. Resources have been released.",
  "params": {
    "visitorName": "Fatima Ahmed"
  }
}
```

### Visitor Reminder
```json
{
  "type": "visitor_reminder",
  "title": "Visitor Reminder Sent",
  "message": "First reminder sent to Omar Hassan for pending visit response.",
  "params": {
    "visitorName": "Omar Hassan",
    "reminderType": "first"
  }
}
```

```json
{
  "type": "visitor_reminder",
  "title": "Final Visitor Reminder",
  "message": "Final reminder sent to Omar Hassan. Auto-cancellation imminent if no response.",
  "params": {
    "visitorName": "Omar Hassan",
    "reminderType": "final"
  }
}
```

---

## Questions?

Contact the mobile development team if you have questions about specific notification types or param requirements.
