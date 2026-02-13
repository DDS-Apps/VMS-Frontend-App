# Dallah Albaraka - Visitor Management System (VMS) Mobile App

## Overview
The Dallah Albaraka Visitor Management System (VMS) is a comprehensive React Native and Expo mobile application designed to streamline visitor management for organizations. It supports nine distinct user roles with specialized interfaces for functions such as visitor requests, check-ins, parking, valet services, and buffet bookings. Visitors interact via unique external invitation links through a lightweight web view. The system adheres to Dallah Albaraka's branding, defaults to light mode, and emphasizes strong UI/UX design with visual analytics. The project aims to enhance organizational efficiency and visitor experience through a robust, user-centric mobile platform.

## User Preferences
### Code Style
- TypeScript for all code
- Functional components with hooks
- Clean architecture patterns
- Separation of concerns
- Mobile-first design approach

### Development Workflow
- Hot module reloading enabled
- Mock data for rapid prototyping
- Design-first approach
- Role-based feature organization

## System Architecture
The VMS app employs a Clean Architecture pattern, segmenting the application into Presentation, Business Logic (Domain), and Data layers.

**UI/UX Decisions:**
- **Color Scheme:** Dallah Albaraka branding colors (Brand Orange: #F58423, Brand Green: #009933, Brand Grey: #282829, Soft Orange: #FEF3E8). Default light mode background #FFFFFF, dark mode #1a1a1a.
- **Typography:** Albert Sans (Latin/English) and FS Albert Arabic (Arabic) with Inter as a fallback.
- **Accessibility:** WCAG contrast compliant text and button colors.
- **Card Styling:** Selectable cards with subtle grey borders, turning orange when selected; card icons are grey in light mode and orange in dark mode.
- **Navigation:** Dashboard-style interface with a responsive, collapsible left sidebar supporting touch-swipe gestures, hamburger menu, and RTL support, featuring accordion-style grouped navigation.
- **Theme:** Default light mode with a dark mode toggle.
- **Components:** Reusable, themed UI components.
- **Visual Analytics:** Role-specific KPI cards and progress bar visualizations.
- **Design System:** Comprehensive design system inspired by iOS 26 liquid glass.
- **View Mode Toggle Pattern:** Grid/List/Table view toggles in section title rows.

**Technical Implementations:**
- **Core Technologies:** React Native, Expo, TypeScript.
- **Iconography & RTL Support:** `DDIcon` component for theme-aware icons with automatic RTL mirroring. Full RTL compatibility.
- **RTL Pattern (DirectionalRow as Single Source of Truth):** All horizontal row layouts must use the `DirectionalRow` component for consistent RTL behavior across web and mobile. `RTLHorizontalScrollView` is used for horizontal ScrollViews with tappable children (cards, tabs, filter pills) on iOS to correct touch alignment issues in RTL. **Exception:** Table-column scrollable sections (`scrollableColumns` pattern in list view rows) must use plain `ScrollView horizontal` — the child-wrapping in RTLHorizontalScrollView breaks fixed-width column layouts.
- **State Management:** Centralized state service using mutable mock data and `useFocusEffect` for reactive updates.
- **Role-Based Access:** Specialized interfaces and navigation for nine distinct user roles.
- **Internationalization (i18n):** Bilingual support for English (LTR) and Arabic (RTL) across all screens using type-safe translation keys.
- **Shared Components:** Reusable UI components like `ServiceIcons`, `SelectionCheckbox`, `StatusBadge`, `EmptyState`, and `PhoneInputWithCountry`.
- **Phone Input Component (`PhoneInputWithCountry`):** Mobile-friendly input with country code selector, Gulf region priority, searchable picker, auto-formatting, and full RTL support.
- **iOS Modal Handling Pattern:** Uses an `inlinePickerMode` state pattern within parent modals to avoid stacking multiple modals on iOS. Inline picker overlays use `StyleSheet.absoluteFill`. `KeyboardAvoidingView` is used for text inputs within modals on iOS.
- **Utility Services:** Centralized utility functions for `dateTimeUtils`, `statusUtils`, and `reminderUtils` supporting RTL locales and i18n.
- **Timezone Architecture:** All date/time displays and API submissions use device-local time; the server handles all timezone normalization.

**Features:**
- **Authentication & Access:** Login, password management, Edit Profile.
- **Dashboard:** Modern sidebar with user profile, dark mode toggle, logout.
- **Role-Specific Flows:** Dedicated interfaces for Employee, Manager, Visitor, Receptionist, Security, Admin (Building, Buffet, Valet), Valet Driver, Buffet Staff.
- **Visit Lifecycle Management:** Reschedule, cancel, event logging, "Waiting on Visitor Acceptance" filter.
- **Users & Roles Management:** Comprehensive user management with bulk actions, three view modes, filtering, and sorting.
- **Meeting Rooms / Ammam Management:** Live room status, detail screens, room reassignment, out-of-service toggles, audit trails.
- **Parking & Valet Configuration (Building Admin):** CRUD for parking spots, reorderable priority rules, utilization monitoring.
- **Parking Dashboard (Valet Admin):** Read-only monitoring dashboard with visitor parking status and KPIs.
- **Visitor Parking Selection:** Visitors select parking preference during invitation acceptance.
- **Visitor Invite Enhancements:** Handling of expired/invalid invites and display of parking/valet expectations.
- **Settings - Notification Preferences:** Per-user notification preferences with role-specific defaults, push/email toggles, frequency options, and event-type specific toggles.
- **Admin System Monitoring:** System event log, reminder schedule visualization.
- **Manager All Requests:** Comprehensive view of all approval requests with 4 tabs, grid/list view toggle, search, and infinite scroll pagination.

**API Integration Layer:**
- **Architecture:** Structured pattern utilizing Axios HTTP Client with interceptors for JWT token injection and automatic refresh, standardized error handling, TanStack Query for data fetching, caching, mutations, and query invalidation, token management (refresh, AsyncStorage persistence), session management, role mapping, Azure AD SSO, and OTP flows.

**Push Notifications:**
- **Architecture:** Unified push notification service supporting mobile (iOS/Android) and web, all using FCM tokens which the backend routes appropriately. This includes `@react-native-firebase/messaging` for iOS and Firebase SDK for web, with `expo-notifications` for Android.
- **Functionality:** Automatic device registration on login, unregistration on logout, and deep linking from notifications. Android channels are configured for various notification types.

**Crashlytics (Crash Reporting):**
- **Status:** ENABLED - Firebase Crashlytics is integrated for crash monitoring with graceful fallback for development/web, using `expo-build-properties` with `buildReactNativeFromSource: true`.
- **Features:** Automatic JavaScript exception reporting via ErrorBoundary, user attributes set on login for crash grouping, custom logging, and non-fatal error recording.

**Multi-Environment Setup:**
- **Environments:** Production (`dallahdigital-vms`) and QA (`dallah-albaraka-vms`) with separate Firebase projects and backends.
- **Configuration:** Environment variables stored in Replit Secrets; `dotenv` and EAS build profiles manage environment-specific configurations.

## External Dependencies
- **React Native:** Core framework.
- **Expo SDK 54:** Development platform.
- **TypeScript:** Language.
- **React Navigation 7+:** In-app navigation.
- **@expo/vector-icons:** For Feather icons.
- **expo-blur:** Blur effects.
- **react-native-safe-area-context:** Safe area handling.
- **react-native-gesture-handler:** Sidebar swipe gestures.
- **react-native-reanimated:** Sidebar animations and chevron rotation.
- **react-native-keyboard-controller:** Keyboard management.
- **@expo-google-fonts/albert-sans:** Albert Sans font family.
- **@react-native-async-storage/async-storage:** Language preference and auth token persistence.
- **axios:** HTTP client for API calls.
- **@tanstack/react-query:** Data fetching, caching, and state management.
- **expo-notifications:** Push notifications for mobile (iOS/Android).
- **firebase:** Firebase SDK for web push notifications (FCM).
- **@react-native-firebase/app:** React Native Firebase core.
- **@react-native-firebase/messaging:** Firebase Cloud Messaging for iOS FCM token retrieval.
- **@react-native-firebase/crashlytics:** Firebase Crashlytics for crash reporting.