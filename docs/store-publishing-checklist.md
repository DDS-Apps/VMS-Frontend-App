# Dallah Albaraka VMS — Store Publishing Checklist

## Pre-Build Configuration
- [ ] Switch APP_VARIANT to 'production' for production builds
- [ ] Verify .env.production has the correct production backend API URL
- [ ] Verify Firebase config files in config/prod/ are correct
- [ ] Increment version number if needed (EAS autoIncrement handles build number)
- [ ] Test production build on real devices before submitting

## Apple Developer Console Setup
- [ ] Apple Developer Account ($99/year) enrolled and active
- [ ] App ID created with bundle ID: com.dallah.vms
- [ ] Push Notification capability enabled on App ID
- [ ] APNs Authentication Key uploaded to Firebase Console (Cloud Messaging > iOS)
- [ ] App Store Connect listing created
- [ ] Signing certificates and provisioning profiles (EAS manages these automatically)

## Google Play Console Setup
- [ ] Google Play Developer Account ($25 one-time) enrolled and active
- [ ] App listing created in Play Console
- [ ] Play App Signing enrolled (recommended, EAS handles upload key)
- [ ] Target API level 34+ (Android 14) for new submissions

## App Store Metadata (Apple)
- [ ] App Name: "Dallah Albaraka VMS" (or chosen name, max 30 characters)
- [ ] Subtitle (max 30 characters)
- [ ] Description (up to 4000 characters)
- [ ] Keywords (up to 100 characters, comma-separated)
- [ ] Category: Business
- [ ] Screenshots required:
  - 6.9" display (iPhone 16 Pro Max) — required
  - 6.7" display (iPhone 15 Plus) — required
  - 6.5" display (iPhone 11 Pro Max) — optional but recommended
  - iPad Pro 13" — required if supportsTablet is true
- [ ] App Icon: 1024x1024 PNG, no transparency, no rounded corners (Apple adds them)
- [ ] Support URL
- [ ] Marketing URL (optional)
- [ ] Privacy Policy URL: {your-domain}/privacy-policy

## Google Play Store Metadata
- [ ] App Name (max 30 characters)
- [ ] Short Description (max 80 characters)
- [ ] Full Description (max 4000 characters)
- [ ] Feature Graphic: 1024x500 PNG or JPEG
- [ ] App Icon: 512x512 PNG
- [ ] Screenshots: minimum 2, recommended 8 per device type
  - Phone screenshots required
  - Tablet screenshots recommended
- [ ] Category: Business
- [ ] Content Rating: Complete IARC questionnaire
- [ ] Privacy Policy URL: {your-domain}/privacy-policy

## Privacy & Data Compliance
- [ ] **Apple Privacy Labels** (App Store Connect > App Privacy):
  - Contact Info: Name, email (collected for account)
  - Identifiers: User ID, Device ID (for push notifications)
  - Diagnostics: Crash Data (Firebase Crashlytics)
  - Usage Data: Product Interaction (analytics)
  - Mark all as "Linked to User's Identity" and "Used for App Functionality"
- [ ] **Google Data Safety Form** (Play Console > Data Safety):
  - Personal info: Name, email
  - Device identifiers: for push notifications
  - App activity: for crash reporting
  - Declare data is encrypted in transit
  - Declare data is not shared with third parties
  - Provide data deletion mechanism info
- [ ] Privacy Policy page live at: {backend-url}/privacy-policy
- [ ] Terms & Conditions page live at: {backend-url}/terms-conditions

## Apple Review Preparation
- [ ] **Test Account Credentials**: Provide Apple review team with:
  - Login email/username
  - Password
  - Any special instructions (e.g., "Use OTP login, OTP code is always 123456 in review environment")
  - Note about SSO: "Azure AD SSO requires corporate credentials — use email/OTP login for review"
- [ ] **Review Notes**: Explain:
  - App is for corporate visitor management (not general public)
  - Multiple user roles exist (employee, manager, receptionist, security, admin)
  - Test account has [role] access
- [ ] **Export Compliance**: ITSAppUsesNonExemptEncryption is already set to false
- [ ] **Content Rights**: Confirm you own all content/branding

## Android Review Preparation
- [ ] Content rating questionnaire completed
- [ ] Target audience: 18+ (business app)
- [ ] App access: provide test credentials if app requires login
- [ ] Advertising declaration: app contains no ads

## EAS Build Commands

```bash
# Staging/QA build (internal testing)
eas build --platform all --profile preview

# Production build (store submission)
eas build --platform all --profile production

# Submit to stores
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

## Pre-Submission Testing Checklist
- [ ] All login flows work (email/OTP, Azure AD SSO)
- [ ] Push notifications received on both iOS and Android
- [ ] Profile photo upload works
- [ ] All 9 user roles can access their dashboards
- [ ] English (LTR) and Arabic (RTL) both render correctly
- [ ] Dark mode works correctly
- [ ] App handles no internet connection gracefully (shows error, doesn't crash)
- [ ] Deep links from notifications work
- [ ] No crashes on cold start (check Crashlytics)
- [ ] No hardcoded test/QA data visible
- [ ] Privacy Policy and Terms links open correctly from Settings
- [ ] App works on oldest supported iOS version (check deployment target)
- [ ] App works on Android 8+ (API 26+)

## Common Rejection Reasons to Avoid
1. **Missing permission purpose strings** — FIXED: Added NSPhotoLibraryUsageDescription
2. **Login issues during review** — Provide clear test credentials and instructions
3. **Privacy policy missing/inaccessible** — FIXED: Added to Settings screen
4. **App crashes during review** — Test thoroughly on real production builds
5. **Incomplete functionality** — Ensure all visible features work end-to-end
6. **iPad support issues** — supportsTablet is true; test on iPad or iPad simulator
7. **IPv6 compatibility** — Ensure backend is accessible over IPv6 networks

## Post-Submission
- [ ] Monitor review status in App Store Connect and Play Console
- [ ] Be prepared to respond within 24 hours if reviewers have questions
- [ ] After approval, consider phased rollout (Google Play supports staged rollouts)
- [ ] Set up crash monitoring alerts in Firebase Crashlytics
