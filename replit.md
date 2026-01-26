# Dallah Albaraka - Visitor Management System (VMS) Mobile App

## Current Environment: QA
This Replit project is configured for the **QA/Testing environment**.

| Setting | Value |
|---------|-------|
| **Backend API** | `https://vms-backend-app-qa.replit.app` |
| **Firebase Project** | `dallah-albaraka-vms` |
| **Branch** | `qa` |
| **Purpose** | QA/Testing - Not for production use |

All environment variables are stored in Replit Secrets (not hardcoded in code).

## Overview
The Dallah Albaraka Visitor Management System (VMS) is a comprehensive React Native and Expo mobile application. Its primary purpose is to streamline visitor management for organizations, supporting nine distinct user roles with specialized interfaces for various functions including visitor requests, check-ins, parking, valet services, and buffet bookings. Visitors interact through unique external invitation links via a lightweight web view. The system is branded with Dallah Albaraka's color scheme, defaults to light mode, and emphasizes UI/UX design and visual analytics.

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
- **Color Scheme:** Dallah Albaraka branding (Brand Orange: #F58423, Brand Green: #009933, Brand Grey: #282829, Soft Orange: #FEF3E8). Default light mode background #FFFFFF, dark mode #1a1a1a.
- **Typography:** FS Albert Pro (Latin) and FS Albert Arabic (Arabic) font families, with fallback to Inter/Noto Sans Arabic.
- **Accessibility:** WCAG contrast compliant text and button colors.
- **Card Styling:** Selectable cards with subtle grey border, turning orange when selected. Card icons use grey in light mode and orange in dark mode.
- **Navigation:** Dashboard-style interface with a responsive, collapsible left sidebar supporting touch-swipe gestures, hamburger menu, and RTL support. Features accordion-style grouped navigation.
- **Theme:** Default light mode with a dark mode toggle.
- **Components:** Reusable, themed UI components.
- **Visual Analytics:** Role-specific KPI cards and progress bar visualizations with mock data.
- **Design System:** Comprehensive design system inspired by iOS 26 liquid glass.
- **View Mode Toggle Pattern:** Grid/List/Table view toggles in section title rows.

**Technical Implementations:**
- **Core Technologies:** React Native, Expo, TypeScript.
- **Iconography & RTL Support:** `DDIcon` component for theme-aware icons with automatic RTL mirroring. Full RTL compatibility.
- **RTL Pattern (DirectionalRow as Single Source of Truth):** All horizontal row layouts must use `DirectionalRow` component for consistent RTL behavior across web and mobile:
  - **DirectionalRow Component:** The single source of truth for RTL row layouts. Uses explicit `flexDirection: 'row-reverse'` for RTL instead of relying on I18nManager auto-swap (mobile) or browser `dir` attribute (web).
  - **Usage Patterns:**
    ```tsx
    // For View-like containers:
    <DirectionalRow style={styles.row} alignItems="center">
      <Icon /><Text>Label</Text>
    </DirectionalRow>
    
    // For Pressable/Animated components (cannot use DirectionalRow):
    const { isRTL } = useLanguage();
    <Pressable style={{ flexDirection: getFlexDirection(isRTL) }}>
      <Icon /><Text>Label</Text>
    </Pressable>
    ```
  - **Helper Functions:**
    - `getFlexDirection(isRTL)` - returns 'row-reverse' for RTL, 'row' for LTR (for inline styles)
    - `useDirectionalStyle()` - hook returning `{ flexDirection }` style object
  - **Key Props:**
    - `alignItems` - defaults to 'center', pass 'stretch' for layout containers
    - `gap` - spacing between children
  - **Deprecated:** `getPlatformFlexDirection()`, `shouldSwapChildrenForRTL()` - do not use
  - **Avoid:** Using inline `flexDirection: 'row'` in View components - always use DirectionalRow
- **State Management:** Centralized state service using mutable mock data and `useFocusEffect` for reactive updates.
- **Role-Based Access:** Specialized interfaces and navigation for nine distinct user roles.
- **Internationalization (i18n):** Bilingual support for English (LTR) and Arabic (RTL) across all 40+ screens using type-safe translation keys, a `LanguageContext`, and `useTranslation` hook.
- **Shared Components:** Reusable UI components including `ServiceIcons`, `SelectionCheckbox`, `StatusBadge`, and `EmptyState`.
- **Utility Services:** Centralized utility functions for `dateTimeUtils`, `statusUtils`, and `reminderUtils` supporting RTL locales and i18n.
- **Timezone Architecture:** All date/time displays and API submissions use device-local time. The client sends raw device-local dates and times to the server, which is responsible for all timezone normalization and conversion.

**Features:**
- **Authentication & Access:** Login, password management, Edit Profile.
- **Dashboard:** Modern sidebar with user profile, dark mode toggle, logout.
- **Role-Specific Flows:** Dedicated interfaces for Employee, Manager, Visitor, Receptionist, Security, Admin (Building, Buffet, Valet), Valet Driver, Buffet Staff.
- **Visit Lifecycle Management:** Reschedule, cancel, event logging, "Waiting on Visitor Acceptance" filter.
- **Users & Roles Management:** Comprehensive user management with bulk actions, three view modes (List, Grid, Table), filtering, and sorting.
- **Meeting Rooms / Ammam Management:** Live room status, detail screens, room reassignment, out-of-service toggles, audit trails.
- **Parking & Valet Configuration (Building Admin):** CRUD for parking spots, reorderable priority rules, utilization monitoring.
- **Parking Dashboard (Valet Admin):** Read-only monitoring dashboard showing today's visitor parking status, with KPIs for expected visitors, parking needs, car info availability, and check-ins. Operations are managed externally.
- **Visitor Parking Selection:** Visitors select parking preference when accepting invitations via a modal (no parking, parking with car details, parking with info to be provided later).
- **Visitor Invite Enhancements:** Handling of expired/invalid invites, display of parking/valet expectations.
- **Settings - Notification Preferences:** Per-user notification preferences with role-specific defaults, push/email toggles, frequency options, and event-type specific toggles.
- **Admin System Monitoring:** System event log, reminder schedule visualization.

**API Integration Layer:**
- **Architecture:** Structured pattern with `api/` (HTTP client core), `services/api/` (API service layer), `services/state/` (local state management), `utils/` (shared helpers), `components/shared/` (for loading states), `types/`, `hooks/` (React Query hooks), `providers/`, and `contexts/`.
- **Key Features:** Axios HTTP Client with interceptors for JWT token injection and automatic refresh, standardized error handling, TanStack Query for data fetching, caching, mutations, and query invalidation, token management (refresh, AsyncStorage persistence), session management, role mapping, Azure AD SSO, and OTP flows.

**Push Notifications:**
- **Architecture:** Unified push notification service supporting mobile (iOS/Android) and web, all using FCM tokens that backend routes appropriately.
  - **iOS:** Uses `@react-native-firebase/messaging` to obtain FCM tokens (required because backend expects FCM tokens and routes FCM → APNs).
  - **Android:** Uses `expo-notifications` which returns native FCM tokens directly.
  - **Web:** Uses Firebase SDK with VAPID key for FCM tokens.
- **Functionality:** Automatic device registration on login, unregistration on logout via AuthContext integration. Deep linking from notifications is supported. Android channels are configured for default, visitors, approvals, tasks, and reminders.
- **iOS Requirements:** Requires EAS Build with `@react-native-firebase/app` and `@react-native-firebase/messaging` plugins. Firebase project must have APNs key configured in Cloud Messaging settings.

**Crashlytics (Crash Reporting):**
- **Status:** TEMPORARILY DISABLED - Firebase Crashlytics plugins removed from app.json due to incompatibility with New Architecture + static frameworks on Expo SDK 54. The service code remains intact with graceful fallback to console logging. To re-enable, add back the plugins listed in `services/crashlytics/crashlyticsService.ts` comments.
- **Architecture:** Firebase Crashlytics integration for crash monitoring with graceful fallback for development/web.
- **Features:** Automatic JavaScript exception reporting via ErrorBoundary integration, user attributes (id, email, name, role) set on login for crash grouping, custom logging and non-fatal error recording. Graceful fallback to console logging in Expo Go/web.

**Multi-Environment Setup:**
- **Environments:** Production (`dallahdigital-vms`) and QA (`dallah-albaraka-vms`) with separate Firebase projects and backends.
- **Deployment Strategy:** Separate Replit projects for each environment (Replit limitation of one deployment per project).
- **Branch Mapping:** `main` branch → Production, `qa` branch → QA.
- **Configuration:** All environment variables stored in Replit Secrets, not in code. See `config/environments.ts` for utilities and `config/README.md` for setup instructions.
- **Environment Detection:** Uses Firebase project ID to detect current environment at runtime.

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
- **@expo-google-fonts/inter:** Inter font family.
- **@react-native-async-storage/async-storage:** Language preference and auth token persistence.
- **axios:** HTTP client for API calls.
- **@tanstack/react-query:** Data fetching, caching, and state management.
- **expo-notifications:** Push notifications for mobile (iOS/Android).
- **firebase:** Firebase SDK for web push notifications (FCM).
- **@react-native-firebase/app:** React Native Firebase core.
- **@react-native-firebase/messaging:** Firebase Cloud Messaging for iOS FCM token retrieval.
- **@react-native-firebase/crashlytics:** Firebase Crashlytics for crash reporting.