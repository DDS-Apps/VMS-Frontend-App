# Dallah Albaraka - Visitor Management System (VMS) Mobile App

## Environments: QA (this Replit project) and production (vms.dallah.com)
This Replit project runs and deploys the **QA** frontend. The `main` branch is
also the source of the **production** web bundle for IIS at `https://vms.dallah.com`.

| Setting | QA | Production |
|---------|----|------------|
| **Web / app domain** | `vms-frontend-folio3.replit.app` | `vms.dallah.com` (IIS) |
| **Backend API** | `https://vms-backend-app-qa.replit.app` | `https://vms.dallah.com` (`/api/*` proxied by IIS) |
| **Microsoft SSO** | `https://vms-backend-app-qa.replit.app` | `https://vms.dallah.com` |
| **Firebase Project** | `dallah-albaraka-vms` | `dallah-albaraka-vms` (shared) |
| **APP_VARIANT** | `staging` (default) | `production` |

### Environment configuration
- **Source of truth**: `config/app-environments.js` (plain CommonJS, public values only). `app.config.js` derives `extra.apiBaseUrl` / `microsoftAuthUrl` / `appDomain` / `legalPagesUrl`, iOS `associatedDomains` and Android `intentFilters` from it. `app.json` contains no environment-specific hosts.
- **Precedence**: `EXPO_PUBLIC_<KEY>` process env (Replit shared env; `*.replit.dev` values ignored) → git-ignored variant file (`.env.production` / `.env.staging`, keys `API_BASE_URL`, `MICROSOFT_AUTH_URL`, `APP_DOMAIN`, `LEGAL_PAGES_URL`, **no `EXPO_PUBLIC_` prefix**) → committed defaults. The Expo CLI auto-loads `.env.production` for every `expo export`, which is why variant files must never contain `EXPO_PUBLIC_*` keys.
- **Guard rails**: with `APP_VARIANT=production`, `app.config.js` ignores inherited `EXPO_PUBLIC_*` URLs (warns) and throws if the result still points at a QA/Replit host. The app reads `Constants.expoConfig.extra.*` before `process.env.EXPO_PUBLIC_*`. Web builds scan `dist/` and fail on foreign hostnames, a mismatched inlined `apiBaseUrl`, or leftover `%%PLACEHOLDER%%` tokens.
- **Web builds**: `npm run build:web` (explicit QA build) and `VMS_BACKEND_ORIGIN=http://localhost:3000 npm run build:web:production` (IIS; ignores inherited `EXPO_PUBLIC_*`, renders `web/web.config` into `dist/`, skips pre-compression). Replit Publishing uses `scripts/build-and-verify.sh` to build the QA variant without IIS-only `web.config` and with pre-compression. Logic lives in `scripts/build-web.js` + `scripts/lib/web-dist.js`.
- **Static web files** (`public/`): `firebase-messaging-sw.js`, legal pages, `.well-known/*`, Outlook add-in. `expo export` copies them into `dist/`; the add-in manifest/task pane use `%%APP_DOMAIN%%` / `%%APP_ORIGIN%%` / `%%ADDIN_*%%` placeholders filled per environment (distinct add-in ids for QA and production).
- **EAS build profiles**: `eas.json` sets `APP_VARIANT=staging` for dev/preview profiles and `APP_VARIANT=production` for production profiles.
- **Docs**: `DEPLOY_WEB_IIS.md` (IIS deployment), `docs/production-readiness-checklist.md` (what is done vs. still outside this repo), `docs/store-publishing-checklist.md`.
- **iOS Permissions**: `NSPhotoLibraryUsageDescription` and `expo-image-picker` plugin in `app.json` for App Store compliance.
- **Legal Section**: Privacy Policy and Terms of Service links in Settings open `{legalPagesUrl}/privacy-policy.html` and `/terms-conditions.html`.

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

### Quality Gates (CI Checks)
- **TypeScript (`typecheck`):** `npx tsc --noEmit` — enforces strict type correctness across the entire codebase. This check **must pass** before merging any PR. Run it via the Replit validation panel or `npx tsc --noEmit` locally. Type errors block merges.
- `tsconfig.json` has `"strict": true` — all strict TypeScript checks are enabled.

## System Architecture
The VMS app employs a Clean Architecture pattern, segmenting the application into Presentation, Business Logic (Domain), and Data layers.

**UI/UX Decisions:**
- **Color Scheme:** Dallah Albaraka branding (Brand Orange: #F58423, Brand Green: #009933, Brand Grey: #282829, Soft Orange: #FEF3E8). Default light mode background #FFFFFF, dark mode #1a1a1a.
- **Typography:** Albert Sans (Latin/English) and Cairo (Arabic) from Google Fonts, with fallback to Inter. Loaded via `@expo-google-fonts/albert-sans` and `@expo-google-fonts/cairo` packages. Web also loads via Google Fonts CSS in `web/index.html`.
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
- **Shared Components:** Reusable UI components including `ServiceIcons`, `SelectionCheckbox`, `StatusBadge`, `EmptyState`, and `PhoneInputWithCountry`.
- **Phone Input Component (`PhoneInputWithCountry`):** Mobile-friendly phone number input with country code selector featuring circular flag avatars (from flagcdn.com CDN), Gulf region priority (Saudi Arabia default), searchable country picker modal with KeyboardAvoidingView, auto-formatting per country, and full RTL support. Outputs full international format (+XXX...) compatible with existing API validation.
- **iOS Modal Handling Pattern:** iOS cannot stack multiple Modals. Use the `inlinePickerMode` state pattern inside parent modals to avoid modal stacking issues. When inside an edit/form modal, set inlinePickerMode to 'date' | 'startTime' | 'endTime' | 'purpose' instead of opening a separate picker Modal. Render inline picker overlays with `StyleSheet.absoluteFill` inside the parent modal. For modals with text inputs, wrap content with `KeyboardAvoidingView` (behavior="padding" on iOS).
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
- **Manager All Requests:** Comprehensive view of all approval requests for managers with 4 tabs (All, Pending Approval, Approved, Rejected), grid/list view toggle, search functionality, and infinite scroll pagination. Pending tab shows approve/reject actions; other tabs display request status. Integrates with `/api/v1/approvals/history` endpoint.

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
- **Status:** ENABLED - Firebase Crashlytics re-enabled using `expo-build-properties` with `buildReactNativeFromSource: true` to resolve Expo SDK 54 + static frameworks compatibility issues.
- **Architecture:** Firebase Crashlytics integration for crash monitoring with graceful fallback for development/web.
- **Features:** Automatic JavaScript exception reporting via ErrorBoundary integration, user attributes (id, email, name, role) set on login for crash grouping, custom logging and non-fatal error recording. Graceful fallback to console logging in Expo Go/web.
- **Build Configuration:** Requires EAS Build with `@react-native-firebase/crashlytics` plugin in app.json. Uses same `buildReactNativeFromSource: true` fix as Firebase Messaging.

**Multi-Environment Setup:**
- **Environments:** QA (Replit) and production (`vms.dallah.com`, IIS) share one Firebase project (`dallah-albaraka-vms`) but have separate backends. See the environment table at the top of this file.
- **Deployment:** Replit Publishing serves a production-configured bundle (`server.js` + `dist/`) that calls `https://vms.dallah.com`; the custom-domain production site remains an IIS build made with `npm run build:web:production` (see `DEPLOY_WEB_IIS.md`).
- **Configuration:** committed defaults in `config/app-environments.js`, optional git-ignored `.env.production` / `.env.staging` overrides, `EXPO_PUBLIC_*` env for QA only. `config/environments.ts` holds the runtime helpers.

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