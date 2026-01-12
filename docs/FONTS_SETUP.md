# Fonts Setup Guide

This document explains how to add the FS Albert Pro and FS Albert Arabic Web fonts to the Dallah Albaraka VMS app.

---

## Required Font Files

### Latin Fonts (FS Albert Pro)

| Weight | Filename | Usage |
|--------|----------|-------|
| Light (300) | `FSAlbertPro-Light.ttf` or `.otf` | Exceptional cases |
| Regular (400) | `FSAlbertPro-Regular.ttf` or `.otf` | Body text |
| Bold (700) | `FSAlbertPro-Bold.ttf` or `.otf` | Subheadlines |
| ExtraBold (800) | `FSAlbertPro-ExtraBold.ttf` or `.otf` | Headlines |

### Arabic Fonts (FS Albert Arabic Web)

| Weight | Filename | Usage |
|--------|----------|-------|
| Light (300) | `FSAlbertArabicWeb-Light.ttf` or `.otf` | Exceptional cases |
| Regular (400) | `FSAlbertArabicWeb-Regular.ttf` or `.otf` | Body text |
| Bold (700) | `FSAlbertArabicWeb-Bold.ttf` or `.otf` | Subheadlines |
| ExtraBold (800) | `FSAlbertArabicWeb-ExtraBold.ttf` or `.otf` | Headlines |

---

## Installation Instructions

### For React Native (iOS/Android)

1. **Create the fonts directory:**
   ```bash
   mkdir -p assets/fonts
   ```

2. **Copy font files to `assets/fonts/`:**
   ```
   assets/fonts/
   ├── FSAlbertPro-Light.ttf
   ├── FSAlbertPro-Regular.ttf
   ├── FSAlbertPro-Bold.ttf
   ├── FSAlbertPro-ExtraBold.ttf
   ├── FSAlbertArabicWeb-Light.ttf
   ├── FSAlbertArabicWeb-Regular.ttf
   ├── FSAlbertArabicWeb-Bold.ttf
   └── FSAlbertArabicWeb-ExtraBold.ttf
   ```

3. **Update font loading in your app:**
   
   If using Expo, update the font loading in `App.tsx` or your root component:
   
   ```typescript
   import * as Font from 'expo-font';
   
   const [fontsLoaded] = useFonts({
     // FS Albert Pro (Latin)
     'FSAlbertPro-Light': require('./assets/fonts/FSAlbertPro-Light.ttf'),
     'FSAlbertPro-Regular': require('./assets/fonts/FSAlbertPro-Regular.ttf'),
     'FSAlbertPro-Bold': require('./assets/fonts/FSAlbertPro-Bold.ttf'),
     'FSAlbertPro-ExtraBold': require('./assets/fonts/FSAlbertPro-ExtraBold.ttf'),
     
     // FS Albert Arabic Web (Arabic)
     'FSAlbertArabicWeb-Light': require('./assets/fonts/FSAlbertArabicWeb-Light.ttf'),
     'FSAlbertArabicWeb-Regular': require('./assets/fonts/FSAlbertArabicWeb-Regular.ttf'),
     'FSAlbertArabicWeb-Bold': require('./assets/fonts/FSAlbertArabicWeb-Bold.ttf'),
     'FSAlbertArabicWeb-ExtraBold': require('./assets/fonts/FSAlbertArabicWeb-ExtraBold.ttf'),
   });
   ```

4. **For bare React Native (non-Expo):**
   
   Add to `react-native.config.js`:
   ```javascript
   module.exports = {
     assets: ['./assets/fonts'],
   };
   ```
   
   Then run:
   ```bash
   npx react-native-asset
   ```

### For Web

1. **Create the fonts directory:**
   ```bash
   mkdir -p public/fonts
   ```

2. **Copy font files (preferably WOFF2 format) to `public/fonts/`:**
   ```
   public/fonts/
   ├── FSAlbertPro-Light.woff2
   ├── FSAlbertPro-Regular.woff2
   ├── FSAlbertPro-Bold.woff2
   ├── FSAlbertPro-ExtraBold.woff2
   ├── FSAlbertArabicWeb-Light.woff2
   ├── FSAlbertArabicWeb-Regular.woff2
   ├── FSAlbertArabicWeb-Bold.woff2
   └── FSAlbertArabicWeb-ExtraBold.woff2
   ```

3. **Create or update CSS file (e.g., `src/styles/fonts.css`):**
   
   ```css
   /* FS Albert Pro - Latin */
   @font-face {
     font-family: 'FS Albert Pro';
     src: url('/fonts/FSAlbertPro-Light.woff2') format('woff2');
     font-weight: 300;
     font-style: normal;
     font-display: swap;
   }
   
   @font-face {
     font-family: 'FS Albert Pro';
     src: url('/fonts/FSAlbertPro-Regular.woff2') format('woff2');
     font-weight: 400;
     font-style: normal;
     font-display: swap;
   }
   
   @font-face {
     font-family: 'FS Albert Pro';
     src: url('/fonts/FSAlbertPro-Bold.woff2') format('woff2');
     font-weight: 700;
     font-style: normal;
     font-display: swap;
   }
   
   @font-face {
     font-family: 'FS Albert Pro';
     src: url('/fonts/FSAlbertPro-ExtraBold.woff2') format('woff2');
     font-weight: 800;
     font-style: normal;
     font-display: swap;
   }
   
   /* FS Albert Arabic Web - Arabic */
   @font-face {
     font-family: 'FS Albert Arabic Web';
     src: url('/fonts/FSAlbertArabicWeb-Light.woff2') format('woff2');
     font-weight: 300;
     font-style: normal;
     font-display: swap;
   }
   
   @font-face {
     font-family: 'FS Albert Arabic Web';
     src: url('/fonts/FSAlbertArabicWeb-Regular.woff2') format('woff2');
     font-weight: 400;
     font-style: normal;
     font-display: swap;
   }
   
   @font-face {
     font-family: 'FS Albert Arabic Web';
     src: url('/fonts/FSAlbertArabicWeb-Bold.woff2') format('woff2');
     font-weight: 700;
     font-style: normal;
     font-display: swap;
   }
   
   @font-face {
     font-family: 'FS Albert Arabic Web';
     src: url('/fonts/FSAlbertArabicWeb-ExtraBold.woff2') format('woff2');
     font-weight: 800;
     font-style: normal;
     font-display: swap;
   }
   
   /* RTL Arabic support */
   [lang="ar"], .rtl, .lang-ar {
     font-family: 'FS Albert Arabic Web', 'Noto Sans Arabic', sans-serif;
   }
   ```

4. **Import the CSS in your app entry point:**
   ```typescript
   import './styles/fonts.css';
   ```

---

## Fallback Behavior

Until the FS Albert fonts are installed, the app will use these fallback fonts:

| Platform | Latin Fallback | Arabic Fallback |
|----------|---------------|-----------------|
| iOS | Inter, System UI | Noto Sans Arabic |
| Android | Inter, Roboto | Noto Sans Arabic |
| Web | Inter, System UI | Noto Sans Arabic |

The fallback fonts are already bundled with the app via `@expo-google-fonts/inter` and `@expo-google-fonts/noto-sans-arabic`.

---

## Font Licensing

**Important:** FS Albert Pro and FS Albert Arabic Web are commercial fonts from Fontsmith. Ensure you have the appropriate license before using these fonts in your application.

- Web license for web deployment
- App license for iOS/Android deployment
- Desktop license for design work

---

## Verification

After installing fonts, verify they load correctly:

1. **Check the browser console** for any font loading errors
2. **Inspect text elements** to confirm the correct font-family is applied
3. **Test RTL mode** to verify Arabic fonts render properly
4. **Test on physical devices** to ensure fonts load on iOS/Android

---

## Troubleshooting

### Fonts not loading on mobile

- Ensure font files are in `assets/fonts/`
- Check that font names in code match the filenames exactly (case-sensitive)
- For Expo, rebuild the app after adding fonts

### Fonts not loading on web

- Check that font files are in `public/fonts/`
- Verify the CORS headers allow font loading
- Check browser console for 404 errors on font files

### Wrong font weight rendering

- Ensure each weight has its own @font-face declaration
- Verify the font-weight values match the CSS declarations
