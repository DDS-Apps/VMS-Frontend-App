# Brand Migration Report: Dallah Digital → Dallah Albaraka

**Migration Date:** January 2026  
**Status:** In Progress

---

## Executive Summary

This document outlines the migration from the **Dallah Digital** brand (Navy/Blue/Teal) to the **Dallah Albaraka** brand (Orange/Green/Grey).

---

## 1. Old Tokens Found

### Brand Colors (constants/theme.ts)

| Token Name | Old Value | Description |
|------------|-----------|-------------|
| `brandBlue` | `#307BF2` | Primary CTAs, buttons, links |
| `brandTeal` | `#12E1D5` | Secondary accent, badges |
| `brandNavy` | `#0e2342` | Dark background, sidebar |
| `brandNavyDark` | `#041A3A` | Text on light surfaces |
| `softTeal` | `#E4FCF9` | Subtle accent backgrounds |

### Neutral Colors

| Token Name | Old Value | Description |
|------------|-----------|-------------|
| `grey900` | `#526178` | Secondary text |
| `grey300` | `#C7CCD3` | Borders, dividers |
| `grey200` | `#DFE2E6` | Card borders |
| `grey50` | `#F5F7FA` | Light backgrounds |
| `white` | `#FFFFFF` | Surfaces |

### Status Colors

| Token Name | Old Value | Description |
|------------|-----------|-------------|
| `success` | `#22C55E` | Approve/Accept buttons |
| `warning` | `#FFA000` | Warning states |
| `error` | `#E53935` | Error states |
| `info` | `#307BF2` | Info/links |

### Gradient Colors

| Token Name | Old Value |
|------------|-----------|
| `start` | `#12E1D5` (brandTeal) |
| `end` | `#307BF2` (brandBlue) |

---

## 2. Hardcoded Colors Found

### In Components (15 occurrences)

| File | Count | Notes |
|------|-------|-------|
| `components/DashboardLayout.tsx` | 6 | Various UI colors |
| `components/shared/RequestTimeline.tsx` | 5 | Timeline indicators |
| `components/VisitorActionButton.tsx` | 2 | Button states |
| `components/SidebarGroup.tsx` | 1 | Sidebar styling |
| `components/shared/LoadingButton.tsx` | 1 | Loading state |

### In Screens (66 occurrences)

| File | Count | Notes |
|------|-------|-------|
| `screens/Visitor/VisitorInviteScreen.tsx` | 13 | Visitor flow colors |
| `screens/BuildingAdmin/BuildingAdminDashboardScreen.tsx` | 10 | Dashboard charts |
| `screens/Buffet/BuffetBoardScreen.tsx` | 10 | Buffet UI |
| `screens/BuildingAdmin/AllRequestsScreen.tsx` | 7 | Request status colors |
| `screens/Auth/SplashScreen.tsx` | 4 | Splash background |
| `screens/BuffetAdmin/BuffetAllRequestsScreen.tsx` | 4 | Request colors |
| Others | 18 | Various screens |

### In Utils (7 occurrences)

| File | Count | Notes |
|------|-------|-------|
| `utils/statusStyles.ts` | 7 | Status color definitions |

### In app.json

| Location | Old Value | Purpose |
|----------|-----------|---------|
| `splash.backgroundColor` | `#0e2342` | Splash screen background |
| `notifications.color` | `#0e2342` | Notification tint |
| `android.adaptiveIcon.backgroundColor` | `#FFFFFF` | Android icon background |

---

## 3. Old Typography/Font Families

### Current Latin Fonts (Inter)

| Token | Value |
|-------|-------|
| `latinRegular` | `Inter_400Regular` |
| `latinMedium` | `Inter_500Medium` |
| `latinSemiBold` | `Inter_600SemiBold` |
| `latinBold` | `Inter_700Bold` |

### Current Arabic Fonts (Noto Sans Arabic)

| Token | Value |
|-------|-------|
| `arabicRegular` | `NotoSansArabic_400Regular` |
| `arabicMedium` | `NotoSansArabic_500Medium` |
| `arabicSemiBold` | `NotoSansArabic_600SemiBold` |
| `arabicBold` | `NotoSansArabic_700Bold` |

---

## 4. Migration Mapping Table

### Brand Colors: OLD → NEW

| Old Token | Old Value | New Token | New Value | Notes |
|-----------|-----------|-----------|-----------|-------|
| `brandBlue` | `#307BF2` | `brandOrange` | `#F58423` | Primary accent |
| `brandTeal` | `#12E1D5` | `brandGreen` | `#009933` | Secondary/success |
| `brandNavy` | `#0e2342` | `brandGrey` | `#282829` | Dark background |
| `brandNavyDark` | `#041A3A` | `brandGreyDark` | `#1A1A1B` | Darker variant |
| `softTeal` | `#E4FCF9` | `softOrange` | `#FDE6D3` | Subtle backgrounds |

### Tint Scale (NEW)

**Orange Tints:**
| Tint | Value |
|------|-------|
| 100% | `#F58423` |
| 80% | `#F79D4F` |
| 60% | `#F9B57B` |
| 40% | `#FBCEA7` |
| 20% | `#FDE6D3` |

**Green Tints:**
| Tint | Value |
|------|-------|
| 100% | `#009933` |
| 80% | `#33AD5C` |
| 60% | `#66C285` |
| 40% | `#99D6AD` |
| 20% | `#CCEBD6` |

**Grey Tints:**
| Tint | Value |
|------|-------|
| 100% | `#282829` |
| 80% | `#535354` |
| 60% | `#7E7E7F` |
| 40% | `#A9A9A9` |
| 20% | `#D4D4D4` |

### Typography: OLD → NEW

| Old Font | New Font | Weight Mapping |
|----------|----------|----------------|
| `Inter_700Bold` | `FSAlbertPro-ExtraBold` | Headlines |
| `Inter_600SemiBold` | `FSAlbertPro-Bold` | Subheadlines |
| `Inter_400Regular` | `FSAlbertPro-Regular` | Body |
| `Inter_300Light` | `FSAlbertPro-Light` | Exceptional |
| `NotoSansArabic_700Bold` | `FSAlbertArabicWeb-ExtraBold` | Arabic Headlines |
| `NotoSansArabic_400Regular` | `FSAlbertArabicWeb-Regular` | Arabic Body |

---

## 5. Risks and Considerations

### Contrast Issues

1. **Orange on White**: Orange (#F58423) has lower contrast than blue on white backgrounds. Button text must remain white for WCAG compliance.

2. **Green for Success**: Using brand green (#009933) for success states is a good semantic match. Existing success color (#22C55E) is brighter but can be replaced.

3. **Dark Mode**: The grey (#282829) is less saturated than navy. Dark mode surfaces may need slight adjustments for visual hierarchy.

### Dark Mode Palette Adjustments

| Element | Old (Navy-based) | New (Grey-based) |
|---------|------------------|------------------|
| Background | `#0e2342` | `#282829` |
| Surface | `#1a3a5a` | `#353536` |
| Surface Secondary | `#254a6a` | `#424243` |
| Primary Accent | `#12E1D5` (Teal) | `#F79D4F` (Orange 80%) |

### Font Availability

- **FS Albert Pro** and **FS Albert Arabic Web** are commercial fonts
- Fallback fonts will be used until font files are added
- See `docs/FONTS_SETUP.md` for installation instructions

### Assets to Update

1. App icon (iOS/Android) - ✅ New icon provided
2. Splash screen logo - Needs creation or extraction
3. Favicon - Needs update
4. In-app logo (AppLogo component) - ✅ New logo provided
5. Notification icon - May need recoloring

---

## 6. Migration Checklist

- [ ] Update `BrandColors` in `constants/theme.ts`
- [ ] Update `NeutralColors` with grey tints
- [ ] Update `StatusColors` (green for success)
- [ ] Update `GradientColors` (orange to green)
- [ ] Rebalance dark mode palette
- [ ] Update `FontFamily` tokens with FS Albert
- [ ] Add font fallbacks for missing files
- [ ] Replace app icon in `assets/images/`
- [ ] Update splash screen in app.json
- [ ] Update notification color in app.json
- [ ] Replace logo in `components/AppLogo.tsx`
- [ ] Search and replace hardcoded hex values
- [ ] Update `utils/statusStyles.ts`
- [ ] Update chart colors
- [ ] Test on light and dark modes
- [ ] Verify RTL/Arabic rendering

---

## 7. Post-Migration Validation

1. Visual smoke test all major screens
2. Verify button contrast ratios
3. Test dark mode toggle
4. Verify Arabic font rendering
5. Check notification appearance
6. Validate app icon on iOS/Android simulators
