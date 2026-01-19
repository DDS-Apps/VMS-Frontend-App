# Notification Localization Guide

This document describes the notification localization system for frontend/mobile developers.

## Overview

Each notification includes:
- `title` - English fallback title
- `message` - English fallback message
- `params` - Structured data object for localized message construction

The `params` object contains key-value pairs that frontend apps can use to build localized messages in any language.

## API Response Format

```json
{
  "id": "uuid-string",
  "type": "request_approved",
  "title": "Visit Request Approved",
  "message": "Your visit request for John Doe has been approved by Jane Manager.",
  "params": {
    "visitorName": "John Doe",
    "managerName": "Jane Manager"
  },
  "timestamp": "2026-01-19T10:30:00.000Z",
  "read": false,
  "requestId": "request-uuid",
  "actionRequired": false,
  "priority": "high"
}
```

## Notification Types and Params

### 1. `pending_approval`
Sent to manager when an employee creates a visit request that needs approval.

| Param Key | Type | Description |
|-----------|------|-------------|
| `visitorName` | string | Full name of the visitor |
| `hostName` | string | Name of the employee who created the request |

**Localization Template Example:**
```
en: "{hostName} has submitted a visit request for {visitorName}. Please review."
ar: "قدم {hostName} طلب زيارة لـ {visitorName}. يرجى المراجعة."
```

---

### 2. `request_approved`
Sent to host (employee) when their visit request is approved by manager.

| Param Key | Type | Description |
|-----------|------|-------------|
| `visitorName` | string | Full name of the visitor |
| `managerName` | string | Name of the manager who approved |

**Localization Template Example:**
```
en: "Your visit request for {visitorName} has been approved by {managerName}."
ar: "تمت الموافقة على طلب زيارتك لـ {visitorName} من قبل {managerName}."
```

---

### 3. `request_rejected`
Sent to host (employee) when their visit request is rejected by manager.

| Param Key | Type | Description |
|-----------|------|-------------|
| `visitorName` | string | Full name of the visitor |
| `managerName` | string | Name of the manager who rejected |
| `reason` | string | Rejection reason provided by manager |

**Localization Template Example:**
```
en: "Your visit request for {visitorName} was rejected by {managerName}. Reason: {reason}"
ar: "تم رفض طلب زيارتك لـ {visitorName} من قبل {managerName}. السبب: {reason}"
```

---

### 4. `request_cancelled`
Sent to host when a visit request is cancelled.

| Param Key | Type | Description |
|-----------|------|-------------|
| `visitorName` | string | Full name of the visitor |
| `cancelledBy` | string | Name of the person who cancelled |

**Localization Template Example:**
```
en: "Visit request for {visitorName} has been cancelled by {cancelledBy}."
ar: "تم إلغاء طلب الزيارة لـ {visitorName} بواسطة {cancelledBy}."
```

---

### 5. `request_modified` (Meeting Room Booked)
Sent to host when a meeting room is successfully booked.

| Param Key | Type | Description |
|-----------|------|-------------|
| `roomName` | string | Name of the allocated meeting room |

**Localization Template Example:**
```
en: "Meeting room \"{roomName}\" has been booked for your visit."
ar: "تم حجز قاعة الاجتماعات \"{roomName}\" لزيارتك."
```

---

### 6. `request_modified` (Meeting Room Booking Failed)
Sent to host when meeting room allocation fails.

| Param Key | Type | Description |
|-----------|------|-------------|
| `error` | string | Error message describing the failure |

**Localization Template Example:**
```
en: "Unable to book a meeting room: {error}. Please update your request."
ar: "تعذر حجز قاعة اجتماعات: {error}. يرجى تحديث طلبك."
```

---

### 7. `walk_in_registered`
Sent to host when a walk-in visitor arrives at reception.

| Param Key | Type | Description |
|-----------|------|-------------|
| `visitorName` | string | Full name of the walk-in visitor |
| `company` | string | Visitor's company name (or "Unknown") |

**Localization Template Example:**
```
en: "{visitorName} from {company} is at reception to see you."
ar: "{visitorName} من {company} في الاستقبال لمقابلتك."
```

---

### 8. `check_in`
Sent to host when their visitor checks in at reception.

| Param Key | Type | Description |
|-----------|------|-------------|
| `visitorName` | string | Full name of the visitor |

**Localization Template Example:**
```
en: "{visitorName} has checked in and is waiting for you."
ar: "وصل {visitorName} وهو في انتظارك."
```

---

### 9. `check_out`
Sent to host when their visitor checks out.

| Param Key | Type | Description |
|-----------|------|-------------|
| `visitorName` | string | Full name of the visitor |

**Localization Template Example:**
```
en: "{visitorName} has checked out."
ar: "غادر {visitorName}."
```

---

## Implementation Guide

### Frontend Usage (React/React Native Example)

```typescript
interface NotificationParams {
  visitorName?: string;
  hostName?: string;
  managerName?: string;
  roomName?: string;
  reason?: string;
  error?: string;
  company?: string;
  cancelledBy?: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  params?: NotificationParams;
  timestamp: string;
  read: boolean;
  requestId?: string;
  actionRequired: boolean;
  priority: 'low' | 'medium' | 'high';
}

// Localization function
function getLocalizedMessage(notification: Notification, locale: string): string {
  const { type, params, message } = notification;
  
  // If no params, use fallback message
  if (!params) {
    return message;
  }
  
  // Get template for locale and type
  const template = getTemplate(type, locale);
  
  if (!template) {
    return message; // Fallback to English message
  }
  
  // Replace placeholders with params
  return template.replace(/{(\w+)}/g, (_, key) => params[key] || `{${key}}`);
}

// Template storage example
const templates = {
  request_approved: {
    en: "Your visit request for {visitorName} has been approved by {managerName}.",
    ar: "تمت الموافقة على طلب زيارتك لـ {visitorName} من قبل {managerName}.",
    fr: "Votre demande de visite pour {visitorName} a été approuvée par {managerName}."
  },
  // ... other notification types
};
```

### Fallback Strategy

1. Try to build localized message using `params` and locale-specific template
2. If template not found for locale, fall back to English template
3. If no template exists, use the `message` field (English fallback from API)

---

## Notes

- All param values are strings
- `params` may be `undefined` or `null` for older notifications created before this feature
- The `message` field always contains a valid English message as fallback
- Notification `type` determines which params are available

---

## Maintenance

When adding new notification types or modifying params:

1. Update the dispatcher call in the relevant service file with the new `params` object
2. Update this documentation with the new notification type and param keys
3. Coordinate with frontend/mobile teams to add corresponding localization templates

**Files to check for notification dispatches:**
- `server/visits/visits.service.ts`
- `server/approvals/approvals.service.ts`
- `server/reception/reception.service.ts`
- `server/notifications/reminder-scheduler.service.ts` (if reminder notifications are added)
