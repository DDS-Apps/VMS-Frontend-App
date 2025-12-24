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
-   **Timezone Architecture:** Date/time displays use device local time for user familiarity. API submissions convert device-local times to server timezone (from login API response) before sending. Timezone conversion is handled server-side for storage and business logic. This approach avoids confusion from native pickers that can only show device local time.

**Features:**
-   **Authentication & Access:** Login, password management, Edit Profile.
-   **Dashboard:** Modern sidebar with user profile, dark mode toggle, logout.
-   **Role-Specific Flows:** Dedicated interfaces for Employee, Manager, Visitor, Receptionist, Security, Admin (Building, Buffet, Valet), Valet Driver, Buffet Staff.
-   **Visit Lifecycle Management:** Reschedule, cancel, event logging, "Waiting on Visitor Acceptance" filter.
-   **Users & Roles Management:** Comprehensive user management with bulk actions, three view modes (List, Grid, Table), filtering, and sorting.
-   **Meeting Rooms / Ammam Management:** Live room status, detail screens, room reassignment, out-of-service toggles, audit trails.
-   **Parking & Valet Configuration (Building Admin):** CRUD for parking spots, reorderable priority rules, utilization monitoring.
-   **Driver Load Monitoring (Valet Admin):** Task distribution dashboard for drivers.
-   **Visitor Invite Enhancements:** Handling of expired/invalid invites, display of parking/valet expectations.
-   **Settings - Notification Preferences:** Per-user notification preferences with role-specific defaults, push/email toggles, frequency options, and event-type specific toggles.
-   **Admin System Monitoring:** System event log, reminder schedule visualization.

**API Integration Layer:**
-   **Architecture:** Follows a structured pattern with `api/`, `components/shared/` (for loading states), `types/`, `services/` (domain services), `hooks/` (React Query hooks), `providers/`, and `contexts/`.
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
-   **express:** Production web server for serving Expo web builds.

## Deployment

### Web App Deployment (Published via Replit)
The web app uses **Autoscale deployment** with an Express server to serve a static landing page.

**Architecture Decision:** The full React Native Web app has compatibility issues with native-only packages (react-native-keyboard-controller, gesture-handler) that cause freezing in production. Instead, we serve a professional landing page that directs users to the mobile app via Expo Go.

**How it works:**
1. `server.js` serves static files from the `/public` folder
2. The landing page (`public/index.html`) provides:
   - App Store and Google Play links for Expo Go
   - Instructions for scanning the QR code
   - Professional DALLAH DIGITAL branding
3. No build step required - just static HTML/CSS

**To publish:**
1. Click the "Publish" button in Replit
2. The Express server starts and serves the landing page

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