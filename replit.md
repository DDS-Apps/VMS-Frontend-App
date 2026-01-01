# DALLAH DIGITAL - Visitor Management System (VMS) Mobile App

## Overview
The DALLAH DIGITAL Visitor Management System (VMS) is a comprehensive React Native and Expo mobile application designed to streamline visitor management for organizations. It supports nine distinct user roles with specialized interfaces for various functions like visitor requests, check-ins, parking, valet services, and buffet bookings. Visitors interact via unique external invitation links through a lightweight web view. The system is branded with DALLAH DIGITAL's color scheme, defaults to light mode, and focuses on UI/UX design and visual analytics using mock data.

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
The VMS app adheres to a Clean Architecture pattern, dividing the application into Presentation, Business Logic (Domain), and Data layers.

**UI/UX Decisions:**
-   **Color Scheme:** DALLAH DIGITAL branding (Brand Navy Dark: #041A3A, Brand Blue: #307BF2, Brand Teal: #12E1D5, Brand Navy: #0e2342, Soft Teal: #E4FCF9). Default light mode background #FFFFFF, dark mode #0e2342.
-   **Accessibility:** WCAG contrast compliant text and button colors.
-   **Card Styling:** Selectable cards with subtle grey border, turning blue when selected. Card icons use navy in light mode and teal in dark mode.
-   **Navigation:** Dashboard-style interface with a responsive, collapsible left sidebar supporting touch-swipe gestures, hamburger menu, and RTL support. Features accordion-style grouped navigation.
-   **Theme:** Default light mode with a dark mode toggle.
-   **Components:** Reusable, themed UI components.
-   **Visual Analytics:** Role-specific KPI cards and progress bar visualizations with mock data.
-   **Design System:** Comprehensive design system inspired by iOS 26 liquid glass.
-   **View Mode Toggle Pattern:** Grid/List/Table view toggles in section title rows.

**Technical Implementations:**
-   **Core Technologies:** React Native, Expo, TypeScript.
-   **Iconography & RTL Support:** `DDIcon` component for theme-aware icons with automatic RTL mirroring. Full RTL compatibility.
-   **State Management:** Centralized state service using mutable mock data and `useFocusEffect` for reactive updates.
-   **Role-Based Access:** Specialized interfaces and navigation for nine distinct user roles.
-   **Internationalization (i18n):** Bilingual support for English (LTR) and Arabic (RTL) across all 40+ screens using type-safe translation keys, a `LanguageContext`, and `useTranslation` hook.
-   **Shared Components:** Reusable UI components including `ServiceIcons`, `SelectionCheckbox`, `StatusBadge`, and `EmptyState`.
-   **Utility Services:** Centralized utility functions for `dateTimeUtils`, `statusUtils`, and `reminderUtils` supporting RTL locales and i18n.
-   **Timezone Architecture:** All date/time displays and API submissions use device-local time. The client performs no timezone conversion - it sends raw device-local dates and times to the server. The server is responsible for all timezone normalization and conversion. This approach avoids confusion since native mobile date/time pickers can only display device-local time and cannot be configured for a different timezone.

**Features:**
-   **Authentication & Access:** Login, password management, Edit Profile.
-   **Dashboard:** Modern sidebar with user profile, dark mode toggle, logout.
-   **Role-Specific Flows:** Dedicated interfaces for Employee, Manager, Visitor, Receptionist, Security, Admin (Building, Buffet, Valet), Valet Driver, Buffet Staff.
-   **Visit Lifecycle Management:** Reschedule, cancel, event logging, "Waiting on Visitor Acceptance" filter.
-   **Users & Roles Management:** Comprehensive user management with bulk actions, three view modes (List, Grid, Table), filtering, and sorting.
-   **Meeting Rooms / Ammam Management:** Live room status, detail screens, room reassignment, out-of-service toggles, audit trails.
-   **Parking & Valet Configuration (Building Admin):** CRUD for parking spots, reorderable priority rules, utilization monitoring.
-   **Parking Dashboard (Valet Admin):** Read-only monitoring dashboard showing today's visitor parking status, with KPIs for expected visitors, parking needs, car info availability, and check-ins. Operations are managed externally.
-   **Visitor Parking Selection:** Visitors select their parking preference when accepting invitations via a modal with 3 options: no parking, parking with car details, or parking with info to be provided later.
-   **Visitor Invite Enhancements:** Handling of expired/invalid invites, display of parking/valet expectations.
-   **Settings - Notification Preferences:** Per-user notification preferences with role-specific defaults, push/email toggles, frequency options, and event-type specific toggles.
-   **Admin System Monitoring:** System event log, reminder schedule visualization.

**Project Structure:**
-   **Screens Organization:**
    -   `screens/Auth/` - Authentication screens (LoginScreen, SplashScreen)
    -   `screens/Profile/` - User profile screens (EditProfileScreen, ChangePasswordScreen)
    -   `screens/Common/` - Shared screens (NotificationsScreen, SettingsScreen, NotificationPreferencesScreen)
    -   `screens/[RoleName]/` - Role-specific screens organized by user role

**API Integration Layer:**
-   **Architecture:** Follows a structured pattern with `api/` (HTTP client core), `services/api/` (API service layer), `services/state/` (local state management), `utils/` (shared helpers), `components/shared/` (for loading states), `types/`, `hooks/` (React Query hooks), `providers/`, and `contexts/`.
-   **Services Structure:**
    -   `api/` - Core HTTP client infrastructure (httpClient, config, errors, validation)
    -   `services/api/` - API service files suffixed with `ApiService` (e.g., `visitorApiService.ts`, `authService.ts`)
    -   `services/state/` - Local state management files suffixed with `State` (e.g., `valetAdminState.ts`, `buffetAdminState.ts`)
    -   `utils/` - Shared utility functions (e.g., `dateTimeUtils.ts`, `statusUtils.ts`, `requestMappers.ts`)
-   **Key Features:** Axios HTTP Client with interceptors for JWT token injection and automatic refresh, standardized error handling, TanStack Query for data fetching, caching, mutations, and query invalidation, token management (refresh, AsyncStorage persistence), session management, role mapping, Azure AD SSO, and OTP flows.
-   **Backend URL:** `https://6dd8abd4-1ba4-4930-9228-1c309ae5d4e2-00-2v2xb6f19be8f.sisko.replit.dev`

## External Dependencies
-   **React Native:** Core framework.
-   **Expo SDK 54:** Development platform.
-   **TypeScript:** Language.
-   **React Navigation 7+:** In-app navigation.
-   **@expo/vector-icons:** For Feather icons.
-   **expo-blur:** Blur effects.
-   **react-native-safe-area-context:** Safe area handling.
-   **react-native-gesture-handler:** Sidebar swipe gestures.
-   **react-native-reanimated:** Sidebar animations and chevron rotation.
-   **react-native-keyboard-controller:** Keyboard management.
-   **@expo-google-fonts/inter:** Inter font family.
-   **@react-native-async-storage/async-storage:** Language preference and auth token persistence.
-   **axios:** HTTP client for API calls.
-   **@tanstack/react-query:** Data fetching, caching, and state management.

## Deployment

### Mobile App Deployment (EAS Build)
Mobile apps are built and distributed via Expo Application Services (EAS).

**Build Profiles (eas.json):**
- `development` - For development with Expo Go simulator support
- `preview` - Internal distribution APK/IPA for testing
- `production` - Store-ready builds (AAB for Android, IPA for iOS)

**Commands:**
```bash
# Initialize EAS (first time only)
npx eas init

# Build preview for testing
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview

# Build for production
npx eas build --platform ios --profile production
npx eas build --platform android --profile production

# Submit to stores
npx eas submit --platform ios
npx eas submit --platform android
```

**Note:** For iOS App Store and Google Play submission, configure your Apple Developer and Google Play Console credentials in `eas.json`.