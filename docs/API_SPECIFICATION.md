# VMS Backend API Specification

This document outlines all backend APIs required for the Visitor Management System (VMS) mobile application.

## Table of Contents

1. [Authentication](#1-authentication)
2. [Users & Roles](#2-users--roles)
3. [Visitor Requests](#3-visitor-requests)
4. [Manager Approvals](#4-manager-approvals)
5. [Receptionist & Check-In](#5-receptionist--check-in)
6. [Security & Gate Control](#6-security--gate-control)
7. [Parking Management](#7-parking-management)
8. [Valet Services](#8-valet-services)
9. [Buffet Services](#9-buffet-services)
10. [Notifications](#10-notifications)
11. [Admin Settings](#11-admin-settings)
12. [Analytics & Reports](#12-analytics--reports)

---

## Base URL

```
Production: https://api.vms.dallahalbarka.com/v1
Development: https://api-dev.vms.dallahalbarka.com/v1
```

## Authentication Headers

All authenticated endpoints require:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## 1. Authentication

### 1.1 Login

Authenticate user and obtain access token.

```
POST /auth/login
```

**Request Body:**
```json
{
  "email": "string",
  "password": "string",
  "deviceId": "string (optional)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "refreshToken": "string",
    "expiresIn": 3600,
    "user": {
      "id": "string",
      "name": "string",
      "email": "string",
      "role": "employee | manager | receptionist | security | building_admin | buffet_admin | buffet_staff | valet_admin | valet_driver",
      "department": "string",
      "avatar": "string (optional)"
    }
  }
}
```

**Roles:** All

---

### 1.2 Refresh Token

Refresh access token using refresh token.

```
POST /auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "expiresIn": 3600
  }
}
```

---

### 1.3 Logout

Invalidate current session.

```
POST /auth/logout
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 1.4 Get Current User

Get authenticated user's profile.

```
GET /auth/me
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "email": "string",
    "role": "string",
    "department": "string",
    "avatar": "string",
    "managerId": "string (optional)",
    "managerName": "string (optional)",
    "requiresApproval": "boolean"
  }
}
```

---

## 2. Users & Roles

### 2.1 Get Employees (Search)

Search employees for host selection.

```
GET /users/employees?search={query}&limit={limit}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | Search by name or department |
| limit | number | Max results (default: 20) |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "email": "string",
      "department": "string",
      "requiresApproval": "boolean",
      "managerId": "string",
      "managerName": "string"
    }
  ]
}
```

**Roles:** Receptionist, Security, Admin

---

### 2.2 Get All Users (Admin)

Get all users with pagination and filtering.

```
GET /admin/users?role={role}&status={status}&page={page}&limit={limit}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

**Roles:** Building Admin

---

### 2.3 Create User (Admin)

```
POST /admin/users
```

**Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "role": "string",
  "department": "string",
  "managerId": "string (optional)",
  "requiresApproval": "boolean"
}
```

**Roles:** Building Admin

---

### 2.4 Update User (Admin)

```
PUT /admin/users/{userId}
```

**Roles:** Building Admin

---

### 2.5 Delete User (Admin)

```
DELETE /admin/users/{userId}
```

**Roles:** Building Admin

---

## 3. Visitor Requests

### 3.1 Create Visitor Request

Create a new visitor request.

```
POST /visitor-requests
```

**Request Body:**
```json
{
  "visitor": {
    "fullName": "string",
    "email": "string",
    "phone": "string",
    "company": "string (optional)"
  },
  "visitDate": "YYYY-MM-DD",
  "visitTime": "HH:MM AM/PM",
  "duration": "string (e.g., '1 hour', '2 hours')",
  "purpose": "string",
  "communicationChannels": ["qr_code", "whatsapp", "sms", "email"],
  "needsMeetingRoom": "boolean",
  "needsParking": "boolean",
  "needsBuffet": "boolean",
  "needsValet": "boolean",
  "asManager": "boolean (auto-approve if true)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "status": "pending_approval | approved",
    "qrCode": "string (if auto-approved)",
    "createdAt": "ISO8601 timestamp"
  }
}
```

**Roles:** Employee, Manager

---

### 3.2 Get My Requests

Get visitor requests created by current user.

```
GET /visitor-requests/my?status={status}&page={page}&limit={limit}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status (optional) |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "string",
        "visitor": {
          "id": "string",
          "fullName": "string",
          "email": "string",
          "phone": "string",
          "company": "string"
        },
        "visitDate": "YYYY-MM-DD",
        "visitTime": "HH:MM AM/PM",
        "duration": "string",
        "purpose": "string",
        "status": "draft | pending_approval | approved | rejected | visitor_accepted | visitor_rejected | checked_in | completed | cancelled | auto_cancelled",
        "communicationChannels": ["string"],
        "parkingType": "auto | valet | none",
        "parkingSlot": {
          "id": "string",
          "slotNumber": "string",
          "location": "string",
          "floor": "string"
        },
        "meetingRoom": {
          "id": "string",
          "name": "string",
          "floor": "string",
          "capacity": "number",
          "timeSlot": "string"
        },
        "buffet": {
          "id": "string",
          "mealType": "breakfast | lunch | dinner | snacks",
          "location": "string",
          "dietaryPreferences": ["string"]
        },
        "valet": {
          "id": "string",
          "driver": {
            "id": "string",
            "name": "string",
            "phone": "string"
          },
          "pickupTime": "string",
          "returnTime": "string",
          "status": "pending | assigned | accepted | rejected | in_progress | completed"
        },
        "approval": {
          "requiresApproval": "boolean",
          "managerId": "string",
          "managerName": "string",
          "approvedAt": "ISO8601",
          "rejectedAt": "ISO8601",
          "rejectionReason": "string",
          "managerComment": "string",
          "autoApproved": "boolean"
        },
        "reminders": {
          "firstReminderAt": "ISO8601",
          "secondReminderAt": "ISO8601",
          "autoCancelAt": "ISO8601",
          "firstReminderSent": "boolean",
          "secondReminderSent": "boolean"
        },
        "qrCode": "string",
        "createdAt": "ISO8601",
        "updatedAt": "ISO8601"
      }
    ],
    "pagination": {...}
  }
}
```

**Roles:** Employee, Manager

---

### 3.3 Get Request by ID

```
GET /visitor-requests/{requestId}
```

**Response (200):** Full request object as above.

**Roles:** Employee (own requests), Manager, Receptionist, Security, Admin

---

### 3.4 Update Request

Update a draft or pending request.

```
PUT /visitor-requests/{requestId}
```

**Request Body:** Same as create (partial update allowed)

**Roles:** Employee (own requests), Manager

---

### 3.5 Cancel Request

Cancel a visitor request.

```
POST /visitor-requests/{requestId}/cancel
```

**Request Body:**
```json
{
  "reason": "string (optional)"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Request cancelled successfully"
}
```

**Roles:** Employee (own requests), Manager, Receptionist

---

### 3.6 Get Upcoming Visits

Get upcoming approved visits for dashboard.

```
GET /visitor-requests/upcoming?days={days}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| days | number | Number of days ahead (default: 7) |

**Roles:** Employee, Manager

---

## 4. Manager Approvals

### 4.1 Get Pending Approvals

Get requests pending manager approval.

```
GET /approvals/pending?page={page}&limit={limit}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "requests": [...],
    "pagination": {...}
  }
}
```

**Roles:** Manager

---

### 4.2 Approve Request

Approve a visitor request.

```
POST /approvals/{requestId}/approve
```

**Request Body:**
```json
{
  "comment": "string (optional)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "requestId": "string",
    "status": "approved",
    "qrCode": "string",
    "reminders": {
      "firstReminderAt": "ISO8601",
      "secondReminderAt": "ISO8601",
      "autoCancelAt": "ISO8601"
    }
  }
}
```

**Roles:** Manager

---

### 4.3 Reject Request

Reject a visitor request.

```
POST /approvals/{requestId}/reject
```

**Request Body:**
```json
{
  "reason": "string (required)",
  "comment": "string (optional)"
}
```

**Roles:** Manager

---

## 5. Receptionist & Check-In

### 5.1 Get Today's Visitors

Get all visitors scheduled for today.

```
GET /reception/today?status={status}&search={search}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | pending, checked_in, completed |
| search | string | Search by visitor name |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "company": "string",
      "phone": "string",
      "host": "string",
      "time": "string",
      "status": "pending | checked_in | completed",
      "parking": "string (slot number)",
      "valet": "string",
      "isWalkIn": "boolean",
      "visitType": "general | parking | valet | buffet",
      "origin": "scheduled | walk_in"
    }
  ]
}
```

**Roles:** Receptionist, Security

---

### 5.2 Register Walk-In Visitor

Register an unscheduled walk-in visitor.

```
POST /reception/walk-in
```

**Request Body:**
```json
{
  "name": "string",
  "company": "string",
  "phone": "string",
  "host": "string",
  "visitType": "general | parking | valet | buffet",
  "purpose": "string (optional)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "status": "pending",
    "message": "Walk-in visitor registered. Pending host approval."
  }
}
```

**Roles:** Receptionist

---

### 5.3 Check In Visitor

Mark visitor as checked in.

```
POST /reception/check-in/{visitorId}
```

**Request Body:**
```json
{
  "notes": "string (optional)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "checkInTime": "ISO8601",
    "badgeNumber": "string (optional)"
  }
}
```

**Roles:** Receptionist, Security

---

### 5.4 Check Out Visitor

Mark visitor as checked out.

```
POST /reception/check-out/{visitorId}
```

**Roles:** Receptionist, Security

---

### 5.5 Cancel Visitor (Receptionist)

Cancel a pending visitor entry.

```
DELETE /reception/visitors/{visitorId}
```

**Roles:** Receptionist

---

## 6. Security & Gate Control

### 6.1 Validate QR Code

Validate visitor QR code at gate.

```
POST /security/validate-qr
```

**Request Body:**
```json
{
  "qrCode": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "valid": "boolean",
    "visitor": {
      "id": "string",
      "name": "string",
      "company": "string",
      "host": "string",
      "visitDate": "string",
      "visitTime": "string",
      "status": "string"
    },
    "accessGranted": "boolean",
    "message": "string"
  }
}
```

**Roles:** Security

---

### 6.2 Validate Access Code

Validate visitor access code at gate.

```
POST /security/validate-code
```

**Request Body:**
```json
{
  "accessCode": "string"
}
```

**Roles:** Security

---

### 6.3 Get Expected Visitors

Get list of expected visitors for the day.

```
GET /security/expected?date={date}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| date | string | YYYY-MM-DD (default: today) |

**Roles:** Security

---

### 6.4 Lookup Visitor

Search for a visitor by name, phone, or company.

```
GET /security/lookup?query={query}
```

**Roles:** Security

---

### 6.5 Grant/Deny Access

Record access decision at gate.

```
POST /security/access-decision
```

**Request Body:**
```json
{
  "visitorId": "string",
  "decision": "granted | denied",
  "reason": "string (required if denied)",
  "gateId": "string"
}
```

**Roles:** Security

---

## 7. Parking Management

### 7.1 Get Available Parking Slots

```
GET /parking/available?location={location}&date={date}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| location | string | SKBC_basement, valet, red_sea_mall |
| date | string | YYYY-MM-DD |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "slotNumber": "string",
      "location": "string",
      "floor": "string",
      "status": "available | occupied | reserved"
    }
  ]
}
```

**Roles:** Receptionist, Building Admin

---

### 7.2 Assign Parking Slot

```
POST /parking/assign
```

**Request Body:**
```json
{
  "requestId": "string",
  "slotId": "string"
}
```

**Roles:** Receptionist, Building Admin

---

### 7.3 Release Parking Slot

```
POST /parking/release/{slotId}
```

**Roles:** Receptionist, Security, Building Admin

---

### 7.4 Get Parking Statistics (Admin)

```
GET /parking/stats
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "total": "number",
    "available": "number",
    "occupied": "number",
    "reserved": "number",
    "byLocation": {
      "SKBC_basement": {...},
      "valet": {...},
      "red_sea_mall": {...}
    }
  }
}
```

**Roles:** Building Admin

---

## 8. Valet Services

### 8.1 Get Valet Tasks

Get all valet tasks with filtering.

```
GET /valet/tasks?status={status}&driverId={driverId}&date={date}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | pending, assigned, accepted, rejected, in_progress, completed |
| driverId | string | Filter by driver |
| date | string | YYYY-MM-DD |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "requestId": "string",
      "visitorName": "string",
      "visitorCompany": "string",
      "hostName": "string",
      "visitDate": "string",
      "pickupTime": "string",
      "returnTime": "string",
      "location": "string",
      "valet": {
        "id": "string",
        "driver": {
          "id": "string",
          "name": "string",
          "phone": "string",
          "status": "available | busy | off_duty",
          "currentTasks": "number"
        },
        "pickupTime": "string",
        "returnTime": "string",
        "status": "pending | assigned | accepted | rejected | in_progress | completed"
      },
      "vehicleInfo": {
        "make": "string",
        "model": "string",
        "color": "string",
        "plateNumber": "string"
      },
      "notes": "string",
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    }
  ]
}
```

**Roles:** Valet Admin, Valet Driver

---

### 8.2 Assign Driver to Task

```
POST /valet/tasks/{taskId}/assign
```

**Request Body:**
```json
{
  "driverId": "string"
}
```

**Roles:** Valet Admin

---

### 8.3 Accept Task (Driver)

```
POST /valet/tasks/{taskId}/accept
```

**Roles:** Valet Driver

---

### 8.4 Reject Task (Driver)

```
POST /valet/tasks/{taskId}/reject
```

**Request Body:**
```json
{
  "reason": "string (optional)"
}
```

**Roles:** Valet Driver

---

### 8.5 Start Task (Driver)

```
POST /valet/tasks/{taskId}/start
```

**Roles:** Valet Driver

---

### 8.6 Complete Task (Driver)

```
POST /valet/tasks/{taskId}/complete
```

**Request Body:**
```json
{
  "vehicleInfo": {
    "make": "string",
    "model": "string",
    "color": "string",
    "plateNumber": "string"
  },
  "notes": "string (optional)"
}
```

**Roles:** Valet Driver

---

### 8.7 Get All Drivers

```
GET /valet/drivers?status={status}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | available, busy, off_duty |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "phone": "string",
      "status": "available | busy | off_duty",
      "currentTasks": "number"
    }
  ]
}
```

**Roles:** Valet Admin

---

### 8.8 Get My Tasks (Driver)

```
GET /valet/my-tasks?status={status}
```

**Roles:** Valet Driver

---

### 8.9 Get Valet Statistics

```
GET /valet/stats
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "pendingTasks": "number",
    "assignedTasks": "number",
    "inProgressTasks": "number",
    "completedToday": "number",
    "availableDrivers": "number",
    "totalDrivers": "number"
  }
}
```

**Roles:** Valet Admin

---

## 9. Buffet Services

### 9.1 Get Buffet Requests

Get buffet service requests.

```
GET /buffet/requests?status={status}&date={date}&location={location}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | pending, in_progress, completed, cancelled |
| date | string | YYYY-MM-DD |
| location | string | Filter by buffet location |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "visitorName": "string",
      "hostName": "string",
      "location": "string",
      "timeSlot": "string",
      "visitDate": "YYYY-MM-DD",
      "guestCount": "number",
      "mealType": "breakfast | lunch | dinner | snacks",
      "dietaryRequirements": ["string"],
      "status": "pending | in_progress | completed | cancelled",
      "notes": "string",
      "assignedStaff": "string",
      "createdAt": "ISO8601"
    }
  ]
}
```

**Roles:** Buffet Admin, Buffet Staff

---

### 9.2 Update Request Status

```
PATCH /buffet/requests/{requestId}/status
```

**Request Body:**
```json
{
  "status": "pending | in_progress | completed | cancelled"
}
```

**Roles:** Buffet Admin, Buffet Staff

---

### 9.3 Assign Staff to Request

```
POST /buffet/requests/{requestId}/assign
```

**Request Body:**
```json
{
  "staffId": "string"
}
```

**Roles:** Buffet Admin

---

### 9.4 Get Buffet Staff

```
GET /buffet/staff?status={status}&location={location}
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "role": "Chef | Server | Coordinator | Kitchen Staff",
      "status": "on_duty | off_duty",
      "assignedLocation": "string",
      "phone": "string",
      "shift": "string"
    }
  ]
}
```

**Roles:** Buffet Admin

---

### 9.5 Update Staff Status

```
PATCH /buffet/staff/{staffId}/status
```

**Request Body:**
```json
{
  "status": "on_duty | off_duty"
}
```

**Roles:** Buffet Admin

---

### 9.6 Get Buffet Locations

```
GET /buffet/locations
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "capacity": "number",
      "activeStaff": "number",
      "currentRequests": "number",
      "building": "string",
      "floor": "string",
      "amenities": ["string"],
      "status": "active | inactive"
    }
  ]
}
```

**Roles:** Buffet Admin

---

### 9.7 Update Buffet Location

```
PUT /buffet/locations/{locationId}
```

**Request Body:**
```json
{
  "name": "string",
  "capacity": "number",
  "status": "active | inactive",
  "amenities": ["string"]
}
```

**Roles:** Buffet Admin, Building Admin

---

### 9.8 Get Buffet Statistics

```
GET /buffet/stats
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "total": "number",
    "pending": "number",
    "inProgress": "number",
    "completed": "number",
    "staffOnDuty": "number",
    "staffOffDuty": "number",
    "activeLocations": "number"
  }
}
```

**Roles:** Buffet Admin

---

## 10. Notifications

### 10.1 Get Notifications

Get notifications for current user.

```
GET /notifications?unreadOnly={unreadOnly}&page={page}&limit={limit}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| unreadOnly | boolean | Filter to unread only |
| page | number | Page number |
| limit | number | Items per page |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "string",
        "type": "request_submitted | request_approved | request_rejected | visitor_accepted | visitor_rejected | visitor_reminder | check_in | update | assignment | auto_cancelled | pending_approval | request_cancelled",
        "title": "string",
        "message": "string",
        "timestamp": "ISO8601",
        "read": "boolean",
        "requestId": "string (optional)",
        "actionRequired": "boolean",
        "priority": "low | medium | high"
      }
    ],
    "unreadCount": "number",
    "pagination": {...}
  }
}
```

**Roles:** All

---

### 10.2 Mark Notification as Read

```
PATCH /notifications/{notificationId}/read
```

**Roles:** All

---

### 10.3 Mark All as Read

```
POST /notifications/mark-all-read
```

**Roles:** All

---

### 10.4 Get Unread Count

```
GET /notifications/unread-count
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "count": "number"
  }
}
```

**Roles:** All

---

### 10.5 Register Push Token

Register device for push notifications.

```
POST /notifications/push-token
```

**Request Body:**
```json
{
  "token": "string",
  "platform": "ios | android | web",
  "deviceId": "string"
}
```

**Roles:** All

---

## 11. Admin Settings

### 11.1 Get System Settings

```
GET /admin/settings
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "approvalWorkflow": {
      "autoApproveManagers": "boolean",
      "reminderSchedule": {
        "firstReminderHours": "number",
        "secondReminderHours": "number",
        "autoCancelHours": "number"
      }
    },
    "parking": {
      "locations": [...],
      "defaultLocation": "string"
    },
    "valet": {
      "enabled": "boolean",
      "maxTasksPerDriver": "number"
    },
    "buffet": {
      "enabled": "boolean",
      "mealTypes": ["string"],
      "defaultDietaryOptions": ["string"]
    },
    "notifications": {
      "emailEnabled": "boolean",
      "smsEnabled": "boolean",
      "whatsappEnabled": "boolean",
      "pushEnabled": "boolean"
    }
  }
}
```

**Roles:** Building Admin

---

### 11.2 Update System Settings

```
PUT /admin/settings
```

**Request Body:** Partial settings object

**Roles:** Building Admin

---

### 11.3 Get System Rules

```
GET /admin/rules
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "type": "approval | notification | parking | access",
      "enabled": "boolean",
      "conditions": {...},
      "actions": {...}
    }
  ]
}
```

**Roles:** Building Admin

---

### 11.4 Update System Rule

```
PUT /admin/rules/{ruleId}
```

**Roles:** Building Admin

---

## 12. Analytics & Reports

### 12.1 Get Dashboard KPIs

Get KPI data for role-specific dashboards.

```
GET /analytics/dashboard?role={role}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "kpis": [
      {
        "label": "string",
        "value": "number | string",
        "trend": "string (+5%, -2%)",
        "icon": "string",
        "color": "string"
      }
    ]
  }
}
```

**Roles:** All (role-specific data)

---

### 12.2 Get Visitor Statistics

```
GET /analytics/visitors?startDate={startDate}&endDate={endDate}&groupBy={groupBy}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | string | YYYY-MM-DD |
| endDate | string | YYYY-MM-DD |
| groupBy | string | day, week, month |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalVisitors": "number",
    "byStatus": {
      "completed": "number",
      "cancelled": "number",
      "noShow": "number"
    },
    "byType": {
      "scheduled": "number",
      "walkIn": "number"
    },
    "timeline": [
      {
        "date": "string",
        "count": "number"
      }
    ]
  }
}
```

**Roles:** Building Admin, Manager

---

### 12.3 Get Service Utilization

```
GET /analytics/services?startDate={startDate}&endDate={endDate}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "parking": {
      "totalUsed": "number",
      "averageOccupancy": "number"
    },
    "valet": {
      "totalTasks": "number",
      "averageCompletionTime": "number"
    },
    "buffet": {
      "totalMeals": "number",
      "byMealType": {...}
    }
  }
}
```

**Roles:** Building Admin

---

## Visitor External Endpoints

These endpoints are accessed by visitors via invitation links (no authentication required, uses invitation token).

### V.1 Get Invitation Details

```
GET /visitor/invitation/{invitationToken}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "requestId": "string",
    "hostName": "string",
    "hostCompany": "string",
    "visitDate": "string",
    "visitTime": "string",
    "purpose": "string",
    "status": "string",
    "canRespond": "boolean"
  }
}
```

---

### V.2 Accept Invitation

```
POST /visitor/invitation/{invitationToken}/accept
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "qrCode": "string",
    "accessCode": "string",
    "confirmationMessage": "string"
  }
}
```

---

### V.3 Reject Invitation

```
POST /visitor/invitation/{invitationToken}/reject
```

**Request Body:**
```json
{
  "reason": "string (optional)"
}
```

---

## WebSocket Events (Real-time Updates)

### Connection

```
wss://api.vms.dallahalbarka.com/ws?token={accessToken}
```

### Events

| Event | Description | Payload |
|-------|-------------|---------|
| `request:updated` | Request status changed | `{ requestId, status, updatedAt }` |
| `approval:pending` | New approval request (Manager) | `{ requestId, employeeName, visitorName }` |
| `visitor:checked_in` | Visitor checked in | `{ requestId, visitorName, checkInTime }` |
| `task:assigned` | Valet task assigned (Driver) | `{ taskId, visitorName, pickupTime }` |
| `notification:new` | New notification | Full notification object |

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "string (e.g., UNAUTHORIZED, NOT_FOUND, VALIDATION_ERROR)",
    "message": "string (human-readable message)",
    "details": {} // Optional additional details
  }
}
```

### Common HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (e.g., duplicate entry) |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## Rate Limiting

- Standard endpoints: 100 requests per minute
- Authentication endpoints: 10 requests per minute
- Analytics endpoints: 20 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

---

## API Versioning

The API version is included in the URL path (`/v1/`). When breaking changes are introduced, a new version will be released (e.g., `/v2/`).

---

## Summary by Role

| Role | Primary Endpoints |
|------|-------------------|
| Employee | `/visitor-requests/*`, `/notifications/*` |
| Manager | `/visitor-requests/*`, `/approvals/*`, `/notifications/*` |
| Receptionist | `/reception/*`, `/parking/*`, `/notifications/*` |
| Security | `/security/*`, `/reception/today`, `/notifications/*` |
| Building Admin | `/admin/*`, `/analytics/*`, `/parking/*`, all read access |
| Buffet Admin | `/buffet/*`, `/notifications/*` |
| Buffet Staff | `/buffet/requests/*`, `/notifications/*` |
| Valet Admin | `/valet/*`, `/notifications/*` |
| Valet Driver | `/valet/my-tasks`, `/valet/tasks/{id}/*`, `/notifications/*` |
| Visitor (External) | `/visitor/invitation/*` (no auth, token-based) |
