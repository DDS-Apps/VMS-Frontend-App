# Dallah Albaraka Visitor Management System (VMS)

## Technical Documentation — Mobile Application

| Field              | Value                                      |
|--------------------|--------------------------------------------|
| **Document Version** | 1.0                                       |
| **App Version**      | 1.0.30 (Build 59)                         |
| **Date**             | February 9, 2026                          |
| **Prepared By**      | Folio3 Engineering Team                   |
| **Classification**   | Confidential — Client Internal Use Only   |

> **CONFIDENTIALITY NOTICE:** This document contains proprietary technical information pertaining to the Dallah Albaraka Visitor Management System. Distribution is restricted to authorized personnel within the client organization and designated technical teams. Unauthorized reproduction or distribution is prohibited.

---

## Executive Summary

The Dallah Albaraka Visitor Management System (VMS) is a cross-platform mobile application designed to digitize and streamline the end-to-end visitor lifecycle within Dallah Albaraka facilities. Built with React Native and Expo SDK 54, the application supports iOS, Android, and Web platforms from a single codebase. It provides role-based workflows for ten distinct user roles — including employees, managers, security personnel, receptionists, and facility service teams — enabling visitor request creation, multi-level approval chains, gate check-in/check-out, buffet service coordination, valet parking management, and real-time push notifications. The system features full bilingual support (English and Arabic with RTL layout), Microsoft Azure AD SSO integration, Firebase-powered push notifications and crash reporting, and a robust multi-environment configuration supporting both QA and Production deployments.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Application Architecture](#3-application-architecture)
4. [User Roles & Access Control](#4-user-roles--access-control)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [API Integration Layer](#6-api-integration-layer)
7. [State Management](#7-state-management)
8. [Navigation Architecture](#8-navigation-architecture)
9. [Push Notifications](#9-push-notifications)
10. [Crash Reporting & Error Handling](#10-crash-reporting--error-handling)
11. [Internationalization (i18n) & RTL Support](#11-internationalization-i18n--rtl-support)
12. [UI/UX Design System](#12-uiux-design-system)
13. [Environment Configuration](#13-environment-configuration)
14. [Build & Deployment](#14-build--deployment)
15. [Security Architecture](#15-security-architecture)
16. [Third-Party Dependencies](#16-third-party-dependencies)
17. [Appendix A: API Endpoint Reference](#appendix-a-api-endpoint-reference)

---

## 1. System Overview

### 1.1 Purpose

The Dallah Albaraka VMS mobile application provides a comprehensive digital solution for managing visitors, facility services, and security operations across Dallah Albaraka properties. The system replaces manual visitor registration processes with a fully digital workflow encompassing request creation, approval chains, gate operations, and ancillary services (buffet, valet parking, meeting rooms).

### 1.2 Platform Support

| Platform | Target           | Distribution         |
|----------|------------------|----------------------|
| iOS      | iPhone & iPad    | Apple App Store      |
| Android  | Android 8.0+ (API 26+) | Google Play Store |
| Web      | Modern browsers  | Expo Web Export      |

### 1.3 Application Identifiers

| Identifier        | Value                                      |
|-------------------|--------------------------------------------|
| App Name          | Dallah Albaraka VMS                        |
| Bundle ID (iOS)   | `com.dallah.vms`                           |
| Package (Android) | `com.dallah.vms`                           |
| EAS Project ID    | `33b6baff-6c89-44be-905f-006d0da4434d`     |
| Slug              | `dallah-vms`                               |
| Backend API       | `https://vms-backend-folio3.replit.app`    |

### 1.4 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│                                                                 │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│   │   iOS     │    │ Android  │    │   Web    │                  │
│   │  (Expo    │    │  (Expo   │    │ (React   │                  │
│   │ Managed)  │    │ Managed) │    │ Native   │                  │
│   │           │    │          │    │   Web)   │                  │
│   └────┬─────┘    └────┬─────┘    └────┬─────┘                  │
│        │               │               │                        │
│   ┌────┴───────────────┴───────────────┴─────┐                  │
│   │         React Native / Expo SDK 54       │                  │
│   │         (Single Shared Codebase)         │                  │
│   └──────────────────┬───────────────────────┘                  │
│                      │                                          │
│   ┌──────────────────┴───────────────────────┐                  │
│   │          API Integration Layer           │                  │
│   │    (Axios + Interceptors + React Query)  │                  │
│   └──────────────────┬───────────────────────┘                  │
└──────────────────────┼──────────────────────────────────────────┘
                       │ HTTPS (JWT Bearer)
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                       BACKEND LAYER                              │
│                                                                  │
│   ┌────────────────────────────────────────────────┐             │
│   │     VMS Backend API (Shared by Mobile & Web)   │             │
│   │     https://vms-backend-folio3.replit.app      │             │
│   └──────────────────┬─────────────────────────────┘             │
│                      │                                           │
│   ┌─────────┐  ┌─────┴──────┐  ┌────────────┐                   │
│   │ Database│  │ Azure AD   │  │  Firebase   │                   │
│   │ (SQL)   │  │ (SSO/Auth) │  │ (FCM/Push)  │                   │
│   └─────────┘  └────────────┘  └────────────┘                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### 2.1 Core Framework

| Technology               | Version   | Purpose                                           |
|--------------------------|-----------|---------------------------------------------------|
| React Native             | 0.81.5    | Cross-platform mobile UI framework                |
| Expo SDK                 | 54        | Managed workflow, build tooling, native modules   |
| TypeScript               | 5.9.2     | Type-safe JavaScript superset                     |
| React                    | 19.1.0    | UI component library                              |

### 2.2 Navigation & UI

| Technology                      | Version   | Purpose                                     |
|---------------------------------|-----------|---------------------------------------------|
| React Navigation (native-stack) | 7+        | Screen navigation with native transitions   |
| React Navigation (bottom-tabs)  | 7+        | Bottom tab bar navigation                   |
| react-native-reanimated         | 4.1.1     | High-performance animations                 |
| react-native-gesture-handler    | 2.28.0    | Native gesture recognition                  |
| react-native-keyboard-controller| 1.18.5    | Keyboard-aware input management             |

### 2.3 Data & Networking

| Technology             | Version   | Purpose                                            |
|------------------------|-----------|----------------------------------------------------|
| TanStack React Query   | 5.90.16   | Server state management, caching, background sync  |
| Axios                  | 1.13.2    | HTTP client with interceptors                      |
| AsyncStorage           | 2.2.0     | Persistent key-value storage (tokens, preferences) |

### 2.4 Firebase & Notifications

| Technology                        | Version   | Purpose                                   |
|-----------------------------------|-----------|-------------------------------------------|
| Firebase SDK (Web)                | 12.7.0    | Web push notifications, analytics         |
| @react-native-firebase/app        | 23.8.4    | Firebase native SDK initialization        |
| @react-native-firebase/messaging   | 23.8.4    | FCM push notifications (iOS native)       |
| @react-native-firebase/crashlytics | 23.8.4    | Crash monitoring and reporting            |
| expo-notifications                 | 0.32.16   | Cross-platform notification handling      |

### 2.5 Utilities & Tooling

| Technology             | Version   | Purpose                                            |
|------------------------|-----------|----------------------------------------------------|
| expo-image-picker      | 17.0.10   | Photo library access for profile images            |
| dotenv                 | 17.2.4    | Environment variable management for builds         |

### 2.6 Architecture Flags

| Feature                | Status    | Description                                        |
|------------------------|-----------|----------------------------------------------------|
| New Architecture       | Enabled   | React Native's TurboModules & Fabric renderer      |
| React Compiler         | Enabled   | Automatic memoization and optimization             |

---

## 3. Application Architecture

### 3.1 Architectural Pattern

The application follows a **layered architecture** pattern with clear separation of concerns:

```
┌──────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                 │
│                                                      │
│  screens/         Navigation views (role-based)      │
│  components/      Reusable UI components             │
│  navigation/      Route definitions & navigators     │
└───────────────────────┬──────────────────────────────┘
                        │
┌───────────────────────┴──────────────────────────────┐
│                 APPLICATION LAYER                    │
│                                                      │
│  contexts/        Global state (Auth, Language, etc) │
│  hooks/queries/   React Query hooks (data fetching)  │
│  providers/       Provider composition               │
└───────────────────────┬──────────────────────────────┘
                        │
┌───────────────────────┴──────────────────────────────┐
│                    SERVICE LAYER                     │
│                                                      │
│  services/api/    API service classes                │
│  services/push/   Push notification service          │
│  services/firebase/ Firebase configuration           │
│  services/crashlytics/ Crash reporting               │
│  services/state/  Local state management             │
└───────────────────────┬──────────────────────────────┘
                        │
┌───────────────────────┴──────────────────────────────┐
│                 INFRASTRUCTURE LAYER                 │
│                                                      │
│  api/httpClient   Axios instance & interceptors      │
│  api/config       Endpoint definitions               │
│  api/errors       Error type mapping                 │
│  config/          Environment & Firebase configs     │
└──────────────────────────────────────────────────────┘
```

### 3.2 Directory Structure

```
/
├── App.tsx                         # Root component, provider tree, routing
├── app.json                        # Static Expo configuration
├── app.config.js                   # Dynamic Expo config (env-based)
├── eas.json                        # EAS Build profiles
├── .env.staging                    # QA environment variables
├── index.js                        # Application entry point
│
├── api/                            # HTTP & API Infrastructure
│   ├── config.ts                   #   All API endpoint definitions
│   ├── errors.ts                   #   Error type mapping utilities
│   ├── httpClient.ts               #   Axios instance, interceptors, token refresh
│   ├── validation.ts               #   Request validation utilities
│   └── index.ts                    #   Module exports
│
├── assets/
│   ├── fonts/                      # Custom typefaces (FS Albert Pro, Arabic, Inter)
│   └── images/                     # App icons, logos, splash screens
│
├── components/
│   ├── shared/                     # Domain-agnostic reusable components
│   │   ├── ApprovalActionGroup.tsx  #   Approve/reject button group
│   │   ├── ConfirmationModal.tsx    #   Reusable confirmation dialog
│   │   ├── EmptyState.tsx           #   Empty list placeholder
│   │   ├── KPICard.tsx              #   Dashboard metric card
│   │   ├── LoadingSpinner.tsx       #   Loading indicator
│   │   ├── RequestTimeline.tsx      #   Request status timeline
│   │   ├── Skeleton.tsx             #   Content loading skeleton
│   │   ├── StatusBadge.tsx          #   Status indicator badge
│   │   ├── VisitorRequestCard.tsx   #   Visitor request summary card
│   │   └── ...                      #   (16 shared components total)
│   ├── DirectionalRow.tsx          # RTL-aware flex row
│   ├── ErrorBoundary.tsx           # React error boundary
│   ├── DashboardLayout.tsx         # Main layout with sidebar
│   ├── PhoneInputWithCountry.tsx   # International phone input
│   └── ...                         # (30+ components total)
│
├── config/
│   ├── environments.ts             # Environment detection & validation
│   ├── qa/                         # QA Firebase configs
│   │   ├── google-services.json    #   Android Firebase config
│   │   └── GoogleService-Info.plist#   iOS Firebase config
│   └── prod/                       # Production Firebase configs
│       ├── google-services.json
│       └── GoogleService-Info.plist
│
├── constants/
│   ├── theme.ts                    # Brand colors, semantic tokens
│   ├── roles.ts                    # User role definitions
│   ├── routes.ts                   # Route name constants
│   ├── iconPaths.ts                # Icon path references
│   ├── countryData.ts              # Country codes for phone input
│   ├── notificationTypes.ts        # Push notification type constants
│   ├── requestConstants.ts         # Request-related constants
│   └── i18n/
│       ├── en.ts                   # English translation strings
│       ├── ar.ts                   # Arabic translation strings
│       ├── types.ts                # Translation key type definitions
│       └── index.ts
│
├── contexts/
│   ├── AuthContext.tsx              # Authentication state & methods
│   ├── LanguageContext.tsx          # i18n locale & RTL management
│   ├── NotificationContext.tsx      # Notification badge state
│   ├── PortalContext.tsx            # Modal portal management
│   └── ToastContext.tsx             # Toast notification management
│
├── domain/
│   ├── interfaces/                  # Repository interface contracts
│   └── models/                      # Domain model definitions
│
├── hooks/
│   ├── queries/                     # React Query data hooks (18 files)
│   │   ├── useAuthQueries.ts
│   │   ├── useApprovalQueries.ts
│   │   ├── useInvitationQueries.ts
│   │   ├── useMeetingRoomQueries.ts
│   │   ├── useNotificationQueries.ts
│   │   ├── useParkingQueries.ts
│   │   ├── useBuffetQueries.ts
│   │   ├── useValetQueries.ts
│   │   ├── useSecurityQueries.ts
│   │   ├── useReceptionQueries.ts
│   │   └── ...
│   ├── useTranslation.ts           # Translation hook
│   ├── useRTLStyles.ts             # RTL style hook
│   ├── useTheme.ts                 # Theme access hook
│   └── ...
│
├── navigation/
│   ├── DashboardContainer.tsx       # Main stack navigator (role-based)
│   ├── MainTabNavigator.tsx         # Bottom tab navigation
│   ├── navigationRef.ts            # Programmatic navigation ref
│   └── screenOptions.ts            # Common screen configuration
│
├── providers/
│   └── QueryProvider.tsx            # React Query client provider
│
├── screens/
│   ├── Admin/                       # 9 screens (system administration)
│   ├── Auth/                        # LoginScreen, SplashScreen
│   ├── Buffet/                      # 1 screen (buffet board)
│   ├── BuffetAdmin/                 # 7 screens (buffet management)
│   ├── BuildingAdmin/               # 2 screens (building admin)
│   ├── Common/                      # Settings, Notifications, Preferences
│   ├── Dashboard/                   # OverviewScreen
│   ├── Driver/                      # 2 screens (valet driver tasks)
│   ├── Employee/                    # 6 screens (visitor requests)
│   ├── Legal/                       # Privacy Policy, Terms & Conditions
│   ├── Manager/                     # 3 screens (approval workflows)
│   ├── Profile/                     # ChangePassword, EditProfile
│   ├── Receptionist/                # 7 screens (front desk ops)
│   ├── Security/                    # 3 screens (gate operations)
│   ├── ValetAdmin/                  # 2 screens (valet management)
│   └── Visitor/                     # VisitorInviteScreen
│
├── services/
│   ├── api/                         # API service layer (18 files)
│   │   ├── authService.ts
│   │   ├── invitationApiService.ts
│   │   ├── requestApiService.ts
│   │   ├── parkingApiService.ts
│   │   ├── buffetApiService.ts
│   │   ├── valetApiService.ts
│   │   ├── securityApiService.ts
│   │   ├── receptionApiService.ts
│   │   └── ...
│   ├── push/                        # Push notification service
│   │   ├── pushNotificationService.ts
│   │   └── notificationQueryMapper.ts
│   ├── firebase/                    # Firebase initialization & web messaging
│   ├── crashlytics/                 # Crash reporting service
│   └── state/                       # Local state management modules
│
├── types/                           # TypeScript type definitions (15 files)
├── utils/                           # Utility functions (15 files)
└── web/                             # Web-specific files (service worker)
```

### 3.3 Data Flow Pattern

```
┌──────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Screen  │────▶│  React Query    │────▶│   API Service    │
│  (UI)    │     │  Hook           │     │   (services/api) │
│          │◀────│  (hooks/queries)│◀────│                  │
└──────────┘     └─────────────────┘     └────────┬─────────┘
                                                  │
                                         ┌────────┴─────────┐
                                         │   HTTP Client    │
                                         │  (api/httpClient)│
                                         └────────┬─────────┘
                                                  │
                                                  ▼
                                         ┌──────────────────┐
                                         │   Backend API    │
                                         │   (REST/JSON)    │
                                         └──────────────────┘
```

**Data flow in detail:**

1. **Screen** renders UI and triggers data operations
2. **React Query Hook** manages caching, loading states, background refetching, and optimistic updates
3. **API Service** constructs request parameters and calls the HTTP client
4. **HTTP Client** (Axios) injects Bearer tokens, sends request, auto-unwraps `{ success, data }` response wrapper, and handles 401 token refresh
5. **Backend API** processes the request and returns structured JSON

---

## 4. User Roles & Access Control

The application supports ten distinct user roles, each with tailored screen access and capabilities.

### 4.1 Role Definitions

| # | Role              | Identifier       | Description                                                      |
|---|-------------------|-------------------|------------------------------------------------------------------|
| 1 | Employee          | `employee`        | Creates visitor requests, manages own visits and valet requests  |
| 2 | Manager           | `manager`         | Approves/rejects requests, has all employee capabilities         |
| 3 | Building Admin    | `building_admin`  | Overall system administration, user management, analytics        |
| 4 | Buffet Admin      | `buffet_admin`    | Manages buffet operations, locations, staff assignments          |
| 5 | Buffet Staff      | `buffet_staff`    | Handles buffet service task execution                            |
| 6 | Valet Admin       | `valet_admin`     | Manages valet operations, driver assignments, zones              |
| 7 | Valet Driver      | `valet_driver`    | Handles valet parking pick-up and delivery tasks                 |
| 8 | Security          | `security`        | Gate management, visitor check-in/check-out via scanning         |
| 9 | Visitor           | `visitor`         | External visitors accepting or declining invitations             |
| 10| Receptionist      | `receptionist`    | Front desk operations, walk-in management, visitor coordination  |

### 4.2 Screen Access Matrix

| Screen Category          | Employee | Manager | Bldg Admin | Buffet Admin | Buffet Staff | Valet Admin | Valet Driver | Security | Visitor | Receptionist |
|--------------------------|:--------:|:-------:|:----------:|:------------:|:------------:|:-----------:|:------------:|:--------:|:-------:|:------------:|
| Dashboard/Overview       | ✓        | ✓       | ✓          | ✓            | ✓            | ✓           | ✓            | ✓        | —       | ✓            |
| Visitor Requests         | ✓        | ✓       | ✓          | —            | —            | —           | —            | —        | —       | —            |
| Request Approval         | —        | ✓       | ✓          | —            | —            | —           | —            | —        | —       | —            |
| All Requests View        | —        | ✓       | ✓          | —            | —            | —           | —            | —        | —       | —            |
| Valet Requests           | ✓        | ✓       | —          | —            | —            | —           | —            | —        | —       | —            |
| Gate Check-In/Out        | —        | —       | —          | —            | —            | —           | —            | ✓        | —       | —            |
| Gate Events Log          | —        | —       | —          | —            | —            | —           | —            | ✓        | —       | —            |
| Reception Dashboard      | —        | —       | —          | —            | —            | —           | —            | —        | —       | ✓            |
| Walk-In Visitors         | —        | —       | —          | —            | —            | —           | —            | —        | —       | ✓            |
| Buffet Dashboard         | —        | —       | —          | ✓            | —            | —           | —            | —        | —       | —            |
| Buffet Board             | —        | —       | —          | —            | ✓            | —           | —            | —        | —       | —            |
| Valet Admin Tasks        | —        | —       | —          | —            | —            | ✓           | —            | —        | —       | —            |
| Driver Tasks             | —        | —       | —          | —            | —            | —           | ✓            | —        | —       | —            |
| Visitor Invite           | —        | —       | —          | —            | —            | —           | —            | —        | ✓       | —            |
| Admin (Users/Analytics)  | —        | —       | ✓          | —            | —            | —           | —            | —        | —       | —            |
| Settings                 | ✓        | ✓       | ✓          | ✓            | ✓            | ✓           | ✓            | ✓        | —       | ✓            |
| Notifications            | ✓        | ✓       | ✓          | ✓            | ✓            | ✓           | ✓            | ✓        | —       | ✓            |
| Profile Management       | ✓        | ✓       | ✓          | ✓            | ✓            | ✓           | ✓            | ✓        | —       | ✓            |

### 4.3 Role Mapping

The backend returns a role string in the user profile. The mobile app maps this string to a typed `UserRole` constant. If the backend returns an unrecognized role, the app defaults to the `employee` role for safe fallback behavior.

---

## 5. Authentication & Authorization

### 5.1 Supported Login Methods

| Method              | Description                                                      |
|---------------------|------------------------------------------------------------------|
| Email / Password    | Standard credential-based login via `/api/v1/auth/login`        |
| Azure AD SSO        | Microsoft single sign-on via web-based OAuth flow               |
| OTP (One-Time Pass) | Phone/email-based OTP verification via `/api/v1/auth/verify-otp`|

### 5.2 Authentication Flow Diagram

```
┌──────────────┐                                          ┌──────────────┐
│  User Opens  │                                          │   Backend    │
│    App       │                                          │   API        │
└──────┬───────┘                                          └──────┬───────┘
       │                                                         │
       │  1. Check AsyncStorage for stored tokens                │
       │─────────────────────────────┐                           │
       │                             │                           │
       │  [Tokens found]             │ [No tokens]               │
       │◄────────────────────────────┘                           │
       │                                                         │
       │  2a. Validate token expiry (5-min buffer)               │
       │  2b. If expired → call /auth/refresh                    │
       │────────────────────────────────────────────────────────▶│
       │                                                         │
       │  3. Fetch fresh user profile (/users/me)                │
       │────────────────────────────────────────────────────────▶│
       │◄────────────────────────────────────────────────────────│
       │     User profile + role                                 │
       │                                                         │
       │  4. Set Crashlytics user attributes                     │
       │  5. Register push notification token                    │
       │────────────────────────────────────────────────────────▶│
       │                                                         │
       │  6. Navigate to role-based dashboard                    │
       │                                                         │
       ▼                                                         ▼

       ═══════════════ LOGIN FLOW (No Tokens) ═══════════════

       │                                                         │
       │  Show LoginScreen                                       │
       │                                                         │
       │  [Email/Password]                                       │
       │  POST /auth/login { email, password }                   │
       │────────────────────────────────────────────────────────▶│
       │◄────────────────────────────────────────────────────────│
       │  { accessToken, refreshToken, expiresIn }               │
       │                                                         │
       │  [Azure AD SSO]                                         │
       │  Open browser → /auth/microsoft/login                   │
       │────────────────────────────────────────────────────────▶│
       │◄────────── Redirect with tokens in URL hash ───────────│
       │  Parse hash fragment → extract tokens                   │
       │                                                         │
       │  [OTP]                                                  │
       │  POST /auth/send-otp → POST /auth/verify-otp           │
       │────────────────────────────────────────────────────────▶│
       │◄────────────────────────────────────────────────────────│
       │                                                         │
       │  Store tokens in AsyncStorage                           │
       │  Set in-memory tokens for HTTP client                   │
       │  Fetch user profile → Navigate to dashboard             │
       ▼                                                         ▼
```

### 5.3 Token Management

| Aspect              | Detail                                                             |
|---------------------|--------------------------------------------------------------------|
| Token Type          | JWT (JSON Web Token)                                               |
| Storage             | AsyncStorage (persisted on device; platform sandboxed)             |
| Access Token        | Held in-memory for HTTP requests; persisted in AsyncStorage        |
| Refresh Token       | Persisted in AsyncStorage; rotated on each refresh                 |
| Expiry Buffer       | 5-minute pre-expiry buffer triggers proactive refresh              |
| Refresh Mechanism   | Axios response interceptor on 401 status                          |
| Concurrent Requests | Subscriber pattern queues requests during token refresh            |

### 5.4 SSO Flow (Azure AD)

1. User taps "Sign in with Microsoft" on LoginScreen
2. App opens web browser to backend's Microsoft login endpoint
3. Backend initiates OAuth flow with Azure AD
4. Azure AD authenticates user, redirects back to backend callback
5. Backend generates JWT tokens, redirects to app with tokens in URL hash fragment
6. App's AuthContext parses the hash fragment, extracts `accessToken` and `refreshToken`
7. App fetches user profile from `/api/v1/users/me` and completes login

### 5.5 Session Lifecycle

**On App Start:**
1. Read stored tokens from AsyncStorage
2. Validate access token expiry (with 5-minute buffer)
3. If expired, attempt silent refresh via `/api/v1/auth/refresh`
4. Fetch fresh user data from `/api/v1/users/me`
5. Initialize Crashlytics user attributes
6. Register push notification device token

**On Logout:**
1. Unregister push notification device token (`/api/v1/devices/token/unregister`)
2. Clear Crashlytics user attributes
3. Call backend logout endpoint (`/api/v1/auth/logout`)
4. Clear all tokens from in-memory storage
5. Clear all tokens from AsyncStorage
6. Navigate to LoginScreen

---

## 6. API Integration Layer

### 6.1 HTTP Client Configuration

| Setting         | Value                                             |
|-----------------|---------------------------------------------------|
| Base URL        | Loaded from environment configuration             |
| Timeout         | 180,000 ms (3 minutes)                            |
| Content Type    | `application/json`                                |
| Authentication  | Bearer token via request interceptor              |

### 6.2 Request Interceptor

Every outgoing request is intercepted to inject the current access token:

```
Request → Interceptor → Add "Authorization: Bearer <token>" → Server
```

The token is stored in-memory (set during login/refresh) for immediate access without async I/O.

### 6.3 Response Interceptor

The response interceptor performs two operations:

1. **Auto-unwrapping**: The backend wraps all responses in a standard envelope:
   ```json
   {
     "success": true,
     "message": "Optional message",
     "data": { /* actual payload */ }
   }
   ```
   The interceptor automatically unwraps this, returning only the `data` payload to the calling code.

2. **401 Token Refresh**: On receiving a 401 (Unauthorized) response:
   - If not already refreshing, initiates a token refresh request
   - Queues all concurrent 401'd requests as subscribers
   - On successful refresh, replays all queued requests with the new token
   - On refresh failure, triggers logout

### 6.4 Error Handling

Axios errors are mapped to a typed `ApiException` containing:

| Field       | Type     | Description                              |
|-------------|----------|------------------------------------------|
| `status`    | `number` | HTTP status code                         |
| `message`   | `string` | Human-readable error message             |
| `details`   | `object` | Additional error context from backend    |

### 6.5 Helper Functions

The HTTP client exports typed helper functions for all HTTP methods:

| Function       | Signature                        | Description                    |
|----------------|----------------------------------|--------------------------------|
| `get<T>`       | `(url, config?) => Promise<T>`   | GET with auto-unwrap           |
| `post<T,D>`    | `(url, data, config?) => T`      | POST with auto-unwrap          |
| `patch<T,D>`   | `(url, data, config?) => T`      | PATCH with auto-unwrap         |
| `put<T,D>`     | `(url, data, config?) => T`      | PUT with auto-unwrap           |
| `del<T,D>`     | `(url, config?) => Promise<T>`   | DELETE with auto-unwrap        |

### 6.6 API Service Layer

Each domain has a dedicated API service module in `services/api/`:

| Service File                   | Domain                                  |
|--------------------------------|-----------------------------------------|
| `authService.ts`               | Authentication, password, OTP           |
| `userApiService.ts`            | User profiles, roles, team queries      |
| `invitationApiService.ts`      | Visitor invitations, RSVP               |
| `requestApiService.ts`         | Visitor requests, my-requests           |
| `parkingApiService.ts`         | Parking space management                |
| `meetingRoomApiService.ts`     | Meeting room bookings                   |
| `buffetApiService.ts`          | Buffet operations (admin & staff)       |
| `valetApiService.ts`           | Valet driver assignments                |
| `valetAdminApiService.ts`      | Valet admin task management             |
| `valetSelfServiceApiService.ts`| Valet self-service requests             |
| `securityApiService.ts`        | Gate scanning, check-in/out             |
| `receptionApiService.ts`       | Reception desk operations               |
| `gateApiService.ts`            | Gate configuration, logs                |
| `notificationApiService.ts`    | Notification list & preferences         |
| `deviceApiService.ts`          | Push token registration                 |
| `visitorApiService.ts`         | Visitor management, blacklisting        |
| `publicInviteService.ts`       | Public invitation acceptance            |

---

## 7. State Management

### 7.1 Global State (React Contexts)

| Context                  | Purpose                                                          |
|--------------------------|------------------------------------------------------------------|
| `AuthContext`            | User authentication state, login/logout methods, token lifecycle |
| `LanguageContext`        | Current locale (en/ar), RTL flag, language switching              |
| `NotificationContext`    | Unread notification count, badge management                      |
| `ToastContext`           | In-app toast notification display                                |
| `PortalContext`          | Modal portal management for overlays                             |

### 7.2 Server State (TanStack React Query)

All server data is managed through TanStack React Query v5 with 18 dedicated query hook files:

| Feature              | Implementation                                                    |
|----------------------|-------------------------------------------------------------------|
| Caching              | Automatic with configurable stale time per query                  |
| Background Refetch   | Data refreshed in background when screen gains focus              |
| Optimistic Updates   | Mutations update UI immediately, roll back on failure             |
| Cache Invalidation   | Triggered by mutations and incoming push notifications            |
| Screen Refresh       | `useFocusEffect` triggers refetch when navigating to a screen    |
| Loading States       | `isLoading` / `isPending` flags for skeleton/spinner display     |

### 7.3 Local State

| Module                             | Purpose                                      |
|------------------------------------|----------------------------------------------|
| `services/state/visitorRequestState.ts` | Visitor request form draft state          |
| `services/state/buffetAdminState.ts`    | Buffet admin operational state            |
| `services/state/valetAdminState.ts`     | Valet admin operational state             |
| `services/state/notificationState.ts`   | Notification badge count tracking         |
| `services/state/receptionistVisitorState.ts` | Receptionist visitor session state   |

### 7.4 Persistent Storage

AsyncStorage is used for persisting:
- Authentication tokens (access + refresh)
- User language preference (en/ar)
- Notification preferences
- User profile cache

---

## 8. Navigation Architecture

### 8.1 Navigation Stack

```
┌─────────────────────────────────────────────────────┐
│                   App.tsx (Root)                     │
│                                                     │
│  ┌──────────────┐   ┌──────────────────────────┐    │
│  │ SplashScreen │   │     LoginScreen          │    │
│  └──────────────┘   └──────────────────────────┘    │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │       DashboardContainer (Stack Navigator)   │   │
│  │                                              │   │
│  │  ┌──────────────────────────────────────┐    │   │
│  │  │  MainTabNavigator (Bottom Tabs)      │    │   │
│  │  │                                      │    │   │
│  │  │  ┌────────┐ ┌──────────┐ ┌────────┐  │    │   │
│  │  │  │Dashboard│ │Notifica- │ │Profile │  │    │   │
│  │  │  │  Tab   │ │tions Tab │ │  Tab   │  │    │   │
│  │  │  └────────┘ └──────────┘ └────────┘  │    │   │
│  │  └──────────────────────────────────────┘    │   │
│  │                                              │   │
│  │  + Role-specific screens (pushed on stack)   │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  Special Routes (outside main stack)         │   │
│  │  - VisitorInviteScreen (public invite flow)  │   │
│  │  - PrivacyPolicyScreen                       │   │
│  │  - TermsConditionsScreen                     │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 8.2 Role-Based Routing

The `DashboardContainer` dynamically registers screens based on the authenticated user's role. Each role has a curated set of screens available in the navigation stack, ensuring users only access functionality appropriate to their role.

### 8.3 Bottom Tab Navigator

The `MainTabNavigator` provides three persistent tabs:

| Tab            | Icon     | Screen                                      |
|----------------|----------|----------------------------------------------|
| Dashboard      | Home     | Role-specific overview/dashboard screen      |
| Notifications  | Bell     | Notification list with badge count           |
| Profile        | User     | Settings, profile edit, password change      |

### 8.4 Programmatic Navigation

A `navigationRef` is exposed for navigation from outside React components (e.g., push notification handlers). This enables deep linking from notification taps to specific screens.

---

## 9. Push Notifications

### 9.1 Architecture Overview

The application uses a **unified FCM (Firebase Cloud Messaging) token approach** across all platforms. Regardless of the platform, the app registers an FCM token with the backend, and the backend handles routing notifications through the appropriate channel.

### 9.2 Platform-Specific Implementation

| Platform | Token Source                        | Notes                                                 |
|----------|-------------------------------------|-------------------------------------------------------|
| iOS      | `@react-native-firebase/messaging`  | Required: backend routes FCM tokens to APNs           |
| Android  | `expo-notifications`                | Returns native FCM tokens directly                    |
| Web      | Firebase SDK with VAPID key         | Uses service worker for background notifications      |

### 9.3 Push Notification Flow

```
┌──────────────┐                    ┌──────────────┐                    ┌──────────────┐
│   App Login  │                    │   Backend    │                    │   Firebase   │
│              │                    │   API        │                    │   FCM        │
└──────┬───────┘                    └──────┬───────┘                    └──────┬───────┘
       │                                   │                                   │
       │  1. Request notification          │                                   │
       │     permission from OS            │                                   │
       │                                   │                                   │
       │  2. Get FCM token                 │                                   │
       │     (platform-specific)           │                                   │
       │                                   │                                   │
       │  3. POST /devices/token           │                                   │
       │     { token, platform }           │                                   │
       │─────────────────────────────────▶│                                   │
       │                                   │  Store device token               │
       │                                   │                                   │
       │         ... TIME PASSES ...       │                                   │
       │                                   │                                   │
       │                                   │  4. Event occurs                  │
       │                                   │     (approval, check-in, etc.)    │
       │                                   │                                   │
       │                                   │  5. Send notification             │
       │                                   │─────────────────────────────────▶│
       │                                   │                                   │
       │                                   │                                   │  6. Route to
       │                                   │                                   │     device
       │  7. Receive notification          │                                   │
       │◀──────────────────────────────────────────────────────────────────────│
       │                                   │                                   │
       │  8. Invalidate React Query        │                                   │
       │     caches (by notification type) │                                   │
       │                                   │                                   │
       │  9. If tapped: deep link to       │                                   │
       │     relevant screen               │                                   │
       ▼                                   ▼                                   ▼
```

### 9.4 Device Registration

| Event    | API Endpoint                       | Action                              |
|----------|-------------------------------------|-------------------------------------|
| Login    | `POST /api/v1/devices/token`       | Register FCM token with backend     |
| Logout   | `POST /api/v1/devices/token/unregister` | Unregister token to stop notifications |

### 9.5 Notification Handling

When a notification is received while the app is in the foreground:
1. Display in-app notification toast
2. Invalidate relevant React Query caches based on the notification type
3. Update notification badge count

When a notification is tapped (background/killed state):
1. Parse notification payload for navigation target
2. Use `notificationNavigator` to route to the appropriate screen
3. Pass relevant parameters (request ID, visit ID, etc.)

---

## 10. Crash Reporting & Error Handling

### 10.1 Firebase Crashlytics

| Feature              | Detail                                                         |
|----------------------|----------------------------------------------------------------|
| Service              | Firebase Crashlytics (`@react-native-firebase/crashlytics`)   |
| Platforms            | iOS, Android (native crash capture)                            |
| Web Fallback         | Console logging (Crashlytics not available on web)             |
| Expo Go Fallback     | Console logging (native modules not available)                 |

### 10.2 User Attribution

On successful login, the following attributes are set on Crashlytics for crash grouping:

| Attribute    | Source                    |
|--------------|---------------------------|
| `userId`     | User profile ID           |
| `email`      | User email address        |
| `name`       | User display name         |
| `role`       | User role (e.g., manager) |

### 10.3 Error Boundary

The app wraps the component tree in a React `ErrorBoundary` component that:
- Catches unhandled JavaScript errors in the component tree
- Displays a user-friendly error fallback screen (`ErrorFallback`)
- Reports the error to Crashlytics
- Provides a "Retry" action to recover

### 10.4 Build Configuration

Firebase Crashlytics requires special build configuration for Expo:
- `expo-build-properties` plugin with `useFrameworks: "static"` for iOS
- `buildReactNativeFromSource: true` to resolve static frameworks compatibility

---

## 11. Internationalization (i18n) & RTL Support

### 11.1 Supported Languages

| Language | Code | Direction | Translation File         |
|----------|------|-----------|--------------------------|
| English  | `en` | LTR       | `constants/i18n/en.ts`   |
| Arabic   | `ar` | RTL       | `constants/i18n/ar.ts`   |

### 11.2 Translation System

- Translation strings are organized as typed TypeScript objects
- Type safety enforced via `constants/i18n/types.ts` (compile-time key validation)
- `useTranslation()` hook provides the current locale's translation function
- Language preference persisted in AsyncStorage

### 11.3 RTL Architecture

| Component / Utility             | Purpose                                                  |
|---------------------------------|----------------------------------------------------------|
| `LanguageContext`               | Manages locale state, triggers RTL layout toggle         |
| `rtlInitializer.ts`            | Synchronous RTL setup before React renders (in index.js) |
| `rtl.ts`                       | RTL detection and layout utilities                       |
| `rtlStyles.ts`                 | RTL-aware style generation                               |
| `DirectionalRow`               | Flex row component that auto-reverses in RTL             |
| `RTLInfoRow`                   | Information row with label-value that respects direction  |
| `useRTLStyles` / `useLocaleDirection` | Hooks for RTL-aware styling                     |

### 11.4 RTL Implementation Details

- `I18nManager.forceRTL()` is called **before** React component tree renders (in `index.js`)
- Language change triggers a full app restart to ensure all native components re-render with correct direction
- `LanguageChangeOverlay` provides visual feedback during the language switch
- Android `supportsRTL: true` is set in `app.json`

---

## 12. UI/UX Design System

### 12.1 Brand Color Palette

| Color Name      | Hex Code    | Usage                                        |
|-----------------|-------------|----------------------------------------------|
| Brand Orange    | `#F58423`   | Primary CTAs, buttons, links, highlights     |
| Brand Orange 80%| `#F79D4F`   | Tinted variations                            |
| Brand Orange 60%| `#F9B57B`   | Secondary tints                              |
| Brand Orange 40%| `#FBCEA7`   | Tertiary tints                               |
| Soft Orange     | `#FDE6D3`   | Subtle accent backgrounds, cards             |
| Brand Green     | `#009933`   | Success states, approve buttons, badges      |
| Brand Green 80% | `#33AD5C`   | Tinted variations                            |
| Soft Green      | `#CCEBD6`   | Subtle green backgrounds                     |
| Brand Grey      | `#282829`   | Dark backgrounds, sidebar, headers           |
| Brand Grey 80%  | `#535354`   | Secondary text                               |
| Brand Grey 60%  | `#7E7E7F`   | Tertiary text, muted                         |

### 12.2 Semantic Colors

| Semantic Token  | Hex Code    | Usage                                        |
|-----------------|-------------|----------------------------------------------|
| Success         | `#009933`   | Approve/accept, success states               |
| Warning         | `#E5A000`   | Pending states, caution indicators           |
| Error           | `#E53935`   | Reject/deny, error states                    |
| Info            | `#2196F3`   | Informational badges, links                  |

### 12.3 Typography

| Font Family         | Script   | Weights                    | Usage                     |
|---------------------|----------|----------------------------|---------------------------|
| FS Albert Pro       | Latin    | Regular, Medium, SemiBold, Bold | Primary English text   |
| FS Albert Arabic    | Arabic   | Regular, Medium, SemiBold, Bold | Primary Arabic text    |
| Inter               | Latin    | 400, 500, 600, 700        | Fallback English           |
| Noto Sans Arabic    | Arabic   | Multiple weights           | Fallback Arabic            |

### 12.4 Theming

| Mode        | Background   | Surface     | Notes                          |
|-------------|--------------|-------------|--------------------------------|
| Light (default) | `#FFFFFF` | `#FFFFFF`  | White surfaces, grey text      |
| Dark        | `#1a1a1a`    | `#282829`   | Dark backgrounds, light text   |

- Theme mode is set to `automatic` (follows OS preference)
- `useTheme()` hook provides current theme tokens
- `ThemeContext` manages theme state across the app

### 12.5 Shared UI Components

| Component                  | Description                                              |
|----------------------------|----------------------------------------------------------|
| `KPICard`                  | Dashboard metric card with icon, value, and label        |
| `StatusBadge`              | Color-coded status indicator (pending, approved, etc.)   |
| `VisitorRequestCard`       | Compact visitor request summary with actions             |
| `ApprovalActionGroup`      | Approve/reject button pair                               |
| `ApprovalRequestListRow`   | Approval queue list item                                 |
| `ConfirmationModal`        | Reusable confirmation dialog                             |
| `EmptyState`               | Placeholder for empty lists                              |
| `LoadingSpinner`           | Centered activity indicator                              |
| `Skeleton`                 | Content loading placeholder animation                    |
| `RequestTimeline`          | Visual timeline of request status changes                |
| `SectionHeader`            | Section title with optional action                       |
| `ServiceIcons`             | Iconography for buffet, valet, parking services          |
| `ListLoadingFooter`        | Infinite scroll loading indicator                        |
| `LoadingButton`            | Button with integrated loading state                     |
| `SelectionCheckbox`        | Checkbox for bulk selection operations                   |
| `RTLInfoRow`               | Directional-aware label-value row                        |

---

## 13. Environment Configuration

### 13.1 Environment Overview

| Environment | Firebase Project       | APP_VARIANT   | Purpose                   |
|-------------|------------------------|---------------|---------------------------|
| QA          | `dallah-albaraka-vms`  | `staging`     | QA/Testing                |
| Production  | `dallahdigital-vms`    | `production`  | Live users                |

### 13.2 Configuration Loading

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  APP_VARIANT    │────▶│  dotenv loads   │────▶│  app.config.js  │
│  env variable   │     │  .env.staging   │     │  merges values  │
│  (from EAS or   │     │  or             │     │  into Expo      │
│   system env)   │     │  .env.production│     │  config         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 13.3 Configuration Priority Chain

Values are resolved in the following order (highest priority first):

1. `EXPO_PUBLIC_*` environment variables (system-level)
2. `.env` file values (loaded by dotenv based on `APP_VARIANT`)
3. Hardcoded defaults in `app.config.js`

### 13.4 Firebase Configuration Files

| Environment | Android Config                      | iOS Config                          |
|-------------|-------------------------------------|-------------------------------------|
| QA          | `config/qa/google-services.json`    | `config/qa/GoogleService-Info.plist` |
| Production  | `config/prod/google-services.json`  | `config/prod/GoogleService-Info.plist`|

### 13.5 Runtime Environment Detection

The app detects its current environment at runtime by comparing the active Firebase project ID against known identifiers:
- `dallah-albaraka-vms` → QA environment
- `dallahdigital-vms` → Production environment

---

## 14. Build & Deployment

### 14.1 EAS Build Profiles

| Profile              | APP_VARIANT   | Distribution | Output    | Use Case                      |
|----------------------|---------------|--------------|-----------|-------------------------------|
| `development`        | `staging`     | Internal     | APK (iOS Simulator) | Local development    |
| `development-device` | `staging`     | Internal     | APK (Device)        | On-device dev testing|
| `preview`            | `staging`     | Internal     | APK       | QA team testing               |
| `production`         | `production`  | Store        | AAB       | App Store / Play Store        |
| `production-preview` | `production`  | Internal     | APK       | Production build verification |

### 14.2 Build Commands

```bash
# Development build (iOS Simulator)
eas build --profile development --platform ios

# QA preview build (Android APK)
eas build --profile preview --platform android

# Production build (App Store)
eas build --profile production --platform ios

# Production build (Play Store AAB)
eas build --profile production --platform android

# Web export
npx expo export --platform web
```

### 14.3 Version Management

| Platform | Version Field    | Auto-Increment | Current Value |
|----------|------------------|----------------|---------------|
| Both     | `version`        | Manual         | `1.0.30`      |
| iOS      | `buildNumber`    | EAS auto       | `59`          |
| Android  | `versionCode`    | EAS auto       | Auto          |

### 14.4 iOS-Specific Requirements

| Requirement                           | Status / Value                           |
|---------------------------------------|------------------------------------------|
| Apple Team ID                         | `SNJM77V43A`                             |
| APNs Authentication Key               | Required in Firebase Console             |
| `ITSAppUsesNonExemptEncryption`       | `false`                                  |
| `UIBackgroundModes`                   | `remote-notification`                    |
| `NSPhotoLibraryUsageDescription`      | Configured for profile photo access      |
| Push notification entitlement         | Enabled                                  |

### 14.5 Android-Specific Requirements

| Requirement                           | Status / Value                           |
|---------------------------------------|------------------------------------------|
| Package Name                          | `com.dallah.vms`                         |
| `POST_NOTIFICATIONS` permission       | Declared in manifest                     |
| Edge-to-edge display                  | Enabled                                  |
| Predictive back gesture               | Disabled                                 |
| RTL support                           | Enabled (`supportsRTL: true`)            |

### 14.6 Deployment Architecture

| Environment | Hosting                  | Notes                                    |
|-------------|--------------------------|------------------------------------------|
| QA Web      | Replit (QA project)      | Auto-deployed on push                    |
| Prod Web    | Replit (Prod project)    | Separate Replit project for isolation     |
| iOS         | Apple App Store          | Via EAS Submit                           |
| Android     | Google Play Store        | Via EAS Submit                           |

---

## 15. Security Architecture

### 15.1 Authentication Security

| Measure                                | Implementation                                       |
|----------------------------------------|------------------------------------------------------|
| Token storage                          | AsyncStorage (app-sandboxed; not encrypted by default)|
| Token type                             | JWT with short-lived access + long-lived refresh      |
| Token refresh                          | Automatic on 401, with subscriber queue pattern       |
| Refresh token rotation                 | New refresh token issued on each refresh              |
| Transport security                     | HTTPS-only API communication                         |
| SSO                                    | Azure AD via OAuth 2.0 (server-side flow)            |

### 15.2 Data Protection

| Measure                                | Implementation                                       |
|----------------------------------------|------------------------------------------------------|
| API communication                      | TLS/HTTPS enforced                                   |
| Secrets management                     | Environment variables, never hardcoded               |
| Custom encryption                      | Not used (`ITSAppUsesNonExemptEncryption: false`)    |
| Sensitive data in code                 | No secrets, keys, or credentials committed to source |
| Error messages                         | Sanitized; no internal details exposed to UI         |

### 15.3 Permission Model

| Permission                    | Platform | Purpose                                   | Timing      |
|-------------------------------|----------|-------------------------------------------|-------------|
| Push Notifications            | iOS/Android | Receive real-time updates              | Runtime     |
| Photo Library                 | iOS      | Profile photo upload                      | On use      |
| Camera (via image-picker)     | Both     | Profile photo capture                     | On use      |

### 15.4 Session Security

- Access tokens are short-lived to minimize exposure window
- Refresh tokens are rotated on each use (one-time use)
- Logout clears all local storage and invalidates server-side session
- Failed token refresh forces immediate logout
- On iOS/Android, AsyncStorage data is sandboxed within the app container (not accessible by other apps)
- For enhanced security in future releases, migration to a secure keychain/keystore solution (e.g., expo-secure-store) is recommended for token storage
- Concurrent request handling prevents race conditions during token refresh

---

## 16. Third-Party Dependencies

### 16.1 Core Dependencies

| Package                              | Version   | Purpose                                    | License  |
|--------------------------------------|-----------|---------------------------------------------|----------|
| `react-native`                       | 0.81.5    | Mobile UI framework                        | MIT      |
| `expo`                               | ~54       | Managed workflow & native modules          | MIT      |
| `react`                              | 19.1.0    | UI component library                       | MIT      |
| `typescript`                         | 5.9.2     | Type-safe development                      | Apache-2 |

### 16.2 Navigation

| Package                              | Version   | Purpose                                    |
|--------------------------------------|-----------|---------------------------------------------|
| `@react-navigation/native`          | 7+        | Navigation framework core                  |
| `@react-navigation/native-stack`    | 7+        | Native stack navigator                     |
| `@react-navigation/bottom-tabs`     | 7+        | Bottom tab navigator                       |

### 16.3 State & Data

| Package                              | Version   | Purpose                                    |
|--------------------------------------|-----------|---------------------------------------------|
| `@tanstack/react-query`             | 5.90.16   | Server state, caching, sync                |
| `axios`                              | 1.13.2    | HTTP client                                |
| `@react-native-async-storage/async-storage` | 2.2.0 | Persistent key-value storage          |

### 16.4 Firebase

| Package                              | Version   | Purpose                                    |
|--------------------------------------|-----------|---------------------------------------------|
| `firebase`                           | 12.7.0    | Firebase Web SDK                           |
| `@react-native-firebase/app`        | 23.8.4    | Native Firebase initialization             |
| `@react-native-firebase/messaging`  | 23.8.4    | Native FCM for iOS push tokens             |
| `@react-native-firebase/crashlytics`| 23.8.4    | Native crash reporting                     |

### 16.5 UI & Animation

| Package                              | Version   | Purpose                                    |
|--------------------------------------|-----------|---------------------------------------------|
| `react-native-reanimated`           | 4.1.1     | High-performance native animations         |
| `react-native-gesture-handler`      | 2.28.0    | Native gesture recognition                 |
| `react-native-keyboard-controller`  | 1.18.5    | Keyboard-aware scrolling                   |
| `react-native-safe-area-context`    | —         | Safe area insets                           |
| `expo-splash-screen`                | —         | Splash screen management                  |
| `expo-image-picker`                 | 17.0.10   | Image selection from library/camera        |
| `expo-blur`                         | —         | Blur effects for tab bar                   |

### 16.6 Build Tooling

| Package                              | Version   | Purpose                                    |
|--------------------------------------|-----------|---------------------------------------------|
| `dotenv`                             | 17.2.4    | Environment variable loading for builds    |
| `expo-build-properties`             | —         | Native build configuration                 |
| `expo-web-browser`                  | —         | In-app browser for SSO                     |

---

## Appendix A: API Endpoint Reference

### A.1 Health Check

| Method | Endpoint           | Description              |
|--------|--------------------|--------------------------|
| GET    | `/api/health`      | Application health check |
| GET    | `/api/health/db`   | Database health check    |

### A.2 Authentication

| Method | Endpoint                                  | Description                        |
|--------|-------------------------------------------|------------------------------------|
| GET    | `/api/v1/auth/health`                     | Auth service health                |
| GET    | `/api/v1/auth/config`                     | Auth configuration                 |
| POST   | `/api/v1/auth/login`                      | Email/password login               |
| POST   | `/api/v1/auth/azure/login`                | Azure AD login initiation          |
| GET    | `/api/v1/auth/azure/callback`             | Azure AD callback                  |
| GET    | `/auth/microsoft/login`                   | Microsoft SSO login                |
| GET    | `/auth/microsoft/callback`                | Microsoft SSO callback             |
| POST   | `/api/v1/auth/refresh`                    | Refresh access token               |
| POST   | `/api/v1/auth/logout`                     | Logout (invalidate session)        |
| POST   | `/api/v1/auth/password`                   | Change password                    |
| POST   | `/api/v1/auth/forgot-password`            | Initiate password reset            |
| POST   | `/api/v1/auth/reset-password`             | Reset password with token          |
| POST   | `/api/v1/auth/reset-password-with-otp`    | Reset password with OTP            |
| POST   | `/api/v1/auth/send-otp`                   | Send OTP code                      |
| POST   | `/api/v1/auth/verify-otp`                 | Verify OTP code                    |
| POST   | `/api/v1/auth/resend-otp`                 | Resend OTP code                    |
| GET    | `/api/v1/users/me/notification-preferences` | Get notification preferences     |

### A.3 Biometric Authentication

| Method | Endpoint                                  | Description                        |
|--------|-------------------------------------------|------------------------------------|
| POST   | `/api/v1/auth/biometric/register`         | Register biometric credential      |
| GET    | `/api/v1/auth/biometric/devices`          | List biometric devices             |
| POST   | `/api/v1/auth/biometric/verify`           | Verify biometric credential        |
| GET    | `/api/v1/auth/biometric/settings`         | Get biometric settings             |
| POST   | `/api/v1/auth/biometric/challenge`        | Request biometric challenge        |

### A.4 Users

| Method | Endpoint                                  | Description                        |
|--------|-------------------------------------------|------------------------------------|
| GET    | `/api/v1/users`                           | List all users                     |
| GET    | `/api/v1/users/me`                        | Get current user profile           |
| PATCH  | `/api/v1/users/me/photo`                  | Update profile photo               |
| GET    | `/api/v1/users/on-vacation`               | List users on vacation             |
| GET    | `/api/v1/users/:id`                       | Get user by ID                     |
| GET    | `/api/v1/users/by-role/:role`             | List users by role                 |
| GET    | `/api/v1/users/:managerId/team`           | Get manager's team members         |

### A.5 Visitors

| Method | Endpoint                                  | Description                        |
|--------|-------------------------------------------|------------------------------------|
| GET    | `/api/v1/visitors`                        | List visitors                      |
| POST   | `/api/v1/visitors/check`                  | Check visitor status               |
| GET    | `/api/v1/visitors/blacklisted`            | List blacklisted visitors          |
| GET    | `/api/v1/visitors/:id`                    | Get visitor by ID                  |
| POST   | `/api/v1/visitors/:id/blacklist`          | Toggle visitor blacklist status    |

### A.6 Invitations

| Method | Endpoint                                  | Description                        |
|--------|-------------------------------------------|------------------------------------|
| GET    | `/api/v1/invitations`                     | List invitations                   |
| GET    | `/api/v1/invitations/today`               | Today's invitations                |
| GET    | `/api/v1/invitations/my-upcoming`         | User's upcoming invitations        |
| GET    | `/api/v1/invitations/:id`                 | Get invitation by ID               |
| POST   | `/api/v1/invitations/respond/:token`      | Respond to invitation (accept/reject) |
| POST   | `/api/v1/invitations/:id/check-in`        | Check-in visitor for invitation    |
| POST   | `/api/v1/invitations/:id/check-out`       | Check-out visitor for invitation   |

### A.7 Public Invites

| Method | Endpoint                                  | Description                        |
|--------|-------------------------------------------|------------------------------------|
| GET    | `/api/v1/invites/:token`                  | Get public invite details          |
| POST   | `/api/v1/invites/:token/accept`           | Accept public invite               |
| POST   | `/api/v1/invites/:token/reject`           | Reject public invite               |

### A.8 Visits

| Method | Endpoint                                  | Description                        |
|--------|-------------------------------------------|------------------------------------|
| GET    | `/api/v1/visits`                          | List visits                        |
| GET    | `/api/v1/visits/rooms/availability`       | Check room availability            |
| GET    | `/api/v1/visits/:id`                      | Get visit by ID                    |
| POST   | `/api/v1/visits/:id/approve`              | Approve visit request              |
| POST   | `/api/v1/visits/:id/reject`               | Reject visit request               |
| POST   | `/api/v1/visits/:id/host-approve`         | Host approval for visit            |
| POST   | `/api/v1/visits/:id/host-reject`          | Host rejection for visit           |
| POST   | `/api/v1/visits/:id/check-in`             | Check-in for visit                 |
| POST   | `/api/v1/visits/:id/check-out`            | Check-out for visit                |

### A.9 Requests

| Method | Endpoint                                  | Description                        |
|--------|-------------------------------------------|------------------------------------|
| GET    | `/api/v1/requests`                        | List all requests                  |
| GET    | `/api/v1/requests/my-requests`            | User's own requests                |
| GET    | `/api/v1/requests/pending-approvals`      | Pending approval requests          |
| GET    | `/api/v1/requests/:id`                    | Get request by ID                  |
| POST   | `/api/v1/requests/:id/approve`            | Approve request                    |
| POST   | `/api/v1/requests/:id/reject`             | Reject request                     |

### A.10 Approvals

| Method | Endpoint                                  | Description                        |
|--------|-------------------------------------------|------------------------------------|
| GET    | `/api/v1/approvals/pending`               | Pending manager approvals          |
| GET    | `/api/v1/approvals/pending-host`          | Pending host approvals             |
| GET    | `/api/v1/approvals/awaiting-visitor`      | Awaiting visitor response          |
| POST   | `/api/v1/approvals/bulk/approve`          | Bulk approve requests              |
| POST   | `/api/v1/approvals/bulk/reject`           | Bulk reject requests               |
| GET    | `/api/v1/approvals/history`               | Approval history                   |

### A.11 Parking

| Method | Endpoint                                  | Description                        |
|--------|-------------------------------------------|------------------------------------|
| GET    | `/api/v1/parking`                         | Parking overview                   |
| GET    | `/api/v1/parking/spaces`                  | List parking spaces                |
| GET    | `/api/v1/parking/spaces/available`        | List available spaces              |
| POST   | `/api/v1/parking/allocate/auto`           | Auto-allocate parking              |
| GET    | `/api/v1/parking/allocations`             | List allocations                   |
| GET    | `/api/v1/parking/stats`                   | Parking statistics                 |
| GET    | `/api/v1/parking/employees`               | Employee parking list              |
| POST   | `/api/v1/parking/employees/bulk-assign`   | Bulk assign parking                |
| GET    | `/api/v1/parking/spaces/:id`              | Get space by ID                    |
| POST   | `/api/v1/parking/allocate/:spaceId`       | Allocate specific space            |
| POST   | `/api/v1/parking/allocations/:id/check-in`  | Parking check-in                 |
| POST   | `/api/v1/parking/allocations/:id/check-out` | Parking check-out                |
| POST   | `/api/v1/parking/allocations/:id/release`   | Release parking allocation       |
| GET    | `/api/v1/parking/spots`                   | List parking spots                 |
| GET    | `/api/v1/parking/spots/:id`               | Get parking spot by ID             |

### A.12 Meeting Rooms

| Method | Endpoint                                  | Description                        |
|--------|-------------------------------------------|------------------------------------|
| GET    | `/api/v1/meeting-rooms`                   | List meeting rooms                 |
| GET    | `/api/v1/meeting-rooms/available`         | List available rooms               |
| GET    | `/api/v1/meeting-rooms/bookings`          | User's bookings                    |
| GET    | `/api/v1/meeting-rooms/bookings/all`      | All bookings                       |
| GET    | `/api/v1/meeting-rooms/bookings/today`    | Today's bookings                   |
| GET    | `/api/v1/meeting-rooms/:id`               | Get room by ID                     |
| GET    | `/api/v1/meeting-rooms/bookings/:id`      | Get booking by ID                  |

### A.13 Buffet

| Method | Endpoint                                  | Description                        |
|--------|-------------------------------------------|------------------------------------|
| GET    | `/api/v1/buffet`                          | Buffet overview                    |
| GET    | `/api/v1/buffet/locations`                | List buffet locations              |
| GET    | `/api/v1/buffet/staff`                    | List buffet staff                  |
| GET    | `/api/v1/buffet/staff/on-duty`            | On-duty staff                      |
| GET    | `/api/v1/buffet/requests`                 | List buffet requests               |
| GET    | `/api/v1/buffet/requests/today`           | Today's buffet requests            |
| GET    | `/api/v1/buffet/requests/pending`         | Pending buffet requests            |
| GET    | `/api/v1/buffet/locations/:id`            | Get location by ID                 |
| GET    | `/api/v1/buffet/staff/:id`                | Get staff member by ID             |
| GET    | `/api/v1/buffet/requests/:id`             | Get buffet request by ID           |
| POST   | `/api/v1/buffet/requests/:id/handle`      | Handle buffet request              |

### A.14 Buffet Staff

| Method | Endpoint                                  | Description                        |
|--------|-------------------------------------------|------------------------------------|
| GET    | `/api/v1/buffet-staff`                    | Buffet staff overview              |
| GET    | `/api/v1/buffet-staff/my-tasks`           | My buffet tasks                    |
| POST   | `/api/v1/buffet-staff/tasks/:id/status`   | Update task status                 |

### A.15 Buffet Admin

| Method | Endpoint                                  | Description                        |
|--------|-------------------------------------------|------------------------------------|
| GET    | `/api/v1/buffet-admin`                    | Buffet admin overview              |
| GET    | `/api/v1/buffet-admin/tasks`              | List admin tasks                   |
| GET    | `/api/v1/buffet-admin/tasks/:id`          | Get task by ID                     |
| POST   | `/api/v1/buffet-admin/tasks/:id/assign`   | Assign task to staff               |
| POST   | `/api/v1/buffet-admin/tasks/:id/status`   | Update task status                 |
| GET    | `/api/v1/buffet-admin/locations`          | Managed locations                  |
| GET    | `/api/v1/buffet-admin/staff`              | Managed staff                      |
| POST   | `/api/v1/buffet-admin/staff/:id/duty`     | Toggle staff duty status           |
| GET    | `/api/v1/buffet-admin/load-summary`       | Staff load summary                 |

### A.16 Valet

| Method | Endpoint                                  | Description                        |
|--------|-------------------------------------------|------------------------------------|
| GET    | `/api/v1/valet`                           | Valet overview                     |
| GET    | `/api/v1/valet/drivers`                   | List drivers                       |
| GET    | `/api/v1/valet/drivers/available`         | List available drivers             |
| GET    | `/api/v1/valet/assignments`               | List assignments                   |
| GET    | `/api/v1/valet/assignments/my`            | My assignments                     |
| GET    | `/api/v1/valet/assignments/today`         | Today's assignments                |
| GET    | `/api/v1/valet/drivers/:id`               | Get driver by ID                   |
| GET    | `/api/v1/valet/assignments/:id`           | Get assignment by ID               |
| POST   | `/api/v1/valet/assignments/:id/accept`    | Accept assignment                  |
| POST   | `/api/v1/valet/assignments/:id/reject`    | Reject assignment                  |
| POST   | `/api/v1/valet/assignments/:id/start`     | Start assignment                   |
| POST   | `/api/v1/valet/assignments/:id/complete`  | Complete assignment                |

### A.17 Valet Admin

| Method | Endpoint                                  | Description                        |
|--------|-------------------------------------------|------------------------------------|
| GET    | `/api/v1/valet-admin`                     | Valet admin overview               |
| GET    | `/api/v1/valet-admin/tasks`               | List valet admin tasks             |
| GET    | `/api/v1/valet-admin/drivers`             | List managed drivers               |
| GET    | `/api/v1/valet-admin/drivers/load`        | Driver load/capacity               |
| GET    | `/api/v1/valet-admin/zones`               | List parking zones                 |
| GET    | `/api/v1/valet-admin/parking-dashboard`   | Parking dashboard overview         |
| POST   | `/api/v1/valet-admin/tasks/:id/assign`    | Assign task to driver              |

### A.18 Valet Driver

| Method | Endpoint                                  | Description                        |
|--------|-------------------------------------------|------------------------------------|
| GET    | `/api/v1/valet-driver`                    | Valet driver overview              |
| GET    | `/api/v1/valet-driver/my-tasks`           | My driving tasks                   |
| GET    | `/api/v1/valet-driver/tasks/:id`          | Get task by ID                     |
| POST   | `/api/v1/valet-driver/tasks/:id/status`   | Update task status                 |

### A.19 Valet Self-Service

| Method | Endpoint                                  | Description                        |
|--------|-------------------------------------------|------------------------------------|
| GET    | `/api/v1/valet/self-service`              | Self-service requests              |
| GET    | `/api/v1/valet/self-service/:id`          | Get self-service request by ID     |

### A.20 Notifications

| Method | Endpoint                                  | Description                        |
|--------|-------------------------------------------|------------------------------------|
| GET    | `/api/v1/notifications`                   | List user notifications            |

### A.21 Devices

| Method | Endpoint                                  | Description                        |
|--------|-------------------------------------------|------------------------------------|
| POST   | `/api/v1/devices/token`                   | Register device push token         |
| POST   | `/api/v1/devices/token/unregister`        | Unregister device push token       |
| GET    | `/api/v1/devices/tokens`                  | List registered tokens             |
| GET    | `/api/v1/devices/status`                  | Device registration status         |
| POST   | `/api/v1/devices/test`                    | Send test notification             |

### A.22 Gates

| Method | Endpoint                                  | Description                        |
|--------|-------------------------------------------|------------------------------------|
| GET    | `/api/v1/gates`                           | List gates                         |
| GET    | `/api/v1/gates/config`                    | Gate configuration                 |
| POST   | `/api/v1/gates/verify`                    | Verify gate access                 |
| GET    | `/api/v1/gates/logs`                      | Gate access logs                   |
| GET    | `/api/v1/gates/logs/today`                | Today's gate logs                  |
| GET    | `/api/v1/gates/stats`                     | Gate statistics                    |

### A.23 Security

| Method | Endpoint                                  | Description                        |
|--------|-------------------------------------------|------------------------------------|
| GET    | `/api/v1/security`                        | Security overview                  |
| GET    | `/api/v1/security/today`                  | Today's security events            |
| GET    | `/api/v1/security/today/summary`          | Today's security summary           |
| GET    | `/api/v1/security/alerts`                 | Security alerts                    |
| POST   | `/api/v1/security/gate/scan`              | Gate QR/barcode scan               |
| POST   | `/api/v1/security/gate/check-in`          | Security gate check-in             |
| POST   | `/api/v1/security/gate/check-out`         | Security gate check-out            |
| GET    | `/api/v1/security/gate-logs`              | Security gate logs                 |
| GET    | `/api/v1/security/visits`                 | Security visit records             |

### A.24 Reception

| Method | Endpoint                                  | Description                        |
|--------|-------------------------------------------|------------------------------------|
| GET    | `/api/v1/reception`                       | Reception overview                 |
| GET    | `/api/v1/reception/today`                 | Today's reception events           |
| GET    | `/api/v1/reception/today/summary`         | Today's reception summary          |
| GET    | `/api/v1/reception/search`                | Search visitors/visits             |
| GET    | `/api/v1/reception/alerts`                | Reception alerts                   |
| GET    | `/api/v1/reception/rooms/today`           | Today's room bookings              |
| POST   | `/api/v1/reception/walk-in`               | Register walk-in visitor           |
| POST   | `/api/v1/reception/communication-override`| Override communication preferences |
| GET    | `/api/v1/reception/visits`                | Reception visit records            |
| GET    | `/api/v1/reception/requests`              | Reception requests                 |

### A.25 Admin

| Method | Endpoint                                  | Description                        |
|--------|-------------------------------------------|------------------------------------|
| GET    | `/api/v1/admin`                           | Admin overview                     |
| GET    | `/api/v1/admin/analytics/summary`         | Analytics summary                  |
| GET    | `/api/v1/admin/analytics/export`          | Export analytics data              |
| GET    | `/api/v1/admin/analytics/schedules`       | Analytics report schedules         |
| POST   | `/api/v1/admin/analytics/schedule`        | Create analytics schedule          |
| POST   | `/api/v1/admin/notifications/send`        | Send admin notification            |
| GET    | `/api/v1/admin/reminder-rules`            | Get reminder rules configuration   |

---

*End of Document*

*Dallah Albaraka VMS — Technical Documentation v1.0*
*Confidential — Client Internal Use Only*
