# DALLAH VMS - Running & Publishing Guide

This guide explains how to run and publish the DALLAH VMS mobile application.

## Development

### In Replit (Web Preview)

Click the **Run** button in Replit to start the web app preview.

- Under the hood: `npm run dev:web`
- Uses Expo to serve the web version at the Replit preview URL
- Hot module reloading is enabled - changes appear automatically

### For Mobile Development

Open a Shell and run:

```bash
npm run dev:all
```

This starts the full Expo dev server with:
- QR code for Expo Go (scan with your phone)
- Options to open iOS/Android simulators
- Web support (press `w`)

**Expo Go Testing:**
1. Download "Expo Go" from App Store or Google Play
2. Scan the QR code shown in the terminal
3. The app loads on your physical device

## Building & Publishing

### Web Build

Export a static web bundle:

```bash
npm run build:web
```

Output: `dist/` folder - deploy to any static host (Netlify, Vercel, S3, etc.)

### Mobile Builds (Preview)

Create APK/IPA for internal testing:

```bash
# Android APK
npm run build:preview:android

# iOS (requires Apple Developer account)
npm run build:preview:ios
```

Preview builds are for internal distribution - share directly with testers.

### Mobile Builds (Production)

Create store-ready builds:

```bash
# Android App Bundle (for Play Store)
npm run build:android

# iOS (for App Store)
npm run build:ios
```

### Build All Platforms

Run all production builds at once:

```bash
npm run publish:all
```

This executes:
1. Web export
2. iOS production build
3. Android production build

## EAS Configuration

The project uses Expo Application Services (EAS) for mobile builds.

**Build Profiles (`eas.json`):**

| Profile | Purpose | Output |
|---------|---------|--------|
| `development` | Dev builds with debugger | APK (Android) |
| `preview` | Internal testing | APK (Android), Ad-hoc (iOS) |
| `production` | App Store / Play Store | AAB (Android), IPA (iOS) |

**First-time Setup:**

```bash
# Login to Expo account
npx eas login

# Initialize EAS for this project
npx eas init
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start web preview (Replit default) |
| `npm run dev:web` | Start web preview explicitly |
| `npm run dev:all` | Start Expo with all platforms (QR code) |
| `npm run build:web` | Export static web bundle |
| `npm run build:preview:android` | Build Android APK for testing |
| `npm run build:preview:ios` | Build iOS for testing |
| `npm run build:android` | Build Android for Play Store |
| `npm run build:ios` | Build iOS for App Store |
| `npm run publish:all` | Build all production platforms |

## Deployment Targets

### Published URL (Replit)

When you click "Publish" in Replit:
- Serves a landing page at your published URL
- Users can download the APK from the landing page
- Update `public/index.html` with APK download link after building

### Mobile App Stores

1. Build with `npm run build:ios` / `npm run build:android`
2. Download artifacts from [expo.dev](https://expo.dev) dashboard
3. Submit to App Store Connect / Google Play Console

## Environment Variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_VMS_API_BASE_URL` | Backend API base URL |
| `REPLIT_DEV_DOMAIN` | Auto-set by Replit for dev server |

## Troubleshooting

**"Could not determine executable to run"**
- Run: `npm install eas-cli --save-dev`

**Web preview not loading**
- Check that port 5000 is exposed
- Ensure `$REPLIT_DEV_DOMAIN` is set

**EAS build fails**
- Run `npx eas login` to authenticate
- Check `eas.json` configuration
