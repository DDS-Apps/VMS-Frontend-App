# VMS Notification Parameters Documentation

This document describes all notification types and their required parameters for the Dallah Albaraka Visitor Management System.

## Overview

When sending push notifications from the backend, include a `params` object with the required parameters for each notification type. The mobile app uses these parameters to display localized messages.

### Notification Payload Structure

```json
{
  "type": "notification_type_here",
  "title": "Notification Title",
  "body": "Fallback message if template not found",
  "params": {
    "paramName": "value",
    "anotherParam": "value"
  }
}
```

**Important:** The `params` object is required for the mobile app to properly display localized messages. If `params` is missing or empty, the raw template placeholders (e.g., `{{hostName}}`) will be shown.

---

## Visit Request Notifications

### `request_created`
New visit request has been created.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |
| `hostName` | string | Name of the host employee | "Mohammed Ali" |

**Message:** "New visit request created for {{visitorName}} to meet {{hostName}}"

---

### `request_approved`
Visit request has been approved by manager.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |
| `managerName` | string | Name of the approving manager | "Sarah Khan" |

**Message:** "Your visit request for {{visitorName}} has been approved by {{managerName}}"

---

### `request_rejected`
Visit request has been rejected by manager.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |
| `managerName` | string | Name of the rejecting manager | "Sarah Khan" |
| `reason` | string | Reason for rejection | "Schedule conflict" |

**Message:** "Your visit request for {{visitorName}} has been rejected by {{managerName}}. Reason: {{reason}}"

---

### `request_cancelled`
Visit request has been cancelled.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |
| `cancelledBy` | string | Name of person who cancelled | "Mohammed Ali" |

**Message:** "Visit request for {{visitorName}} has been cancelled by {{cancelledBy}}"

---

### `request_updated`
Visit request has been updated.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |
| `updatedBy` | string | Name of person who updated | "Mohammed Ali" |

**Message:** "Visit request for {{visitorName}} has been updated by {{updatedBy}}"

---

### `request_modified`
Meeting room has been booked for a visit.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `roomName` | string | Name of the meeting room | "Board Room A" |
| `error` | string | (Optional) Error message if booking failed | "Room not available" |

**Message (Success):** "Meeting room \"{{roomName}}\" has been booked for your visit"
**Message (Error):** "Unable to book a meeting room: {{error}}. Please update your request"

---

### `pending_approval`
Visit request is awaiting manager approval.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |
| `hostName` | string | Name of the host employee | "Mohammed Ali" |

**Message:** "Visit request from {{visitorName}} to {{hostName}} is awaiting your approval"

---

## Visitor Response Notifications

### `visitor_accepted`
Visitor has accepted the invitation.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |

**Message:** "{{visitorName}} has accepted the visit invitation"

---

### `visitor_rejected`
Visitor has declined the invitation.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |

**Message:** "{{visitorName}} has declined the visit invitation"

---

### `visitor_arrival`
Visitor has arrived at reception.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |

**Message:** "{{visitorName}} has arrived at reception"

---

### `visitor_no_show`
Visitor did not arrive for scheduled visit.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |

**Message:** "{{visitorName}} did not arrive for the scheduled visit"

---

### `walk_in_registered`
Walk-in visitor has arrived at reception.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |
| `company` | string | Visitor's company name | "ABC Corporation" |

**Message:** "{{visitorName}} from {{company}} is at reception to see you. Please approve or reject this visit"

---

## Check-in/Check-out Notifications

### `check_in`
Visitor has checked in.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |

**Message:** "{{visitorName}} has checked in"

---

### `check_out`
Visitor has checked out.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |

**Message:** "{{visitorName}} has checked out"

---

## Reminder Notifications

### `reminder_tomorrow`
Reminder for visit scheduled tomorrow.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |
| `visitDate` | string | Date of the visit | "January 28, 2026" |

**Message:** "Reminder: {{visitorName}} is scheduled to visit tomorrow ({{visitDate}})"

---

### `reminder_2hours`
Reminder for visit in 2 hours.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |
| `visitTime` | string | Time of the visit | "2:00 PM" |

**Message:** "Reminder: {{visitorName}} is arriving in 2 hours at {{visitTime}}"

---

### `reminder_30min`
Reminder for visit in 30 minutes.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |
| `visitTime` | string | Time of the visit | "2:00 PM" |

**Message:** "Reminder: {{visitorName}} is arriving in 30 minutes at {{visitTime}}"

---

### `reminder_now`
Visitor should be arriving now.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |

**Message:** "{{visitorName}} should be arriving now"

---

### `expected_today`
Daily agenda notification.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorCount` | string | Number of expected visitors | "3" |

**Message:** "You have {{visitorCount}} visitor(s) expected today"

---

### `visitor_reminder`
Reminder sent to visitor for pending response.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |

**Message (First):** "First reminder sent to {{visitorName}} for pending visit response"
**Message (Final):** "Final reminder sent to {{visitorName}}. Auto-cancellation imminent if no response"

---

### `auto_cancelled`
Visit auto-cancelled due to no response.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |

**Message:** "Visit request for {{visitorName}} was auto-cancelled due to no response. Resources have been released"

---

## Meeting Room Notifications

### `room_booked`
Meeting room has been booked.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `roomName` | string | Name of the meeting room | "Board Room A" |
| `visitDate` | string | Date of the booking | "January 28, 2026" |
| `visitTime` | string | Time of the booking | "2:00 PM" |

**Message:** "Meeting room {{roomName}} has been booked for {{visitDate}} at {{visitTime}}"

---

### `room_reminder`
Meeting reminder.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `roomName` | string | Name of the meeting room | "Board Room A" |
| `visitTime` | string | Time of the meeting | "2:00 PM" |

**Message:** "Reminder: Meeting in {{roomName}} at {{visitTime}}"

---

### `room_cancelled`
Meeting room booking cancelled.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `roomName` | string | Name of the meeting room | "Board Room A" |

**Message:** "Meeting room booking for {{roomName}} has been cancelled"

---

### `room_conflict`
Conflict detected for meeting room.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `roomName` | string | Name of the meeting room | "Board Room A" |
| `conflictTime` | string | Time of the conflict | "2:00 PM" |

**Message:** "Conflict detected for {{roomName}} at {{conflictTime}}"

---

### `room_reassigned`
Meeting has been moved to a different room.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `oldRoom` | string | Original room name | "Board Room A" |
| `newRoom` | string | New room name | "Conference Room B" |

**Message:** "Your meeting has been moved from {{oldRoom}} to {{newRoom}}"

---

## Parking Notifications

### `parking_assigned`
Parking spot has been assigned.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `spotNumber` | string | Parking spot identifier | "A-15" |
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |

**Message:** "Parking spot {{spotNumber}} has been assigned for {{visitorName}}"

---

### `parking_full`
Parking is full.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |

**Message:** "Parking is currently full. Visitor {{visitorName}} will need alternative arrangements"

---

## Buffet Notifications

### `buffet_new_request`
New buffet request created.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `hostName` | string | Name of the host employee | "Mohammed Ali" |
| `location` | string | Meeting room where buffet will be served | "Board Room A" |

**Message:** "New buffet request from {{hostName}} at {{location}}"

---

### `buffet_request_created`
Buffet request has been created.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `hostName` | string | Name of the host employee | "Mohammed Ali" |
| `location` | string | Meeting room where buffet will be served | "Board Room A" |

**Message:** "Buffet request created for {{hostName}} at {{location}}"

---

### `buffet_task_assigned`
Buffet task has been assigned.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `taskType` | string | Type of task | "Setup" or "Cleanup" |
| `location` | string | Meeting room location | "Board Room A" |

**Message:** "New {{taskType}} task assigned at {{location}}"

---

### `buffet_scheduled`
Buffet service has been scheduled.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `scheduledTime` | string | Scheduled time | "2:00 PM" |
| `location` | string | Meeting room location | "Board Room A" |

**Message:** "Buffet service scheduled for {{scheduledTime}} at {{location}}"

---

### `buffet_completed`
Buffet service has been completed.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `location` | string | Meeting room location | "Board Room A" |

**Message:** "Buffet service at {{location}} has been completed"

---

### `buffet_status_update`
Buffet service status has been updated.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `location` | string | Meeting room location | "Board Room A" |

**Message:** "Buffet service status updated at {{location}}"

---

### `buffet_staff_update`
Buffet staff assignment has been updated.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `location` | string | Meeting room location | "Board Room A" |

**Message:** "Staff assignment updated for buffet service at {{location}}"

---

## Valet Notifications

### `valet_new_request`
New valet request created.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |
| `vehicleInfo` | string | Vehicle description | "Black BMW X5" |

**Message:** "New valet request for {{visitorName}} - {{vehicleInfo}}"

---

### `valet_task_assigned`
Valet task has been assigned.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |
| `driverName` | string | Name of the valet driver | "Ali Hassan" |

**Message:** "Valet task for {{visitorName}} assigned to {{driverName}}"

---

### `valet_scheduled`
Valet service has been scheduled.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |
| `scheduledTime` | string | Scheduled time | "2:00 PM" |

**Message:** "Valet service scheduled for {{visitorName}} at {{scheduledTime}}"

---

### `valet_completed`
Valet service has been completed.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |

**Message:** "Valet service for {{visitorName}} has been completed"

---

### `valet_cancelled`
Valet service has been cancelled.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |

**Message:** "Valet service for {{visitorName}} has been cancelled"

---

## Security Notifications

### `security_access_update`
Visitor access level has been updated.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |
| `accessLevel` | string | New access level | "VIP" or "Standard" |

**Message:** "Access level for {{visitorName}} updated to {{accessLevel}}"

---

### `security_gate_pass`
Gate pass has been issued.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visitorName` | string | Name of the visitor | "Ahmed Al-Rashid" |
| `gateNumber` | string | Gate number | "1" or "Main" |

**Message:** "Gate pass issued for {{visitorName}} at Gate {{gateNumber}}"

---

## Example Backend Implementation

```javascript
// Example: Sending a buffet notification
const notification = {
  type: 'buffet_new_request',
  title: 'New Buffet Request',
  body: 'New buffet request received',
  params: {
    hostName: 'Mohammed Ali',
    location: 'Board Room A'
  }
};

await sendPushNotification(userId, notification);
```

```javascript
// Example: Sending a visit approval notification
const notification = {
  type: 'request_approved',
  title: 'Visit Request Approved',
  body: 'Your visit request has been approved',
  params: {
    visitorName: 'Ahmed Al-Rashid',
    managerName: 'Sarah Khan'
  }
};

await sendPushNotification(userId, notification);
```

---

## Notes

1. All parameter values should be strings
2. Date/time formats should be human-readable (e.g., "January 28, 2026", "2:00 PM")
3. The mobile app supports both English and Arabic - parameter values should be in the user's preferred language when possible
4. If `params` is missing or empty, the app will fall back to displaying the raw `body` field
