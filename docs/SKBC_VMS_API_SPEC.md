# SKBC VMS API Specification

**Version:** 1.3.0  
**Last Updated:** 2025-12-08  
**Base URL:** `/api/v1`  
**Target Stack:** NestJS + SQL Server

---

## Table of Contents

### API Specification
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Entities & Data Model](#entities--data-model)
5. [Module: Auth & User Management](#module-auth--user-management)
6. [Module: Staff (Employee Initiator)](#module-staff-employee-initiator)
7. [Module: Manager / Approver](#module-manager--approver)
8. [Module: Receptionist](#module-receptionist)
9. [Module: Security](#module-security)
10. [Module: Meeting Rooms / Ammam](#module-meeting-rooms--ammam)
11. [Module: Parking & Valet (System-Level)](#module-parking--valet-system-level)
12. [Module: Employee Parking Assignment](#module-employee-parking-assignment)
13. [Module: Employee Self-Valet](#module-employee-self-valet)
14. [Module: Valet Admin](#module-valet-admin)
15. [Module: Valet Driver](#module-valet-driver)
16. [Module: Buffet Admin](#module-buffet-admin)
17. [Module: Buffet Staff](#module-buffet-staff)
18. [Module: Visitor (External Invite)](#module-visitor-external-invite)
19. [Module: Notifications & Reminders](#module-notifications--reminders)
20. [Module: Admin / Building Admin](#module-admin--building-admin)
21. [Module: Analytics Export](#module-analytics-export)
22. [Screen-to-API Mapping](#screen-to-api-mapping)

### NestJS Backend Implementation Guide
23. [Role-Based API Access Matrix](#role-based-api-access-matrix)
24. [SQL Server Database Schema](#sql-server-database-schema)
25. [NestJS Module Structure & Implementation Patterns](#nestjs-module-structure--implementation-patterns)
26. [Role-Specific Workflow Documentation](#role-specific-workflow-documentation)
27. [Azure AD SSO Integration](#azure-ad-sso-integration)

### Reference
28. [Changelog](#changelog)

---

## Overview

The SKBC Visitor Management System (VMS) API provides RESTful endpoints for managing visitor access, parking, meeting rooms, valet services, and buffet arrangements. The system supports multiple user roles with distinct capabilities.

### Supported User Roles

| Role | Description |
|------|-------------|
| `employee` | Staff who can create visitor requests |
| `manager` | Can create requests (auto-approved) and approve/reject subordinate requests |
| `receptionist` | Handles walk-ins, check-ins, visitor lookups |
| `security` | Gate access control, QR scanning, check-in/out |
| `building_admin` | System-wide configuration, parking, meeting rooms |
| `buffet_admin` | Manages buffet requests and staff |
| `buffet_staff` | Handles buffet task execution |
| `valet_admin` | Manages valet tasks and drivers |
| `valet_driver` | Executes valet parking tasks |
| `visitor` | External visitors with invite tokens |

### API Conventions

- All timestamps are in ISO 8601 format (UTC)
- Pagination uses `page` (1-indexed) and `limit` query parameters
- Filtering uses query parameters specific to each endpoint
- All request/response bodies are JSON

---

## Authentication

All API endpoints (except public visitor invite endpoints) require JWT Bearer token authentication.

**Header Format:**
```
Authorization: Bearer <access_token>
```

**Token Payload:**
```json
{
  "sub": "user_001",
  "email": "user@dallah.com",
  "role": "employee",
  "name": "John Doe",
  "department": "IT",
  "iat": 1704067200,
  "exp": 1704153600
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      }
    ]
  }
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful deletion) |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate or state conflict |
| 422 | Unprocessable Entity - Business rule violation |
| 500 | Internal Server Error |

---

## Entities & Data Model

### User

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  phoneNumber?: string;
  status: 'active' | 'inactive';
  autoApproval: boolean;
  source: 'microsoft_ad' | 'app_created';
  managerId?: string;
  managerName?: string;
  createdAt: string;
  lastLogin?: string;
}

type UserRole = 
  | 'employee' 
  | 'manager' 
  | 'building_admin' 
  | 'buffet_admin' 
  | 'buffet_staff' 
  | 'valet_admin' 
  | 'valet_driver' 
  | 'security' 
  | 'visitor' 
  | 'receptionist';
```

### Visitor

```typescript
interface Visitor {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  company?: string;
  photo?: string;
}
```

### VisitorRequest (Visit)

```typescript
interface VisitorRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeDepartment?: string;
  
  visitor: Visitor;
  
  visitDate: string;        // YYYY-MM-DD
  visitTime: string;        // "10:00 AM"
  duration: string;         // "1 hour", "2 hours"
  purpose: string;
  
  status: RequestStatus;
  communicationChannels: CommunicationChannel[];
  
  // Resource allocations
  meetingRoom?: MeetingRoom;
  parkingType: ParkingType;
  parkingSlot?: ParkingSlot;
  buffet?: BuffetService;
  valet?: ValetService;
  
  // Approval workflow
  approval: ApprovalInfo;
  reminders: ReminderSchedule;
  
  // Visitor decision
  visitorDecision?: {
    accepted: boolean;
    decidedAt: string;
    reason?: string;
  };
  
  // Lifecycle fields
  qrCode?: string;
  isWalkIn?: boolean;
  needsResourceReallocation?: boolean;
  
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  checkedInAt?: string;
  completedAt?: string;
  cancelledBy?: string;
  cancelledByName?: string;
  cancelledAt?: string;
}

type RequestStatus = 
  | 'draft' 
  | 'pending_approval' 
  | 'approved' 
  | 'rejected' 
  | 'visitor_pending'
  | 'visitor_accepted' 
  | 'visitor_rejected' 
  | 'checked_in' 
  | 'completed' 
  | 'cancelled' 
  | 'auto_cancelled';

type CommunicationChannel = 'qr_code' | 'whatsapp' | 'sms' | 'email';
type ParkingType = 'auto' | 'valet' | 'none';

interface ApprovalInfo {
  requiresApproval: boolean;
  autoApproved?: boolean;
  managerId?: string;
  managerName?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  managerComment?: string;
}

interface ReminderSchedule {
  firstReminderAt?: string;
  secondReminderAt?: string;
  autoCancelAt?: string;
  firstReminderSent?: boolean;
  secondReminderSent?: boolean;
}
```

### MeetingRoom

```typescript
interface MeetingRoom {
  id: string;
  name: string;
  floor: string;
  building: string;
  capacity: number;
  features: MeetingRoomFeature[];
  status: 'active' | 'inactive' | 'maintenance';
  description?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

type MeetingRoomFeature = 
  | 'projector' 
  | 'whiteboard' 
  | 'video_conferencing' 
  | 'audio_system' 
  | 'tv_display' 
  | 'phone'
  | 'air_conditioning'
  | 'natural_light';

interface MeetingBooking {
  id: string;
  roomId: string;
  roomName: string;
  requestId?: string;
  hostId: string;
  hostName: string;
  hostDepartment?: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  attendeesCount: number;
  visitors?: { name: string; company?: string }[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  createdAt: string;
}
```

### ParkingSpot & Allocation

```typescript
interface ParkingSpot {
  id: string;
  spotNumber: string;
  location: ParkingLocationId;
  level: string;
  type: ParkingSpotType;
  isActive: boolean;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  assignedTo?: string;
  vehiclePlate?: string;
  createdAt: string;
  updatedAt: string;
}

type ParkingLocationId = 'skbc_basement' | 'red_sea_mall' | 'valet_zone' | 'none';
type ParkingSpotType = 'visitor' | 'employee' | 'valet' | 'reserved';

interface ParkingPriorityRule {
  id: string;
  location: ParkingLocationId;
  priority: number;
  maxOccupancyPercent: number;
  isActive: boolean;
  description: string;
}

interface ParkingConfig {
  priorityRules: ParkingPriorityRule[];
  defaultFallback: ParkingLocationId;
  enableAutoAllocation: boolean;
  updatedAt: string;
}
```

### ValetTask

```typescript
interface ValetTask {
  id: string;
  requestId: string;
  visitorName: string;
  visitorCompany: string;
  hostName: string;
  visitDate: string;
  pickupTime: string;
  returnTime: string;
  location: string;
  valet: ValetService;
  vehicleInfo?: VehicleInfo;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface EmployeeValetTask {
  id: string;
  employeeId: string;
  employeeName: string;
  vehicleInfo: VehicleInfo;
  dropOffLocation: string;
  requestedReturnTime: string;
  valet: ValetService;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ValetService {
  id: string;
  driver?: ValetDriver;
  pickupTime: string;
  returnTime: string;
  status: ValetStatus;
}

interface ValetDriver {
  id: string;
  name: string;
  phone: string;
  status: 'available' | 'busy' | 'off_duty';
  currentTasks: number;
}

interface VehicleInfo {
  make: string;
  model: string;
  color: string;
  plateNumber: string;
}

type ValetStatus = 'pending' | 'assigned' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';
```

### BuffetTask

```typescript
interface BuffetTask {
  id: string;
  requestId: string;
  visitorName: string;
  company: string;
  hostName: string;
  visitDate: string;
  visitTime: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  guestCount: number;
  dietaryRequirements?: string[];
  location: string;
  status: BuffetStatus;
  notes?: string;
  assignedTo?: string;
  assignedToId?: string;
  createdAt: string;
  updatedAt: string;
}

type BuffetStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
```

### Notification

```typescript
interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  requestId?: string;
  actionRequired?: boolean;
  priority?: 'low' | 'medium' | 'high';
  targetRoles?: UserRole[];
  sourceRole?: UserRole;
}

// Complete list of all 32 notification types
type NotificationType = 
  // Visit Request Lifecycle
  | 'request_submitted'      // Employee submitted a new visit request
  | 'request_approved'       // Manager approved the visit request
  | 'request_rejected'       // Manager rejected the visit request
  | 'request_cancelled'      // Visit request was cancelled
  | 'request_modified'       // Visit request was modified/rescheduled
  | 'pending_approval'       // New request awaiting manager approval
  | 'auto_cancelled'         // Visit auto-cancelled due to no visitor response
  
  // Visitor Response
  | 'visitor_accepted'       // Visitor accepted the invitation
  | 'visitor_rejected'       // Visitor declined the invitation
  | 'visitor_reminder'       // Reminder sent to visitor to respond
  | 'visitor_arrival'        // Visitor has arrived/checked in
  | 'expected_today'         // Daily digest of expected visitors
  
  // Check-In/Out Events
  | 'check_in'               // Visitor checked in at gate/reception
  | 'check_out'              // Visitor checked out
  
  // Walk-In Events
  | 'walk_in_registered'     // Walk-in visitor registered by receptionist
  | 'walk_in_approved'       // Walk-in visitor approved by manager
  
  // Buffet Events
  | 'buffet_new_request'     // New buffet request created (for admin)
  | 'buffet_request_created' // Buffet request created confirmation
  | 'buffet_task_assigned'   // Buffet task assigned to staff
  | 'buffet_scheduled'       // Buffet task scheduled confirmation
  | 'buffet_status_update'   // Buffet task status changed
  | 'buffet_staff_update'    // Staff assignment updated
  | 'buffet_completed'       // Buffet service completed
  
  // Valet Events
  | 'valet_new_request'      // New valet request created (for admin)
  | 'valet_task_assigned'    // Valet task assigned to driver
  | 'valet_scheduled'        // Valet task scheduled confirmation
  | 'valet_completed'        // Valet service completed
  | 'valet_cancelled'        // Valet task cancelled
  
  // Security Events
  | 'security_access_update' // Access permissions changed
  | 'security_gate_pass'     // Gate pass issued/updated
  
  // Generic Events
  | 'update'                 // General update notification
  | 'assignment';            // General assignment notification
```

### UserNotificationPreferences

```typescript
interface UserNotificationPreferences {
  userId: string;
  
  // Channel Preferences
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  
  // Email Digest Settings
  emailSummaryFrequency: 'none' | 'daily' | 'weekly';
  dailyDigestTime?: string;  // "09:00" - when to send daily digest
  
  // Event Type Preferences (role-filtered)
  eventPreferences: {
    // Visit Lifecycle (all roles)
    request_updates: boolean;
    
    // Visitor Events (employee, manager, receptionist)
    visitor_responses: boolean;
    visitor_arrivals: boolean;
    
    // Approval Events (manager)
    approval_requests: boolean;
    
    // Buffet Events (buffet_admin, buffet_staff)
    buffet_tasks: boolean;
    
    // Valet Events (valet_admin, valet_driver)
    valet_tasks: boolean;
    
    // Security Events (security)
    security_alerts: boolean;
    gate_events: boolean;
    
    // System Events (all roles)
    system_alerts: boolean;
  };
  
  // Quiet Hours
  quietHoursEnabled: boolean;
  quietHoursStart?: string;  // "22:00"
  quietHoursEnd?: string;    // "07:00"
  
  updatedAt: string;
}

// Default preferences by role
const DEFAULT_PREFERENCES_BY_ROLE: Record<UserRole, Partial<UserNotificationPreferences['eventPreferences']>> = {
  employee: {
    request_updates: true,
    visitor_responses: true,
    visitor_arrivals: true,
    system_alerts: true
  },
  manager: {
    request_updates: true,
    visitor_responses: true,
    visitor_arrivals: true,
    approval_requests: true,
    system_alerts: true
  },
  receptionist: {
    request_updates: true,
    visitor_arrivals: true,
    system_alerts: true
  },
  security: {
    visitor_arrivals: true,
    security_alerts: true,
    gate_events: true,
    system_alerts: true
  },
  buffet_admin: {
    buffet_tasks: true,
    system_alerts: true
  },
  buffet_staff: {
    buffet_tasks: true
  },
  valet_admin: {
    valet_tasks: true,
    system_alerts: true
  },
  valet_driver: {
    valet_tasks: true
  },
  building_admin: {
    request_updates: true,
    system_alerts: true
  }
};
```

### SystemRules

```typescript
interface ReminderRules {
  id: string;
  firstReminderDelayMinutes: number;   // e.g., 120 (2 hours before)
  secondReminderDelayMinutes: number;  // e.g., 240 (4 hours before)
  autoCancelDelayMinutes: number;      // e.g., 300 (5 hours before)
  officeStartTime: string;             // "09:00"
  officeEndTime: string;               // "18:00"
  workingDays: number[];               // [0,1,2,3,4] (Sun-Thu)
  isActive: boolean;
  updatedAt: string;
}

interface IntegrationHealth {
  id: string;
  name: string;
  type: 'outlook' | 'oracle_hcm' | 'speed_gate' | 'whatsapp' | 'sms' | 'email';
  status: 'ok' | 'degraded' | 'down' | 'unknown';
  lastSyncTime?: string;
  lastErrorMessage?: string;
  lastErrorTime?: string;
  isConfigured: boolean;
}
```

### Entity Relationships

```
User (1) ─────── (N) VisitorRequest (as host/employee)
    │
    └──────────── (1) Manager (optional)

VisitorRequest (1) ─── (1) Visitor
                  │
                  ├─── (0..1) MeetingRoom
                  ├─── (0..1) ParkingSlot
                  ├─── (0..1) BuffetService → BuffetTask
                  ├─── (0..1) ValetService → ValetTask
                  └─── (N) VisitEventLog

MeetingRoom (1) ─── (N) MeetingBooking

ParkingSpot (N) ─── (1) ParkingConfig (priority rules)

ValetDriver (1) ─── (N) ValetTask
            │
            └───── (N) EmployeeValetTask

User [buffet_staff] (1) ─── (N) BuffetTask
```

---

## Module: Auth & User Management

### POST /api/v1/auth/login

Authenticate user and receive access tokens.

**Roles:** Public

**Request Body:**
```json
{
  "email": "user@dallah.com",
  "password": "********"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 86400,
  "user": {
    "id": "user_001",
    "email": "user@dallah.com",
    "name": "Ahmed Al-Rashid",
    "role": "manager",
    "department": "Executive Office",
    "autoApproval": true
  }
}
```

**Status Codes:**
- 200: Success
- 400: Missing email or password
- 401: Invalid credentials
- 403: Account inactive

---

### POST /api/v1/auth/login/biometric

Authenticate using biometric data (Face ID, fingerprint).

**Roles:** Public

**Request Body:**
```json
{
  "userId": "user_001",
  "biometricToken": "device_biometric_token_xyz",
  "deviceId": "device_123"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 86400,
  "user": { ... }
}
```

**Status Codes:**
- 200: Success
- 400: Missing biometric token
- 401: Biometric verification failed
- 403: Biometric not enabled for this user

---

### POST /api/v1/auth/refresh

Refresh access token using refresh token.

**Roles:** Authenticated

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 86400
}
```

**Status Codes:**
- 200: Success
- 401: Invalid or expired refresh token

---

### POST /api/v1/auth/logout

Invalidate current session tokens.

**Roles:** Authenticated

**Response (204 No Content)**

---

### GET /api/v1/users/me

Get current authenticated user profile.

**Roles:** All authenticated users

**Response (200 OK):**
```json
{
  "id": "user_001",
  "email": "ahmed.alrashid@dallah.com",
  "name": "Ahmed Al-Rashid",
  "role": "manager",
  "department": "Executive Office",
  "phoneNumber": "+966 50 123 4567",
  "status": "active",
  "autoApproval": true,
  "source": "microsoft_ad",
  "managerId": null,
  "managerName": null,
  "createdAt": "2024-01-15T09:00:00Z",
  "lastLogin": "2025-11-24T10:30:00Z"
}
```

---

### PUT /api/v1/users/me

Update current user profile.

**Roles:** All authenticated users

**Request Body:**
```json
{
  "name": "Ahmed Al-Rashid",
  "phoneNumber": "+966 50 123 4567",
  "department": "Executive Office"
}
```

**Response (200 OK):**
```json
{
  "id": "user_001",
  "name": "Ahmed Al-Rashid",
  "phoneNumber": "+966 50 123 4567",
  "department": "Executive Office",
  ...
}
```

**Status Codes:**
- 200: Success
- 400: Invalid input
- 403: Cannot modify read-only fields (email, designation for AD users)

---

### POST /api/v1/users/me/photo

Upload or update profile photo.

**Roles:** All authenticated users

**Request:**
- Content-Type: `multipart/form-data`

**Form Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| photo | file | Yes | Profile photo image file | JPEG, PNG, WebP only. Max 5MB. Min 100x100px, max 2048x2048px |

**Request Example:**
```
POST /api/v1/users/me/photo
Content-Type: multipart/form-data; boundary=----FormBoundary
Authorization: Bearer <token>

------FormBoundary
Content-Disposition: form-data; name="photo"; filename="profile.jpg"
Content-Type: image/jpeg

<binary image data>
------FormBoundary--
```

**Response (200 OK):**
```json
{
  "photoUrl": "https://storage.skbc.com/users/user_001/photo_1701619200.jpg",
  "thumbnailUrl": "https://storage.skbc.com/users/user_001/photo_1701619200_thumb.jpg",
  "uploadedAt": "2025-12-03T10:00:00Z"
}
```

**Status Codes:**
- 200: Photo uploaded successfully
- 400: Invalid file format, dimensions, or size
- 413: File too large

---

### DELETE /api/v1/users/me/photo

Remove profile photo (revert to default avatar).

**Roles:** All authenticated users

**Response (200 OK):**
```json
{
  "message": "Profile photo removed",
  "photoUrl": null
}
```

---

### PUT /api/v1/auth/password

Change current user's password.

**Roles:** All authenticated users

**Request Body:**
```json
{
  "currentPassword": "********",
  "newPassword": "********",
  "confirmPassword": "********"
}
```

**Response (200 OK):**
```json
{
  "message": "Password updated successfully"
}
```

**Status Codes:**
- 200: Success
- 400: Passwords don't match, weak password
- 401: Current password incorrect

---

### POST /api/v1/auth/forgot-password

Request password reset email.

**Roles:** Public

**Request Body:**
```json
{
  "email": "user@dallah.com"
}
```

**Response (200 OK):**
```json
{
  "message": "If an account exists, a reset link has been sent"
}
```

---

### POST /api/v1/auth/reset-password

Reset password using token from email.

**Roles:** Public

**Request Body:**
```json
{
  "token": "reset_token_xyz",
  "newPassword": "********",
  "confirmPassword": "********"
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset successfully"
}
```

**Status Codes:**
- 200: Success
- 400: Invalid or expired token, passwords don't match
- 422: Weak password

---

### POST /api/v1/auth/send-otp

Send OTP verification code to user's email/phone for password reset.

**Roles:** Public

**Request Body:**
```json
{
  "email": "user@dallah.com",
  "channel": "email"
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| email | string | Yes | User's registered email address | Valid email format, must exist in system |
| channel | string | No | Delivery channel for OTP | `email` (default), `sms`, `whatsapp` |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "expiresIn": 300,
  "maskedDestination": "u***r@dallah.com",
  "channel": "email",
  "canResendAt": "2025-12-03T10:05:00Z"
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Whether OTP was sent successfully |
| message | string | User-friendly status message |
| expiresIn | number | OTP validity period in seconds (default: 300 = 5 minutes) |
| maskedDestination | string | Partially masked email/phone for confirmation |
| channel | string | Channel used to send OTP |
| canResendAt | string | ISO timestamp when user can request new OTP (rate limiting) |

**Status Codes:**
- 200: OTP sent successfully
- 400: Invalid email format
- 404: Email not found in system
- 429: Too many requests (rate limited, wait before retrying)

---

### POST /api/v1/auth/verify-otp

Verify the OTP code sent to user's email/phone.

**Roles:** Public

**Request Body:**
```json
{
  "email": "user@dallah.com",
  "code": "123456"
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| email | string | Yes | User's registered email address | Valid email format |
| code | string | Yes | 6-digit OTP verification code | Exactly 6 numeric characters |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Code verified successfully",
  "resetToken": "eyJhbGciOiJIUzI1NiIs...",
  "tokenExpiresIn": 900
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Whether verification was successful |
| message | string | User-friendly status message |
| resetToken | string | JWT token to use for password reset (valid for 15 minutes) |
| tokenExpiresIn | number | Token validity period in seconds |

**Status Codes:**
- 200: OTP verified successfully
- 400: Invalid code format
- 401: Invalid or expired OTP code
- 404: No pending OTP for this email
- 429: Too many failed attempts (account temporarily locked)

**Error Response (401):**
```json
{
  "error": {
    "code": "INVALID_OTP",
    "message": "Invalid or expired verification code",
    "remainingAttempts": 2
  }
}
```

---

### POST /api/v1/auth/resend-otp

Resend OTP verification code (with rate limiting).

**Roles:** Public

**Request Body:**
```json
{
  "email": "user@dallah.com",
  "channel": "email"
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| email | string | Yes | User's registered email address | Valid email format |
| channel | string | No | Preferred delivery channel | `email` (default), `sms`, `whatsapp` |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "New verification code sent",
  "expiresIn": 300,
  "maskedDestination": "u***r@dallah.com",
  "canResendAt": "2025-12-03T10:10:00Z",
  "resendCount": 2,
  "maxResends": 5
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Whether new OTP was sent |
| message | string | User-friendly status message |
| expiresIn | number | OTP validity period in seconds |
| maskedDestination | string | Partially masked destination |
| canResendAt | string | ISO timestamp for next allowed resend |
| resendCount | number | Number of times OTP has been resent |
| maxResends | number | Maximum resends allowed (default: 5) |

**Status Codes:**
- 200: OTP resent successfully
- 400: Invalid email format
- 404: No pending OTP session for this email
- 429: Resend limit reached or rate limited

**Error Response (429):**
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Please wait before requesting a new code",
    "retryAfter": 60,
    "retryAt": "2025-12-03T10:06:00Z"
  }
}
```

---

### POST /api/v1/auth/reset-password-with-otp

Reset password after OTP verification (alternative flow using verified session).

**Roles:** Public

**Request Body:**
```json
{
  "email": "user@dallah.com",
  "resetToken": "eyJhbGciOiJIUzI1NiIs...",
  "newPassword": "NewSecureP@ss123",
  "confirmPassword": "NewSecureP@ss123"
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| email | string | Yes | User's email address | Valid email format |
| resetToken | string | Yes | Token received from verify-otp | Valid JWT token |
| newPassword | string | Yes | New password | Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char |
| confirmPassword | string | Yes | Password confirmation | Must match newPassword |

**Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*()_+-=)
- Cannot be same as previous 3 passwords
- Cannot contain user's name or email

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successfully",
  "requiresRelogin": true
}
```

**Status Codes:**
- 200: Password reset successfully
- 400: Validation error (password mismatch, weak password)
- 401: Invalid or expired reset token
- 422: Password does not meet requirements

**Error Response (422):**
```json
{
  "error": {
    "code": "WEAK_PASSWORD",
    "message": "Password does not meet security requirements",
    "details": [
      { "rule": "minLength", "message": "Password must be at least 8 characters" },
      { "rule": "uppercase", "message": "Password must contain at least 1 uppercase letter" }
    ]
  }
}
```

---

### POST /api/v1/auth/biometric/register

Register biometric authentication for current device.

**Roles:** All authenticated users

**Request Body:**
```json
{
  "deviceId": "device_abc123",
  "deviceName": "iPhone 15 Pro",
  "biometricType": "face_id",
  "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A..."
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| deviceId | string | Yes | Unique device identifier | Non-empty string |
| deviceName | string | Yes | Human-readable device name | Max 100 characters |
| biometricType | string | Yes | Type of biometric | `face_id`, `touch_id`, `fingerprint` |
| publicKey | string | Yes | Public key for biometric verification | Valid base64-encoded key |

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Biometric authentication registered",
  "registrationId": "bio_reg_001",
  "deviceId": "device_abc123",
  "deviceName": "iPhone 15 Pro",
  "biometricType": "face_id",
  "registeredAt": "2025-12-03T10:00:00Z"
}
```

**Status Codes:**
- 201: Biometric registered successfully
- 400: Invalid request data
- 403: Biometric not enabled for this user's role
- 409: Device already registered

---

### GET /api/v1/auth/biometric/devices

List registered biometric devices for current user.

**Roles:** All authenticated users

**Response (200 OK):**
```json
{
  "data": [
    {
      "registrationId": "bio_reg_001",
      "deviceId": "device_abc123",
      "deviceName": "iPhone 15 Pro",
      "biometricType": "face_id",
      "registeredAt": "2025-12-03T10:00:00Z",
      "lastUsedAt": "2025-12-03T14:30:00Z",
      "isActive": true
    }
  ],
  "maxDevices": 3,
  "currentCount": 1
}
```

---

### DELETE /api/v1/auth/biometric/devices/:deviceId

Remove biometric registration for a device.

**Roles:** All authenticated users

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| deviceId | string | Device ID to remove |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Biometric registration removed",
  "deviceId": "device_abc123"
}
```

**Status Codes:**
- 200: Device removed successfully
- 404: Device not found or not owned by user

---

### POST /api/v1/auth/biometric/verify

Verify biometric authentication (called from login flow).

**Roles:** Public

**Request Body:**
```json
{
  "userId": "user_001",
  "deviceId": "device_abc123",
  "biometricSignature": "signed_challenge_data...",
  "challenge": "random_challenge_string"
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| userId | string | Yes | User ID attempting login | Valid user ID |
| deviceId | string | Yes | Registered device ID | Non-empty string |
| biometricSignature | string | Yes | Cryptographic signature of challenge | Valid signature |
| challenge | string | Yes | Challenge string from biometric prompt | Non-empty string |

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 86400,
  "user": {
    "id": "user_001",
    "email": "user@dallah.com",
    "name": "Ahmed Al-Rashid",
    "role": "manager",
    "department": "Executive Office"
  }
}
```

**Status Codes:**
- 200: Authentication successful
- 401: Invalid biometric signature
- 403: Biometric not registered for this device
- 404: User or device not found

---

### PATCH /api/v1/auth/biometric/settings

Update biometric settings for user.

**Roles:** All authenticated users

**Request Body:**
```json
{
  "enabled": true,
  "requirePasswordFallback": true,
  "allowedBiometricTypes": ["face_id", "touch_id"]
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| enabled | boolean | No | Enable/disable biometric login | true/false |
| requirePasswordFallback | boolean | No | Require password option | true/false |
| allowedBiometricTypes | array | No | Allowed biometric methods | Array of valid types |

**Response (200 OK):**
```json
{
  "userId": "user_001",
  "enabled": true,
  "requirePasswordFallback": true,
  "allowedBiometricTypes": ["face_id", "touch_id"],
  "registeredDevices": 1,
  "updatedAt": "2025-12-03T10:00:00Z"
}
```

---

### GET /api/v1/users

List all users (admin only).

**Roles:** `building_admin`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20, max: 100) |
| role | string | Filter by role |
| department | string | Filter by department |
| status | string | Filter by status (active/inactive) |
| search | string | Search by name or email |
| sortBy | string | Sort field (name, role, department, createdAt) |
| sortOrder | string | Sort order (asc/desc) |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "user_001",
      "name": "Ahmed Al-Rashid",
      "email": "ahmed.alrashid@dallah.com",
      "role": "manager",
      "department": "Executive Office",
      "status": "active",
      "autoApproval": true,
      "source": "microsoft_ad",
      "createdAt": "2024-01-15T09:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

### POST /api/v1/users

Create a new user (admin only).

**Roles:** `building_admin`

**Request Body:**
```json
{
  "email": "new.user@dallah.com",
  "name": "New User",
  "role": "employee",
  "department": "Marketing",
  "phoneNumber": "+966 50 111 2222",
  "status": "active",
  "autoApproval": false,
  "managerId": "user_001"
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| email | string | Yes | User's email address | Valid email format, must be unique, max 255 chars |
| name | string | Yes | Full name (supports Arabic) | 2-100 characters |
| role | string | Yes | User role | One of: `employee`, `manager`, `receptionist`, `security`, `building_admin`, `buffet_admin`, `buffet_staff`, `valet_admin`, `valet_driver` |
| department | string | Yes | Department name | Max 100 characters |
| phoneNumber | string | No | Phone with country code | Format: +XXX XX XXX XXXX |
| status | string | No | Account status | `active` (default), `inactive` |
| autoApproval | boolean | No | Enable auto-approval for visits | Default: `false` |
| managerId | string | No | Reporting manager's user ID | Must exist in system |

**Response (201 Created):**
```json
{
  "id": "user_050",
  "email": "new.user@dallah.com",
  "name": "New User",
  "role": "employee",
  "department": "Marketing",
  "phoneNumber": "+966 50 111 2222",
  "status": "active",
  "autoApproval": false,
  "source": "app_created",
  "managerId": "user_001",
  "managerName": "Ahmed Al-Rashid",
  "createdAt": "2025-12-03T10:00:00Z"
}
```

**Status Codes:**
- 201: Created
- 400: Invalid input
- 409: Email already exists

---

### GET /api/v1/users/:id

Get user by ID.

**Roles:** `building_admin`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | User ID |

**Response (200 OK):**
```json
{
  "id": "user_001",
  "name": "Ahmed Al-Rashid",
  "email": "ahmed.alrashid@dallah.com",
  ...
}
```

**Status Codes:**
- 200: Success
- 404: User not found

---

### PUT /api/v1/users/:id

Update user by ID (admin only).

**Roles:** `building_admin`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | User ID |

**Request Body:**
```json
{
  "name": "Updated Name",
  "role": "manager",
  "department": "New Department",
  "phoneNumber": "+966 50 999 8888",
  "status": "active",
  "autoApproval": true,
  "managerId": "user_001"
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| name | string | No | Full name (supports Arabic) | 2-100 characters |
| role | string | No | User role | One of: `employee`, `manager`, `receptionist`, `security`, `building_admin`, `buffet_admin`, `buffet_staff`, `valet_admin`, `valet_driver` |
| department | string | No | Department name | Max 100 characters |
| phoneNumber | string | No | Phone with country code | Format: +XXX XX XXX XXXX |
| status | string | No | Account status | `active`, `inactive` |
| autoApproval | boolean | No | Enable auto-approval for visits | true/false |
| managerId | string | No | Reporting manager's user ID | Must exist in system, null to remove |

**Note:** Email cannot be changed after creation. At least one field must be provided.

**Response (200 OK):**
```json
{
  "id": "user_001",
  "name": "Updated Name",
  "role": "manager",
  "department": "New Department",
  "phoneNumber": "+966 50 999 8888",
  "status": "active",
  "autoApproval": true,
  "managerId": "user_001",
  "managerName": "Ahmed Al-Rashid",
  "updatedAt": "2025-12-03T15:00:00Z"
}
```

**Status Codes:**
- 200: Success
- 400: Invalid input, no fields provided
- 404: User not found
- 409: Cannot change role while user has active requests

---

### DELETE /api/v1/users/:id

Delete user (admin only).

**Roles:** `building_admin`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | User ID |

**Response (204 No Content)**

**Status Codes:**
- 204: Deleted
- 404: User not found
- 409: Cannot delete user with active requests

---

### POST /api/v1/users/bulk/auto-approval

Enable/disable auto-approval for multiple users.

**Roles:** `building_admin`

**Request Body:**
```json
{
  "userIds": ["user_001", "user_002", "user_003"],
  "autoApproval": true
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| userIds | array | Yes | Array of user IDs to update | Non-empty array, max 100 IDs, all must be valid user IDs |
| autoApproval | boolean | Yes | Enable or disable auto-approval | true/false |

**Response (200 OK):**
```json
{
  "successCount": 3,
  "failedCount": 0,
  "failedIds": [],
  "message": "Auto-approval updated for 3 users"
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| successCount | number | Number of users successfully updated |
| failedCount | number | Number of users that failed to update |
| failedIds | array | Array of user IDs that failed with reasons |
| message | string | Summary message |

**Error Response (Partial Failure):**
```json
{
  "successCount": 2,
  "failedCount": 1,
  "failedIds": [
    { "id": "user_999", "reason": "User not found" }
  ]
}
```

---

## Module: Staff (Employee Initiator)

### POST /api/v1/visits

Create a new visitor request.

**Roles:** `employee`, `manager`

**Request Body:**
```json
{
  "visitor": {
    "fullName": "John Smith",
    "email": "john.smith@techcorp.com",
    "phone": "+1 555 123 4567",
    "company": "TechCorp Inc"
  },
  "visitDate": "2025-12-10",
  "visitTime": "10:00 AM",
  "duration": "2 hours",
  "purpose": "Business Meeting",
  "notes": "VIP client, please provide premium service",
  "communicationChannels": ["email", "whatsapp", "qr_code"],
  "needsMeetingRoom": true,
  "needsParking": true,
  "needsBuffet": true,
  "needsValet": false,
  "buffetPreferences": {
    "mealType": "lunch",
    "guestCount": 4,
    "specialRequirements": "Halal, no pork"
  },
  "parkingPreference": "auto"
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| visitor | object | Yes | Visitor information | See nested fields below |
| visitor.fullName | string | Yes | Visitor's full name | 2-100 characters, supports Arabic |
| visitor.email | string | Yes | Visitor's email | Valid email format |
| visitor.phone | string | Yes | Visitor's phone number | International format with country code |
| visitor.company | string | No | Visitor's company name | Max 200 characters |
| visitDate | string | Yes | Date of visit | ISO 8601 date (YYYY-MM-DD), must be future date |
| visitTime | string | Yes | Time of visit | Format: "HH:MM AM/PM" or "HH:MM" (24h) |
| duration | string | Yes | Expected duration | Format: "X hours" or "X minutes" |
| purpose | string | Yes | Purpose of visit | One of: `Business Meeting`, `Interview`, `Delivery`, `Contractor Work`, `Official Visit`, `Personal`, `Other` |
| notes | string | No | Additional notes for the visit | Max 500 characters |
| communicationChannels | array | Yes | How to notify visitor | Array of: `email`, `sms`, `whatsapp`, `qr_code` (at least one required) |
| needsMeetingRoom | boolean | No | Request meeting room | Default: false |
| needsParking | boolean | No | Request parking | Default: false |
| needsBuffet | boolean | No | Request catering | Default: false |
| needsValet | boolean | No | Request valet service | Default: false |
| buffetPreferences | object | No | Catering preferences | Required if needsBuffet is true |
| buffetPreferences.mealType | string | Cond. | Type of meal | `breakfast`, `lunch`, `snacks`, `dinner` |
| buffetPreferences.guestCount | number | Cond. | Number of guests | 1-50 |
| buffetPreferences.specialRequirements | string | No | Dietary requirements | Max 200 characters |
| parkingPreference | string | No | Parking allocation method | `auto` (default), `valet_zone`, `none` |

**Response (201 Created):**
```json
{
  "id": "REQ_1701619200_abc123",
  "employeeId": "user_002",
  "employeeName": "Sarah Johnson",
  "employeeDepartment": "Marketing",
  "visitor": {
    "id": "VIS_1701619200_xyz789",
    "fullName": "John Smith",
    "email": "john.smith@techcorp.com",
    "phone": "+1 555 123 4567",
    "company": "TechCorp Inc"
  },
  "visitDate": "2025-12-10",
  "visitTime": "10:00 AM",
  "duration": "2 hours",
  "purpose": "Business Meeting",
  "status": "pending_approval",
  "communicationChannels": ["email", "whatsapp", "qr_code"],
  "parkingType": "auto",
  "meetingRoom": {
    "id": "ROOM_1701619200",
    "name": "Conference Room (TBD)",
    "floor": "3rd Floor",
    "capacity": 8,
    "timeSlot": "10:00 AM"
  },
  "buffet": {
    "id": "BUFF_1701619200",
    "mealType": "lunch",
    "location": "Cafeteria"
  },
  "approval": {
    "requiresApproval": true,
    "autoApproved": false
  },
  "createdAt": "2025-12-03T10:00:00Z",
  "updatedAt": "2025-12-03T10:00:00Z"
}
```

**Note:** If user is a `manager`, `autoApproved` will be `true` and `status` will be `approved`.

**Status Codes:**
- 201: Created
- 400: Invalid input
- 422: Date in the past, invalid time slot

---

### GET /api/v1/visits

List visitor requests.

**Roles:** `employee`, `manager`, `receptionist`, `building_admin`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |
| status | string | Filter by status (comma-separated for multiple) |
| startDate | string | Filter from date (YYYY-MM-DD) |
| endDate | string | Filter to date (YYYY-MM-DD) |
| search | string | Search by visitor name, company, or host |
| myRequestsOnly | boolean | Only show current user's requests |
| pendingApproval | boolean | Only pending_approval requests |
| awaitingVisitor | boolean | Approved but visitor hasn't responded |
| isWalkIn | boolean | Filter walk-in visits |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "REQ_001",
      "employeeName": "Sarah Johnson",
      "visitor": {
        "fullName": "John Smith",
        "company": "TechCorp Inc"
      },
      "visitDate": "2025-12-10",
      "visitTime": "10:00 AM",
      "status": "pending_approval",
      "purpose": "Business Meeting",
      "isWalkIn": false,
      "createdAt": "2025-12-03T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### GET /api/v1/visits/:id

Get visitor request details.

**Roles:** `employee`, `manager`, `receptionist`, `security`, `building_admin`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Request ID |

**Response (200 OK):**
```json
{
  "id": "REQ_001",
  "employeeId": "user_002",
  "employeeName": "Sarah Johnson",
  "employeeDepartment": "Marketing",
  "visitor": {
    "id": "VIS_001",
    "fullName": "John Smith",
    "email": "john.smith@techcorp.com",
    "phone": "+1 555 123 4567",
    "company": "TechCorp Inc"
  },
  "visitDate": "2025-12-10",
  "visitTime": "10:00 AM",
  "duration": "2 hours",
  "purpose": "Business Meeting",
  "status": "approved",
  "communicationChannels": ["email", "whatsapp", "qr_code"],
  "parkingType": "auto",
  "parkingSlot": {
    "id": "ps_002",
    "slotNumber": "B1-002",
    "location": "skbc_basement",
    "floor": "B1"
  },
  "meetingRoom": {
    "id": "room_001",
    "name": "Majlis Al-Shura",
    "floor": "3rd Floor",
    "capacity": 12,
    "timeSlot": "10:00 AM - 12:00 PM"
  },
  "buffet": {
    "id": "buffet_001",
    "mealType": "lunch",
    "location": "Executive Dining Room"
  },
  "approval": {
    "requiresApproval": true,
    "autoApproved": false,
    "managerId": "user_001",
    "managerName": "Ahmed Al-Rashid",
    "approvedAt": "2025-12-03T11:00:00Z",
    "managerComment": "Approved for VIP treatment"
  },
  "reminders": {
    "firstReminderAt": "2025-12-10T06:00:00Z",
    "secondReminderAt": "2025-12-10T04:00:00Z",
    "autoCancelAt": "2025-12-10T03:00:00Z",
    "firstReminderSent": false,
    "secondReminderSent": false
  },
  "qrCode": "QR_REQ_001_visitor",
  "createdAt": "2025-12-03T10:00:00Z",
  "updatedAt": "2025-12-03T11:00:00Z"
}
```

**Status Codes:**
- 200: Success
- 404: Request not found

---

### PUT /api/v1/visits/:id

Update/reschedule a visitor request.

**Roles:** `employee`, `manager` (owner only)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Request ID |

**Request Body:**
```json
{
  "visitDate": "2025-12-12",
  "visitTime": "2:00 PM",
  "duration": "3 hours",
  "purpose": "Updated purpose",
  "notes": "Updated meeting notes",
  "needsParking": true,
  "needsValet": true,
  "needsBuffet": false,
  "needsMeetingRoom": true,
  "communicationChannels": ["email", "whatsapp"]
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| visitDate | string | No | New date of visit | ISO 8601 date (YYYY-MM-DD), must be future date |
| visitTime | string | No | New time of visit | Format: "HH:MM AM/PM" or "HH:MM" (24h) |
| duration | string | No | Updated duration | Format: "X hours" or "X minutes" |
| purpose | string | No | Updated purpose | One of: `Business Meeting`, `Interview`, `Delivery`, `Contractor Work`, `Official Visit`, `Personal`, `Other` |
| notes | string | No | Updated notes | Max 500 characters |
| needsParking | boolean | No | Update parking requirement | true/false |
| needsValet | boolean | No | Update valet requirement | true/false |
| needsBuffet | boolean | No | Update buffet requirement | true/false |
| needsMeetingRoom | boolean | No | Update meeting room requirement | true/false |
| communicationChannels | array | No | Update notification channels | Array of: `email`, `sms`, `whatsapp`, `qr_code` |

**Note:** At least one field must be provided. If date/time is changed and request was already approved, status changes to `pending_approval` and requires re-approval. Resources (parking, valet, buffet, meeting room) may need reallocation.

**Response (200 OK):**
```json
{
  "id": "REQ_001",
  "visitDate": "2025-12-12",
  "visitTime": "2:00 PM",
  "duration": "3 hours",
  "purpose": "Updated purpose",
  "status": "pending_approval",
  "needsResourceReallocation": true,
  "resourcesAffected": ["meeting_room", "parking"],
  "updatedAt": "2025-12-03T14:00:00Z"
}
```

**Status Codes:**
- 200: Success
- 400: Invalid input, no fields provided
- 403: Not the request owner
- 404: Request not found
- 422: Cannot reschedule after check-in, cannot reschedule cancelled request

---

### DELETE /api/v1/visits/:id

Cancel a visitor request.

**Roles:** `employee`, `manager`, `receptionist` (owner or authorized)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Request ID |

**Response (200 OK):**
```json
{
  "id": "REQ_001",
  "status": "cancelled",
  "cancelledBy": "user_002",
  "cancelledByName": "Sarah Johnson",
  "cancelledAt": "2025-12-03T15:00:00Z",
  "message": "Visit cancelled. Associated valet task has been cancelled."
}
```

**Status Codes:**
- 200: Cancelled
- 403: Not authorized to cancel
- 404: Request not found
- 422: Cannot cancel after check-in

---

### GET /api/v1/visits/:id/event-log

Get event log for a specific visit.

**Roles:** `employee`, `manager`, `building_admin`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Request ID |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "LOG_001",
      "requestId": "REQ_001",
      "eventType": "created",
      "description": "Visit request created by Sarah Johnson for John Smith",
      "performedBy": "user_002",
      "performedByRole": "employee",
      "timestamp": "2025-12-03T10:00:00Z"
    },
    {
      "id": "LOG_002",
      "requestId": "REQ_001",
      "eventType": "approved",
      "description": "Visit request approved by Ahmed Al-Rashid",
      "performedBy": "user_001",
      "performedByRole": "manager",
      "timestamp": "2025-12-03T11:00:00Z"
    }
  ]
}
```

---

## Module: Manager / Approver

### GET /api/v1/approvals/pending

Get requests pending manager approval.

**Roles:** `manager`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| isWalkIn | boolean | Filter walk-in only |
| search | string | Search by visitor or host name |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "REQ_005",
      "employeeName": "Sarah Johnson",
      "employeeDepartment": "Marketing",
      "visitor": {
        "fullName": "Michael Chen",
        "company": "Tech Solutions Ltd"
      },
      "visitDate": "2025-12-10",
      "visitTime": "2:00 PM",
      "purpose": "Product Demo",
      "isWalkIn": false,
      "createdAt": "2025-12-03T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

### POST /api/v1/visits/:id/approve

Approve a visitor request.

**Roles:** `manager`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Request ID |

**Request Body:**
```json
{
  "comment": "Approved. Please arrange VIP parking."
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| comment | string | No | Optional approval comment | Max 500 characters |

**Response (200 OK):**
```json
{
  "id": "REQ_005",
  "status": "approved",
  "approval": {
    "requiresApproval": true,
    "autoApproved": false,
    "managerId": "user_001",
    "managerName": "Ahmed Al-Rashid",
    "approvedAt": "2025-12-03T12:00:00Z",
    "managerComment": "Approved. Please arrange VIP parking."
  },
  "qrCode": "QR_REQ_005_visitor",
  "reminders": {
    "firstReminderAt": "2025-12-10T10:00:00Z",
    "secondReminderAt": "2025-12-10T08:00:00Z",
    "autoCancelAt": "2025-12-10T07:00:00Z"
  }
}
```

**Status Codes:**
- 200: Approved
- 403: Not authorized to approve
- 404: Request not found
- 422: Request not in pending_approval status

---

### POST /api/v1/visits/:id/reject

Reject a visitor request.

**Roles:** `manager`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Request ID |

**Request Body:**
```json
{
  "reason": "Meeting room unavailable",
  "comment": "Please reschedule to next week"
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| reason | string | Yes | Reason for rejection | One of: `Schedule Conflict`, `Meeting room unavailable`, `Capacity exceeded`, `Visitor blacklisted`, `Security concern`, `Incomplete information`, `Other` |
| comment | string | No | Additional comment for employee | Max 500 characters |

**Response (200 OK):**
```json
{
  "id": "REQ_005",
  "status": "rejected",
  "approval": {
    "requiresApproval": true,
    "autoApproved": false,
    "managerId": "user_001",
    "managerName": "Ahmed Al-Rashid",
    "rejectedAt": "2025-12-03T12:00:00Z",
    "rejectionReason": "Meeting room unavailable",
    "managerComment": "Please reschedule to next week"
  }
}
```

**Status Codes:**
- 200: Rejected
- 400: Reason is required
- 403: Not authorized to reject
- 404: Request not found
- 422: Request not in pending_approval status

---

### POST /api/v1/approvals/bulk/approve

Bulk approve multiple requests.

**Roles:** `manager`

**Request Body:**
```json
{
  "requestIds": ["REQ_001", "REQ_002", "REQ_003"],
  "comment": "Batch approved for upcoming conference"
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| requestIds | array | Yes | Array of request IDs to approve | Non-empty array, max 50 IDs |
| comment | string | No | Comment applied to all approvals | Max 500 characters |

**Response (200 OK):**
```json
{
  "successCount": 3,
  "failedCount": 0,
  "failedIds": [],
  "results": [
    { "id": "REQ_001", "status": "approved" },
    { "id": "REQ_002", "status": "approved" },
    { "id": "REQ_003", "status": "approved" }
  ]
}
```

---

### POST /api/v1/approvals/bulk/reject

Bulk reject multiple requests.

**Roles:** `manager`

**Request Body:**
```json
{
  "requestIds": ["REQ_004", "REQ_005"],
  "reason": "Capacity exceeded for this date",
  "comment": "Please reschedule"
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| requestIds | array | Yes | Array of request IDs to reject | Non-empty array, max 50 IDs |
| reason | string | Yes | Rejection reason applied to all | One of: `Schedule Conflict`, `Meeting room unavailable`, `Capacity exceeded`, `Visitor blacklisted`, `Security concern`, `Incomplete information`, `Other` |
| comment | string | No | Additional comment for all | Max 500 characters |

**Response (200 OK):**
```json
{
  "successCount": 2,
  "failedCount": 0,
  "failedIds": [],
  "results": [
    { "id": "REQ_004", "status": "rejected" },
    { "id": "REQ_005", "status": "rejected" }
  ]
}
```

---

### GET /api/v1/approvals/awaiting-visitor

Get approved requests waiting for visitor acceptance.

**Roles:** `manager`, `employee`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "REQ_010",
      "visitor": {
        "fullName": "Elena Rodriguez",
        "email": "elena@innovate.com"
      },
      "visitDate": "2025-12-15",
      "status": "approved",
      "approval": {
        "approvedAt": "2025-12-03T10:00:00Z"
      },
      "reminders": {
        "firstReminderAt": "2025-12-14T10:00:00Z",
        "autoCancelAt": "2025-12-14T07:00:00Z"
      }
    }
  ],
  "pagination": {...}
}
```

---

## Module: Receptionist

### GET /api/v1/reception/today

Get today's visitors for reception dashboard.

**Roles:** `receptionist`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter: expected, checked_in, completed |
| search | string | Search by visitor name or company |
| hostName | string | Filter by host name |

**Response (200 OK):**
```json
{
  "summary": {
    "expected": 15,
    "checkedIn": 8,
    "completed": 4,
    "pending": 3
  },
  "data": [
    {
      "id": "REQ_020",
      "visitor": {
        "fullName": "Michael Chen",
        "company": "Tech Solutions Ltd",
        "phone": "+1 555 234 5678"
      },
      "hostName": "Sarah Johnson",
      "hostDepartment": "Marketing",
      "visitTime": "10:00 AM",
      "status": "visitor_accepted",
      "meetingRoom": {
        "name": "Majlis Al-Shura",
        "floor": "3rd Floor"
      },
      "parkingSlot": {
        "slotNumber": "B1-005"
      },
      "qrCode": "QR_REQ_020_visitor"
    }
  ]
}
```

---

### GET /api/v1/reception/search

Search visitors across all requests.

**Roles:** `receptionist`, `security`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| q | string | Search query (name, phone, company, ID) |
| limit | number | Max results (default: 20) |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "REQ_020",
      "visitor": {
        "fullName": "Michael Chen",
        "company": "Tech Solutions Ltd"
      },
      "visitDate": "2025-12-03",
      "visitTime": "10:00 AM",
      "status": "checked_in",
      "hostName": "Sarah Johnson"
    }
  ]
}
```

---

### POST /api/v1/reception/walk-in

Register a walk-in visitor.

**Roles:** `receptionist`

**Request Body:**
```json
{
  "visitorName": "Jane Doe",
  "visitorEmail": "jane.doe@consulting.com",
  "visitorCompany": "Consulting Inc",
  "visitorPhone": "+1 555 999 8888",
  "hostId": "user_001",
  "hostName": "Ahmed Al-Rashid",
  "visitType": "Business Meeting",
  "purpose": "Unscheduled discussion",
  "idType": "national_id",
  "idNumber": "1234567890"
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| visitorName | string | Yes | Visitor's full name | 2-100 characters, supports Arabic |
| visitorEmail | string | No | Visitor's email address | Valid email format |
| visitorCompany | string | No | Visitor's company name | Max 200 characters |
| visitorPhone | string | Yes | Visitor's phone number | International format with country code |
| hostId | string | Cond. | Host's user ID | Required if hostName not provided |
| hostName | string | Cond. | Host's name (for lookup) | Required if hostId not provided |
| visitType | string | Yes | Type of visit | One of: `Business Meeting`, `Interview`, `Delivery`, `Contractor Work`, `Official Visit`, `Personal`, `Other` |
| purpose | string | No | Brief purpose description | Max 500 characters |
| idType | string | No | Type of ID document | `national_id`, `passport`, `iqama`, `driver_license` |
| idNumber | string | No | ID document number | Max 50 characters |

**Response (201 Created):**
```json
{
  "id": "WALKIN_1701619200_abc123",
  "visitor": {
    "id": "VIS_1701619200_xyz",
    "fullName": "Jane Doe",
    "company": "Consulting Inc",
    "phone": "+1 555 999 8888"
  },
  "hostName": "Ahmed Al-Rashid",
  "visitDate": "2025-12-03",
  "visitTime": "2:30 PM",
  "status": "pending_approval",
  "isWalkIn": true,
  "createdAt": "2025-12-03T14:30:00Z"
}
```

---

### POST /api/v1/visits/:id/check-in

Check in a visitor (desk-based).

**Roles:** `receptionist`, `security`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Request ID |

**Request Body:**
```json
{
  "notes": "Visitor arrived 5 minutes early",
  "badgeNumber": "V-1234",
  "idVerified": true,
  "idType": "national_id",
  "idNumber": "1234567890"
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| notes | string | No | Check-in notes | Max 500 characters |
| badgeNumber | string | No | Assigned visitor badge number | Max 20 characters |
| idVerified | boolean | No | Whether ID was verified | Default: false |
| idType | string | No | Type of ID document verified | `national_id`, `passport`, `iqama`, `driver_license` |
| idNumber | string | No | ID document number | Max 50 characters |

**Response (200 OK):**
```json
{
  "id": "REQ_020",
  "status": "checked_in",
  "checkedInAt": "2025-12-03T09:55:00Z",
  "checkedInBy": "user_004",
  "checkedInByName": "Fatima Al-Zahrani",
  "badgeNumber": "V-1234",
  "idVerified": true
}
```

**Status Codes:**
- 200: Checked in
- 404: Request not found
- 422: Already checked in, visit not approved, or visit expired

---

### POST /api/v1/visits/:id/check-out

Check out a visitor (desk-based).

**Roles:** `receptionist`, `security`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Request ID |

**Request Body:**
```json
{
  "notes": "Visitor collected badge",
  "badgeReturned": true,
  "rating": 5,
  "feedback": "Great visit experience"
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| notes | string | No | Check-out notes | Max 500 characters |
| badgeReturned | boolean | No | Whether visitor badge was returned | Default: true |
| rating | number | No | Visit experience rating | 1-5 |
| feedback | string | No | Optional visitor feedback | Max 500 characters |

**Response (200 OK):**
```json
{
  "id": "REQ_020",
  "status": "completed",
  "completedAt": "2025-12-03T12:00:00Z",
  "checkedOutBy": "user_004",
  "checkedOutByName": "Fatima Al-Zahrani",
  "visitDuration": "2 hours 5 minutes",
  "badgeReturned": true
}
```

**Status Codes:**
- 200: Checked out successfully
- 404: Request not found
- 422: Not checked in, cannot check out

---

### GET /api/v1/reception/rooms/today

Get today's meetings grouped by room.

**Roles:** `receptionist`

**Response (200 OK):**
```json
{
  "data": [
    {
      "roomId": "room_001",
      "roomName": "Majlis Al-Shura",
      "floor": "3rd Floor",
      "capacity": 12,
      "meetings": [
        {
          "id": "booking_001",
          "title": "Client Meeting",
          "hostName": "Sarah Johnson",
          "startTime": "10:00 AM",
          "endTime": "12:00 PM",
          "status": "scheduled",
          "visitors": [
            { "name": "Michael Chen", "company": "Tech Solutions" }
          ]
        }
      ]
    }
  ]
}
```

---

### POST /api/v1/reception/communication-override

Mark communication exception/manual override.

**Roles:** `receptionist`

**Request Body:**
```json
{
  "requestId": "REQ_020",
  "channel": "phone_call",
  "notes": "Visitor contacted via phone as WhatsApp failed",
  "successfullyReached": true,
  "failedChannels": ["whatsapp", "sms"],
  "visitorConfirmedAttendance": true
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| requestId | string | Yes | Visit request ID | Must exist |
| channel | string | Yes | Channel used for override | `phone_call`, `email`, `in_person`, `other` |
| notes | string | Yes | Explanation of override | Max 500 characters |
| successfullyReached | boolean | Yes | Whether visitor was reached | true/false |
| failedChannels | array | No | Channels that failed | Array of: `email`, `sms`, `whatsapp` |
| visitorConfirmedAttendance | boolean | No | Visitor confirmed they will attend | Default: false |

**Response (200 OK):**
```json
{
  "id": "override_001",
  "requestId": "REQ_020",
  "channel": "phone_call",
  "notes": "Visitor contacted via phone as WhatsApp failed",
  "successfullyReached": true,
  "failedChannels": ["whatsapp", "sms"],
  "visitorConfirmedAttendance": true,
  "createdBy": "user_004",
  "createdByName": "Fatima Al-Zahrani",
  "createdAt": "2025-12-03T09:00:00Z"
}
```

**Status Codes:**
- 200: Override recorded
- 400: Invalid channel or missing required fields
- 404: Request not found

---

### GET /api/v1/reception/alerts

Get real-time alerts for receptionist dashboard.

**Roles:** `receptionist`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| unreadOnly | boolean | Only unread alerts (default: true) |
| type | string | Filter: arrival, late, exception, walk_in |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "alert_001",
      "type": "arrival",
      "title": "Visitor Arriving",
      "message": "Michael Chen (Tech Solutions) arriving for 10:00 AM meeting with Sarah Johnson",
      "requestId": "REQ_020",
      "priority": "medium",
      "timestamp": "2025-12-03T09:55:00Z",
      "read": false,
      "actionRequired": false
    },
    {
      "id": "alert_002",
      "type": "late",
      "title": "Visitor Late",
      "message": "Elena Rodriguez expected at 9:00 AM has not arrived. Host: Ahmed Al-Rashid",
      "requestId": "REQ_018",
      "priority": "high",
      "timestamp": "2025-12-03T09:30:00Z",
      "read": false,
      "actionRequired": true
    },
    {
      "id": "alert_003",
      "type": "exception",
      "title": "Communication Failed",
      "message": "WhatsApp message to visitor John Smith failed delivery. Manual follow-up required.",
      "requestId": "REQ_022",
      "priority": "high",
      "timestamp": "2025-12-03T08:45:00Z",
      "read": false,
      "actionRequired": true
    },
    {
      "id": "alert_004",
      "type": "walk_in",
      "title": "Walk-In Pending Approval",
      "message": "Walk-in visitor Jane Doe awaiting approval from Ahmed Al-Rashid",
      "requestId": "WALKIN_001",
      "priority": "high",
      "timestamp": "2025-12-03T09:15:00Z",
      "read": false,
      "actionRequired": true
    }
  ],
  "unreadCount": 4,
  "summary": {
    "arrivals": 5,
    "late": 2,
    "exceptions": 1,
    "walkIns": 1
  }
}
```

---

## Module: Security

### GET /api/v1/security/lookup

Look up visit/visitor by QR code or ID.

**Roles:** `security`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| qrCode | string | QR code value |
| requestId | string | Request ID |
| visitorId | string | Visitor ID |

**Response (200 OK):**
```json
{
  "id": "REQ_020",
  "visitor": {
    "id": "VIS_020",
    "fullName": "Michael Chen",
    "company": "Tech Solutions Ltd",
    "photo": "/photos/vis_020.jpg"
  },
  "hostName": "Sarah Johnson",
  "hostDepartment": "Marketing",
  "visitDate": "2025-12-03",
  "visitTime": "10:00 AM",
  "status": "visitor_accepted",
  "qrCode": "QR_REQ_020_visitor",
  "meetingRoom": {
    "name": "Majlis Al-Shura",
    "floor": "3rd Floor"
  },
  "parkingSlot": {
    "slotNumber": "B1-005",
    "location": "skbc_basement"
  },
  "accessGranted": true,
  "accessReason": "Valid approved visit for today"
}
```

**Status Codes:**
- 200: Found
- 404: No matching visit found
- 422: Visit expired/cancelled

---

### POST /api/v1/security/gate/check-in

Check in visitor via gate scan.

**Roles:** `security`

**Request Body:**
```json
{
  "qrCode": "QR_REQ_020_visitor",
  "gateId": "gate_main_entrance",
  "notes": "Entered through main gate",
  "vehiclePlate": "ABC 1234",
  "escortAssigned": false
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| qrCode | string | Yes | Visitor's QR code | Must be valid QR format |
| gateId | string | Yes | Gate identifier | Must be valid gate ID |
| notes | string | No | Check-in notes | Max 500 characters |
| vehiclePlate | string | No | Vehicle plate number if applicable | Max 20 characters |
| escortAssigned | boolean | No | Whether escort was assigned | Default: false |

**Response (200 OK):**
```json
{
  "id": "REQ_020",
  "visitor": {
    "fullName": "Michael Chen",
    "company": "Tech Solutions Ltd"
  },
  "hostName": "Sarah Johnson",
  "status": "checked_in",
  "checkedInAt": "2025-12-03T09:58:00Z",
  "meetingRoom": {
    "name": "Majlis Al-Shura",
    "floor": "3rd Floor"
  },
  "parkingSlot": {
    "slotNumber": "B1-005"
  },
  "gateEvent": {
    "id": "gate_event_001",
    "gateId": "gate_main_entrance",
    "gateName": "Main Entrance",
    "action": "check_in",
    "result": "allowed",
    "timestamp": "2025-12-03T09:58:00Z"
  }
}
```

**Status Codes:**
- 200: Checked in successfully
- 403: Access denied (invalid/expired QR, blacklisted visitor)
- 404: Visit not found
- 422: Already checked in, visit not for today

---

### POST /api/v1/security/gate/check-out

Check out visitor via gate scan.

**Roles:** `security`

**Request Body:**
```json
{
  "qrCode": "QR_REQ_020_visitor",
  "gateId": "gate_main_entrance",
  "notes": "Departed on schedule"
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| qrCode | string | Yes | Visitor's QR code | Must be valid QR format |
| gateId | string | Yes | Gate identifier | Must be valid gate ID |
| notes | string | No | Check-out notes | Max 500 characters |

**Response (200 OK):**
```json
{
  "id": "REQ_020",
  "visitor": {
    "fullName": "Michael Chen",
    "company": "Tech Solutions Ltd"
  },
  "status": "completed",
  "completedAt": "2025-12-03T12:15:00Z",
  "visitDuration": "2 hours 17 minutes",
  "gateEvent": {
    "id": "gate_event_002",
    "gateId": "gate_main_entrance",
    "gateName": "Main Entrance",
    "action": "check_out",
    "result": "allowed",
    "timestamp": "2025-12-03T12:15:00Z"
  }
}
```

**Status Codes:**
- 200: Checked out successfully
- 404: Visit not found
- 422: Not checked in, cannot check out

---

### GET /api/v1/security/today/summary

Get today's visitor summary for security.

**Roles:** `security`

**Response (200 OK):**
```json
{
  "date": "2025-12-03",
  "summary": {
    "expected": 25,
    "checkedIn": 18,
    "currentlyOnSite": 12,
    "checkedOut": 6,
    "noShow": 2,
    "denied": 1
  },
  "byGate": [
    {
      "gateId": "gate_main_entrance",
      "gateName": "Main Entrance",
      "checkIns": 15,
      "checkOuts": 5
    },
    {
      "gateId": "gate_parking",
      "gateName": "Parking Gate",
      "checkIns": 3,
      "checkOuts": 1
    }
  ]
}
```

---

### GET /api/v1/security/gate-events

Get gate events log.

**Roles:** `security`, `building_admin`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| gateId | string | Filter by gate |
| action | string | Filter: check_in, check_out, denied |
| startTime | string | Filter from time (ISO) |
| endTime | string | Filter to time (ISO) |
| result | string | Filter: allowed, denied |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "gate_event_001",
      "gateId": "gate_main_entrance",
      "gateName": "Main Entrance",
      "requestId": "REQ_020",
      "visitorName": "Michael Chen",
      "action": "check_in",
      "result": "allowed",
      "reason": "Valid QR code",
      "scannedBy": "user_003",
      "timestamp": "2025-12-03T09:58:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### GET /api/v1/security/alerts

Get real-time security alerts.

**Roles:** `security`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| unreadOnly | boolean | Only unread alerts (default: true) |
| type | string | Filter: access_denied, overstay, unregistered, emergency |
| gateId | string | Filter by gate |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "sec_alert_001",
      "type": "access_denied",
      "title": "Access Denied",
      "message": "Invalid QR code scanned at Main Entrance. Visitor claims appointment with Sarah Johnson.",
      "gateId": "gate_main_entrance",
      "priority": "high",
      "timestamp": "2025-12-03T10:15:00Z",
      "read": false,
      "actionRequired": true,
      "details": {
        "scannedCode": "QR_INVALID_001",
        "claimedVisitorName": "Unknown Person",
        "claimedHostName": "Sarah Johnson"
      }
    },
    {
      "id": "sec_alert_002",
      "type": "overstay",
      "title": "Visitor Overstay",
      "message": "Michael Chen has exceeded visit duration by 2 hours. Original checkout: 12:00 PM",
      "requestId": "REQ_015",
      "priority": "medium",
      "timestamp": "2025-12-03T14:00:00Z",
      "read": false,
      "actionRequired": true,
      "details": {
        "visitorName": "Michael Chen",
        "hostName": "Ahmed Al-Rashid",
        "expectedCheckout": "12:00 PM",
        "overstayMinutes": 120
      }
    },
    {
      "id": "sec_alert_003",
      "type": "unregistered",
      "title": "Unregistered Vehicle",
      "message": "Vehicle with plate ABC 9999 detected at parking gate without valid pass.",
      "gateId": "gate_parking",
      "priority": "high",
      "timestamp": "2025-12-03T09:45:00Z",
      "read": false,
      "actionRequired": true,
      "details": {
        "vehiclePlate": "ABC 9999",
        "location": "Parking Gate B1"
      }
    }
  ],
  "unreadCount": 3,
  "summary": {
    "accessDenied": 1,
    "overstay": 1,
    "unregistered": 1,
    "emergency": 0
  }
}
```

---

## Module: Meeting Rooms / Ammam

### GET /api/v1/meeting-rooms

List all meeting rooms.

**Roles:** `building_admin`, `employee`, `manager`, `receptionist`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter: active, inactive, maintenance |
| floor | string | Filter by floor |
| minCapacity | number | Minimum capacity |
| features | string | Comma-separated required features |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "room_001",
      "name": "Majlis Al-Shura",
      "floor": "3rd Floor",
      "building": "SKBC Tower",
      "capacity": 12,
      "features": ["projector", "video_conferencing", "whiteboard"],
      "status": "active",
      "description": "Executive boardroom",
      "photoUrl": "/rooms/majlis.jpg"
    }
  ]
}
```

---

### POST /api/v1/meeting-rooms

Create a new meeting room.

**Roles:** `building_admin`

**Request Body:**
```json
{
  "name": "Innovation Lab",
  "floor": "5th Floor",
  "building": "SKBC Tower",
  "capacity": 8,
  "features": ["projector", "whiteboard", "tv_display"],
  "status": "active",
  "description": "Creative collaboration space",
  "bookingRules": {
    "minDuration": 30,
    "maxDuration": 480,
    "advanceBookingDays": 30
  }
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| name | string | Yes | Room name (supports Arabic) | 2-100 characters, must be unique |
| floor | string | Yes | Floor location | Max 50 characters |
| building | string | Yes | Building name | Max 100 characters |
| capacity | number | Yes | Maximum occupancy | 1-200 |
| features | array | No | Room features | Array of: `projector`, `video_conferencing`, `whiteboard`, `tv_display`, `audio_system`, `phone` |
| status | string | No | Room availability status | `active` (default), `out_of_service`, `maintenance` |
| description | string | No | Room description | Max 500 characters |
| bookingRules | object | No | Booking configuration | See nested fields |
| bookingRules.minDuration | number | No | Minimum booking duration in minutes | 15-480, default: 30 |
| bookingRules.maxDuration | number | No | Maximum booking duration in minutes | 30-480, default: 480 |
| bookingRules.advanceBookingDays | number | No | How far in advance room can be booked | 1-90, default: 30 |

**Response (201 Created):**
```json
{
  "id": "room_010",
  "name": "Innovation Lab",
  "floor": "5th Floor",
  "building": "SKBC Tower",
  "capacity": 8,
  "features": ["projector", "whiteboard", "tv_display"],
  "status": "active",
  "description": "Creative collaboration space",
  "createdAt": "2025-12-03T10:00:00Z"
}
```

**Status Codes:**
- 201: Room created successfully
- 400: Invalid input
- 409: Room name already exists on this floor

---

### GET /api/v1/meeting-rooms/:id

Get meeting room details with upcoming bookings.

**Roles:** `building_admin`, `receptionist`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Room ID |

**Response (200 OK):**
```json
{
  "id": "room_001",
  "name": "Majlis Al-Shura",
  "floor": "3rd Floor",
  "building": "SKBC Tower",
  "capacity": 12,
  "features": ["projector", "video_conferencing", "whiteboard"],
  "status": "active",
  "upcomingBookings": [
    {
      "id": "booking_001",
      "title": "Client Meeting",
      "date": "2025-12-03",
      "startTime": "10:00 AM",
      "endTime": "12:00 PM",
      "hostName": "Sarah Johnson",
      "attendeesCount": 6
    }
  ]
}
```

---

### PUT /api/v1/meeting-rooms/:id

Update meeting room details.

**Roles:** `building_admin`

**Request Body:**
```json
{
  "name": "Updated Room Name",
  "capacity": 15,
  "features": ["projector", "video_conferencing"],
  "status": "active"
}
```

**Response (200 OK):**
```json
{
  "id": "room_001",
  "name": "Updated Room Name",
  ...
}
```

---

### PATCH /api/v1/meeting-rooms/:id/status

Toggle room status (active/maintenance).

**Roles:** `building_admin`

**Request Body:**
```json
{
  "status": "maintenance",
  "reason": "AV equipment repair",
  "estimatedAvailableDate": "2025-12-05"
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| status | string | Yes | New room status | `active`, `out_of_service`, `maintenance` |
| reason | string | Cond. | Reason for status change | Required if not `active`, max 300 chars |
| estimatedAvailableDate | string | No | Estimated return date | ISO 8601 date (YYYY-MM-DD), must be future date |

**Response (200 OK):**
```json
{
  "id": "room_001",
  "status": "maintenance",
  "reason": "AV equipment repair",
  "estimatedAvailableDate": "2025-12-05",
  "affectedBookings": [
    {
      "id": "booking_005",
      "date": "2025-12-05",
      "needsReassignment": true
    }
  ]
}
```

---

### POST /api/v1/visits/:id/assign-room

Assign or reassign meeting room to a visit.

**Roles:** `building_admin`, `receptionist`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Visit request ID |

**Request Body:**
```json
{
  "roomId": "room_002",
  "reason": "Original room under maintenance"
}
```

**Response (200 OK):**
```json
{
  "requestId": "REQ_020",
  "previousRoom": {
    "id": "room_001",
    "name": "Majlis Al-Shura"
  },
  "newRoom": {
    "id": "room_002",
    "name": "Conference Room B"
  },
  "changeLog": {
    "id": "change_001",
    "changedBy": "user_005",
    "changedAt": "2025-12-03T10:00:00Z",
    "reason": "Original room under maintenance"
  }
}
```

---

### GET /api/v1/meeting-rooms/operations/today

Get today's meeting operations view (Ammam dashboard).

**Roles:** `receptionist`, `building_admin`

**Response (200 OK):**
```json
{
  "rooms": [
    {
      "id": "room_001",
      "name": "Majlis Al-Shura",
      "floor": "3rd Floor",
      "currentStatus": "in_use",
      "currentMeeting": {
        "id": "booking_001",
        "title": "Client Meeting",
        "hostName": "Sarah Johnson",
        "startTime": "10:00 AM",
        "endTime": "12:00 PM",
        "attendeesCount": 6
      },
      "upcomingCount": 2
    },
    {
      "id": "room_002",
      "name": "Conference Room B",
      "floor": "2nd Floor",
      "currentStatus": "available",
      "currentMeeting": null,
      "upcomingCount": 1
    }
  ]
}
```

---

## Module: Parking & Valet (System-Level)

### GET /api/v1/parking/spots

List all parking spots.

**Roles:** `building_admin`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| location | string | Filter by location |
| type | string | Filter: visitor, employee, valet, reserved |
| status | string | Filter: available, occupied, reserved, maintenance |
| isActive | boolean | Filter active/inactive |
| level | string | Filter by level/floor |
| search | string | Search by spot number or plate |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "ps_001",
      "spotNumber": "B1-001",
      "location": "skbc_basement",
      "level": "B1",
      "type": "visitor",
      "isActive": true,
      "status": "occupied",
      "vehiclePlate": "ABC 1234",
      "assignedTo": null
    }
  ],
  "pagination": {...}
}
```

---

### POST /api/v1/parking/spots

Create a new parking spot.

**Roles:** `building_admin`

**Request Body:**
```json
{
  "spotNumber": "B3-001",
  "location": "skbc_basement",
  "level": "B3",
  "type": "visitor",
  "isActive": true
}
```

**Response (201 Created):**
```json
{
  "id": "ps_050",
  "spotNumber": "B3-001",
  "location": "skbc_basement",
  "level": "B3",
  "type": "visitor",
  "isActive": true,
  "status": "available",
  "createdAt": "2025-12-03T10:00:00Z"
}
```

---

### PUT /api/v1/parking/spots/:id

Update parking spot.

**Roles:** `building_admin`

**Request Body:**
```json
{
  "type": "employee",
  "isActive": true,
  "status": "available"
}
```

**Response (200 OK):**
```json
{
  "id": "ps_001",
  "spotNumber": "B1-001",
  "type": "employee",
  ...
}
```

---

### DELETE /api/v1/parking/spots/:id

Delete parking spot.

**Roles:** `building_admin`

**Response (204 No Content)**

**Status Codes:**
- 204: Deleted
- 404: Spot not found
- 409: Cannot delete occupied spot

---

## Module: Employee Parking Assignment

### GET /api/v1/parking/employees

List employees and their parking assignments.

**Roles:** `building_admin`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | Search by employee name or email |
| department | string | Filter by department |
| hasAssignment | boolean | Filter: true=assigned, false=unassigned |
| parkingArea | string | Filter by assigned parking area |
| page | number | Page number (default: 1) |
| pageSize | number | Items per page (default: 20) |

**Response (200 OK):**
```json
{
  "employees": [
    {
      "id": "user_002",
      "name": "Sarah Johnson",
      "email": "sarah.johnson@skbc.com",
      "department": "Engineering",
      "parking": {
        "assigned": true,
        "spotId": "spot_001",
        "spotNumber": "B1-005",
        "area": "SKBC Basement",
        "assignedAt": "2025-01-15T10:00:00Z"
      }
    },
    {
      "id": "user_003",
      "name": "Mohammed Al-Rashid",
      "email": "mohammed.r@skbc.com",
      "department": "Finance",
      "parking": {
        "assigned": false,
        "spotId": null,
        "spotNumber": null,
        "area": null
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 150,
    "totalPages": 8
  },
  "summary": {
    "totalEmployees": 150,
    "withAssignment": 85,
    "withoutAssignment": 65
  }
}
```

---

### POST /api/v1/parking/employees/:id/assign

Assign parking spot to employee.

**Roles:** `building_admin`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Employee user ID |

**Request Body:**
```json
{
  "spotId": "spot_001",
  "effectiveDate": "2025-12-05",
  "permanent": true,
  "notes": "Priority parking for manager"
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| spotId | string | Yes | Parking spot to assign | Must be available spot |
| effectiveDate | string | No | When assignment takes effect | ISO 8601 date, default: today |
| permanent | boolean | No | Permanent vs temporary assignment | Default: true |
| expiryDate | string | Cond. | Required if permanent=false | ISO 8601 date, must be after effectiveDate |
| notes | string | No | Assignment notes | Max 300 characters |

**Response (200 OK):**
```json
{
  "employeeId": "user_002",
  "employeeName": "Sarah Johnson",
  "spotId": "spot_001",
  "spotNumber": "B1-005",
  "area": "SKBC Basement",
  "permanent": true,
  "effectiveDate": "2025-12-05",
  "assignedAt": "2025-12-03T10:00:00Z",
  "assignedBy": "user_001"
}
```

**Status Codes:**
- 200: Assignment successful
- 400: Invalid spot ID
- 404: Employee not found
- 409: Spot already assigned, or employee already has assignment

---

### DELETE /api/v1/parking/employees/:id/assign

Remove parking assignment from employee.

**Roles:** `building_admin`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Employee user ID |

**Request Body:**
```json
{
  "reason": "Transfer to different building",
  "effectiveDate": "2025-12-10"
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| reason | string | Yes | Reason for unassignment | Max 300 characters |
| effectiveDate | string | No | When unassignment takes effect | ISO 8601 date, default: immediate |

**Response (200 OK):**
```json
{
  "employeeId": "user_002",
  "employeeName": "Sarah Johnson",
  "previousSpot": "B1-005",
  "unassignedAt": "2025-12-03T10:00:00Z",
  "unassignedBy": "user_001",
  "effectiveDate": "2025-12-10"
}
```

**Status Codes:**
- 200: Unassignment successful
- 404: Employee not found or no active assignment

---

### POST /api/v1/parking/employees/bulk-assign

Bulk assign parking spots to employees.

**Roles:** `building_admin`

**Request Body:**
```json
{
  "assignments": [
    {
      "employeeId": "user_002",
      "spotId": "spot_001"
    },
    {
      "employeeId": "user_003",
      "spotId": "spot_002"
    }
  ],
  "effectiveDate": "2025-12-05",
  "permanent": true
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| assignments | array | Yes | List of employee-spot pairs | Max 50 assignments per request |
| assignments[].employeeId | string | Yes | Employee user ID | Must exist |
| assignments[].spotId | string | Yes | Parking spot ID | Must be available |
| effectiveDate | string | No | When assignments take effect | ISO 8601 date |
| permanent | boolean | No | Permanent vs temporary | Default: true |

**Response (200 OK):**
```json
{
  "successful": 2,
  "failed": 0,
  "results": [
    {
      "employeeId": "user_002",
      "status": "success",
      "spotNumber": "B1-005"
    },
    {
      "employeeId": "user_003",
      "status": "success",
      "spotNumber": "B1-006"
    }
  ]
}
```

**Status Codes:**
- 200: Bulk operation completed (check individual results)
- 400: Invalid request body

---

### GET /api/v1/parking/config

Get parking configuration and priority rules.

**Roles:** `building_admin`

**Response (200 OK):**
```json
{
  "priorityRules": [
    {
      "id": "pr_001",
      "location": "skbc_basement",
      "priority": 1,
      "maxOccupancyPercent": 85,
      "isActive": true,
      "description": "SKBC Basement - Primary parking location"
    },
    {
      "id": "pr_002",
      "location": "red_sea_mall",
      "priority": 2,
      "maxOccupancyPercent": 70,
      "isActive": true,
      "description": "Red Sea Mall - Overflow parking"
    }
  ],
  "defaultFallback": "none",
  "enableAutoAllocation": true,
  "updatedAt": "2025-12-01T00:00:00Z"
}
```

---

### PUT /api/v1/parking/config

Update parking configuration.

**Roles:** `building_admin`

**Request Body:**
```json
{
  "enableAutoAllocation": true,
  "defaultFallback": "valet_zone"
}
```

**Response (200 OK):**
```json
{
  "enableAutoAllocation": true,
  "defaultFallback": "valet_zone",
  "updatedAt": "2025-12-03T10:00:00Z",
  ...
}
```

---

### PUT /api/v1/parking/priority-rules

Reorder parking priority rules.

**Roles:** `building_admin`

**Request Body:**
```json
{
  "orderedRuleIds": ["pr_002", "pr_001", "pr_003", "pr_004"]
}
```

**Response (200 OK):**
```json
{
  "priorityRules": [
    { "id": "pr_002", "location": "red_sea_mall", "priority": 1 },
    { "id": "pr_001", "location": "skbc_basement", "priority": 2 },
    { "id": "pr_003", "location": "valet_zone", "priority": 3 },
    { "id": "pr_004", "location": "none", "priority": 4 }
  ]
}
```

---

### GET /api/v1/parking/utilization

Get current parking utilization.

**Roles:** `building_admin`, `valet_admin`

**Response (200 OK):**
```json
{
  "total": 22,
  "available": 8,
  "occupied": 10,
  "reserved": 3,
  "maintenance": 1,
  "byLocation": [
    {
      "location": "skbc_basement",
      "total": 12,
      "available": 4,
      "occupied": 6,
      "reserved": 1,
      "maintenance": 1
    },
    {
      "location": "red_sea_mall",
      "total": 5,
      "available": 2,
      "occupied": 2,
      "reserved": 1,
      "maintenance": 0
    }
  ],
  "byType": [
    { "type": "visitor", "total": 10, "available": 4, "occupied": 5, "reserved": 1 },
    { "type": "employee", "total": 5, "available": 2, "occupied": 3 }
  ]
}
```

---

### GET /api/v1/parking/utilization/history

Get parking utilization history.

**Roles:** `building_admin`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| days | number | Number of days (default: 7) |
| location | string | Filter by location |

**Response (200 OK):**
```json
{
  "data": [
    {
      "date": "2025-12-03",
      "location": "skbc_basement",
      "totalSpots": 12,
      "occupiedSpots": 8,
      "reservedSpots": 2,
      "maintenanceSpots": 1,
      "peakOccupancy": 10,
      "peakHour": "11:00"
    }
  ]
}
```

---

## Module: Employee Self-Valet

### POST /api/v1/valet/self-service

Create employee self-valet request (Park My Car).

**Roles:** `employee`, `manager`

**Request Body:**
```json
{
  "vehicleInfo": {
    "make": "Honda",
    "model": "Accord",
    "color": "White",
    "plateNumber": "SAR 1234"
  },
  "dropOffLocation": "SKBC Main Entrance",
  "requestedReturnTime": "5:00 PM",
  "notes": "Daily parking request"
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| vehicleInfo | object | Yes | Vehicle details | See nested fields |
| vehicleInfo.make | string | Yes | Vehicle manufacturer | Max 50 characters |
| vehicleInfo.model | string | Yes | Vehicle model | Max 50 characters |
| vehicleInfo.color | string | Yes | Vehicle color | Max 30 characters |
| vehicleInfo.plateNumber | string | Yes | License plate number | Max 20 characters |
| dropOffLocation | string | Yes | Where to drop off vehicle | `SKBC Main Entrance`, `SKBC Basement`, `Parking Gate` |
| requestedReturnTime | string | Yes | Requested return time | Format: "HH:MM AM/PM", must be future time today |
| notes | string | No | Additional notes for driver | Max 300 characters |

**Response (201 Created):**
```json
{
  "id": "emp_valet_1701619200_abc",
  "employeeId": "user_002",
  "employeeName": "Sarah Johnson",
  "vehicleInfo": {
    "make": "Honda",
    "model": "Accord",
    "color": "White",
    "plateNumber": "SAR 1234"
  },
  "dropOffLocation": "SKBC Main Entrance",
  "requestedReturnTime": "5:00 PM",
  "valet": {
    "id": "emp_val_1701619200",
    "pickupTime": "8:30 AM",
    "returnTime": "5:00 PM",
    "status": "pending"
  },
  "createdAt": "2025-12-03T08:30:00Z"
}
```

---

### GET /api/v1/valet/self-service

List current user's valet requests.

**Roles:** `employee`, `manager`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status |
| startDate | string | From date |
| endDate | string | To date |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "emp_valet_001",
      "vehicleInfo": {
        "make": "Honda",
        "model": "Accord",
        "color": "White",
        "plateNumber": "SAR 1234"
      },
      "dropOffLocation": "SKBC Main Entrance",
      "requestedReturnTime": "5:00 PM",
      "valet": {
        "status": "in_progress",
        "driver": {
          "name": "Mohammed Saleh",
          "phone": "+966-50-234-5678"
        }
      },
      "createdAt": "2025-12-03T08:30:00Z"
    }
  ]
}
```

---

### GET /api/v1/valet/self-service/:id

Get employee valet request details.

**Roles:** `employee`, `manager` (owner only)

**Response (200 OK):**
```json
{
  "id": "emp_valet_001",
  "employeeId": "user_002",
  "employeeName": "Sarah Johnson",
  "vehicleInfo": {...},
  "dropOffLocation": "SKBC Main Entrance",
  "requestedReturnTime": "5:00 PM",
  "valet": {
    "id": "emp_val_001",
    "driver": {
      "id": "driver_001",
      "name": "Mohammed Saleh",
      "phone": "+966-50-234-5678"
    },
    "pickupTime": "8:30 AM",
    "returnTime": "5:00 PM",
    "status": "in_progress"
  },
  "notes": "Daily parking request",
  "createdAt": "2025-12-03T08:30:00Z"
}
```

---

## Module: Valet Admin

### GET /api/v1/valet-admin/tasks

List all valet tasks (visitors + employees).

**Roles:** `valet_admin`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter: visitor, employee, all |
| status | string | Filter by status |
| driverId | string | Filter by assigned driver |
| date | string | Filter by date |
| unassigned | boolean | Only unassigned tasks |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "task_001",
      "type": "visitor",
      "requestId": "REQ_001",
      "visitorName": "Michael Chen",
      "visitorCompany": "Tech Solutions Ltd",
      "hostName": "Sarah Johnson",
      "visitDate": "2025-12-03",
      "pickupTime": "2:00 PM",
      "returnTime": "4:00 PM",
      "location": "SKBC Main Entrance",
      "valet": {
        "status": "assigned",
        "driver": {
          "id": "driver_001",
          "name": "Mohammed Saleh"
        }
      }
    },
    {
      "id": "emp_valet_001",
      "type": "employee",
      "employeeId": "user_002",
      "employeeName": "Sarah Johnson",
      "vehicleInfo": {...},
      "dropOffLocation": "SKBC Main Entrance",
      "requestedReturnTime": "5:00 PM",
      "valet": {
        "status": "pending"
      }
    }
  ]
}
```

---

### POST /api/v1/valet-admin/tasks/:id/assign

Assign driver to a valet task.

**Roles:** `valet_admin`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Task ID |

**Request Body:**
```json
{
  "driverId": "driver_001",
  "priority": "normal",
  "notes": "VIP guest, handle with care"
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| driverId | string | Yes | Driver to assign | Must be valid, available driver ID |
| priority | string | No | Task priority | `low`, `normal` (default), `high`, `urgent` |
| notes | string | No | Instructions for driver | Max 300 characters |

**Response (200 OK):**
```json
{
  "id": "task_001",
  "valet": {
    "status": "assigned",
    "driver": {
      "id": "driver_001",
      "name": "Mohammed Saleh",
      "phone": "+966-50-234-5678"
    },
    "priority": "normal",
    "notes": "VIP guest, handle with care"
  },
  "updatedAt": "2025-12-03T10:00:00Z"
}
```

**Status Codes:**
- 200: Driver assigned successfully
- 400: Invalid driver ID
- 404: Task not found
- 409: Driver already has maximum active tasks
- 422: Task already completed or cancelled

---

### GET /api/v1/valet-admin/drivers

List all valet drivers.

**Roles:** `valet_admin`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter: available, busy, off_duty |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "driver_001",
      "name": "Mohammed Saleh",
      "phone": "+966-50-234-5678",
      "status": "available",
      "currentTasks": 2
    }
  ]
}
```

---

### GET /api/v1/valet-admin/drivers/load

Get driver load summary.

**Roles:** `valet_admin`

**Response (200 OK):**
```json
{
  "drivers": [
    {
      "id": "driver_001",
      "name": "Mohammed Saleh",
      "tasksToday": 4,
      "tasksThisWeek": 18,
      "loadLevel": "medium",
      "status": "available"
    },
    {
      "id": "driver_002",
      "name": "Ahmed Al-Rashid",
      "tasksToday": 6,
      "tasksThisWeek": 25,
      "loadLevel": "high",
      "status": "busy"
    }
  ],
  "fairnessMetrics": {
    "averageTasksPerDriver": 5.2,
    "standardDeviation": 1.3,
    "mostLoaded": "driver_002",
    "leastLoaded": "driver_006"
  }
}
```

---

### GET /api/v1/valet-admin/zones

List valet zones/locations.

**Roles:** `valet_admin`, `building_admin`

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "zone_001",
      "name": "SKBC Main Entrance",
      "type": "covered",
      "location": "Building A",
      "capacity": 20,
      "currentOccupancy": 12,
      "status": "active"
    }
  ]
}
```

---

## Module: Valet Driver

### GET /api/v1/valet-driver/my-tasks

Get tasks assigned to current driver.

**Roles:** `valet_driver`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status |
| date | string | Filter by date |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "task_001",
      "type": "visitor",
      "visitorName": "Michael Chen",
      "hostName": "Sarah Johnson",
      "visitDate": "2025-12-03",
      "pickupTime": "2:00 PM",
      "returnTime": "4:00 PM",
      "location": "SKBC Main Entrance",
      "vehicleInfo": {
        "make": "Toyota",
        "model": "Camry",
        "color": "Silver",
        "plateNumber": "ABC 1234"
      },
      "valet": {
        "status": "assigned"
      },
      "notes": "VIP visitor - handle with care"
    }
  ]
}
```

---

### GET /api/v1/valet-driver/tasks/:id

Get task details for driver.

**Roles:** `valet_driver`

**Response (200 OK):**
```json
{
  "id": "task_001",
  "visitorName": "Michael Chen",
  "visitorCompany": "Tech Solutions Ltd",
  "hostName": "Sarah Johnson",
  "hostPhone": "+966-50-234-5678",
  "visitDate": "2025-12-03",
  "pickupTime": "2:00 PM",
  "returnTime": "4:00 PM",
  "location": "SKBC Main Entrance",
  "vehicleInfo": {
    "make": "Toyota",
    "model": "Camry",
    "color": "Silver",
    "plateNumber": "ABC 1234"
  },
  "valet": {
    "status": "assigned"
  },
  "notes": "VIP visitor - handle with care"
}
```

---

### PATCH /api/v1/valet-driver/tasks/:id/status

Update task status.

**Roles:** `valet_driver`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Task ID |

**Request Body:**
```json
{
  "status": "accepted",
  "notes": "On my way to pickup",
  "parkingLocation": "B1-025",
  "rejectionReason": null
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| status | string | Yes | New task status | See valid transitions below |
| notes | string | No | Status update notes | Max 300 characters |
| parkingLocation | string | Cond. | Required when completing | Parking spot where car is parked |
| rejectionReason | string | Cond. | Required if rejecting | `unavailable`, `vehicle_issue`, `emergency`, `other` |

**Valid Status Transitions:**
- `assigned` → `accepted` or `rejected`
- `accepted` → `in_progress`
- `in_progress` → `completed`

**Response (200 OK):**
```json
{
  "id": "task_001",
  "valet": {
    "status": "accepted"
  },
  "updatedAt": "2025-12-03T13:55:00Z"
}
```

**Status Codes:**
- 200: Updated
- 400: Invalid status transition
- 403: Not assigned to this task
- 404: Task not found

---

## Module: Buffet Admin

### GET /api/v1/buffet-admin/tasks

List all buffet tasks.

**Roles:** `buffet_admin`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status |
| date | string | Filter by date |
| location | string | Filter by location |
| mealType | string | Filter by meal type |
| unassigned | boolean | Only unassigned tasks |
| staffId | string | Filter by assigned staff |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "buffet_001",
      "requestId": "REQ_015",
      "visitorName": "James Anderson",
      "company": "Global Tech Inc",
      "hostName": "Ahmed Al-Rashid",
      "visitDate": "2025-12-03",
      "visitTime": "12:30 PM",
      "mealType": "lunch",
      "guestCount": 4,
      "dietaryRequirements": ["Vegetarian", "No nuts"],
      "location": "Executive Dining Room",
      "status": "pending",
      "assignedTo": "Chef Mohammed Al-Farsi",
      "assignedToId": "staff_001",
      "notes": "VIP guest - prefer Saudi cuisine"
    }
  ],
  "pagination": {...}
}
```

---

### GET /api/v1/buffet-admin/tasks/:id

Get buffet task details.

**Roles:** `buffet_admin`

**Response (200 OK):**
```json
{
  "id": "buffet_001",
  "requestId": "REQ_015",
  "visitorName": "James Anderson",
  "company": "Global Tech Inc",
  "hostName": "Ahmed Al-Rashid",
  "visitDate": "2025-12-03",
  "visitTime": "12:30 PM",
  "mealType": "lunch",
  "guestCount": 4,
  "dietaryRequirements": ["Vegetarian", "No nuts"],
  "location": "Executive Dining Room",
  "status": "pending",
  "assignedTo": "Chef Mohammed Al-Farsi",
  "assignedToId": "staff_001",
  "notes": "VIP guest - prefer Saudi cuisine",
  "createdAt": "2025-12-02T09:00:00Z",
  "updatedAt": "2025-12-02T09:00:00Z"
}
```

---

### POST /api/v1/buffet-admin/tasks/:id/assign

Assign staff to buffet task.

**Roles:** `buffet_admin`

**Request Body:**
```json
{
  "staffId": "staff_001",
  "staffName": "Chef Mohammed Al-Farsi",
  "priority": "normal",
  "instructions": "Prepare halal options only"
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| staffId | string | Yes | Staff member to assign | Must be valid, available staff ID |
| staffName | string | No | Staff name (for display) | Max 100 characters |
| priority | string | No | Task priority | `low`, `normal` (default), `high` |
| instructions | string | No | Special instructions for staff | Max 500 characters |

**Response (200 OK):**
```json
{
  "id": "buffet_001",
  "assignedTo": "Chef Mohammed Al-Farsi",
  "assignedToId": "staff_001",
  "status": "preparing",
  "priority": "normal",
  "updatedAt": "2025-12-03T10:00:00Z"
}
```

**Status Codes:**
- 200: Staff assigned successfully
- 400: Invalid staff ID
- 404: Task not found
- 409: Staff member has conflicting task at same time
- 422: Task already completed or cancelled

---

### PATCH /api/v1/buffet-admin/tasks/:id/status

Update buffet task status (admin override).

**Roles:** `buffet_admin`

**Request Body:**
```json
{
  "status": "completed",
  "notes": "Served successfully"
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| status | string | Yes | New status | `pending`, `preparing`, `ready`, `served`, `completed`, `cancelled` |
| notes | string | No | Status change notes | Max 500 characters |
| reason | string | Cond. | Required if cancelling | Max 300 characters |

**Response (200 OK):**
```json
{
  "id": "buffet_001",
  "status": "completed",
  "updatedAt": "2025-12-03T14:00:00Z"
}
```

---

### GET /api/v1/buffet-admin/locations

List buffet locations.

**Roles:** `buffet_admin`, `building_admin`

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "loc_001",
      "name": "Executive Dining Room",
      "floor": "5th Floor",
      "capacity": 20,
      "status": "active"
    },
    {
      "id": "loc_002",
      "name": "Conference Hall B",
      "floor": "3rd Floor",
      "capacity": 50,
      "status": "active"
    }
  ]
}
```

---

### GET /api/v1/buffet-admin/staff

List buffet staff.

**Roles:** `buffet_admin`

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "staff_001",
      "name": "Chef Mohammed Al-Farsi",
      "role": "buffet_staff",
      "status": "on_duty",
      "currentTasks": 3
    }
  ]
}
```

---

### GET /api/v1/buffet-admin/load-summary

Get buffet load summary by location.

**Roles:** `buffet_admin`

**Response (200 OK):**
```json
{
  "locations": [
    {
      "locationId": "loc_001",
      "locationName": "Executive Dining Room",
      "tasksToday": 5,
      "pendingTasks": 2,
      "activeTasks": 2,
      "completedTasks": 1
    }
  ],
  "staff": [
    {
      "staffId": "staff_001",
      "staffName": "Chef Mohammed Al-Farsi",
      "assignedTasks": 3,
      "completedToday": 1
    }
  ]
}
```

---

## Module: Buffet Staff

### GET /api/v1/buffet-staff/my-tasks

Get tasks assigned to current staff member.

**Roles:** `buffet_staff`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status |
| date | string | Filter by date |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "buffet_001",
      "visitorName": "James Anderson",
      "company": "Global Tech Inc",
      "hostName": "Ahmed Al-Rashid",
      "visitDate": "2025-12-03",
      "visitTime": "12:30 PM",
      "mealType": "lunch",
      "guestCount": 4,
      "dietaryRequirements": ["Vegetarian", "No nuts"],
      "location": "Executive Dining Room",
      "status": "pending",
      "notes": "VIP guest"
    }
  ]
}
```

---

### PATCH /api/v1/buffet-staff/tasks/:id/status

Update task status.

**Roles:** `buffet_staff`

**Request Body:**
```json
{
  "status": "preparing",
  "notes": "Started preparation",
  "estimatedReadyTime": "11:30 AM"
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| status | string | Yes | New task status | See valid transitions below |
| notes | string | No | Status update notes | Max 300 characters |
| estimatedReadyTime | string | No | Estimated ready time | Format: "HH:MM AM/PM" |

**Valid Status Transitions:**
- `pending` → `preparing`
- `preparing` → `ready`
- `ready` → `served`
- `served` → `completed`

**Response (200 OK):**
```json
{
  "id": "buffet_001",
  "status": "preparing",
  "estimatedReadyTime": "11:30 AM",
  "updatedAt": "2025-12-03T11:00:00Z"
}
```

---

## Module: Visitor (External Invite)

### GET /api/v1/invites/:token

Get invite details by token (public endpoint).

**Roles:** Public (no auth required)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| token | string | Unique invite token |

**Response (200 OK):**
```json
{
  "id": "REQ_020",
  "status": "approved",
  "hostName": "Sarah Johnson",
  "hostDepartment": "Marketing",
  "visitDate": "2025-12-10",
  "visitTime": "10:00 AM",
  "duration": "2 hours",
  "purpose": "Business Meeting",
  "location": {
    "building": "SKBC Tower",
    "address": "King Abdullah Road, Jeddah"
  },
  "meetingRoom": {
    "name": "Majlis Al-Shura",
    "floor": "3rd Floor"
  },
  "parkingInfo": {
    "type": "auto",
    "location": "SKBC Basement",
    "slotNumber": "B1-005"
  },
  "valetInfo": null,
  "visitorDecision": null,
  "canAccept": true,
  "canReject": true,
  "expiresAt": "2025-12-10T07:00:00Z"
}
```

**Status Codes:**
- 200: Valid invite
- 404: Invalid token
- 410: Invite expired or auto-cancelled

---

### POST /api/v1/invites/:token/accept

Accept the invitation.

**Roles:** Public

**Request Body:**
```json
{
  "visitorNotes": "Looking forward to the meeting"
}
```

**Response (200 OK):**
```json
{
  "id": "REQ_020",
  "status": "visitor_accepted",
  "visitorDecision": {
    "accepted": true,
    "decidedAt": "2025-12-03T15:00:00Z"
  },
  "qrCode": "QR_REQ_020_visitor",
  "message": "Your visit has been confirmed. Please show the QR code at the entrance."
}
```

**Status Codes:**
- 200: Accepted
- 404: Invalid token
- 410: Invite expired
- 422: Already responded

---

### POST /api/v1/invites/:token/reject

Reject the invitation.

**Roles:** Public

**Request Body:**
```json
{
  "reason": "Schedule conflict"
}
```

**Response (200 OK):**
```json
{
  "id": "REQ_020",
  "status": "visitor_rejected",
  "visitorDecision": {
    "accepted": false,
    "decidedAt": "2025-12-03T15:00:00Z",
    "reason": "Schedule conflict"
  },
  "message": "The invitation has been declined. The host has been notified."
}
```

---

## Module: Notifications & Reminders

### GET /api/v1/notifications

Get notifications for current user.

**Roles:** All authenticated users

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| unreadOnly | boolean | Only unread notifications |
| type | string | Filter by notification type |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "notif_001",
      "type": "request_approved",
      "title": "Request Approved",
      "message": "Your visitor request for John Smith has been approved by Ahmed Al-Rashid.",
      "timestamp": "2025-12-03T11:00:00Z",
      "read": false,
      "requestId": "REQ_020",
      "actionRequired": false,
      "priority": "high"
    }
  ],
  "unreadCount": 5,
  "pagination": {...}
}
```

---

### PATCH /api/v1/notifications/:id/read

Mark notification as read.

**Roles:** All authenticated users

**Response (200 OK):**
```json
{
  "id": "notif_001",
  "read": true
}
```

---

### POST /api/v1/notifications/mark-all-read

Mark all notifications as read.

**Roles:** All authenticated users

**Response (200 OK):**
```json
{
  "markedCount": 5
}
```

---

### DELETE /api/v1/notifications/:id

Delete a specific notification.

**Roles:** All authenticated users

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Notification ID |

**Response (204 No Content)**

**Status Codes:**
- 204: Deleted successfully
- 404: Notification not found
- 403: Cannot delete notification belonging to another user

---

### GET /api/v1/users/me/notification-preferences

Get current user's notification preferences.

**Roles:** All authenticated users

**Response (200 OK):**
```json
{
  "userId": "user_002",
  "pushEnabled": true,
  "emailEnabled": true,
  "smsEnabled": false,
  "whatsappEnabled": true,
  "emailSummaryFrequency": "daily",
  "dailyDigestTime": "09:00",
  "eventPreferences": {
    "request_updates": true,
    "visitor_responses": true,
    "visitor_arrivals": true,
    "approval_requests": false,
    "buffet_tasks": false,
    "valet_tasks": false,
    "security_alerts": false,
    "gate_events": false,
    "system_alerts": true
  },
  "quietHoursEnabled": true,
  "quietHoursStart": "22:00",
  "quietHoursEnd": "07:00",
  "updatedAt": "2025-12-01T10:00:00Z"
}
```

**Note:** Only event preferences relevant to the user's role are returned and editable.

---

### PUT /api/v1/users/me/notification-preferences

Update current user's notification preferences.

**Roles:** All authenticated users

**Request Body:**
```json
{
  "pushEnabled": true,
  "emailEnabled": true,
  "smsEnabled": false,
  "whatsappEnabled": true,
  "emailSummaryFrequency": "daily",
  "dailyDigestTime": "09:00",
  "eventPreferences": {
    "request_updates": true,
    "visitor_responses": true,
    "visitor_arrivals": false,
    "system_alerts": true
  },
  "quietHoursEnabled": true,
  "quietHoursStart": "22:00",
  "quietHoursEnd": "07:00"
}
```

**Response (200 OK):**
```json
{
  "userId": "user_002",
  "pushEnabled": true,
  "emailEnabled": true,
  "smsEnabled": false,
  "whatsappEnabled": true,
  "emailSummaryFrequency": "daily",
  "dailyDigestTime": "09:00",
  "eventPreferences": {
    "request_updates": true,
    "visitor_responses": true,
    "visitor_arrivals": false,
    "system_alerts": true
  },
  "quietHoursEnabled": true,
  "quietHoursStart": "22:00",
  "quietHoursEnd": "07:00",
  "updatedAt": "2025-12-03T14:30:00Z"
}
```

**Status Codes:**
- 200: Updated successfully
- 400: Invalid input (e.g., invalid time format)
- 422: Cannot enable preferences not relevant to user's role

---

### GET /api/v1/admin/notification-templates

List notification templates.

**Roles:** `building_admin`

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "template_001",
      "eventType": "request_approved",
      "name": "Request Approval Notification",
      "channels": {
        "qr": true,
        "whatsapp": true,
        "sms": true,
        "email": true
      },
      "emailSubject": "Your Visit to SKBC Has Been Approved",
      "emailBody": "Dear {{visitor_name}}, your visit on {{visit_date}}...",
      "smsTemplate": "SKBC: Your visit on {{visit_date}} has been approved.",
      "whatsappTemplate": "Your visit to SKBC on {{visit_date}} has been approved...",
      "placeholders": ["visitor_name", "visit_date", "host_name", "meeting_room"],
      "isActive": true
    }
  ]
}
```

---

### PUT /api/v1/admin/notification-templates/:id

Update notification template.

**Roles:** `building_admin`

**Request Body:**
```json
{
  "channels": {
    "qr": true,
    "whatsapp": true,
    "sms": false,
    "email": true
  },
  "emailSubject": "Updated Subject",
  "isActive": true
}
```

---

### POST /api/v1/admin/notifications/send

Send broadcast notification to users.

**Roles:** `building_admin`

**Request Body:**
```json
{
  "title": "System Maintenance Notice",
  "message": "The VMS system will be under maintenance on Dec 5th from 10 PM to 2 AM.",
  "priority": "high",
  "targetRoles": ["employee", "manager", "receptionist"],
  "targetDepartments": [],
  "channels": {
    "push": true,
    "email": true,
    "sms": false
  },
  "scheduledFor": null
}
```

**Response (201 Created):**
```json
{
  "id": "broadcast_001",
  "title": "System Maintenance Notice",
  "message": "The VMS system will be under maintenance on Dec 5th from 10 PM to 2 AM.",
  "priority": "high",
  "targetRoles": ["employee", "manager", "receptionist"],
  "recipientCount": 125,
  "status": "sent",
  "sentAt": "2025-12-03T10:00:00Z",
  "createdBy": "user_admin_001"
}
```

**Status Codes:**
- 201: Notification sent/scheduled
- 400: Invalid input
- 422: No recipients match the criteria

---

### GET /api/v1/admin/reminder-rules

Get reminder timing rules.

**Roles:** `building_admin`

**Response (200 OK):**
```json
{
  "id": "reminder_config_001",
  "firstReminderDelayMinutes": 120,
  "secondReminderDelayMinutes": 240,
  "autoCancelDelayMinutes": 300,
  "officeStartTime": "09:00",
  "officeEndTime": "18:00",
  "workingDays": [0, 1, 2, 3, 4],
  "isActive": true,
  "updatedAt": "2025-12-01T00:00:00Z"
}
```

---

### PUT /api/v1/admin/reminder-rules

Update reminder rules.

**Roles:** `building_admin`

**Request Body:**
```json
{
  "firstReminderDelayMinutes": 180,
  "secondReminderDelayMinutes": 300,
  "autoCancelDelayMinutes": 360,
  "officeStartTime": "08:00",
  "officeEndTime": "17:00"
}
```

---

### GET /api/v1/admin/event-logs

Get system event logs.

**Roles:** `building_admin`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| eventType | string | Filter by event type |
| startDate | string | From date |
| endDate | string | To date |
| performedBy | string | Filter by user ID |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "LOG_001",
      "requestId": "REQ_020",
      "eventType": "approved",
      "description": "Visit request approved by Ahmed Al-Rashid",
      "performedBy": "user_001",
      "performedByRole": "manager",
      "timestamp": "2025-12-03T11:00:00Z"
    }
  ],
  "stats": {
    "totalEvents": 1250,
    "byType": {
      "created": 300,
      "approved": 250,
      "rejected": 50,
      "cancelled": 100
    }
  },
  "pagination": {...}
}
```

---

### GET /api/v1/admin/reminder-schedule

Get upcoming reminder schedule preview.

**Roles:** `building_admin`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| hours | number | Look-ahead hours (default: 24) |

**Response (200 OK):**
```json
{
  "upcomingReminders": [
    {
      "requestId": "REQ_025",
      "visitorName": "Elena Rodriguez",
      "hostName": "Sarah Johnson",
      "visitDateTime": "2025-12-04T10:00:00Z",
      "reminderType": "first",
      "scheduledFor": "2025-12-04T08:00:00Z",
      "isUrgent": false
    },
    {
      "requestId": "REQ_030",
      "visitorName": "Hassan Al-Otaibi",
      "hostName": "Lisa Chen",
      "visitDateTime": "2025-12-03T14:00:00Z",
      "reminderType": "auto_cancel",
      "scheduledFor": "2025-12-03T09:00:00Z",
      "isUrgent": true
    }
  ]
}
```

---

## Module: Admin / Building Admin

### GET /api/v1/admin/settings

Get system settings.

**Roles:** `building_admin`

**Response (200 OK):**
```json
{
  "general": {
    "companyName": "SKBC",
    "buildingName": "SKBC Tower",
    "timezone": "Asia/Riyadh",
    "defaultLanguage": "ar",
    "supportedLanguages": ["ar", "en"]
  },
  "reminderRules": {
    "firstReminderDelayMinutes": 120,
    "secondReminderDelayMinutes": 240,
    "autoCancelDelayMinutes": 300,
    "officeStartTime": "09:00",
    "officeEndTime": "18:00",
    "workingDays": [0, 1, 2, 3, 4]
  },
  "parkingConfig": {
    "enableAutoAllocation": true,
    "defaultFallback": "none"
  },
  "biometricSettings": {
    "globalEnabled": true,
    "allowedRoles": ["manager", "building_admin"],
    "fallbackToPassword": true
  }
}
```

---

### PUT /api/v1/admin/settings

Update system settings.

**Roles:** `building_admin`

**Request Body:**
```json
{
  "general": {
    "defaultLanguage": "en"
  },
  "biometricSettings": {
    "globalEnabled": true,
    "allowedRoles": ["manager", "building_admin", "security"]
  }
}
```

---

### GET /api/v1/admin/integrations

Get integration status.

**Roles:** `building_admin`

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "int_001",
      "name": "Microsoft Outlook",
      "type": "outlook",
      "status": "ok",
      "lastSyncTime": "2025-12-03T10:00:00Z",
      "isConfigured": true
    },
    {
      "id": "int_002",
      "name": "Oracle HCM",
      "type": "oracle_hcm",
      "status": "degraded",
      "lastSyncTime": "2025-12-03T08:00:00Z",
      "lastErrorMessage": "Connection timeout",
      "lastErrorTime": "2025-12-03T09:30:00Z",
      "isConfigured": true
    },
    {
      "id": "int_003",
      "name": "Speed Gate System",
      "type": "speed_gate",
      "status": "ok",
      "lastSyncTime": "2025-12-03T10:15:00Z",
      "isConfigured": true
    },
    {
      "id": "int_004",
      "name": "WhatsApp Business",
      "type": "whatsapp",
      "status": "ok",
      "isConfigured": true
    },
    {
      "id": "int_005",
      "name": "SMS Gateway",
      "type": "sms",
      "status": "down",
      "lastErrorMessage": "API key expired",
      "lastErrorTime": "2025-12-03T06:00:00Z",
      "isConfigured": true
    },
    {
      "id": "int_006",
      "name": "Email Service",
      "type": "email",
      "status": "ok",
      "isConfigured": true
    }
  ]
}
```

---

### PUT /api/v1/admin/integrations/:id

Update integration configuration.

**Roles:** `building_admin`

**Request Body:**
```json
{
  "isConfigured": true,
  "config": {
    "apiKey": "new_api_key",
    "endpoint": "https://api.example.com"
  }
}
```

---

### POST /api/v1/admin/integrations/:id/test

Test integration connection.

**Roles:** `building_admin`

**Response (200 OK):**
```json
{
  "id": "int_002",
  "testResult": "success",
  "responseTime": 250,
  "message": "Connection successful"
}
```

**Response (422 Unprocessable):**
```json
{
  "id": "int_005",
  "testResult": "failed",
  "message": "API key expired",
  "details": "Authentication failed with status 401"
}
```

---

### GET /api/v1/admin/analytics/summary

Get analytics/KPI summary.

**Roles:** `building_admin`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| period | string | day, week, month (default: week) |

**Response (200 OK):**
```json
{
  "period": "week",
  "visits": {
    "totalInvited": 150,
    "totalCheckedIn": 120,
    "noShowRate": 0.08,
    "averageVisitDuration": 95,
    "dailyVisits": [
      { "date": "2025-12-01", "count": 25 },
      { "date": "2025-12-02", "count": 30 },
      { "date": "2025-12-03", "count": 28 }
    ]
  },
  "parking": {
    "utilizationRate": 0.72,
    "averageDailyOccupancy": 15,
    "peakHours": [
      { "hour": 10, "occupancy": 18 },
      { "hour": 11, "occupancy": 20 },
      { "hour": 14, "occupancy": 17 }
    ]
  },
  "valet": {
    "totalTasks": 45,
    "averageWaitTime": 8,
    "completionRate": 0.95,
    "dailyTasks": [
      { "date": "2025-12-01", "count": 12 },
      { "date": "2025-12-02", "count": 18 }
    ]
  },
  "buffet": {
    "totalEvents": 35,
    "averageGuestsPerEvent": 5.2,
    "popularMealTypes": [
      { "type": "lunch", "count": 20 },
      { "type": "breakfast", "count": 10 },
      { "type": "snacks", "count": 5 }
    ],
    "dailyEvents": [
      { "date": "2025-12-01", "count": 8 },
      { "date": "2025-12-02", "count": 12 }
    ]
  }
}
```

---

## Module: Analytics Export

### GET /api/v1/admin/analytics/export

Export analytics data as CSV, Excel, or PDF report.

**Roles:** `building_admin`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| format | string | Export format: `csv`, `xlsx`, `pdf` (default: csv) |
| reportType | string | Type of report (see below) |
| startDate | string | Report start date (ISO 8601) |
| endDate | string | Report end date (ISO 8601) |
| includeCharts | boolean | Include visual charts (PDF only) |

**Report Types:**
- `visits` - Visit history and statistics
- `parking` - Parking utilization
- `valet` - Valet service metrics
- `buffet` - Buffet service metrics
- `security` - Gate events and access logs
- `comprehensive` - All metrics combined

**Request Example:**
```
GET /api/v1/admin/analytics/export?format=xlsx&reportType=visits&startDate=2025-12-01&endDate=2025-12-03
```

**Response (200 OK):**
```json
{
  "exportId": "export_abc123",
  "status": "processing",
  "format": "xlsx",
  "reportType": "visits",
  "dateRange": {
    "start": "2025-12-01",
    "end": "2025-12-03"
  },
  "estimatedSize": "2.5 MB",
  "estimatedCompletionSeconds": 30
}
```

**Status Codes:**
- 200: Export job started
- 400: Invalid date range or report type
- 429: Too many export requests (rate limited)

---

### GET /api/v1/admin/analytics/export/:exportId

Check export job status and download.

**Roles:** `building_admin`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| exportId | string | Export job ID |

**Response (200 OK - Processing):**
```json
{
  "exportId": "export_abc123",
  "status": "processing",
  "progress": 65,
  "estimatedRemainingSeconds": 10
}
```

**Response (200 OK - Complete):**
```json
{
  "exportId": "export_abc123",
  "status": "complete",
  "downloadUrl": "https://storage.skbc.com/exports/export_abc123.xlsx",
  "expiresAt": "2025-12-04T10:00:00Z",
  "fileSize": "2.3 MB",
  "rowCount": 1250
}
```

**Response (200 OK - Failed):**
```json
{
  "exportId": "export_abc123",
  "status": "failed",
  "errorMessage": "Date range too large, maximum 90 days"
}
```

**Status Codes:**
- 200: Status returned
- 404: Export job not found

---

### POST /api/v1/admin/analytics/schedule

Schedule recurring analytics report.

**Roles:** `building_admin`

**Request Body:**
```json
{
  "reportType": "comprehensive",
  "format": "pdf",
  "frequency": "weekly",
  "dayOfWeek": 0,
  "time": "08:00",
  "recipients": ["ahmed@skbc.com", "fatima@skbc.com"],
  "includeCharts": true,
  "timezone": "Asia/Riyadh"
}
```

**Request Body Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| reportType | string | Yes | Type of report | `visits`, `parking`, `valet`, `buffet`, `security`, `comprehensive` |
| format | string | Yes | Export format | `csv`, `xlsx`, `pdf` |
| frequency | string | Yes | Schedule frequency | `daily`, `weekly`, `monthly` |
| dayOfWeek | number | Cond. | Day of week (0=Sun) | Required for weekly, 0-6 |
| dayOfMonth | number | Cond. | Day of month | Required for monthly, 1-28 |
| time | string | Yes | Delivery time | Format: HH:MM |
| recipients | array | Yes | Email addresses | 1-10 valid emails |
| includeCharts | boolean | No | Include charts | Default: true for PDF |
| timezone | string | No | Timezone | IANA timezone, default: system |

**Response (201 Created):**
```json
{
  "scheduleId": "sched_001",
  "reportType": "comprehensive",
  "format": "pdf",
  "frequency": "weekly",
  "nextRunAt": "2025-12-08T08:00:00+03:00",
  "recipients": ["ahmed@skbc.com", "fatima@skbc.com"],
  "createdAt": "2025-12-03T10:00:00Z"
}
```

**Status Codes:**
- 201: Schedule created
- 400: Invalid schedule configuration
- 409: Duplicate schedule exists

---

### GET /api/v1/admin/analytics/schedules

List all scheduled reports.

**Roles:** `building_admin`

**Response (200 OK):**
```json
{
  "schedules": [
    {
      "id": "sched_001",
      "reportType": "comprehensive",
      "format": "pdf",
      "frequency": "weekly",
      "dayOfWeek": 0,
      "time": "08:00",
      "recipients": ["ahmed@skbc.com", "fatima@skbc.com"],
      "isActive": true,
      "lastRunAt": "2025-12-01T08:00:00Z",
      "nextRunAt": "2025-12-08T08:00:00Z",
      "lastRunStatus": "success"
    }
  ]
}
```

---

### DELETE /api/v1/admin/analytics/schedules/:id

Delete scheduled report.

**Roles:** `building_admin`

**Response (204 No Content)**

**Status Codes:**
- 204: Schedule deleted
- 404: Schedule not found

---

### GET /api/v1/admin/user-preferences/:userId

Get user notification preferences (admin view).

**Roles:** `building_admin`

**Response (200 OK):**
```json
{
  "userId": "user_002",
  "pushEnabled": true,
  "emailEnabled": true,
  "emailSummaryFrequency": "daily",
  "eventPreferences": {
    "request_updates": true,
    "visitor_arrivals": true,
    "approvals": true,
    "system_alerts": true
  }
}
```

---

## Appendix: Notification Triggers

This section documents which actions trigger which notifications to which user roles.

### Visit Request Lifecycle Triggers

| Trigger Action | Notification Type | Target Roles | Priority |
|----------------|-------------------|--------------|----------|
| Employee creates visit request | `request_submitted` | Employee (confirmation) | low |
| Employee creates visit request (needs approval) | `pending_approval` | Manager | high |
| Manager approves request | `request_approved` | Employee, Visitor (via channels) | high |
| Manager rejects request | `request_rejected` | Employee | high |
| Employee/Manager cancels request | `request_cancelled` | Manager, Receptionist | medium |
| Employee reschedules request | `request_modified` | Manager, Visitor | medium |
| System auto-cancels (no visitor response) | `auto_cancelled` | Employee, Manager | high |

### Visitor Response Triggers

| Trigger Action | Notification Type | Target Roles | Priority |
|----------------|-------------------|--------------|----------|
| Visitor accepts invitation | `visitor_accepted` | Employee, Receptionist | high |
| Visitor rejects invitation | `visitor_rejected` | Employee, Manager | high |
| Reminder sent to visitor (1st) | `visitor_reminder` | Employee | low |
| Reminder sent to visitor (2nd) | `visitor_reminder` | Employee | medium |
| Visitor checks in | `visitor_arrival` | Employee, Receptionist, Security | medium |

### Check-In/Out Triggers

| Trigger Action | Notification Type | Target Roles | Priority |
|----------------|-------------------|--------------|----------|
| Visitor checks in at gate | `check_in` | Employee, Receptionist | medium |
| Visitor checks out | `check_out` | Employee, Receptionist | low |
| Walk-in registered | `walk_in_registered` | Manager | high |
| Walk-in approved | `walk_in_approved` | Receptionist | high |

### Daily Digest Triggers

| Trigger Action | Notification Type | Target Roles | Priority |
|----------------|-------------------|--------------|----------|
| Morning digest (configurable time) | `expected_today` | Employee, Receptionist, Security | medium |

### Buffet Service Triggers

| Trigger Action | Notification Type | Target Roles | Priority |
|----------------|-------------------|--------------|----------|
| Buffet request created (from visit) | `buffet_new_request` | Buffet Admin | medium |
| Buffet request created confirmation | `buffet_request_created` | Employee | low |
| Buffet task assigned to staff | `buffet_task_assigned` | Buffet Staff | high |
| Buffet task scheduled | `buffet_scheduled` | Buffet Staff, Employee | medium |
| Buffet status changed | `buffet_status_update` | Buffet Admin, Receptionist | low |
| Staff assignment changed | `buffet_staff_update` | Buffet Admin | low |
| Buffet service completed | `buffet_completed` | Buffet Admin, Employee | low |

### Valet Service Triggers

| Trigger Action | Notification Type | Target Roles | Priority |
|----------------|-------------------|--------------|----------|
| Valet request created (from visit) | `valet_new_request` | Valet Admin | medium |
| Valet task assigned to driver | `valet_task_assigned` | Valet Driver | high |
| Valet task scheduled | `valet_scheduled` | Valet Driver, Employee | medium |
| Valet service completed | `valet_completed` | Valet Admin, Employee | low |
| Valet task cancelled | `valet_cancelled` | Valet Driver, Valet Admin | high |

### Security Event Triggers

| Trigger Action | Notification Type | Target Roles | Priority |
|----------------|-------------------|--------------|----------|
| Access permissions updated | `security_access_update` | Security | medium |
| Gate pass issued/updated | `security_gate_pass` | Security, Visitor | medium |

### Notification Channel Matrix

| Notification Type | Push | Email | SMS | WhatsApp | In-App |
|-------------------|------|-------|-----|----------|--------|
| `request_approved` | Yes | Yes | Optional | Yes | Yes |
| `request_rejected` | Yes | Yes | No | No | Yes |
| `pending_approval` | Yes | Yes | No | No | Yes |
| `visitor_accepted` | Yes | Yes | No | No | Yes |
| `visitor_arrival` | Yes | No | No | No | Yes |
| `check_in` | Yes | No | No | No | Yes |
| `buffet_task_assigned` | Yes | No | No | No | Yes |
| `valet_task_assigned` | Yes | No | No | No | Yes |
| `expected_today` | No | Yes | No | No | Yes |
| `auto_cancelled` | Yes | Yes | No | No | Yes |

### Notification Priority Definitions

| Priority | Description | Delivery |
|----------|-------------|----------|
| `high` | Action required immediately | Push + Email immediately |
| `medium` | Important but not urgent | Push immediately, Email in digest |
| `low` | Informational only | In-app only, Email in digest |

---

## Appendix: Webhook Events (Future)

For future integration, the following webhook events will be supported:

| Event | Description |
|-------|-------------|
| `visit.created` | New visit request created |
| `visit.approved` | Visit approved by manager |
| `visit.rejected` | Visit rejected by manager |
| `visit.cancelled` | Visit cancelled |
| `visit.checked_in` | Visitor checked in |
| `visit.checked_out` | Visitor checked out |
| `visitor.accepted` | Visitor accepted invitation |
| `visitor.rejected` | Visitor rejected invitation |
| `valet.task_created` | Valet task created |
| `valet.task_completed` | Valet task completed |
| `buffet.task_created` | Buffet task created |
| `buffet.task_completed` | Buffet task completed |

---

## Screen-to-API Mapping

This section provides a comprehensive mapping of all VMS mobile app screens to their corresponding API endpoints for developer reference.

### Authentication & Profile Screens

| Screen | Primary APIs | Description |
|--------|--------------|-------------|
| **LoginScreen** | `POST /auth/login` | User authentication with email/password |
| **ForgotPasswordScreen** | `POST /auth/send-otp` | Initiate password reset flow |
| **ResetPasswordScreen** | `POST /auth/verify-otp`, `POST /auth/reset-password-with-otp` | Verify code and set new password |
| **ChangePasswordScreen** | `PUT /auth/password` | Change password for logged-in user |
| **EditProfileScreen** | `GET /users/me`, `PUT /users/me`, `POST /users/me/photo`, `DELETE /users/me/photo` | View and update user profile |
| **BiometricSetupScreen** | `POST /auth/biometric/register`, `PATCH /auth/biometric/settings` | Configure biometric login |

### Employee / Staff Screens

| Screen | Primary APIs | Description |
|--------|--------------|-------------|
| **EmployeeDashboardScreen** | `GET /users/me`, `GET /visits/my?status=upcoming`, `GET /notifications/unread-count` | Employee home with quick stats |
| **MyVisitorsScreen** | `GET /visits/my` | List of employee's visitor requests |
| **NewVisitorRequestScreen** | `POST /visits`, `GET /meeting-rooms/available` | Create new visitor request |
| **VisitorRequestDetailScreen** | `GET /visits/:id`, `PATCH /visits/:id`, `DELETE /visits/:id` | View/edit/cancel visit |
| **RescheduleVisitScreen** | `POST /visits/:id/reschedule` | Reschedule approved visit |
| **ParkMyCarScreen** | `POST /valet/self-service` | Employee self-valet request |
| **NotificationsScreen** | `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/mark-all-read` | View and manage notifications |
| **NotificationPreferencesScreen** | `GET /users/me/notification-preferences`, `PUT /users/me/notification-preferences` | Configure notification settings |
| **SettingsScreen** | `GET /users/me`, `PUT /users/me`, `POST /auth/logout` | App settings and logout |

### Manager Screens

| Screen | Primary APIs | Description |
|--------|--------------|-------------|
| **ManagerDashboardScreen** | `GET /users/me`, `GET /approvals/pending?count=true`, `GET /visits/my?status=upcoming` | Manager home with pending count |
| **PendingApprovalsScreen** | `GET /approvals/pending` | List pending approval requests |
| **ApprovalDetailScreen** | `GET /visits/:id`, `POST /visits/:id/approve`, `POST /visits/:id/reject` | Review and action on request |
| **ApprovalHistoryScreen** | `GET /approvals/history` | Past approval decisions |
| **BulkApprovalScreen** | `POST /approvals/bulk` | Approve/reject multiple requests |
| **TeamVisitorsScreen** | `GET /visits/team` | All team visitor requests |

### Receptionist Screens

| Screen | Primary APIs | Description |
|--------|--------------|-------------|
| **ReceptionistDashboardScreen** | `GET /reception/today`, `GET /reception/alerts`, `GET /parking/today` | Reception home with today's visitors |
| **TodaysVisitorsScreen** | `GET /reception/today` | All expected visitors for today |
| **CheckInScreen** | `GET /visits/:id`, `POST /visits/:id/check-in` | Check in visitor at desk |
| **CheckOutScreen** | `GET /visits/:id`, `POST /visits/:id/check-out` | Check out visitor |
| **WalkInRegistrationScreen** | `POST /visits/walk-in` | Register unscheduled visitor |
| **RoomStatusScreen** | `GET /reception/rooms/today` | Meeting room status overview |
| **CommunicationOverrideScreen** | `POST /reception/communication-override` | Manual visitor contact override |
| **VisitorSearchScreen** | `GET /visits?search=...`, `GET /visitors/check` | Search visitors and history |

### Security Screens

| Screen | Primary APIs | Description |
|--------|--------------|-------------|
| **SecurityDashboardScreen** | `GET /security/today`, `GET /security/alerts`, `GET /security/today/summary` | Security home with gate activity |
| **GateScannerScreen** | `POST /security/gate/scan`, `POST /security/gate/check-in`, `POST /security/gate/check-out` | QR/barcode gate scanning |
| **VisitorVerificationScreen** | `GET /visits/:id` | View visitor details for verification |
| **GateLogScreen** | `GET /security/gate-logs` | Gate access history |
| **BlacklistCheckScreen** | `GET /visitors/check` | Check visitor against blacklist |
| **OnSiteVisitorsScreen** | `GET /security/today?status=checked_in` | Currently on-site visitors |
| **EmergencyEvacuationScreen** | `GET /security/today?status=checked_in` | List of people on-site for emergency |

### Building Admin Screens

| Screen | Primary APIs | Description |
|--------|--------------|-------------|
| **AdminDashboardScreen** | `GET /admin/analytics/summary`, `GET /admin/integrations` | Admin home with KPIs |
| **UsersRolesScreen** | `GET /users`, `POST /users`, `DELETE /users/:id` | User management |
| **UserDetailScreen** | `GET /users/:id`, `PUT /users/:id`, `GET /users/:id/managers` | View/edit user details |
| **BulkUserActionsScreen** | `POST /users/bulk-action` | Bulk activate/deactivate users |
| **MeetingRoomsScreen** | `GET /meeting-rooms` | List all meeting rooms |
| **MeetingRoomDetailScreen** | `GET /meeting-rooms/:id`, `PUT /meeting-rooms/:id`, `PATCH /meeting-rooms/:id/status` | Room details and status |
| **CreateRoomScreen** | `POST /meeting-rooms` | Create new meeting room |
| **RoomReassignmentScreen** | `POST /meeting-rooms/:id/reassign` | Reassign room booking |
| **ParkingSpotsScreen** | `GET /parking/spots`, `POST /parking/spots`, `DELETE /parking/spots/:id` | Parking spot management |
| **ParkingPriorityScreen** | `GET /parking/config`, `PUT /parking/config` | Parking priority rules |
| **EmployeeParkingScreen** | `GET /parking/employees`, `POST /parking/employees/:id/assign`, `DELETE /parking/employees/:id/assign` | Employee parking assignments |
| **ParkingUtilizationScreen** | `GET /parking/utilization`, `GET /parking/utilization/history` | Parking analytics |
| **SystemSettingsScreen** | `GET /admin/settings`, `PUT /admin/settings` | Global system configuration |
| **IntegrationsScreen** | `GET /admin/integrations`, `PUT /admin/integrations/:id`, `POST /admin/integrations/:id/test` | Integration management |
| **EventLogScreen** | `GET /admin/event-logs` | System event audit log |
| **ReminderScheduleScreen** | `GET /admin/reminder-schedule` | View reminder configuration |
| **AnalyticsExportScreen** | `GET /admin/analytics/export`, `GET /admin/analytics/export/:exportId` | Export reports |
| **ScheduledReportsScreen** | `GET /admin/analytics/schedules`, `POST /admin/analytics/schedule`, `DELETE /admin/analytics/schedules/:id` | Manage scheduled reports |

### Valet Admin Screens

| Screen | Primary APIs | Description |
|--------|--------------|-------------|
| **ValetAdminDashboardScreen** | `GET /valet-admin/today`, `GET /valet-admin/driver-loads` | Valet admin home |
| **ValetTasksScreen** | `GET /valet-admin/tasks` | All valet tasks |
| **DriverAssignmentScreen** | `POST /valet-admin/tasks/:id/assign`, `GET /valet-admin/drivers` | Assign driver to task |
| **DriverLoadScreen** | `GET /valet-admin/driver-loads` | Driver workload distribution |
| **ValetHistoryScreen** | `GET /valet-admin/tasks?status=completed` | Completed valet tasks |

### Valet Driver Screens

| Screen | Primary APIs | Description |
|--------|--------------|-------------|
| **DriverDashboardScreen** | `GET /valet-driver/tasks/my` | Driver's assigned tasks |
| **DriverTaskDetailScreen** | `GET /valet-driver/tasks/:id`, `PATCH /valet-driver/tasks/:id/status` | View and update task |
| **DriverLocationScreen** | `PATCH /valet-driver/tasks/:id/location` | Update parking location |

### Buffet Admin Screens

| Screen | Primary APIs | Description |
|--------|--------------|-------------|
| **BuffetAdminDashboardScreen** | `GET /buffet-admin/today`, `GET /buffet-admin/locations` | Buffet admin home |
| **BuffetTasksScreen** | `GET /buffet-admin/tasks` | All buffet tasks |
| **StaffAssignmentScreen** | `POST /buffet-admin/tasks/:id/assign`, `GET /buffet-admin/staff` | Assign staff to task |
| **BuffetLocationsScreen** | `GET /buffet-admin/locations` | Manage service locations |
| **BuffetHistoryScreen** | `GET /buffet-admin/tasks?status=completed` | Completed buffet tasks |

### Buffet Staff Screens

| Screen | Primary APIs | Description |
|--------|--------------|-------------|
| **StaffDashboardScreen** | `GET /buffet-staff/tasks/my` | Staff's assigned tasks |
| **StaffTaskDetailScreen** | `GET /buffet-staff/tasks/:id`, `PATCH /buffet-staff/tasks/:id/status` | View and update task |
| **TaskNotesScreen** | `GET /buffet-staff/tasks/:id` | View task special instructions |

### External Visitor Screens (Web View)

| Screen | Primary APIs | Description |
|--------|--------------|-------------|
| **InvitationLandingScreen** | `GET /invitations/:token` | Validate and display invitation |
| **AcceptInvitationScreen** | `POST /invitations/:token/accept` | Accept visit invitation |
| **RejectInvitationScreen** | `POST /invitations/:token/reject` | Reject visit invitation |
| **VisitorQRScreen** | `GET /invitations/:token` | Display visitor QR code |
| **ExpiredInvitationScreen** | `GET /invitations/:token` | Handle expired/invalid invite |
| **VisitExpectationsScreen** | `GET /invitations/:token` | Show parking/valet expectations |

### Common Shared Screens

| Screen | Primary APIs | Description |
|--------|--------------|-------------|
| **NotFoundScreen** | N/A | 404 error handling |
| **ErrorScreen** | N/A | Generic error display |
| **LoadingScreen** | N/A | Loading state display |
| **OfflineScreen** | N/A | No network connection |

### API Dependency Matrix by Role

| Role | Required API Modules |
|------|---------------------|
| **employee** | Auth, Users/me, Visits, Notifications, Valet (self-service) |
| **manager** | Auth, Users/me, Visits, Approvals, Notifications |
| **receptionist** | Auth, Users/me, Reception, Visits, Parking, Notifications |
| **security** | Auth, Users/me, Security, Visits, Notifications |
| **building_admin** | Auth, Users, Visits, Meeting Rooms, Parking, Admin, Notifications |
| **valet_admin** | Auth, Users/me, Valet Admin, Notifications |
| **valet_driver** | Auth, Users/me, Valet Driver, Notifications |
| **buffet_admin** | Auth, Users/me, Buffet Admin, Notifications |
| **buffet_staff** | Auth, Users/me, Buffet Staff, Notifications |
| **visitor** (external) | Invitations (public endpoints) |

---

## NestJS + SQL Server Backend Implementation Guide

This section provides detailed guidance for implementing the SKBC VMS backend using NestJS framework with SQL Server database.

---

### Role-Based API Access Matrix

The following comprehensive matrix maps every API endpoint to authorized roles. Use this matrix to implement NestJS Guards and RBAC decorators.

#### Legend
- ✅ Full Access
- 🔒 Own data only (filtered by user ID)
- 📝 Read-only
- ❌ No Access

#### Authentication Module

| Endpoint | Method | employee | manager | receptionist | security | building_admin | buffet_admin | buffet_staff | valet_admin | valet_driver | visitor |
|----------|--------|----------|---------|--------------|----------|----------------|--------------|--------------|-------------|--------------|---------|
| `/auth/login` | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/auth/azure/login` | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/auth/me` | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/auth/refresh` | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/auth/logout` | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/auth/change-password` | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/auth/send-otp` | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/auth/verify-otp` | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/auth/reset-password` | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/auth/biometric/register` | POST | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/auth/biometric/devices` | GET | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/auth/biometric/devices/:id` | DELETE | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/auth/biometric/verify` | POST | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

#### User Management Module

| Endpoint | Method | employee | manager | receptionist | security | building_admin | buffet_admin | buffet_staff | valet_admin | valet_driver | visitor |
|----------|--------|----------|---------|--------------|----------|----------------|--------------|--------------|-------------|--------------|---------|
| `/users` | GET | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/users` | POST | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/users/:id` | GET | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/users/:id` | PUT | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/users/:id` | DELETE | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/users/:id/status` | PATCH | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/users/me` | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/users/me` | PUT | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/users/me/photo` | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/users/me/photo` | DELETE | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/users/me/notification-preferences` | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/users/me/notification-preferences` | PUT | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/users/managers` | GET | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/users/employees` | GET | ❌ | 🔒 | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/users/bulk-status` | PATCH | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/users/bulk-role` | PATCH | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

#### Visits/Requests Module

| Endpoint | Method | employee | manager | receptionist | security | building_admin | buffet_admin | buffet_staff | valet_admin | valet_driver | visitor |
|----------|--------|----------|---------|--------------|----------|----------------|--------------|--------------|-------------|--------------|---------|
| `/visits` | GET | 🔒 | 🔒 | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/visits` | POST | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/visits/:id` | GET | 🔒 | 🔒 | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/visits/:id` | PUT | 🔒 | 🔒 | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/visits/:id` | DELETE | 🔒 | 🔒 | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/visits/:id/cancel` | POST | 🔒 | 🔒 | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/visits/:id/reschedule` | POST | 🔒 | 🔒 | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/visits/:id/check-in` | POST | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/visits/:id/check-out` | POST | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/visits/:id/assign-room` | POST | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/visits/:id/resend-invite` | POST | 🔒 | 🔒 | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/visits/:id/qr-code` | GET | 🔒 | 🔒 | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/visits/today` | GET | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/visits/history` | GET | 🔒 | 🔒 | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/visits/walk-in` | POST | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

#### Approvals Module (Manager)

| Endpoint | Method | employee | manager | receptionist | security | building_admin | buffet_admin | buffet_staff | valet_admin | valet_driver | visitor |
|----------|--------|----------|---------|--------------|----------|----------------|--------------|--------------|-------------|--------------|---------|
| `/approvals/pending` | GET | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/approvals/:id/approve` | POST | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/approvals/:id/reject` | POST | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/approvals/bulk` | POST | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/approvals/history` | GET | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/approvals/stats` | GET | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

#### Reception Module

| Endpoint | Method | employee | manager | receptionist | security | building_admin | buffet_admin | buffet_staff | valet_admin | valet_driver | visitor |
|----------|--------|----------|---------|--------------|----------|----------------|--------------|--------------|-------------|--------------|---------|
| `/reception/today` | GET | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/reception/summary` | GET | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/reception/alerts` | GET | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/reception/alerts/:id/read` | PATCH | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/reception/search` | GET | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/reception/walk-in` | POST | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/reception/rooms` | GET | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/reception/:id/notify-host` | POST | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

#### Security Module

| Endpoint | Method | employee | manager | receptionist | security | building_admin | buffet_admin | buffet_staff | valet_admin | valet_driver | visitor |
|----------|--------|----------|---------|--------------|----------|----------------|--------------|--------------|-------------|--------------|---------|
| `/security/today` | GET | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/security/today/summary` | GET | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/security/alerts` | GET | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/security/alerts/:id/read` | PATCH | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/security/qr/scan` | POST | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/security/gate/check-in` | POST | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/security/gate/check-out` | POST | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/security/gate-events` | GET | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/security/blacklist/check` | POST | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/security/blacklist` | GET | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/security/blacklist` | POST | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/security/blacklist/:id` | DELETE | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

#### Meeting Rooms Module

| Endpoint | Method | employee | manager | receptionist | security | building_admin | buffet_admin | buffet_staff | valet_admin | valet_driver | visitor |
|----------|--------|----------|---------|--------------|----------|----------------|--------------|--------------|-------------|--------------|---------|
| `/meeting-rooms` | GET | 📝 | 📝 | 📝 | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/meeting-rooms` | POST | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/meeting-rooms/:id` | GET | 📝 | 📝 | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/meeting-rooms/:id` | PUT | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/meeting-rooms/:id` | DELETE | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/meeting-rooms/:id/status` | PATCH | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/meeting-rooms/:id/availability` | GET | 📝 | 📝 | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/meeting-rooms/operations/today` | GET | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

#### Parking Module

| Endpoint | Method | employee | manager | receptionist | security | building_admin | buffet_admin | buffet_staff | valet_admin | valet_driver | visitor |
|----------|--------|----------|---------|--------------|----------|----------------|--------------|--------------|-------------|--------------|---------|
| `/parking/spots` | GET | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/parking/spots` | POST | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/parking/spots/:id` | PUT | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/parking/spots/:id` | DELETE | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/parking/config` | GET | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/parking/config` | PUT | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/parking/priority-rules` | PUT | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/parking/utilization` | GET | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/parking/employees` | GET | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/parking/employees/:id/assign` | POST | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/parking/employees/:id/assign` | DELETE | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/parking/employees/bulk-assign` | POST | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

#### Valet Module

| Endpoint | Method | employee | manager | receptionist | security | building_admin | buffet_admin | buffet_staff | valet_admin | valet_driver | visitor |
|----------|--------|----------|---------|--------------|----------|----------------|--------------|--------------|-------------|--------------|---------|
| `/valet/self-service` | GET | 🔒 | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/valet/self-service` | POST | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/valet/self-service/:id` | GET | 🔒 | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/valet/self-service/:id/cancel` | POST | 🔒 | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/valet-admin/tasks` | GET | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/valet-admin/tasks/:id` | GET | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/valet-admin/tasks/:id/assign` | POST | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/valet-admin/drivers` | GET | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/valet-admin/drivers/load` | GET | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/valet-admin/zones` | GET | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/valet-driver/my-tasks` | GET | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `/valet-driver/tasks/:id` | GET | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `/valet-driver/tasks/:id/status` | PATCH | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

#### Buffet Module

| Endpoint | Method | employee | manager | receptionist | security | building_admin | buffet_admin | buffet_staff | valet_admin | valet_driver | visitor |
|----------|--------|----------|---------|--------------|----------|----------------|--------------|--------------|-------------|--------------|---------|
| `/buffet-admin/tasks` | GET | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/buffet-admin/tasks/:id` | GET | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/buffet-admin/tasks/:id/assign` | POST | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/buffet-admin/tasks/:id/status` | PATCH | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/buffet-admin/locations` | GET | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/buffet-admin/staff` | GET | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/buffet-admin/load-summary` | GET | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/buffet-staff/my-tasks` | GET | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/buffet-staff/tasks/:id/status` | PATCH | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

#### Notifications Module

| Endpoint | Method | employee | manager | receptionist | security | building_admin | buffet_admin | buffet_staff | valet_admin | valet_driver | visitor |
|----------|--------|----------|---------|--------------|----------|----------------|--------------|--------------|-------------|--------------|---------|
| `/notifications` | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/notifications/:id/read` | PATCH | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/notifications/read-all` | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/notifications/:id` | DELETE | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/notifications/unread-count` | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/notifications/devices` | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/notifications/devices/:id` | DELETE | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

#### External Invite Module (Public)

| Endpoint | Method | employee | manager | receptionist | security | building_admin | buffet_admin | buffet_staff | valet_admin | valet_driver | visitor |
|----------|--------|----------|---------|--------------|----------|----------------|--------------|--------------|-------------|--------------|---------|
| `/invites/:token` | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/invites/:token/accept` | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/invites/:token/reject` | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

#### Admin Module

| Endpoint | Method | employee | manager | receptionist | security | building_admin | buffet_admin | buffet_staff | valet_admin | valet_driver | visitor |
|----------|--------|----------|---------|--------------|----------|----------------|--------------|--------------|-------------|--------------|---------|
| `/admin/settings` | GET | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/admin/settings` | PUT | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/admin/integrations` | GET | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/admin/integrations/:id` | PUT | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/admin/integrations/:id/test` | POST | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/admin/notification-templates` | GET | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/admin/notification-templates/:id` | PUT | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/admin/notifications/send` | POST | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/admin/reminder-rules` | GET | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/admin/reminder-rules` | PUT | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/admin/reminder-schedule` | GET | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/admin/event-logs` | GET | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/admin/analytics/summary` | GET | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/admin/analytics/export` | GET | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/admin/analytics/export/:exportId` | GET | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/admin/analytics/schedule` | POST | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/admin/analytics/schedules` | GET | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/admin/analytics/schedules/:id` | DELETE | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/admin/user-preferences/:userId` | GET | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

### SQL Server Database Schema

This section provides complete SQL Server database schema definitions for the SKBC VMS system.

#### Schema Design Principles

1. **Naming Conventions:**
   - Tables: PascalCase, plural (e.g., `Users`, `VisitRequests`)
   - Columns: PascalCase (e.g., `CreatedAt`, `UserId`)
   - Primary Keys: `Id` (UNIQUEIDENTIFIER/NVARCHAR)
   - Foreign Keys: `<Entity>Id` (e.g., `UserId`, `VisitId`)
   - Indexes: `IX_<Table>_<Columns>`
   - Constraints: `CK_<Table>_<Column>`, `FK_<Table>_<RefTable>`

2. **Data Types:**
   - IDs: `NVARCHAR(50)` or `UNIQUEIDENTIFIER`
   - Text: `NVARCHAR(n)` for Unicode support (Arabic)
   - Dates: `DATETIME2(7)` for precision
   - Enums: `NVARCHAR(50)` with CHECK constraints
   - Boolean: `BIT`
   - JSON: `NVARCHAR(MAX)` with JSON validation

---

#### Core Tables

```sql
-- =============================================
-- Users Table
-- =============================================
CREATE TABLE [dbo].[Users] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [Email]                 NVARCHAR(255)   NOT NULL UNIQUE,
    [PasswordHash]          NVARCHAR(255)   NULL,  -- NULL for Azure AD users
    [Name]                  NVARCHAR(200)   NOT NULL,
    [NameAr]                NVARCHAR(200)   NULL,  -- Arabic name
    [Role]                  NVARCHAR(50)    NOT NULL,
    [Department]            NVARCHAR(100)   NULL,
    [DepartmentAr]          NVARCHAR(100)   NULL,
    [PhoneNumber]           NVARCHAR(20)    NULL,
    [PhotoUrl]              NVARCHAR(500)   NULL,
    [Status]                NVARCHAR(20)    NOT NULL DEFAULT 'active',
    [AutoApproval]          BIT             NOT NULL DEFAULT 0,
    [Source]                NVARCHAR(20)    NOT NULL DEFAULT 'app_created',
    [AzureAdObjectId]       NVARCHAR(100)   NULL,
    [ManagerId]             NVARCHAR(50)    NULL,
    [BiometricEnabled]      BIT             NOT NULL DEFAULT 0,
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [LastLoginAt]           DATETIME2(7)    NULL,
    [DeletedAt]             DATETIME2(7)    NULL,
    
    CONSTRAINT [FK_Users_Manager] FOREIGN KEY ([ManagerId]) REFERENCES [Users]([Id]),
    CONSTRAINT [CK_Users_Role] CHECK ([Role] IN ('employee', 'manager', 'receptionist', 'security', 'building_admin', 'buffet_admin', 'buffet_staff', 'valet_admin', 'valet_driver')),
    CONSTRAINT [CK_Users_Status] CHECK ([Status] IN ('active', 'inactive', 'suspended')),
    CONSTRAINT [CK_Users_Source] CHECK ([Source] IN ('microsoft_ad', 'app_created'))
);

CREATE INDEX [IX_Users_Email] ON [Users]([Email]);
CREATE INDEX [IX_Users_Role] ON [Users]([Role]);
CREATE INDEX [IX_Users_ManagerId] ON [Users]([ManagerId]);
CREATE INDEX [IX_Users_Status] ON [Users]([Status]) WHERE [DeletedAt] IS NULL;
CREATE INDEX [IX_Users_Department] ON [Users]([Department]);

-- =============================================
-- Visitors Table (External visitors)
-- =============================================
CREATE TABLE [dbo].[Visitors] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [FullName]              NVARCHAR(200)   NOT NULL,
    [Email]                 NVARCHAR(255)   NOT NULL,
    [Phone]                 NVARCHAR(20)    NULL,
    [Company]               NVARCHAR(200)   NULL,
    [IdType]                NVARCHAR(30)    NULL,
    [IdNumber]              NVARCHAR(50)    NULL,
    [PhotoUrl]              NVARCHAR(500)   NULL,
    [IsBlacklisted]         BIT             NOT NULL DEFAULT 0,
    [BlacklistReason]       NVARCHAR(500)   NULL,
    [BlacklistedAt]         DATETIME2(7)    NULL,
    [BlacklistedBy]         NVARCHAR(50)    NULL,
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [CK_Visitors_IdType] CHECK ([IdType] IS NULL OR [IdType] IN ('national_id', 'passport', 'driver_license', 'iqama', 'other'))
);

CREATE INDEX [IX_Visitors_Email] ON [Visitors]([Email]);
CREATE INDEX [IX_Visitors_Phone] ON [Visitors]([Phone]) WHERE [Phone] IS NOT NULL;
CREATE INDEX [IX_Visitors_IsBlacklisted] ON [Visitors]([IsBlacklisted]) WHERE [IsBlacklisted] = 1;

-- =============================================
-- VisitRequests Table (Core visit entity)
-- =============================================
CREATE TABLE [dbo].[VisitRequests] (
    [Id]                        NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [HostId]                    NVARCHAR(50)    NOT NULL,
    [VisitorId]                 NVARCHAR(50)    NOT NULL,
    [VisitDate]                 DATE            NOT NULL,
    [VisitTime]                 TIME(0)         NOT NULL,
    [Duration]                  INT             NOT NULL,  -- Duration in minutes
    [Purpose]                   NVARCHAR(500)   NOT NULL,
    [Status]                    NVARCHAR(30)    NOT NULL DEFAULT 'pending_approval',
    [IsWalkIn]                  BIT             NOT NULL DEFAULT 0,
    [RequiresApproval]          BIT             NOT NULL DEFAULT 1,
    
    -- Resource allocations
    [MeetingRoomId]             NVARCHAR(50)    NULL,
    [ParkingType]               NVARCHAR(20)    NULL DEFAULT 'auto',
    [ParkingSpotId]             NVARCHAR(50)    NULL,
    
    -- Communication
    [CommunicationChannels]     NVARCHAR(500)   NULL,  -- JSON array: ["email", "whatsapp", "sms"]
    
    -- QR Code
    [QrCode]                    NVARCHAR(100)   NULL UNIQUE,
    [InviteToken]               NVARCHAR(100)   NULL UNIQUE,
    [InviteExpiresAt]           DATETIME2(7)    NULL,
    
    -- Visitor Decision
    [VisitorAccepted]           BIT             NULL,
    [VisitorDecidedAt]          DATETIME2(7)    NULL,
    [VisitorRejectionReason]    NVARCHAR(500)   NULL,
    
    -- Approval workflow
    [ApproverId]                NVARCHAR(50)    NULL,
    [ApprovalStatus]            NVARCHAR(20)    NULL,
    [ApprovedAt]                DATETIME2(7)    NULL,
    [RejectedAt]                DATETIME2(7)    NULL,
    [RejectionReason]           NVARCHAR(500)   NULL,
    
    -- Lifecycle
    [CheckedInAt]               DATETIME2(7)    NULL,
    [CheckedOutAt]              DATETIME2(7)    NULL,
    [CheckedInByGate]           NVARCHAR(50)    NULL,
    [CheckedOutByGate]          NVARCHAR(50)    NULL,
    [CancelledAt]               DATETIME2(7)    NULL,
    [CancelledBy]               NVARCHAR(50)    NULL,
    [CancellationReason]        NVARCHAR(500)   NULL,
    [CompletedAt]               DATETIME2(7)    NULL,
    
    -- Reminders
    [FirstReminderSentAt]       DATETIME2(7)    NULL,
    [SecondReminderSentAt]      DATETIME2(7)    NULL,
    [AutoCancelledAt]           DATETIME2(7)    NULL,
    
    -- Notes
    [HostNotes]                 NVARCHAR(1000)  NULL,
    [VisitorNotes]              NVARCHAR(1000)  NULL,
    [ReceptionNotes]            NVARCHAR(1000)  NULL,
    
    -- Metadata
    [CreatedAt]                 DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt]                 DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [FK_VisitRequests_Host] FOREIGN KEY ([HostId]) REFERENCES [Users]([Id]),
    CONSTRAINT [FK_VisitRequests_Visitor] FOREIGN KEY ([VisitorId]) REFERENCES [Visitors]([Id]),
    CONSTRAINT [FK_VisitRequests_Approver] FOREIGN KEY ([ApproverId]) REFERENCES [Users]([Id]),
    CONSTRAINT [FK_VisitRequests_MeetingRoom] FOREIGN KEY ([MeetingRoomId]) REFERENCES [MeetingRooms]([Id]),
    CONSTRAINT [FK_VisitRequests_ParkingSpot] FOREIGN KEY ([ParkingSpotId]) REFERENCES [ParkingSpots]([Id]),
    CONSTRAINT [CK_VisitRequests_Status] CHECK ([Status] IN (
        'draft', 'pending_approval', 'approved', 'rejected', 
        'waiting_visitor', 'visitor_accepted', 'visitor_rejected',
        'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'auto_cancelled'
    )),
    CONSTRAINT [CK_VisitRequests_ParkingType] CHECK ([ParkingType] IS NULL OR [ParkingType] IN ('auto', 'none', 'valet'))
);

CREATE INDEX [IX_VisitRequests_HostId] ON [VisitRequests]([HostId]);
CREATE INDEX [IX_VisitRequests_VisitorId] ON [VisitRequests]([VisitorId]);
CREATE INDEX [IX_VisitRequests_VisitDate] ON [VisitRequests]([VisitDate]);
CREATE INDEX [IX_VisitRequests_Status] ON [VisitRequests]([Status]);
CREATE INDEX [IX_VisitRequests_InviteToken] ON [VisitRequests]([InviteToken]) WHERE [InviteToken] IS NOT NULL;
CREATE INDEX [IX_VisitRequests_QrCode] ON [VisitRequests]([QrCode]) WHERE [QrCode] IS NOT NULL;
CREATE INDEX [IX_VisitRequests_TodayVisits] ON [VisitRequests]([VisitDate], [Status]) INCLUDE ([HostId], [VisitorId], [VisitTime]);
CREATE INDEX [IX_VisitRequests_PendingApproval] ON [VisitRequests]([ApproverId], [Status]) WHERE [Status] = 'pending_approval';

-- =============================================
-- MeetingRooms Table
-- =============================================
CREATE TABLE [dbo].[MeetingRooms] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [Name]                  NVARCHAR(100)   NOT NULL,
    [NameAr]                NVARCHAR(100)   NULL,
    [Floor]                 NVARCHAR(50)    NOT NULL,
    [Building]              NVARCHAR(100)   NOT NULL DEFAULT 'SKBC Tower',
    [Capacity]              INT             NOT NULL,
    [Features]              NVARCHAR(500)   NULL,  -- JSON array
    [Status]                NVARCHAR(20)    NOT NULL DEFAULT 'active',
    [Description]           NVARCHAR(500)   NULL,
    [PhotoUrl]              NVARCHAR(500)   NULL,
    [MaintenanceReason]     NVARCHAR(300)   NULL,
    [EstimatedAvailableDate] DATE           NULL,
    [MinDuration]           INT             NOT NULL DEFAULT 30,  -- minutes
    [MaxDuration]           INT             NOT NULL DEFAULT 480, -- minutes
    [AdvanceBookingDays]    INT             NOT NULL DEFAULT 30,
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [CK_MeetingRooms_Status] CHECK ([Status] IN ('active', 'out_of_service', 'maintenance')),
    CONSTRAINT [UQ_MeetingRooms_Name_Floor] UNIQUE ([Name], [Floor])
);

CREATE INDEX [IX_MeetingRooms_Status] ON [MeetingRooms]([Status]);
CREATE INDEX [IX_MeetingRooms_Floor] ON [MeetingRooms]([Floor]);

-- =============================================
-- ParkingSpots Table
-- =============================================
CREATE TABLE [dbo].[ParkingSpots] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [SpotNumber]            NVARCHAR(20)    NOT NULL UNIQUE,
    [Location]              NVARCHAR(50)    NOT NULL,
    [Level]                 NVARCHAR(10)    NOT NULL,
    [Type]                  NVARCHAR(20)    NOT NULL DEFAULT 'visitor',
    [Status]                NVARCHAR(20)    NOT NULL DEFAULT 'available',
    [IsActive]              BIT             NOT NULL DEFAULT 1,
    [AssignedToUserId]      NVARCHAR(50)    NULL,  -- For employee permanent spots
    [CurrentVehiclePlate]   NVARCHAR(20)    NULL,
    [CurrentVisitId]        NVARCHAR(50)    NULL,
    [OccupiedSince]         DATETIME2(7)    NULL,
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [FK_ParkingSpots_AssignedUser] FOREIGN KEY ([AssignedToUserId]) REFERENCES [Users]([Id]),
    CONSTRAINT [CK_ParkingSpots_Type] CHECK ([Type] IN ('visitor', 'employee', 'valet', 'reserved', 'disabled')),
    CONSTRAINT [CK_ParkingSpots_Status] CHECK ([Status] IN ('available', 'occupied', 'reserved', 'maintenance'))
);

CREATE INDEX [IX_ParkingSpots_Location] ON [ParkingSpots]([Location]);
CREATE INDEX [IX_ParkingSpots_Status] ON [ParkingSpots]([Status]);
CREATE INDEX [IX_ParkingSpots_Type] ON [ParkingSpots]([Type]);
CREATE INDEX [IX_ParkingSpots_AssignedUser] ON [ParkingSpots]([AssignedToUserId]) WHERE [AssignedToUserId] IS NOT NULL;

-- =============================================
-- ParkingPriorityRules Table
-- =============================================
CREATE TABLE [dbo].[ParkingPriorityRules] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [Location]              NVARCHAR(50)    NOT NULL,
    [Priority]              INT             NOT NULL,
    [MaxOccupancyPercent]   INT             NOT NULL DEFAULT 85,
    [IsActive]              BIT             NOT NULL DEFAULT 1,
    [Description]           NVARCHAR(300)   NULL,
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [UQ_ParkingPriorityRules_Priority] UNIQUE ([Priority])
);

-- =============================================
-- ParkingAssignments Table (Employee permanent assignments)
-- =============================================
CREATE TABLE [dbo].[ParkingAssignments] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [EmployeeId]            NVARCHAR(50)    NOT NULL,
    [SpotId]                NVARCHAR(50)    NOT NULL,
    [IsPermanent]           BIT             NOT NULL DEFAULT 1,
    [EffectiveDate]         DATE            NOT NULL,
    [ExpiryDate]            DATE            NULL,
    [Notes]                 NVARCHAR(300)   NULL,
    [AssignedBy]            NVARCHAR(50)    NOT NULL,
    [AssignedAt]            DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [UnassignedAt]          DATETIME2(7)    NULL,
    [UnassignedBy]          NVARCHAR(50)    NULL,
    [UnassignmentReason]    NVARCHAR(300)   NULL,
    
    CONSTRAINT [FK_ParkingAssignments_Employee] FOREIGN KEY ([EmployeeId]) REFERENCES [Users]([Id]),
    CONSTRAINT [FK_ParkingAssignments_Spot] FOREIGN KEY ([SpotId]) REFERENCES [ParkingSpots]([Id]),
    CONSTRAINT [FK_ParkingAssignments_AssignedBy] FOREIGN KEY ([AssignedBy]) REFERENCES [Users]([Id])
);

CREATE INDEX [IX_ParkingAssignments_EmployeeId] ON [ParkingAssignments]([EmployeeId]);
CREATE INDEX [IX_ParkingAssignments_SpotId] ON [ParkingAssignments]([SpotId]);
CREATE INDEX [IX_ParkingAssignments_Active] ON [ParkingAssignments]([EmployeeId], [SpotId]) WHERE [UnassignedAt] IS NULL;

-- =============================================
-- ValetTasks Table
-- =============================================
CREATE TABLE [dbo].[ValetTasks] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [Type]                  NVARCHAR(20)    NOT NULL,  -- 'visitor' or 'employee'
    [VisitRequestId]        NVARCHAR(50)    NULL,      -- For visitor valet
    [EmployeeId]            NVARCHAR(50)    NULL,      -- For employee self-valet
    [DriverId]              NVARCHAR(50)    NULL,
    [Status]                NVARCHAR(20)    NOT NULL DEFAULT 'pending',
    [Priority]              NVARCHAR(20)    NOT NULL DEFAULT 'normal',
    
    -- Vehicle info
    [VehicleMake]           NVARCHAR(50)    NULL,
    [VehicleModel]          NVARCHAR(50)    NULL,
    [VehicleColor]          NVARCHAR(30)    NULL,
    [VehiclePlate]          NVARCHAR(20)    NULL,
    
    -- Location & timing
    [DropOffLocation]       NVARCHAR(100)   NOT NULL,
    [ParkingLocation]       NVARCHAR(50)    NULL,      -- Where car is parked
    [PickupTime]            TIME(0)         NULL,
    [ReturnTime]            TIME(0)         NULL,
    [RequestedReturnTime]   TIME(0)         NULL,
    
    -- Lifecycle
    [AssignedAt]            DATETIME2(7)    NULL,
    [AcceptedAt]            DATETIME2(7)    NULL,
    [RejectedAt]            DATETIME2(7)    NULL,
    [RejectionReason]       NVARCHAR(100)   NULL,
    [StartedAt]             DATETIME2(7)    NULL,
    [CompletedAt]           DATETIME2(7)    NULL,
    [CancelledAt]           DATETIME2(7)    NULL,
    
    [Notes]                 NVARCHAR(500)   NULL,
    [DriverNotes]           NVARCHAR(500)   NULL,
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [FK_ValetTasks_VisitRequest] FOREIGN KEY ([VisitRequestId]) REFERENCES [VisitRequests]([Id]),
    CONSTRAINT [FK_ValetTasks_Employee] FOREIGN KEY ([EmployeeId]) REFERENCES [Users]([Id]),
    CONSTRAINT [FK_ValetTasks_Driver] FOREIGN KEY ([DriverId]) REFERENCES [Users]([Id]),
    CONSTRAINT [CK_ValetTasks_Type] CHECK ([Type] IN ('visitor', 'employee')),
    CONSTRAINT [CK_ValetTasks_Status] CHECK ([Status] IN ('pending', 'assigned', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled')),
    CONSTRAINT [CK_ValetTasks_Priority] CHECK ([Priority] IN ('low', 'normal', 'high', 'urgent'))
);

CREATE INDEX [IX_ValetTasks_DriverId] ON [ValetTasks]([DriverId]);
CREATE INDEX [IX_ValetTasks_Status] ON [ValetTasks]([Status]);
CREATE INDEX [IX_ValetTasks_VisitRequestId] ON [ValetTasks]([VisitRequestId]) WHERE [VisitRequestId] IS NOT NULL;
CREATE INDEX [IX_ValetTasks_EmployeeId] ON [ValetTasks]([EmployeeId]) WHERE [EmployeeId] IS NOT NULL;

-- =============================================
-- ValetZones Table
-- =============================================
CREATE TABLE [dbo].[ValetZones] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [Name]                  NVARCHAR(100)   NOT NULL,
    [Type]                  NVARCHAR(20)    NOT NULL DEFAULT 'covered',
    [Location]              NVARCHAR(100)   NOT NULL,
    [Capacity]              INT             NOT NULL,
    [CurrentOccupancy]      INT             NOT NULL DEFAULT 0,
    [Status]                NVARCHAR(20)    NOT NULL DEFAULT 'active',
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [CK_ValetZones_Status] CHECK ([Status] IN ('active', 'inactive', 'maintenance'))
);

-- =============================================
-- BuffetTasks Table
-- =============================================
CREATE TABLE [dbo].[BuffetTasks] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [VisitRequestId]        NVARCHAR(50)    NOT NULL,
    [LocationId]            NVARCHAR(50)    NULL,
    [StaffId]               NVARCHAR(50)    NULL,
    [Status]                NVARCHAR(20)    NOT NULL DEFAULT 'pending',
    [Priority]              NVARCHAR(20)    NOT NULL DEFAULT 'normal',
    
    -- Meal details
    [MealType]              NVARCHAR(20)    NOT NULL,
    [GuestCount]            INT             NOT NULL DEFAULT 1,
    [DietaryRequirements]   NVARCHAR(500)   NULL,  -- JSON array
    [SpecialInstructions]   NVARCHAR(500)   NULL,
    
    -- Timing
    [ScheduledTime]         TIME(0)         NOT NULL,
    [EstimatedReadyTime]    TIME(0)         NULL,
    
    -- Lifecycle
    [AssignedAt]            DATETIME2(7)    NULL,
    [PreparingAt]           DATETIME2(7)    NULL,
    [ReadyAt]               DATETIME2(7)    NULL,
    [ServedAt]              DATETIME2(7)    NULL,
    [CompletedAt]           DATETIME2(7)    NULL,
    [CancelledAt]           DATETIME2(7)    NULL,
    [CancellationReason]    NVARCHAR(300)   NULL,
    
    [Notes]                 NVARCHAR(500)   NULL,
    [StaffNotes]            NVARCHAR(500)   NULL,
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [FK_BuffetTasks_VisitRequest] FOREIGN KEY ([VisitRequestId]) REFERENCES [VisitRequests]([Id]),
    CONSTRAINT [FK_BuffetTasks_Location] FOREIGN KEY ([LocationId]) REFERENCES [BuffetLocations]([Id]),
    CONSTRAINT [FK_BuffetTasks_Staff] FOREIGN KEY ([StaffId]) REFERENCES [Users]([Id]),
    CONSTRAINT [CK_BuffetTasks_Status] CHECK ([Status] IN ('pending', 'assigned', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
    CONSTRAINT [CK_BuffetTasks_MealType] CHECK ([MealType] IN ('breakfast', 'lunch', 'dinner', 'snacks', 'beverages', 'custom'))
);

CREATE INDEX [IX_BuffetTasks_VisitRequestId] ON [BuffetTasks]([VisitRequestId]);
CREATE INDEX [IX_BuffetTasks_StaffId] ON [BuffetTasks]([StaffId]) WHERE [StaffId] IS NOT NULL;
CREATE INDEX [IX_BuffetTasks_Status] ON [BuffetTasks]([Status]);

-- =============================================
-- BuffetLocations Table
-- =============================================
CREATE TABLE [dbo].[BuffetLocations] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [Name]                  NVARCHAR(100)   NOT NULL,
    [NameAr]                NVARCHAR(100)   NULL,
    [Floor]                 NVARCHAR(50)    NOT NULL,
    [Capacity]              INT             NOT NULL,
    [Status]                NVARCHAR(20)    NOT NULL DEFAULT 'active',
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [CK_BuffetLocations_Status] CHECK ([Status] IN ('active', 'inactive', 'maintenance'))
);

-- =============================================
-- Gates Table
-- =============================================
CREATE TABLE [dbo].[Gates] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [Name]                  NVARCHAR(100)   NOT NULL,
    [NameAr]                NVARCHAR(100)   NULL,
    [Location]              NVARCHAR(100)   NOT NULL,
    [Type]                  NVARCHAR(30)    NOT NULL DEFAULT 'main',
    [Status]                NVARCHAR(20)    NOT NULL DEFAULT 'active',
    [IntegrationId]         NVARCHAR(100)   NULL,  -- Speed gate integration ID
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [CK_Gates_Type] CHECK ([Type] IN ('main', 'parking', 'emergency', 'service')),
    CONSTRAINT [CK_Gates_Status] CHECK ([Status] IN ('active', 'inactive', 'maintenance'))
);

-- =============================================
-- GateEvents Table (Audit log)
-- =============================================
CREATE TABLE [dbo].[GateEvents] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [GateId]                NVARCHAR(50)    NOT NULL,
    [VisitRequestId]        NVARCHAR(50)    NULL,
    [VisitorName]           NVARCHAR(200)   NULL,
    [Action]                NVARCHAR(20)    NOT NULL,
    [Result]                NVARCHAR(20)    NOT NULL,
    [Reason]                NVARCHAR(300)   NULL,
    [ScannedQrCode]         NVARCHAR(100)   NULL,
    [PerformedBy]           NVARCHAR(50)    NOT NULL,
    [Timestamp]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [Metadata]              NVARCHAR(MAX)   NULL,  -- JSON
    
    CONSTRAINT [FK_GateEvents_Gate] FOREIGN KEY ([GateId]) REFERENCES [Gates]([Id]),
    CONSTRAINT [FK_GateEvents_VisitRequest] FOREIGN KEY ([VisitRequestId]) REFERENCES [VisitRequests]([Id]),
    CONSTRAINT [FK_GateEvents_PerformedBy] FOREIGN KEY ([PerformedBy]) REFERENCES [Users]([Id]),
    CONSTRAINT [CK_GateEvents_Action] CHECK ([Action] IN ('scan', 'check_in', 'check_out', 'denied', 'manual_override')),
    CONSTRAINT [CK_GateEvents_Result] CHECK ([Result] IN ('success', 'failed', 'blocked'))
);

CREATE INDEX [IX_GateEvents_GateId] ON [GateEvents]([GateId]);
CREATE INDEX [IX_GateEvents_Timestamp] ON [GateEvents]([Timestamp] DESC);
CREATE INDEX [IX_GateEvents_VisitRequestId] ON [GateEvents]([VisitRequestId]) WHERE [VisitRequestId] IS NOT NULL;

-- =============================================
-- Notifications Table
-- =============================================
CREATE TABLE [dbo].[Notifications] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [UserId]                NVARCHAR(50)    NOT NULL,
    [Type]                  NVARCHAR(50)    NOT NULL,
    [Title]                 NVARCHAR(200)   NOT NULL,
    [TitleAr]               NVARCHAR(200)   NULL,
    [Body]                  NVARCHAR(1000)  NOT NULL,
    [BodyAr]                NVARCHAR(1000)  NULL,
    [Data]                  NVARCHAR(MAX)   NULL,  -- JSON with additional data
    [Priority]              NVARCHAR(10)    NOT NULL DEFAULT 'medium',
    [Channels]              NVARCHAR(200)   NOT NULL,  -- JSON array: ["push", "email"]
    [IsRead]                BIT             NOT NULL DEFAULT 0,
    [ReadAt]                DATETIME2(7)    NULL,
    [RelatedEntityType]     NVARCHAR(50)    NULL,  -- 'visit', 'approval', 'valet', etc.
    [RelatedEntityId]       NVARCHAR(50)    NULL,
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [ExpiresAt]             DATETIME2(7)    NULL,
    
    CONSTRAINT [FK_Notifications_User] FOREIGN KEY ([UserId]) REFERENCES [Users]([Id]),
    CONSTRAINT [CK_Notifications_Priority] CHECK ([Priority] IN ('high', 'medium', 'low'))
);

CREATE INDEX [IX_Notifications_UserId] ON [Notifications]([UserId]);
CREATE INDEX [IX_Notifications_IsRead] ON [Notifications]([UserId], [IsRead]) WHERE [IsRead] = 0;
CREATE INDEX [IX_Notifications_CreatedAt] ON [Notifications]([CreatedAt] DESC);
CREATE INDEX [IX_Notifications_Type] ON [Notifications]([Type]);

-- =============================================
-- NotificationPreferences Table
-- =============================================
CREATE TABLE [dbo].[NotificationPreferences] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [UserId]                NVARCHAR(50)    NOT NULL UNIQUE,
    [PushEnabled]           BIT             NOT NULL DEFAULT 1,
    [EmailEnabled]          BIT             NOT NULL DEFAULT 1,
    [SmsEnabled]            BIT             NOT NULL DEFAULT 0,
    [WhatsappEnabled]       BIT             NOT NULL DEFAULT 1,
    [EmailSummaryFrequency] NVARCHAR(20)    NOT NULL DEFAULT 'daily',
    [DailyDigestTime]       TIME(0)         NOT NULL DEFAULT '09:00:00',
    [EventPreferences]      NVARCHAR(MAX)   NOT NULL,  -- JSON object
    [QuietHoursEnabled]     BIT             NOT NULL DEFAULT 0,
    [QuietHoursStart]       TIME(0)         NULL DEFAULT '22:00:00',
    [QuietHoursEnd]         TIME(0)         NULL DEFAULT '07:00:00',
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [FK_NotificationPreferences_User] FOREIGN KEY ([UserId]) REFERENCES [Users]([Id]),
    CONSTRAINT [CK_NotificationPreferences_Frequency] CHECK ([EmailSummaryFrequency] IN ('immediate', 'daily', 'weekly', 'none'))
);

-- =============================================
-- DeviceTokens Table (Push notifications)
-- =============================================
CREATE TABLE [dbo].[DeviceTokens] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [UserId]                NVARCHAR(50)    NOT NULL,
    [Token]                 NVARCHAR(500)   NOT NULL,
    [Platform]              NVARCHAR(10)    NOT NULL,
    [DeviceId]              NVARCHAR(100)   NULL,
    [DeviceName]            NVARCHAR(100)   NULL,
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [LastUsedAt]            DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [FK_DeviceTokens_User] FOREIGN KEY ([UserId]) REFERENCES [Users]([Id]),
    CONSTRAINT [CK_DeviceTokens_Platform] CHECK ([Platform] IN ('ios', 'android', 'web')),
    CONSTRAINT [UQ_DeviceTokens_Token] UNIQUE ([Token])
);

CREATE INDEX [IX_DeviceTokens_UserId] ON [DeviceTokens]([UserId]);

-- =============================================
-- BiometricDevices Table
-- =============================================
CREATE TABLE [dbo].[BiometricDevices] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [UserId]                NVARCHAR(50)    NOT NULL,
    [DeviceId]              NVARCHAR(100)   NOT NULL,
    [DeviceName]            NVARCHAR(100)   NOT NULL,
    [BiometricType]         NVARCHAR(30)    NOT NULL,
    [PublicKey]             NVARCHAR(MAX)   NOT NULL,
    [LastUsedAt]            DATETIME2(7)    NULL,
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [FK_BiometricDevices_User] FOREIGN KEY ([UserId]) REFERENCES [Users]([Id]),
    CONSTRAINT [CK_BiometricDevices_Type] CHECK ([BiometricType] IN ('face_id', 'touch_id', 'fingerprint', 'passcode')),
    CONSTRAINT [UQ_BiometricDevices_UserDevice] UNIQUE ([UserId], [DeviceId])
);

CREATE INDEX [IX_BiometricDevices_UserId] ON [BiometricDevices]([UserId]);

-- =============================================
-- OtpCodes Table (One-time passwords)
-- =============================================
CREATE TABLE [dbo].[OtpCodes] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [Email]                 NVARCHAR(255)   NOT NULL,
    [Code]                  NVARCHAR(10)    NOT NULL,
    [Purpose]               NVARCHAR(30)    NOT NULL,
    [IsUsed]                BIT             NOT NULL DEFAULT 0,
    [UsedAt]                DATETIME2(7)    NULL,
    [ExpiresAt]             DATETIME2(7)    NOT NULL,
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [Attempts]              INT             NOT NULL DEFAULT 0,
    
    CONSTRAINT [CK_OtpCodes_Purpose] CHECK ([Purpose] IN ('password_reset', 'email_verification', 'login_verification'))
);

CREATE INDEX [IX_OtpCodes_Email_Purpose] ON [OtpCodes]([Email], [Purpose]) WHERE [IsUsed] = 0;
CREATE INDEX [IX_OtpCodes_ExpiresAt] ON [OtpCodes]([ExpiresAt]) WHERE [IsUsed] = 0;

-- =============================================
-- RefreshTokens Table
-- =============================================
CREATE TABLE [dbo].[RefreshTokens] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [UserId]                NVARCHAR(50)    NOT NULL,
    [Token]                 NVARCHAR(500)   NOT NULL UNIQUE,
    [ExpiresAt]             DATETIME2(7)    NOT NULL,
    [IsRevoked]             BIT             NOT NULL DEFAULT 0,
    [RevokedAt]             DATETIME2(7)    NULL,
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [DeviceInfo]            NVARCHAR(500)   NULL,
    
    CONSTRAINT [FK_RefreshTokens_User] FOREIGN KEY ([UserId]) REFERENCES [Users]([Id])
);

CREATE INDEX [IX_RefreshTokens_Token] ON [RefreshTokens]([Token]);
CREATE INDEX [IX_RefreshTokens_UserId] ON [RefreshTokens]([UserId]);

-- =============================================
-- SystemSettings Table
-- =============================================
CREATE TABLE [dbo].[SystemSettings] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [Category]              NVARCHAR(50)    NOT NULL,
    [Key]                   NVARCHAR(100)   NOT NULL,
    [Value]                 NVARCHAR(MAX)   NOT NULL,
    [ValueType]             NVARCHAR(20)    NOT NULL DEFAULT 'string',
    [Description]           NVARCHAR(500)   NULL,
    [UpdatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedBy]             NVARCHAR(50)    NULL,
    
    CONSTRAINT [UQ_SystemSettings_Category_Key] UNIQUE ([Category], [Key]),
    CONSTRAINT [CK_SystemSettings_ValueType] CHECK ([ValueType] IN ('string', 'number', 'boolean', 'json'))
);

-- =============================================
-- ReminderRules Table
-- =============================================
CREATE TABLE [dbo].[ReminderRules] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [FirstReminderMinutes]  INT             NOT NULL DEFAULT 120,
    [SecondReminderMinutes] INT             NOT NULL DEFAULT 240,
    [AutoCancelMinutes]     INT             NOT NULL DEFAULT 300,
    [OfficeStartTime]       TIME(0)         NOT NULL DEFAULT '09:00:00',
    [OfficeEndTime]         TIME(0)         NOT NULL DEFAULT '18:00:00',
    [WorkingDays]           NVARCHAR(50)    NOT NULL DEFAULT '[0,1,2,3,4]',  -- JSON array (0=Sunday)
    [IsActive]              BIT             NOT NULL DEFAULT 1,
    [UpdatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedBy]             NVARCHAR(50)    NULL
);

-- =============================================
-- EventLogs Table (Audit trail)
-- =============================================
CREATE TABLE [dbo].[EventLogs] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [EntityType]            NVARCHAR(50)    NOT NULL,
    [EntityId]              NVARCHAR(50)    NOT NULL,
    [EventType]             NVARCHAR(50)    NOT NULL,
    [Description]           NVARCHAR(500)   NOT NULL,
    [OldValue]              NVARCHAR(MAX)   NULL,
    [NewValue]              NVARCHAR(MAX)   NULL,
    [PerformedBy]           NVARCHAR(50)    NOT NULL,
    [PerformedByRole]       NVARCHAR(50)    NOT NULL,
    [IpAddress]             NVARCHAR(50)    NULL,
    [UserAgent]             NVARCHAR(500)   NULL,
    [Timestamp]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [FK_EventLogs_PerformedBy] FOREIGN KEY ([PerformedBy]) REFERENCES [Users]([Id])
);

CREATE INDEX [IX_EventLogs_EntityType_EntityId] ON [EventLogs]([EntityType], [EntityId]);
CREATE INDEX [IX_EventLogs_Timestamp] ON [EventLogs]([Timestamp] DESC);
CREATE INDEX [IX_EventLogs_EventType] ON [EventLogs]([EventType]);
CREATE INDEX [IX_EventLogs_PerformedBy] ON [EventLogs]([PerformedBy]);

-- =============================================
-- Integrations Table
-- =============================================
CREATE TABLE [dbo].[Integrations] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [Name]                  NVARCHAR(100)   NOT NULL,
    [Type]                  NVARCHAR(50)    NOT NULL,
    [Status]                NVARCHAR(20)    NOT NULL DEFAULT 'inactive',
    [Config]                NVARCHAR(MAX)   NULL,  -- Encrypted JSON config
    [IsConfigured]          BIT             NOT NULL DEFAULT 0,
    [LastSyncTime]          DATETIME2(7)    NULL,
    [LastErrorMessage]      NVARCHAR(500)   NULL,
    [LastErrorTime]         DATETIME2(7)    NULL,
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [CK_Integrations_Type] CHECK ([Type] IN ('outlook', 'oracle_hcm', 'speed_gate', 'whatsapp', 'sms', 'email', 'azure_ad')),
    CONSTRAINT [CK_Integrations_Status] CHECK ([Status] IN ('ok', 'degraded', 'down', 'inactive'))
);

-- =============================================
-- NotificationTemplates Table
-- =============================================
CREATE TABLE [dbo].[NotificationTemplates] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [EventType]             NVARCHAR(50)    NOT NULL UNIQUE,
    [Name]                  NVARCHAR(100)   NOT NULL,
    [ChannelQr]             BIT             NOT NULL DEFAULT 1,
    [ChannelEmail]          BIT             NOT NULL DEFAULT 1,
    [ChannelSms]            BIT             NOT NULL DEFAULT 0,
    [ChannelWhatsapp]       BIT             NOT NULL DEFAULT 1,
    [EmailSubject]          NVARCHAR(200)   NULL,
    [EmailSubjectAr]        NVARCHAR(200)   NULL,
    [EmailBody]             NVARCHAR(MAX)   NULL,
    [EmailBodyAr]           NVARCHAR(MAX)   NULL,
    [SmsTemplate]           NVARCHAR(500)   NULL,
    [SmsTemplateAr]         NVARCHAR(500)   NULL,
    [WhatsappTemplate]      NVARCHAR(1000)  NULL,
    [WhatsappTemplateAr]    NVARCHAR(1000)  NULL,
    [Placeholders]          NVARCHAR(500)   NOT NULL,  -- JSON array
    [IsActive]              BIT             NOT NULL DEFAULT 1,
    [UpdatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE()
);

-- =============================================
-- ScheduledReports Table
-- =============================================
CREATE TABLE [dbo].[ScheduledReports] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [ReportType]            NVARCHAR(30)    NOT NULL,
    [Format]                NVARCHAR(10)    NOT NULL,
    [Frequency]             NVARCHAR(20)    NOT NULL,
    [DayOfWeek]             INT             NULL,
    [DayOfMonth]            INT             NULL,
    [Time]                  TIME(0)         NOT NULL,
    [Timezone]              NVARCHAR(50)    NOT NULL DEFAULT 'Asia/Riyadh',
    [Recipients]            NVARCHAR(1000)  NOT NULL,  -- JSON array of emails
    [IncludeCharts]         BIT             NOT NULL DEFAULT 1,
    [IsActive]              BIT             NOT NULL DEFAULT 1,
    [LastRunAt]             DATETIME2(7)    NULL,
    [LastRunStatus]         NVARCHAR(20)    NULL,
    [NextRunAt]             DATETIME2(7)    NOT NULL,
    [CreatedBy]             NVARCHAR(50)    NOT NULL,
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [FK_ScheduledReports_CreatedBy] FOREIGN KEY ([CreatedBy]) REFERENCES [Users]([Id]),
    CONSTRAINT [CK_ScheduledReports_ReportType] CHECK ([ReportType] IN ('visits', 'parking', 'valet', 'buffet', 'security', 'comprehensive')),
    CONSTRAINT [CK_ScheduledReports_Format] CHECK ([Format] IN ('csv', 'xlsx', 'pdf')),
    CONSTRAINT [CK_ScheduledReports_Frequency] CHECK ([Frequency] IN ('daily', 'weekly', 'monthly'))
);

-- =============================================
-- ExportJobs Table
-- =============================================
CREATE TABLE [dbo].[ExportJobs] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [ReportType]            NVARCHAR(30)    NOT NULL,
    [Format]                NVARCHAR(10)    NOT NULL,
    [StartDate]             DATE            NOT NULL,
    [EndDate]               DATE            NOT NULL,
    [Status]                NVARCHAR(20)    NOT NULL DEFAULT 'processing',
    [Progress]              INT             NOT NULL DEFAULT 0,
    [DownloadUrl]           NVARCHAR(500)   NULL,
    [FileSize]              NVARCHAR(20)    NULL,
    [RowCount]              INT             NULL,
    [ErrorMessage]          NVARCHAR(500)   NULL,
    [ExpiresAt]             DATETIME2(7)    NULL,
    [RequestedBy]           NVARCHAR(50)    NOT NULL,
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [CompletedAt]           DATETIME2(7)    NULL,
    
    CONSTRAINT [FK_ExportJobs_RequestedBy] FOREIGN KEY ([RequestedBy]) REFERENCES [Users]([Id]),
    CONSTRAINT [CK_ExportJobs_Status] CHECK ([Status] IN ('processing', 'complete', 'failed', 'expired'))
);

CREATE INDEX [IX_ExportJobs_RequestedBy] ON [ExportJobs]([RequestedBy]);
CREATE INDEX [IX_ExportJobs_Status] ON [ExportJobs]([Status]) WHERE [Status] = 'processing';

-- =============================================
-- SecurityAlerts Table
-- =============================================
CREATE TABLE [dbo].[SecurityAlerts] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [Type]                  NVARCHAR(30)    NOT NULL,
    [Priority]              NVARCHAR(10)    NOT NULL DEFAULT 'medium',
    [Title]                 NVARCHAR(200)   NOT NULL,
    [Message]               NVARCHAR(1000)  NOT NULL,
    [VisitId]               NVARCHAR(50)    NULL,
    [VisitorName]           NVARCHAR(200)   NULL,
    [GateId]                NVARCHAR(50)    NULL,
    [Details]               NVARCHAR(MAX)   NULL,  -- JSON with additional context
    [IsRead]                BIT             NOT NULL DEFAULT 0,
    [RequiresAction]        BIT             NOT NULL DEFAULT 0,
    [ActionTakenBy]         NVARCHAR(50)    NULL,
    [ActionTakenAt]         DATETIME2(7)    NULL,
    [ActionNotes]           NVARCHAR(500)   NULL,
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [FK_SecurityAlerts_Visit] FOREIGN KEY ([VisitId]) REFERENCES [VisitRequests]([Id]),
    CONSTRAINT [FK_SecurityAlerts_Gate] FOREIGN KEY ([GateId]) REFERENCES [Gates]([Id]),
    CONSTRAINT [CK_SecurityAlerts_Type] CHECK ([Type] IN ('blacklist_match', 'expired_invite', 'unauthorized_access', 'suspicious_activity', 'overstay', 'unregistered', 'emergency', 'system')),
    CONSTRAINT [CK_SecurityAlerts_Priority] CHECK ([Priority] IN ('critical', 'high', 'medium', 'low'))
);

CREATE INDEX [IX_SecurityAlerts_IsRead] ON [SecurityAlerts]([IsRead]) WHERE [IsRead] = 0;
CREATE INDEX [IX_SecurityAlerts_CreatedAt] ON [SecurityAlerts]([CreatedAt] DESC);
CREATE INDEX [IX_SecurityAlerts_Type] ON [SecurityAlerts]([Type]);

-- =============================================
-- ReceptionAlerts Table
-- =============================================
CREATE TABLE [dbo].[ReceptionAlerts] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [Type]                  NVARCHAR(30)    NOT NULL,
    [Priority]              NVARCHAR(10)    NOT NULL DEFAULT 'medium',
    [Title]                 NVARCHAR(200)   NOT NULL,
    [Message]               NVARCHAR(1000)  NOT NULL,
    [VisitId]               NVARCHAR(50)    NULL,
    [VisitorName]           NVARCHAR(200)   NULL,
    [IsRead]                BIT             NOT NULL DEFAULT 0,
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [FK_ReceptionAlerts_Visit] FOREIGN KEY ([VisitId]) REFERENCES [VisitRequests]([Id]),
    CONSTRAINT [CK_ReceptionAlerts_Type] CHECK ([Type] IN ('visitor_arrival', 'visitor_waiting', 'visitor_overstay', 'walk_in', 'vip_arrival', 'system')),
    CONSTRAINT [CK_ReceptionAlerts_Priority] CHECK ([Priority] IN ('high', 'medium', 'low'))
);

CREATE INDEX [IX_ReceptionAlerts_IsRead] ON [ReceptionAlerts]([IsRead]) WHERE [IsRead] = 0;
CREATE INDEX [IX_ReceptionAlerts_CreatedAt] ON [ReceptionAlerts]([CreatedAt] DESC);

-- =============================================
-- Blacklist Table
-- =============================================
CREATE TABLE [dbo].[Blacklist] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [Email]                 NVARCHAR(255)   NULL,
    [Phone]                 NVARCHAR(20)    NULL,
    [IdNumber]              NVARCHAR(50)    NULL,
    [FullName]              NVARCHAR(200)   NULL,
    [Reason]                NVARCHAR(500)   NOT NULL,
    [IsActive]              BIT             NOT NULL DEFAULT 1,
    [AddedBy]               NVARCHAR(50)    NOT NULL,
    [AddedAt]               DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [RemovedBy]             NVARCHAR(50)    NULL,
    [RemovedAt]             DATETIME2(7)    NULL,
    [RemovalReason]         NVARCHAR(500)   NULL,
    
    CONSTRAINT [FK_Blacklist_AddedBy] FOREIGN KEY ([AddedBy]) REFERENCES [Users]([Id])
);

CREATE INDEX [IX_Blacklist_Email] ON [Blacklist]([Email]) WHERE [Email] IS NOT NULL AND [IsActive] = 1;
CREATE INDEX [IX_Blacklist_Phone] ON [Blacklist]([Phone]) WHERE [Phone] IS NOT NULL AND [IsActive] = 1;
CREATE INDEX [IX_Blacklist_IdNumber] ON [Blacklist]([IdNumber]) WHERE [IdNumber] IS NOT NULL AND [IsActive] = 1;

-- =============================================
-- VisitEventLog Table (Audit trail for visit lifecycle)
-- =============================================
CREATE TABLE [dbo].[VisitEventLog] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [VisitId]               NVARCHAR(50)    NOT NULL,
    [EventType]             NVARCHAR(50)    NOT NULL,
    [PreviousStatus]        NVARCHAR(30)    NULL,
    [NewStatus]             NVARCHAR(30)    NULL,
    [Description]           NVARCHAR(500)   NOT NULL,
    [PerformedBy]           NVARCHAR(50)    NULL,
    [PerformedByRole]       NVARCHAR(50)    NULL,
    [PerformedByName]       NVARCHAR(200)   NULL,
    [Metadata]              NVARCHAR(MAX)   NULL,  -- JSON additional data
    [Timestamp]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [FK_VisitEventLog_Visit] FOREIGN KEY ([VisitId]) REFERENCES [VisitRequests]([Id]),
    CONSTRAINT [CK_VisitEventLog_EventType] CHECK ([EventType] IN (
        'created', 'submitted', 'approved', 'rejected', 'visitor_invited',
        'visitor_accepted', 'visitor_rejected', 'rescheduled', 'cancelled',
        'checked_in', 'checked_out', 'completed', 'no_show', 'reminder_sent',
        'auto_cancelled', 'room_assigned', 'room_reassigned', 'parking_assigned',
        'valet_requested', 'buffet_requested', 'note_added'
    ))
);

CREATE INDEX [IX_VisitEventLog_VisitId] ON [VisitEventLog]([VisitId]);
CREATE INDEX [IX_VisitEventLog_Timestamp] ON [VisitEventLog]([Timestamp] DESC);
CREATE INDEX [IX_VisitEventLog_EventType] ON [VisitEventLog]([EventType]);

-- =============================================
-- MeetingRoomBookings Table (Bridge table for room schedules)
-- =============================================
CREATE TABLE [dbo].[MeetingRoomBookings] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [RoomId]                NVARCHAR(50)    NOT NULL,
    [VisitId]               NVARCHAR(50)    NULL,
    [BookedBy]              NVARCHAR(50)    NOT NULL,
    [BookingDate]           DATE            NOT NULL,
    [StartTime]             TIME(0)         NOT NULL,
    [EndTime]               TIME(0)         NOT NULL,
    [Status]                NVARCHAR(20)    NOT NULL DEFAULT 'confirmed',
    [Purpose]               NVARCHAR(300)   NULL,
    [Attendees]             INT             NULL,
    [CancelledAt]           DATETIME2(7)    NULL,
    [CancelledBy]           NVARCHAR(50)    NULL,
    [CancellationReason]    NVARCHAR(300)   NULL,
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [FK_MeetingRoomBookings_Room] FOREIGN KEY ([RoomId]) REFERENCES [MeetingRooms]([Id]),
    CONSTRAINT [FK_MeetingRoomBookings_Visit] FOREIGN KEY ([VisitId]) REFERENCES [VisitRequests]([Id]),
    CONSTRAINT [FK_MeetingRoomBookings_BookedBy] FOREIGN KEY ([BookedBy]) REFERENCES [Users]([Id]),
    CONSTRAINT [CK_MeetingRoomBookings_Status] CHECK ([Status] IN ('confirmed', 'cancelled', 'completed', 'no_show'))
);

CREATE INDEX [IX_MeetingRoomBookings_RoomId_Date] ON [MeetingRoomBookings]([RoomId], [BookingDate]);
CREATE INDEX [IX_MeetingRoomBookings_VisitId] ON [MeetingRoomBookings]([VisitId]) WHERE [VisitId] IS NOT NULL;

-- =============================================
-- NotificationDeliveryLog Table (Track notification delivery status)
-- =============================================
CREATE TABLE [dbo].[NotificationDeliveryLog] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [NotificationId]        NVARCHAR(50)    NOT NULL,
    [Channel]               NVARCHAR(20)    NOT NULL,
    [Recipient]             NVARCHAR(255)   NOT NULL,
    [Status]                NVARCHAR(20)    NOT NULL DEFAULT 'pending',
    [SentAt]                DATETIME2(7)    NULL,
    [DeliveredAt]           DATETIME2(7)    NULL,
    [FailedAt]              DATETIME2(7)    NULL,
    [FailureReason]         NVARCHAR(500)   NULL,
    [RetryCount]            INT             NOT NULL DEFAULT 0,
    [ExternalMessageId]     NVARCHAR(200)   NULL,  -- ID from external provider
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [FK_NotificationDeliveryLog_Notification] FOREIGN KEY ([NotificationId]) REFERENCES [Notifications]([Id]),
    CONSTRAINT [CK_NotificationDeliveryLog_Channel] CHECK ([Channel] IN ('push', 'email', 'sms', 'whatsapp')),
    CONSTRAINT [CK_NotificationDeliveryLog_Status] CHECK ([Status] IN ('pending', 'sent', 'delivered', 'failed', 'bounced'))
);

CREATE INDEX [IX_NotificationDeliveryLog_NotificationId] ON [NotificationDeliveryLog]([NotificationId]);
CREATE INDEX [IX_NotificationDeliveryLog_Status] ON [NotificationDeliveryLog]([Status]) WHERE [Status] IN ('pending', 'failed');

-- =============================================
-- ReminderQueue Table (Background job queue for reminders)
-- =============================================
CREATE TABLE [dbo].[ReminderQueue] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [VisitId]               NVARCHAR(50)    NOT NULL,
    [ReminderType]          NVARCHAR(30)    NOT NULL,
    [ScheduledFor]          DATETIME2(7)    NOT NULL,
    [Status]                NVARCHAR(20)    NOT NULL DEFAULT 'pending',
    [ProcessedAt]           DATETIME2(7)    NULL,
    [ErrorMessage]          NVARCHAR(500)   NULL,
    [RetryCount]            INT             NOT NULL DEFAULT 0,
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [FK_ReminderQueue_Visit] FOREIGN KEY ([VisitId]) REFERENCES [VisitRequests]([Id]),
    CONSTRAINT [CK_ReminderQueue_Type] CHECK ([ReminderType] IN ('first_reminder', 'second_reminder', 'auto_cancel', 'host_notification', 'visitor_reminder')),
    CONSTRAINT [CK_ReminderQueue_Status] CHECK ([Status] IN ('pending', 'processing', 'completed', 'failed', 'cancelled'))
);

CREATE INDEX [IX_ReminderQueue_ScheduledFor] ON [ReminderQueue]([ScheduledFor]) WHERE [Status] = 'pending';
CREATE INDEX [IX_ReminderQueue_VisitId] ON [ReminderQueue]([VisitId]);

-- =============================================
-- UserRoleHistory Table (Track role changes)
-- =============================================
CREATE TABLE [dbo].[UserRoleHistory] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [UserId]                NVARCHAR(50)    NOT NULL,
    [PreviousRole]          NVARCHAR(50)    NULL,
    [NewRole]               NVARCHAR(50)    NOT NULL,
    [ChangedBy]             NVARCHAR(50)    NOT NULL,
    [Reason]                NVARCHAR(300)   NULL,
    [ChangedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [FK_UserRoleHistory_User] FOREIGN KEY ([UserId]) REFERENCES [Users]([Id]),
    CONSTRAINT [FK_UserRoleHistory_ChangedBy] FOREIGN KEY ([ChangedBy]) REFERENCES [Users]([Id])
);

CREATE INDEX [IX_UserRoleHistory_UserId] ON [UserRoleHistory]([UserId]);

-- =============================================
-- VisitorHistory Table (Track repeat visitors)
-- =============================================
CREATE TABLE [dbo].[VisitorHistory] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [VisitorId]             NVARCHAR(50)    NOT NULL,
    [VisitId]               NVARCHAR(50)    NOT NULL,
    [HostId]                NVARCHAR(50)    NOT NULL,
    [VisitDate]             DATE            NOT NULL,
    [CheckedInAt]           DATETIME2(7)    NULL,
    [CheckedOutAt]          DATETIME2(7)    NULL,
    [Duration]              INT             NULL,  -- Actual duration in minutes
    [Rating]                INT             NULL,  -- 1-5 host rating
    [Notes]                 NVARCHAR(500)   NULL,
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [FK_VisitorHistory_Visitor] FOREIGN KEY ([VisitorId]) REFERENCES [Visitors]([Id]),
    CONSTRAINT [FK_VisitorHistory_Visit] FOREIGN KEY ([VisitId]) REFERENCES [VisitRequests]([Id]),
    CONSTRAINT [FK_VisitorHistory_Host] FOREIGN KEY ([HostId]) REFERENCES [Users]([Id])
);

CREATE INDEX [IX_VisitorHistory_VisitorId] ON [VisitorHistory]([VisitorId]);
CREATE INDEX [IX_VisitorHistory_HostId] ON [VisitorHistory]([HostId]);
CREATE INDEX [IX_VisitorHistory_VisitDate] ON [VisitorHistory]([VisitDate] DESC);

-- =============================================
-- BuffetTaskEscalations Table (Track escalation history)
-- =============================================
CREATE TABLE [dbo].[BuffetTaskEscalations] (
    [Id]                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    [TaskId]                NVARCHAR(50)    NOT NULL,
    [EscalationType]        NVARCHAR(30)    NOT NULL,
    [EscalatedFrom]         NVARCHAR(50)    NULL,
    [EscalatedTo]           NVARCHAR(50)    NULL,
    [Reason]                NVARCHAR(500)   NOT NULL,
    [Status]                NVARCHAR(20)    NOT NULL DEFAULT 'pending',
    [ResolvedAt]            DATETIME2(7)    NULL,
    [Resolution]            NVARCHAR(500)   NULL,
    [CreatedAt]             DATETIME2(7)    NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [FK_BuffetTaskEscalations_Task] FOREIGN KEY ([TaskId]) REFERENCES [BuffetTasks]([Id]),
    CONSTRAINT [FK_BuffetTaskEscalations_From] FOREIGN KEY ([EscalatedFrom]) REFERENCES [Users]([Id]),
    CONSTRAINT [FK_BuffetTaskEscalations_To] FOREIGN KEY ([EscalatedTo]) REFERENCES [Users]([Id]),
    CONSTRAINT [CK_BuffetTaskEscalations_Type] CHECK ([EscalationType] IN ('delay', 'shortage', 'special_request', 'complaint', 'emergency'))
);

CREATE INDEX [IX_BuffetTaskEscalations_TaskId] ON [BuffetTaskEscalations]([TaskId]);
CREATE INDEX [IX_BuffetTaskEscalations_Status] ON [BuffetTaskEscalations]([Status]) WHERE [Status] = 'pending';
```

---

### NestJS Module Structure & Implementation Patterns

This section provides NestJS-specific implementation guidance for the SKBC VMS backend.

#### Recommended Module Structure

```
src/
├── app.module.ts
├── main.ts
├── common/
│   ├── decorators/
│   │   ├── roles.decorator.ts
│   │   ├── current-user.decorator.ts
│   │   └── api-paginated-response.decorator.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── interceptors/
│   │   ├── transform.interceptor.ts
│   │   └── logging.interceptor.ts
│   ├── pipes/
│   │   └── validation.pipe.ts
│   ├── dto/
│   │   ├── pagination.dto.ts
│   │   └── api-response.dto.ts
│   └── types/
│       ├── user-role.enum.ts
│       └── request-status.enum.ts
│
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── azure-ad.strategy.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       ├── refresh-token.dto.ts
│   │       └── change-password.dto.ts
│   │
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   └── dto/
│   │       ├── create-user.dto.ts
│   │       ├── update-user.dto.ts
│   │       └── user-response.dto.ts
│   │
│   ├── visits/
│   │   ├── visits.module.ts
│   │   ├── visits.controller.ts
│   │   ├── visits.service.ts
│   │   ├── entities/
│   │   │   ├── visit-request.entity.ts
│   │   │   └── visitor.entity.ts
│   │   └── dto/
│   │       ├── create-visit.dto.ts
│   │       ├── update-visit.dto.ts
│   │       └── reschedule-visit.dto.ts
│   │
│   ├── approvals/
│   │   ├── approvals.module.ts
│   │   ├── approvals.controller.ts
│   │   ├── approvals.service.ts
│   │   └── dto/
│   │       ├── approve-request.dto.ts
│   │       └── reject-request.dto.ts
│   │
│   ├── reception/
│   │   ├── reception.module.ts
│   │   ├── reception.controller.ts
│   │   ├── reception.service.ts
│   │   └── dto/
│   │       ├── walk-in-registration.dto.ts
│   │       └── check-in.dto.ts
│   │
│   ├── security/
│   │   ├── security.module.ts
│   │   ├── security.controller.ts
│   │   ├── security.service.ts
│   │   ├── entities/
│   │   │   ├── gate.entity.ts
│   │   │   ├── gate-event.entity.ts
│   │   │   └── security-alert.entity.ts
│   │   └── dto/
│   │       ├── qr-scan.dto.ts
│   │       └── gate-check-in.dto.ts
│   │
│   ├── meeting-rooms/
│   │   ├── meeting-rooms.module.ts
│   │   ├── meeting-rooms.controller.ts
│   │   ├── meeting-rooms.service.ts
│   │   └── entities/
│   │       └── meeting-room.entity.ts
│   │
│   ├── parking/
│   │   ├── parking.module.ts
│   │   ├── parking.controller.ts
│   │   ├── parking.service.ts
│   │   └── entities/
│   │       ├── parking-spot.entity.ts
│   │       └── parking-assignment.entity.ts
│   │
│   ├── valet/
│   │   ├── valet.module.ts
│   │   ├── valet-admin.controller.ts
│   │   ├── valet-driver.controller.ts
│   │   ├── valet-self-service.controller.ts
│   │   ├── valet.service.ts
│   │   └── entities/
│   │       ├── valet-task.entity.ts
│   │       └── valet-zone.entity.ts
│   │
│   ├── buffet/
│   │   ├── buffet.module.ts
│   │   ├── buffet-admin.controller.ts
│   │   ├── buffet-staff.controller.ts
│   │   ├── buffet.service.ts
│   │   └── entities/
│   │       ├── buffet-task.entity.ts
│   │       └── buffet-location.entity.ts
│   │
│   ├── notifications/
│   │   ├── notifications.module.ts
│   │   ├── notifications.controller.ts
│   │   ├── notifications.service.ts
│   │   ├── notification-sender.service.ts
│   │   └── entities/
│   │       ├── notification.entity.ts
│   │       └── notification-preferences.entity.ts
│   │
│   ├── invites/
│   │   ├── invites.module.ts
│   │   ├── invites.controller.ts
│   │   └── invites.service.ts
│   │
│   └── admin/
│       ├── admin.module.ts
│       ├── admin.controller.ts
│       ├── admin.service.ts
│       ├── analytics.controller.ts
│       └── analytics.service.ts
│
└── database/
    ├── database.module.ts
    └── migrations/
```

#### Core DTOs with Class-Validator

```typescript
// src/common/dto/pagination.dto.ts
import { IsInt, Min, Max, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class PaginatedResponseDto<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// src/common/dto/api-response.dto.ts
export class ApiErrorDto {
  code: string;
  message: string;
  details?: { field: string; message: string }[];
}

export class ApiErrorResponseDto {
  error: ApiErrorDto;
}
```

```typescript
// src/modules/visits/dto/create-visit.dto.ts
import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  IsEnum,
  IsArray,
  ValidateNested,
  Length,
  Matches,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VisitorInfoDto {
  @IsString()
  @Length(2, 200)
  fullName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s-]{10,20}$/)
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  company?: string;

  @IsOptional()
  @IsEnum(['national_id', 'passport', 'driver_license', 'iqama', 'other'])
  idType?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  idNumber?: string;
}

export class BuffetOptionsDto {
  @IsOptional()
  @IsEnum(['breakfast', 'lunch', 'dinner', 'snacks', 'beverages', 'custom'])
  mealType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  guestCount?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryRequirements?: string[];

  @IsOptional()
  @IsString()
  @Length(0, 500)
  specialInstructions?: string;
}

export class CreateVisitDto {
  @ValidateNested()
  @Type(() => VisitorInfoDto)
  visitor: VisitorInfoDto;

  @IsDateString()
  visitDate: string;

  @IsString()
  @Matches(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i)
  visitTime: string;

  @IsInt()
  @Min(15)
  @Max(480)
  duration: number;

  @IsString()
  @Length(3, 500)
  purpose: string;

  @IsOptional()
  @IsString()
  meetingRoomId?: string;

  @IsOptional()
  @IsEnum(['auto', 'none', 'valet'])
  parkingType?: string = 'auto';

  @IsOptional()
  @IsArray()
  @IsEnum(['email', 'whatsapp', 'sms', 'qr'], { each: true })
  communicationChannels?: string[] = ['email', 'whatsapp', 'qr'];

  @IsOptional()
  @ValidateNested()
  @Type(() => BuffetOptionsDto)
  buffet?: BuffetOptionsDto;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}
```

#### Role-Based Access Control Implementation

```typescript
// src/common/types/user-role.enum.ts
export enum UserRole {
  EMPLOYEE = 'employee',
  MANAGER = 'manager',
  RECEPTIONIST = 'receptionist',
  SECURITY = 'security',
  BUILDING_ADMIN = 'building_admin',
  BUFFET_ADMIN = 'buffet_admin',
  BUFFET_STAFF = 'buffet_staff',
  VALET_ADMIN = 'valet_admin',
  VALET_DRIVER = 'valet_driver',
}

// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../types/user-role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../types/user-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasRole = requiredRoles.some((role) => user.role === role);
    
    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}

// src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    return data ? user?.[data] : user;
  },
);
```

#### Example Controller with Role Guards

```typescript
// src/modules/approvals/approvals.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/types/user-role.enum';
import { ApprovalsService } from './approvals.service';
import { ApproveRequestDto } from './dto/approve-request.dto';
import { RejectRequestDto } from './dto/reject-request.dto';
import { BulkApprovalDto } from './dto/bulk-approval.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('api/v1/approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get('pending')
  @Roles(UserRole.MANAGER, UserRole.BUILDING_ADMIN)
  async getPendingApprovals(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Query() pagination: PaginationDto,
  ) {
    return this.approvalsService.getPendingApprovals(userId, role, pagination);
  }

  @Post(':id/approve')
  @Roles(UserRole.MANAGER, UserRole.BUILDING_ADMIN)
  @HttpCode(HttpStatus.OK)
  async approveRequest(
    @Param('id') requestId: string,
    @CurrentUser('id') approverId: string,
    @Body() dto: ApproveRequestDto,
  ) {
    return this.approvalsService.approve(requestId, approverId, dto);
  }

  @Post(':id/reject')
  @Roles(UserRole.MANAGER, UserRole.BUILDING_ADMIN)
  @HttpCode(HttpStatus.OK)
  async rejectRequest(
    @Param('id') requestId: string,
    @CurrentUser('id') approverId: string,
    @Body() dto: RejectRequestDto,
  ) {
    return this.approvalsService.reject(requestId, approverId, dto);
  }

  @Post('bulk')
  @Roles(UserRole.MANAGER, UserRole.BUILDING_ADMIN)
  @HttpCode(HttpStatus.OK)
  async bulkApproval(
    @CurrentUser('id') approverId: string,
    @Body() dto: BulkApprovalDto,
  ) {
    return this.approvalsService.bulkProcess(approverId, dto);
  }

  @Get('history')
  @Roles(UserRole.MANAGER, UserRole.BUILDING_ADMIN)
  async getApprovalHistory(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.approvalsService.getHistory(userId, pagination);
  }

  @Get('stats')
  @Roles(UserRole.MANAGER, UserRole.BUILDING_ADMIN)
  async getApprovalStats(@CurrentUser('id') userId: string) {
    return this.approvalsService.getStats(userId);
  }
}
```

#### Azure AD SSO Integration

```typescript
// src/modules/auth/strategies/azure-ad.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { BearerStrategy } from 'passport-azure-ad';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class AzureAdStrategy extends PassportStrategy(BearerStrategy, 'azure-ad') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      identityMetadata: `https://login.microsoftonline.com/${configService.get('AZURE_TENANT_ID')}/v2.0/.well-known/openid-configuration`,
      clientID: configService.get('AZURE_CLIENT_ID'),
      validateIssuer: true,
      issuer: `https://sts.windows.net/${configService.get('AZURE_TENANT_ID')}/`,
      passReqToCallback: false,
      loggingLevel: 'warn',
    });
  }

  async validate(payload: any) {
    // payload contains Azure AD claims
    const {
      oid: azureObjectId,
      preferred_username: email,
      name,
      roles: adRoles,
    } = payload;

    // Find or create user based on Azure AD data
    let user = await this.usersService.findByAzureObjectId(azureObjectId);

    if (!user) {
      // Auto-provision user from Azure AD
      user = await this.usersService.createFromAzureAd({
        azureAdObjectId: azureObjectId,
        email,
        name,
        role: this.mapAzureRoleToVmsRole(adRoles),
        source: 'microsoft_ad',
      });
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('User account is not active');
    }

    return user;
  }

  private mapAzureRoleToVmsRole(adRoles: string[] = []): string {
    // Map Azure AD group/role names to VMS roles
    const roleMapping: Record<string, string> = {
      'VMS.Manager': 'manager',
      'VMS.BuildingAdmin': 'building_admin',
      'VMS.Receptionist': 'receptionist',
      'VMS.Security': 'security',
      'VMS.BuffetAdmin': 'buffet_admin',
      'VMS.BuffetStaff': 'buffet_staff',
      'VMS.ValetAdmin': 'valet_admin',
      'VMS.ValetDriver': 'valet_driver',
    };

    for (const adRole of adRoles) {
      if (roleMapping[adRole]) {
        return roleMapping[adRole];
      }
    }

    return 'employee'; // Default role
  }
}
```

#### Background Jobs & Scheduled Tasks

The VMS system requires several background jobs for automated processing. Use `@nestjs/schedule` for cron-based jobs.

```typescript
// src/modules/schedulers/scheduler.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ReminderScheduler } from './reminder.scheduler';
import { NotificationCleanupScheduler } from './notification-cleanup.scheduler';
import { ReportGeneratorScheduler } from './report-generator.scheduler';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    ReminderScheduler,
    NotificationCleanupScheduler,
    ReportGeneratorScheduler,
  ],
})
export class SchedulerModule {}

// src/modules/schedulers/reminder.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { ReminderQueue } from './entities/reminder-queue.entity';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class ReminderScheduler {
  private readonly logger = new Logger(ReminderScheduler.name);

  constructor(
    @InjectRepository(ReminderQueue)
    private reminderQueueRepo: Repository<ReminderQueue>,
    private notificationService: NotificationService,
  ) {}

  // Run every minute during office hours
  @Cron('*/1 9-18 * * 0-4', { timeZone: 'Asia/Riyadh' })  // Sun-Thu, 9AM-6PM
  async processReminderQueue() {
    const now = new Date();
    const pendingReminders = await this.reminderQueueRepo.find({
      where: {
        status: 'pending',
        scheduledFor: LessThanOrEqual(now),
      },
      take: 50,
      order: { scheduledFor: 'ASC' },
    });

    for (const reminder of pendingReminders) {
      try {
        reminder.status = 'processing';
        await this.reminderQueueRepo.save(reminder);

        await this.processReminder(reminder);

        reminder.status = 'completed';
        reminder.processedAt = new Date();
      } catch (error) {
        reminder.status = 'failed';
        reminder.errorMessage = error.message;
        reminder.retryCount += 1;
        
        // Retry up to 3 times
        if (reminder.retryCount < 3) {
          reminder.status = 'pending';
          reminder.scheduledFor = new Date(Date.now() + 5 * 60 * 1000); // 5 min delay
        }
      }
      await this.reminderQueueRepo.save(reminder);
    }
  }

  private async processReminder(reminder: ReminderQueue) {
    switch (reminder.reminderType) {
      case 'first_reminder':
        await this.notificationService.sendVisitorReminder(reminder.visitId, 'first');
        break;
      case 'second_reminder':
        await this.notificationService.sendVisitorReminder(reminder.visitId, 'second');
        break;
      case 'auto_cancel':
        await this.notificationService.autoCancelVisit(reminder.visitId);
        break;
      case 'host_notification':
        await this.notificationService.notifyHostOfArrival(reminder.visitId);
        break;
    }
  }

  // Daily cleanup at 11PM
  @Cron('0 23 * * *', { timeZone: 'Asia/Riyadh' })
  async cleanupOldReminders() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await this.reminderQueueRepo.delete({
      status: 'completed',
      processedAt: LessThanOrEqual(thirtyDaysAgo),
    });
  }
}

// src/modules/schedulers/report-generator.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ScheduledReportsService } from '../admin/scheduled-reports.service';

@Injectable()
export class ReportGeneratorScheduler {
  private readonly logger = new Logger(ReportGeneratorScheduler.name);

  constructor(private scheduledReportsService: ScheduledReportsService) {}

  // Check every hour for scheduled reports
  @Cron('0 * * * *', { timeZone: 'Asia/Riyadh' })
  async processScheduledReports() {
    const dueReports = await this.scheduledReportsService.getDueReports();
    
    for (const report of dueReports) {
      try {
        await this.scheduledReportsService.generateAndSendReport(report);
      } catch (error) {
        this.logger.error(`Failed to generate report ${report.id}: ${error.message}`);
      }
    }
  }
}
```

#### Public Endpoints (No Authentication)

For external visitor invitation endpoints that don't require authentication:

```typescript
// src/modules/invites/invites.controller.ts
import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { InvitesService } from './invites.service';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { RejectInviteDto } from './dto/reject-invite.dto';

@Controller('api/v1/invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Public()  // Skip JWT authentication
  @Get(':token')
  async getInvitation(@Param('token') token: string) {
    return this.invitesService.getByToken(token);
  }

  @Public()
  @Post(':token/accept')
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(
    @Param('token') token: string,
    @Body() dto: AcceptInviteDto,
  ) {
    return this.invitesService.accept(token, dto);
  }

  @Public()
  @Post(':token/reject')
  @HttpCode(HttpStatus.OK)
  async rejectInvitation(
    @Param('token') token: string,
    @Body() dto: RejectInviteDto,
  ) {
    return this.invitesService.reject(token, dto);
  }
}

// src/common/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Update JWT guard to skip public routes
// src/common/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
```

---

## Role-Specific Workflow Documentation

This section provides detailed workflow sequences for each user role, including the exact API calls required for each operation.

### Employee Role Workflows

#### Complete Visitor Request Creation Flow

```
1. Employee Login
   POST /auth/login → Get JWT tokens
   
2. Get Available Resources (Parallel calls)
   GET /users/managers → For approval routing
   GET /meeting-rooms?status=active → Available rooms
   GET /meeting-rooms/:id/availability?date=YYYY-MM-DD → Check room availability
   
3. Create Visit Request
   POST /visits
   {
     "visitor": {
       "fullName": "John Smith",
       "email": "john.smith@company.com",
       "phone": "+966-50-123-4567",
       "company": "Tech Solutions Ltd"
     },
     "visitDate": "2025-12-10",
     "visitTime": "10:00 AM",
     "duration": 120,
     "purpose": "Business Meeting",
     "meetingRoomId": "room_001",
     "parkingType": "auto",
     "communicationChannels": ["email", "whatsapp", "qr"],
     "buffet": {
       "mealType": "lunch",
       "guestCount": 4,
       "dietaryRequirements": ["Vegetarian"],
       "specialInstructions": "Prefer Saudi cuisine"
     },
     "notes": "VIP client - handle with care"
   }
   
   Response: Visit with status "pending_approval" (if employee)
             Visit with status "approved" (if manager creating for self)

4. Track Request Status
   GET /visits/:id → Monitor status changes
   
5. View My Requests
   GET /visits?hostId=<userId>&page=1&limit=20
   
6. Cancel Request (if needed before visitor accepts)
   POST /visits/:id/cancel
   { "reason": "Meeting rescheduled" }
   
7. Reschedule Request
   POST /visits/:id/reschedule
   {
     "newDate": "2025-12-12",
     "newTime": "2:00 PM",
     "reason": "Client requested date change"
   }
```

#### Employee Self-Valet Request Flow

```
1. Create Valet Request
   POST /valet/self-service
   {
     "vehicleInfo": {
       "make": "Toyota",
       "model": "Camry",
       "color": "Silver",
       "plateNumber": "ABC 1234"
     },
     "dropOffLocation": "SKBC Main Entrance",
     "requestedReturnTime": "5:00 PM",
     "notes": "Please park in covered area"
   }

2. Track Valet Status
   GET /valet/self-service/:id
   
3. View All My Valet Requests
   GET /valet/self-service?status=in_progress

4. Cancel Valet Request
   POST /valet/self-service/:id/cancel
```

#### Employee APIs Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | Login with credentials |
| `/auth/azure/login` | POST | Login with Azure AD SSO |
| `/auth/me` | GET | Get current user profile |
| `/auth/change-password` | POST | Change password |
| `/users/me` | GET/PUT | View/update profile |
| `/users/me/photo` | POST/DELETE | Upload/remove photo |
| `/users/me/notification-preferences` | GET/PUT | Manage notification settings |
| `/users/managers` | GET | List available managers |
| `/visits` | GET | List own visit requests |
| `/visits` | POST | Create visit request |
| `/visits/:id` | GET/PUT/DELETE | Manage own visit |
| `/visits/:id/cancel` | POST | Cancel visit |
| `/visits/:id/reschedule` | POST | Reschedule visit |
| `/visits/:id/resend-invite` | POST | Resend invite to visitor |
| `/meeting-rooms` | GET | List available rooms |
| `/meeting-rooms/:id/availability` | GET | Check room availability |
| `/valet/self-service` | GET/POST | Manage own valet requests |
| `/notifications` | GET | View notifications |
| `/notifications/:id/read` | PATCH | Mark notification read |

---

### Manager Role Workflows

#### Approval Workflow

```
1. Check Pending Approvals
   GET /approvals/pending?page=1&limit=20
   
   Response:
   {
     "data": [
       {
         "id": "REQ_001",
         "employee": { "id": "user_002", "name": "Sarah Johnson" },
         "visitor": { "fullName": "John Smith", "company": "Tech Ltd" },
         "visitDate": "2025-12-10",
         "visitTime": "10:00 AM",
         "purpose": "Business Meeting",
         "submittedAt": "2025-12-03T09:00:00Z",
         "urgency": "normal"
       }
     ],
     "pagination": { "totalItems": 5 }
   }

2. View Request Details
   GET /visits/:id
   
3. Approve Request
   POST /approvals/:id/approve
   {
     "notes": "Approved - please ensure visitor has parking pass"
   }
   
   → System auto-sends invite to visitor via configured channels
   → System allocates parking if "auto" selected
   → Notifications sent to employee, receptionist

4. Reject Request
   POST /approvals/:id/reject
   {
     "reason": "Visitor's company is on our internal review list"
   }

5. Bulk Approval (Multiple requests)
   POST /approvals/bulk
   {
     "action": "approve",
     "requestIds": ["REQ_001", "REQ_002", "REQ_003"],
     "notes": "Batch approved for Q4 planning meetings"
   }
   
   Response:
   {
     "processed": 3,
     "successful": 3,
     "failed": 0,
     "results": [
       { "requestId": "REQ_001", "status": "approved" },
       { "requestId": "REQ_002", "status": "approved" },
       { "requestId": "REQ_003", "status": "approved" }
     ]
   }

6. View Approval History
   GET /approvals/history?startDate=2025-12-01&endDate=2025-12-08

7. View Statistics
   GET /approvals/stats
   
   Response:
   {
     "pending": 5,
     "approvedToday": 12,
     "rejectedToday": 2,
     "averageResponseTime": 45,  // minutes
     "weeklyTrend": [...]
   }
```

#### Manager APIs Summary (includes all Employee APIs plus)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/approvals/pending` | GET | Get pending approval requests |
| `/approvals/:id/approve` | POST | Approve a request |
| `/approvals/:id/reject` | POST | Reject a request |
| `/approvals/bulk` | POST | Bulk approve/reject |
| `/approvals/history` | GET | View approval history |
| `/approvals/stats` | GET | Approval statistics |
| `/users/employees` | GET | List subordinate employees |

---

### Receptionist Role Workflows

#### Daily Operations Dashboard

```
1. Get Today's Summary
   GET /reception/summary
   
   Response:
   {
     "total": 25,
     "pending": 8,
     "checkedIn": 12,
     "checkedOut": 3,
     "noShow": 2
   }

2. Get Today's Visitors (with filters)
   GET /reception/today?status=checked_in&sortBy=scheduledTime

3. Get Real-time Alerts
   GET /reception/alerts?unreadOnly=true
   
   Response:
   {
     "data": [
       {
         "id": "alert_001",
         "type": "visitor_arrival",
         "title": "Visitor Arrived",
         "message": "John Smith from Tech Ltd has arrived at reception",
         "visitId": "REQ_001",
         "priority": "medium",
         "createdAt": "2025-12-03T09:55:00Z"
       }
     ]
   }

4. Mark Alert as Read
   PATCH /reception/alerts/:id/read
```

#### Walk-in Registration Flow

```
1. Check if Visitor is Blacklisted
   POST /security/blacklist/check
   { "email": "visitor@company.com", "phone": "+966-50-123-4567" }

2. Register Walk-in Visitor
   POST /reception/walk-in
   {
     "visitorFirstName": "James",
     "visitorLastName": "Wilson",
     "visitorEmail": "james.wilson@company.com",
     "visitorPhone": "+966-50-234-5678",
     "visitorCompany": "Global Corp",
     "visitorIdType": "passport",
     "visitorIdNumber": "AB123456",
     "hostId": "user_002",
     "purpose": "Emergency meeting",
     "expectedDuration": 60,
     "meetingRoomId": "room_002",
     "notes": "Referred by CEO"
   }
   
   Response:
   {
     "id": "REQ_WALKIN_001",
     "status": "pending_approval",  // Needs manager approval
     "visitor": {...},
     "qrCode": "QR_WALKIN_001",
     "message": "Walk-in registered. Manager approval required."
   }

3. Notify Host
   POST /reception/:visitId/notify-host
   {
     "channel": "whatsapp",
     "message": "Your visitor James Wilson has arrived at reception."
   }
```

#### Check-in/Check-out Flow

```
1. Check In Visitor
   POST /visits/:id/check-in
   {
     "notes": "Visitor arrived 5 mins early. ID verified.",
     "gateId": "gate_main"
   }
   
   Response:
   {
     "id": "REQ_001",
     "status": "checked_in",
     "checkedInAt": "2025-12-03T09:58:00Z",
     "visitor": {
       "fullName": "John Smith",
       "qrCode": "QR_REQ_001"
     },
     "meetingRoom": {
       "name": "Majlis Al-Shura",
       "floor": "3rd Floor"
     }
   }

2. Check Out Visitor
   POST /visits/:id/check-out
   {
     "notes": "Visitor departed. Meeting concluded successfully."
   }
```

#### Room Management

```
1. Get Today's Room Operations
   GET /meeting-rooms/operations/today
   
2. Get Room Status
   GET /reception/rooms
   
3. Assign Different Room to Visit
   POST /visits/:id/assign-room
   {
     "roomId": "room_002",
     "reason": "Original room is under maintenance"
   }
```

#### Receptionist APIs Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/reception/today` | GET | Today's visitor list |
| `/reception/summary` | GET | Daily summary stats |
| `/reception/alerts` | GET | Real-time alerts |
| `/reception/alerts/:id/read` | PATCH | Mark alert read |
| `/reception/search` | GET | Search visitors |
| `/reception/walk-in` | POST | Register walk-in |
| `/reception/rooms` | GET | Room status |
| `/reception/:id/notify-host` | POST | Notify host of arrival |
| `/visits/:id/check-in` | POST | Check in visitor |
| `/visits/:id/check-out` | POST | Check out visitor |
| `/visits/:id/assign-room` | POST | Reassign meeting room |
| `/meeting-rooms/operations/today` | GET | Room operations dashboard |

---

### Security Role Workflows

#### Gate Check-in/out via QR Scan

```
1. Scan QR Code
   POST /security/qr/scan
   { "qrCode": "QR_REQ_001_visitor" }
   
   Response (Valid):
   {
     "valid": true,
     "visitId": "REQ_001",
     "visitor": {
       "id": "vis_001",
       "visitorName": "John Smith",
       "visitorCompany": "Tech Ltd",
       "hostName": "Sarah Johnson",
       "hostDepartment": "Marketing",
       "purpose": "Business Meeting",
       "scheduledTime": "10:00 AM",
       "status": "visitor_accepted",
       "isBlacklisted": false,
       "parkingAssigned": true,
       "parkingSpot": "B1-005"
     },
     "canCheckIn": true,
     "canCheckOut": false,
     "message": "Valid visitor. Ready for check-in."
   }
   
   Response (Invalid/Expired):
   {
     "valid": false,
     "message": "QR code has expired or is invalid",
     "canCheckIn": false,
     "warnings": ["QR code expired 2 hours ago"]
   }

2. Process Check-in at Gate
   POST /security/gate/check-in
   {
     "qrCode": "QR_REQ_001_visitor",
     "gateId": "gate_main_entrance",
     "notes": "ID verified - Saudi National ID"
   }
   
   Response:
   {
     "id": "REQ_001",
     "visitor": {
       "fullName": "John Smith",
       "company": "Tech Ltd"
     },
     "status": "checked_in",
     "checkedInAt": "2025-12-03T09:58:00Z",
     "gateEvent": {
       "id": "gate_event_001",
       "gateId": "gate_main_entrance",
       "gateName": "Main Entrance",
       "action": "check_in",
       "result": "allowed"
     },
     "accessInfo": {
       "meetingRoom": "Majlis Al-Shura, 3rd Floor",
       "parkingSpot": "B1-005",
       "expectedDuration": "2 hours"
     }
   }

3. Process Check-out at Gate
   POST /security/gate/check-out
   {
     "qrCode": "QR_REQ_001_visitor",
     "gateId": "gate_main_entrance",
     "notes": "Departed on schedule"
   }
```

#### Security Dashboard

```
1. Get Today's Security Summary
   GET /security/today/summary
   
   Response:
   {
     "date": "2025-12-03",
     "summary": {
       "expected": 25,
       "checkedIn": 18,
       "currentlyOnSite": 12,
       "checkedOut": 6,
       "noShow": 2,
       "denied": 1
     },
     "byGate": [
       { "gateId": "gate_main", "gateName": "Main Entrance", "checkIns": 15 },
       { "gateId": "gate_parking", "gateName": "Parking Gate", "checkIns": 3 }
     ]
   }

2. Get Today's Visitors
   GET /security/today?status=on_site

3. Get Security Alerts
   GET /security/alerts?unreadOnly=true
   
   Response:
   {
     "data": [
       {
         "id": "sec_alert_001",
         "type": "access_denied",
         "title": "Access Denied",
         "message": "Invalid QR code at Main Entrance",
         "priority": "high",
         "requiresAction": true,
         "details": {
           "scannedCode": "QR_INVALID",
           "claimedVisitorName": "Unknown Person"
         }
       },
       {
         "id": "sec_alert_002",
         "type": "overstay",
         "title": "Visitor Overstay",
         "message": "John Smith exceeded visit by 2 hours",
         "visitId": "REQ_015",
         "priority": "medium"
       }
     ]
   }

4. View Gate Events Log
   GET /security/gate-events?gateId=gate_main&startTime=2025-12-03T00:00:00Z
```

#### Blacklist Check

```
1. Check if Person is Blacklisted
   POST /security/blacklist/check
   {
     "email": "suspect@company.com",
     "phone": "+966-50-999-9999",
     "idNumber": "1234567890"
   }
   
   Response:
   {
     "isBlacklisted": true,
     "matchedRecords": [
       {
         "id": "bl_001",
         "reason": "Previous security incident - July 2024",
         "addedAt": "2024-07-15T10:00:00Z",
         "addedBy": "user_admin"
       }
     ]
   }
```

#### Security APIs Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/security/today` | GET | Today's visitor list |
| `/security/today/summary` | GET | Security summary stats |
| `/security/alerts` | GET | Security alerts |
| `/security/alerts/:id/read` | PATCH | Mark alert read |
| `/security/qr/scan` | POST | Validate QR code |
| `/security/gate/check-in` | POST | Gate check-in |
| `/security/gate/check-out` | POST | Gate check-out |
| `/security/gate-events` | GET | Gate event log |
| `/security/blacklist/check` | POST | Check blacklist |
| `/security/blacklist` | GET | View blacklist |

---

### Building Admin Role Workflows

#### User Management

```
1. List All Users (with filters)
   GET /users?role=employee&status=active&department=IT&page=1&limit=50
   
2. Create New User
   POST /users
   {
     "email": "new.user@skbc.com",
     "name": "New User",
     "role": "employee",
     "department": "IT",
     "phoneNumber": "+966-50-123-4567",
     "managerId": "user_001",
     "autoApproval": false
   }

3. Update User Role
   PATCH /users/:id/status
   {
     "status": "active",
     "role": "manager"
   }

4. Bulk Operations
   PATCH /users/bulk-status
   {
     "userIds": ["user_001", "user_002", "user_003"],
     "status": "inactive",
     "reason": "Department restructuring"
   }
```

#### Parking Configuration

```
1. Get Parking Overview
   GET /parking/spots?location=skbc_basement&status=available
   GET /parking/utilization
   GET /parking/config

2. Create Parking Spot
   POST /parking/spots
   {
     "spotNumber": "B3-001",
     "location": "skbc_basement",
     "level": "B3",
     "type": "visitor",
     "isActive": true
   }

3. Configure Priority Rules
   PUT /parking/priority-rules
   {
     "orderedRuleIds": ["pr_001", "pr_002", "pr_003"]
   }

4. Assign Parking to Employee
   POST /parking/employees/:userId/assign
   {
     "spotId": "spot_001",
     "permanent": true,
     "effectiveDate": "2025-12-05",
     "notes": "Manager priority parking"
   }

5. Bulk Parking Assignment
   POST /parking/employees/bulk-assign
   {
     "assignments": [
       { "employeeId": "user_001", "spotId": "spot_001" },
       { "employeeId": "user_002", "spotId": "spot_002" }
     ],
     "effectiveDate": "2025-12-05",
     "permanent": true
   }
```

#### Meeting Room Management

```
1. Create Meeting Room
   POST /meeting-rooms
   {
     "name": "Innovation Lab",
     "floor": "5th Floor",
     "building": "SKBC Tower",
     "capacity": 8,
     "features": ["projector", "whiteboard", "tv_display"],
     "status": "active",
     "bookingRules": {
       "minDuration": 30,
       "maxDuration": 480,
       "advanceBookingDays": 30
     }
   }

2. Set Room Maintenance
   PATCH /meeting-rooms/:id/status
   {
     "status": "maintenance",
     "reason": "AV equipment repair",
     "estimatedAvailableDate": "2025-12-10"
   }
```

#### System Settings & Integrations

```
1. Get System Settings
   GET /admin/settings

2. Update Settings
   PUT /admin/settings
   {
     "general": { "defaultLanguage": "ar" },
     "reminderRules": { "autoCancelMinutes": 360 }
   }

3. Check Integration Status
   GET /admin/integrations

4. Test Integration
   POST /admin/integrations/:id/test
```

#### Analytics & Reporting

```
1. Get Analytics Summary
   GET /admin/analytics/summary?period=week

2. Export Report
   GET /admin/analytics/export?format=xlsx&reportType=visits&startDate=2025-12-01&endDate=2025-12-08

3. Check Export Status
   GET /admin/analytics/export/:exportId

4. Schedule Recurring Report
   POST /admin/analytics/schedule
   {
     "reportType": "comprehensive",
     "format": "pdf",
     "frequency": "weekly",
     "dayOfWeek": 0,
     "time": "08:00",
     "recipients": ["admin@skbc.com"],
     "includeCharts": true
   }
```

---

### Valet Admin Role Workflows

```
1. View All Valet Tasks
   GET /valet-admin/tasks?status=pending&unassigned=true

2. View Driver Availability
   GET /valet-admin/drivers?status=available

3. Check Driver Load Distribution
   GET /valet-admin/drivers/load
   
   Response:
   {
     "drivers": [
       { "id": "driver_001", "name": "Mohammed", "tasksToday": 4, "loadLevel": "medium" },
       { "id": "driver_002", "name": "Ahmed", "tasksToday": 6, "loadLevel": "high" }
     ],
     "fairnessMetrics": {
       "averageTasksPerDriver": 5.2,
       "mostLoaded": "driver_002",
       "leastLoaded": "driver_005"
     }
   }

4. Assign Driver to Task
   POST /valet-admin/tasks/:id/assign
   {
     "driverId": "driver_001",
     "priority": "high",
     "notes": "VIP guest"
   }

5. View Valet Zones
   GET /valet-admin/zones
```

---

### Valet Driver Role Workflows

```
1. View My Assigned Tasks
   GET /valet-driver/my-tasks?status=assigned

2. Accept/Reject Task
   PATCH /valet-driver/tasks/:id/status
   { "status": "accepted", "notes": "On my way" }
   
   OR
   
   { "status": "rejected", "rejectionReason": "vehicle_issue" }

3. Start Task (picking up vehicle)
   PATCH /valet-driver/tasks/:id/status
   { "status": "in_progress", "notes": "Picked up vehicle" }

4. Complete Task (vehicle parked)
   PATCH /valet-driver/tasks/:id/status
   {
     "status": "completed",
     "parkingLocation": "B1-025",
     "notes": "Vehicle parked safely"
   }
```

---

### Buffet Admin Role Workflows

```
1. View All Buffet Tasks
   GET /buffet-admin/tasks?status=pending&date=2025-12-03

2. View Staff Availability
   GET /buffet-admin/staff

3. Get Load Summary
   GET /buffet-admin/load-summary
   
   Response:
   {
     "locations": [
       { "locationName": "Executive Dining", "tasksToday": 5, "pendingTasks": 2 }
     ],
     "staff": [
       { "staffName": "Chef Mohammed", "assignedTasks": 3, "completedToday": 1 }
     ]
   }

4. Assign Staff to Task
   POST /buffet-admin/tasks/:id/assign
   {
     "staffId": "staff_001",
     "priority": "high",
     "instructions": "Prepare halal options only"
   }

5. Override Task Status
   PATCH /buffet-admin/tasks/:id/status
   {
     "status": "completed",
     "notes": "Completed by admin override"
   }
```

---

### Buffet Staff Role Workflows

#### Standard Task Processing Flow

```
1. View My Tasks
   GET /buffet-staff/my-tasks?status=pending

2. Update Task Status
   PATCH /buffet-staff/tasks/:id/status
   {
     "status": "preparing",
     "notes": "Started preparation",
     "estimatedReadyTime": "11:30 AM"
   }

3. Mark as Ready
   PATCH /buffet-staff/tasks/:id/status
   { "status": "ready" }

4. Mark as Served
   PATCH /buffet-staff/tasks/:id/status
   { "status": "served" }

5. Complete Task
   PATCH /buffet-staff/tasks/:id/status
   { "status": "completed", "notes": "All guests served" }
```

#### Escalation Flow (When Issues Arise)

```
1. Staff Identifies Issue (shortage, delay, special request)
   POST /buffet-staff/tasks/:id/escalate
   {
     "escalationType": "shortage",  // delay, shortage, special_request, complaint, emergency
     "reason": "Missing vegetarian options - need more supplies",
     "urgency": "high"
   }
   
   Response:
   {
     "escalationId": "esc_001",
     "taskId": "task_001",
     "status": "pending",
     "message": "Escalation sent to Buffet Admin. You will be notified of the resolution."
   }

2. Buffet Admin Receives Alert
   → GET /buffet-admin/escalations?status=pending
   
   Response:
   {
     "data": [
       {
         "id": "esc_001",
         "taskId": "task_001",
         "escalationType": "shortage",
         "reason": "Missing vegetarian options",
         "escalatedBy": "staff_001",
         "escalatedByName": "Mohammed",
         "urgency": "high",
         "createdAt": "2025-12-03T11:15:00Z"
       }
     ]
   }

3. Buffet Admin Resolves Escalation
   PATCH /buffet-admin/escalations/:id/resolve
   {
     "resolution": "Additional supplies dispatched. ETA 15 minutes.",
     "reassignToStaffId": null  // Optional: reassign to different staff
   }
   
   → Notification sent back to original staff member

4. Staff Continues with Task
   → Receives notification of resolution
   → Continues normal task flow
```

#### Buffet Staff APIs Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/buffet-staff/my-tasks` | GET | View assigned tasks |
| `/buffet-staff/tasks/:id/status` | PATCH | Update task status |
| `/buffet-staff/tasks/:id/escalate` | POST | Escalate issue to admin |
| `/notifications` | GET | View notifications |

---

### External Visitor Workflows (Public - No Auth)

```
1. Access Invitation Link
   GET /invites/:token
   
   Response (Valid):
   {
     "id": "REQ_001",
     "status": "approved",
     "hostName": "Sarah Johnson",
     "hostDepartment": "Marketing",
     "visitDate": "2025-12-10",
     "visitTime": "10:00 AM",
     "duration": "2 hours",
     "purpose": "Business Meeting",
     "location": {
       "building": "SKBC Tower",
       "address": "King Abdullah Road, Jeddah"
     },
     "meetingRoom": { "name": "Majlis Al-Shura", "floor": "3rd Floor" },
     "parkingInfo": { "type": "auto", "location": "SKBC Basement" },
     "canAccept": true,
     "canReject": true,
     "expiresAt": "2025-12-10T07:00:00Z"
   }
   
   Response (Expired):
   Status: 410 Gone
   {
     "error": {
       "code": "INVITE_EXPIRED",
       "message": "This invitation has expired"
     }
   }

2. Accept Invitation
   POST /invites/:token/accept
   { "visitorNotes": "Looking forward to the meeting" }
   
   Response:
   {
     "id": "REQ_001",
     "status": "visitor_accepted",
     "qrCode": "QR_REQ_001_visitor",
     "message": "Your visit is confirmed. Show this QR code at entrance."
   }

3. Reject Invitation
   POST /invites/:token/reject
   { "reason": "Schedule conflict - please suggest alternative date" }
   
   Response:
   {
     "id": "REQ_001",
     "status": "visitor_rejected",
     "message": "The host has been notified of your response."
   }
```

---

## Azure AD SSO Integration

### Configuration Requirements

```typescript
// Required Environment Variables
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<your-application-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>  // For backend validation
AZURE_REDIRECT_URI=https://your-domain.com/auth/callback
```

### Azure AD App Registration Setup

1. **Create App Registration** in Azure Portal
2. **Configure Platform:**
   - Add Mobile/Desktop platform for Expo app
   - Add Web platform for backend
   - Set redirect URIs

3. **API Permissions:**
   - `User.Read` - Read user profile
   - `email` - Access user email
   - `openid` - OpenID Connect
   - `profile` - Access user profile

4. **Configure App Roles** (for VMS role mapping):
   - `VMS.Manager`
   - `VMS.BuildingAdmin`
   - `VMS.Receptionist`
   - `VMS.Security`
   - `VMS.BuffetAdmin`
   - `VMS.BuffetStaff`
   - `VMS.ValetAdmin`
   - `VMS.ValetDriver`

### Mobile App Integration Flow

```typescript
// Expo AuthSession Flow
import * as AuthSession from 'expo-auth-session';

const discovery = {
  authorizationEndpoint: `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/authorize`,
  tokenEndpoint: `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`,
};

const [request, response, promptAsync] = AuthSession.useAuthRequest(
  {
    clientId: AZURE_CLIENT_ID,
    scopes: ['openid', 'profile', 'email', 'User.Read'],
    redirectUri: AuthSession.makeRedirectUri({ scheme: 'vms' }),
    responseType: 'code',
    usePKCE: true,
  },
  discovery
);

// After user authenticates, exchange code for tokens
// Then send Azure access token to backend
POST /auth/azure/login
{
  "azureAccessToken": "<azure-access-token>"
}

// Backend validates token with Azure and returns VMS JWT
Response:
{
  "accessToken": "<vms-jwt-access-token>",
  "refreshToken": "<vms-refresh-token>",
  "expiresIn": 86400,
  "user": {
    "id": "user_001",
    "email": "user@skbc.com",
    "name": "User Name",
    "role": "employee",
    "azureAdObjectId": "<azure-oid>"
  }
}
```

### Backend Token Validation

```typescript
// NestJS Azure AD Token Validation
import { JwksClient } from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';

const jwksClient = new JwksClient({
  jwksUri: `https://login.microsoftonline.com/${AZURE_TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  rateLimit: true,
});

async function validateAzureToken(token: string): Promise<AzureClaims> {
  const decoded = jwt.decode(token, { complete: true });
  const key = await jwksClient.getSigningKey(decoded.header.kid);
  
  const verified = jwt.verify(token, key.getPublicKey(), {
    audience: AZURE_CLIENT_ID,
    issuer: `https://sts.windows.net/${AZURE_TENANT_ID}/`,
    algorithms: ['RS256'],
  });
  
  return verified as AzureClaims;
}

interface AzureClaims {
  oid: string;           // Azure AD Object ID
  preferred_username: string;  // Email
  name: string;
  roles?: string[];      // App roles
  iat: number;
  exp: number;
}
```

### Role Mapping from Azure AD Groups

```typescript
// Azure AD Group to VMS Role Mapping
const ROLE_MAPPING: Record<string, UserRole> = {
  'VMS.Manager': UserRole.MANAGER,
  'VMS.BuildingAdmin': UserRole.BUILDING_ADMIN,
  'VMS.Receptionist': UserRole.RECEPTIONIST,
  'VMS.Security': UserRole.SECURITY,
  'VMS.BuffetAdmin': UserRole.BUFFET_ADMIN,
  'VMS.BuffetStaff': UserRole.BUFFET_STAFF,
  'VMS.ValetAdmin': UserRole.VALET_ADMIN,
  'VMS.ValetDriver': UserRole.VALET_DRIVER,
};

function mapAzureRolesToVmsRole(azureRoles: string[]): UserRole {
  for (const role of azureRoles) {
    if (ROLE_MAPPING[role]) {
      return ROLE_MAPPING[role];
    }
  }
  return UserRole.EMPLOYEE; // Default
}
```

---

## Changelog

### v1.3.0 (2025-12-08)
- Added comprehensive NestJS + SQL Server Backend Implementation Guide
- Added complete Role-Based API Access Matrix for all 10 roles across all modules
- Added complete SQL Server database schema with 30+ tables including:
  - Core tables: Users, Visitors, VisitRequests, MeetingRooms, ParkingSpots
  - Auxiliary tables: VisitEventLog, MeetingRoomBookings, NotificationDeliveryLog
  - Queue tables: ReminderQueue for background job processing
  - History tables: UserRoleHistory, VisitorHistory
  - Escalation tables: BuffetTaskEscalations for staff issue tracking
- Added NestJS module structure and recommended architecture
- Added DTO examples with class-validator decorators
- Added RBAC implementation patterns with guards and decorators
- Added Azure AD SSO integration strategy with role mapping
- Added Background Jobs & Scheduled Tasks section with NestJS @nestjs/schedule patterns
- Added Public Endpoints implementation for visitor invitations (no auth required)
- Added Buffet Staff escalation workflow with complete API examples
- Added detailed role-specific workflow documentation for all 10 roles
- Added database indexes and constraints for performance
- Added entity relationships and foreign keys

### v1.2.0 (2025-12-04)
- Added complete OTP/verification flow APIs (send-otp, verify-otp, resend-otp, reset-password-with-otp)
- Added comprehensive biometric authentication APIs (register, list devices, remove, verify, settings)
- Added complete field definitions with validation rules to all POST/PATCH endpoints
- Added photo upload endpoints (POST/DELETE /users/me/photo)
- Added employee parking assignment APIs (GET/POST/DELETE /parking/employees)
- Added bulk parking assignment endpoint
- Added analytics export APIs with scheduling (export, schedules)
- Added comprehensive Screen-to-API mapping section for 40+ screens
- Added API Dependency Matrix by Role

### v1.1.0 (2025-12-03)
- Added complete notification types enumeration (32 types with descriptions)
- Added UserNotificationPreferences entity with role-specific defaults
- Added user self-service notification preferences APIs (GET/PUT)
- Added DELETE notification endpoint
- Added admin broadcast notification API (POST /admin/notifications/send)
- Added GET /reception/alerts for real-time receptionist alerts
- Added GET /security/alerts for real-time security alerts
- Added comprehensive Notification Triggers documentation
- Added Notification Channel Matrix and Priority Definitions

### v1.0.0 (2025-12-03)
- Initial API specification
- Core modules: Auth, Visits, Approvals, Reception, Security
- Resource management: Meeting Rooms, Parking, Valet, Buffet
- External visitor invite flow
- Admin settings and analytics
