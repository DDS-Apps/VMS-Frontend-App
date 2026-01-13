# RTL/LTR Implementation Guide

## Project Overview

- **Framework:** React Native + Expo SDK 54
- **Platforms:** Web (React Native Web), iOS, Android
- **Languages:** English (LTR), Arabic (RTL)

---

## Current Architecture

### Key Files

| File | Purpose |
|------|---------|
| `utils/rtlInitializer.ts` | Core RTL initialization and utility functions |
| `contexts/LanguageContext.tsx` | Language state management, locale switching, reload logic |
| `index.js` | App entry point, calls `initializeRTLSync()` before first render |
| `App.tsx` | Root component with `LanguageProvider` |

### Initialization Flow

```
1. index.js loads
2. initializeRTLSync() called BEFORE registerRootComponent()
3. On web: reads localStorage, calls I18nManager.forceRTL(), sets document.dir
4. On mobile: just calls I18nManager.allowRTL(true)
5. App renders with LanguageProvider
6. LanguageProvider calls initializeRTLAsync() to load stored locale
7. Components use useLanguage() hook to get isRTL state
```

### Storage

| Platform | Storage Mechanism | Key |
|----------|-------------------|-----|
| Web | localStorage + AsyncStorage | `@vms_language` |
| Mobile | AsyncStorage | `@vms_language` |

---

## The Core Problem

### React Native Web Behavior

React Native Web has a critical limitation: **View child order is cached during the initial layout pass**.

This means:

```jsx
// THIS DOES NOT WORK ON WEB
{isRTL ? (
  <>
    <TextB />
    <TextA />
  </>
) : (
  <>
    <TextA />
    <TextB />
  </>
)}
```

When `isRTL` changes, React updates the virtual DOM, but React Native Web does NOT re-order the actual DOM children. The elements stay in their original positions.

### Why Array.reverse() Also Fails

```jsx
// THIS ALSO DOES NOT WORK ON WEB
const items = [<A />, <B />, <C />];
return <View>{isRTL ? items.reverse() : items}</View>;
```

Same issue - the DOM child order is cached.

---

## Current Solution

### Approach: flexDirection Toggle

Instead of reordering children, we keep children in a consistent order and flip the container's flex direction:

```jsx
// THIS WORKS ON ALL PLATFORMS
<View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
  <Icon />
  <Text />
</View>
```

- **LTR (row):** Icon on left, Text on right
- **RTL (row-reverse):** Text on left, Icon on right

### Critical Requirement: I18nManager.forceRTL at Module Load

For `flexDirection: 'row-reverse'` to work on React Native Web, `I18nManager.forceRTL(true)` must be called **synchronously before the first render**.

On web, I18nManager state resets on every page reload, so we:
1. Read locale from localStorage (synchronous)
2. Call `I18nManager.forceRTL(needsRTL)` before any component renders
3. Set `document.documentElement.dir` for CSS/text direction

---

## Platform Differences

### Web (React Native Web)

| Aspect | Behavior |
|--------|----------|
| I18nManager.isRTL persistence | **Resets to false on every page reload** |
| Solution | Read localStorage synchronously at startup |
| Language switch | Requires `window.location.reload()` |
| Document direction | Must set `document.dir` manually |

### Mobile (iOS/Android)

| Aspect | Behavior |
|--------|----------|
| I18nManager.isRTL persistence | **Persists across app launches** |
| Solution | State survives restart after `forceRTL()` |
| Language switch | Requires app restart (`Updates.reloadAsync()`) |
| Document direction | N/A |

---

## Known Issues

### 1. Web RTL Not Applying on First Load

**Symptom:** Arabic mode shows LTR layout until page is refreshed again.

**Cause:** `I18nManager.forceRTL()` not called early enough, or called with wrong value.

**Current mitigation:** `initializeRTLSync()` in index.js before `registerRootComponent()`.

### 2. Double Reversal in Nested Components

**Symptom:** Some elements appear in correct order, others don't.

**Cause:** If a parent component uses `flexDirection: row-reverse` and a child also uses `flexDirection: row-reverse`, they cancel out.

**Solution:** Only the outermost container should toggle flexDirection. Inner components should use `flexDirection: 'row'` (fixed).

### 3. Mobile Initial State

**Symptom:** First launch may not reflect correct RTL until async storage is read.

**Current behavior:** Mobile relies on I18nManager's persisted state from previous launches. Fresh installs default to LTR until user switches language.

---

## Component Patterns

### Correct Pattern

```jsx
const { isRTL } = useLanguage();

return (
  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
    <Icon name="calendar" />
    <Text>Date here</Text>
  </View>
);
```

### Incorrect Patterns

```jsx
// BAD: Conditional child ordering (doesn't work on web)
{isRTL ? <><Text /><Icon /></> : <><Icon /><Text /></>}

// BAD: Array reversal (doesn't work on web)
{isRTL ? items.reverse() : items}

// BAD: Double flexDirection toggle (cancels out)
<View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
    <Icon /><Text />
  </View>
</View>
```

---

## Current Implementation Status

### What Works

- [x] Locale persistence in AsyncStorage/localStorage
- [x] Language switching with reload (web) / restart (mobile)
- [x] Document direction updates on web
- [x] Text alignment (`textAlign: isRTL ? 'right' : 'left'`)
- [x] Icon mirroring for directional icons (chevrons)
- [x] Components using flexDirection toggle

### What's Problematic

- [ ] **Inconsistent initialization:** Web has sync localStorage path, mobile doesn't have equivalent early init
- [ ] **Page reload required on web:** No in-place RTL switching
- [ ] **No RTL regression tests:** Changes may break RTL without detection
- [ ] **Some components may still have nested flexDirection issues**

---

## File-by-File Analysis

### utils/rtlInitializer.ts

```typescript
// Synchronous init - called before first render
export function initializeRTLSync(): void {
  I18nManager.allowRTL(true);
  
  if (Platform.OS === 'web') {
    // Read localStorage, call forceRTL, set document.dir
  } else {
    // Mobile: just allow RTL, actual state set by async init
  }
}

// Async init - called in LanguageProvider
export async function initializeRTLAsync(): Promise<SupportedLocale> {
  // Read from AsyncStorage
  // Update I18nManager if needed (mobile only)
  // Return stored locale
}
```

**Issue:** Mobile branch in `initializeRTLSync` doesn't call `forceRTL()`. It relies on persisted state, which may be stale on fresh install.

### contexts/LanguageContext.tsx

```typescript
// On language change:
if (Platform.OS === 'web') {
  localStorage.setItem(key, newLocale);
  window.location.reload(); // Full page reload
} else {
  await AsyncStorage.setItem(key, newLocale);
  I18nManager.forceRTL(needsRTL);
  await Updates.reloadAsync(); // App restart
}
```

**Issue:** Different code paths for web vs mobile. Both end up reloading, but the mechanics differ.

---

## Recommended Solutions

### Option A: Unified I18nManager Approach

1. Always call `I18nManager.forceRTL()` on all platforms in sync init
2. Use platform-specific storage reads (localStorage on web, fallback to default on mobile)
3. Keep the reload/restart requirement for language switches

```typescript
export function initializeRTLSync(): void {
  I18nManager.allowRTL(true);
  
  let needsRTL = false;
  
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    needsRTL = stored === 'ar';
  }
  // Mobile: I18nManager.isRTL already has persisted value
  // Only override if we have explicit storage on web
  
  I18nManager.forceRTL(needsRTL);
  
  if (Platform.OS === 'web') {
    setWebDocumentDirection(needsRTL ? 'ar' : 'en');
  }
}
```

### Option B: CSS-based RTL for Web

Instead of relying on I18nManager for web, use pure CSS direction:

1. Set `document.dir = 'rtl'` on the HTML element
2. Use CSS logical properties (`margin-inline-start`, `padding-inline-end`)
3. Use `[dir="rtl"]` CSS selectors for overrides

**Pros:** No React re-render needed, immediate effect
**Cons:** React Native styles don't support logical properties; requires significant refactor

### Option C: Context-based Re-render with Key

Force React to completely remount the app when RTL changes:

```jsx
<LanguageProvider>
  {({ layoutKey }) => (
    <AppRoot key={layoutKey} />
  )}
</LanguageProvider>
```

When `layoutKey` changes (e.g., `"ltr-1"` → `"rtl-2"`), React unmounts and remounts the entire tree, resetting React Native Web's cached child order.

**Note:** This is already partially implemented but may not trigger full remount.

---

## Testing Checklist

### Web Testing

1. Fresh load in English → verify LTR
2. Switch to Arabic → page reloads → verify RTL
3. Refresh page → verify Arabic/RTL persists
4. Switch back to English → verify LTR

### Mobile Testing

1. Fresh install → verify LTR
2. Switch to Arabic → app restarts → verify RTL
3. Force quit and reopen → verify Arabic/RTL persists
4. Switch back to English → verify LTR

### Component Checks

- [ ] Cards: icon/text order
- [ ] Date/time rows: calendar icon, date, separator, time
- [ ] Service icons: parking, meeting room, buffet icons
- [ ] Status badges: icon + text order
- [ ] Section headers: title on start, action on end
- [ ] Navigation: back arrows point correct direction

---

## Summary

The core issue is React Native Web's child order caching. The solution is:

1. **Use `flexDirection: isRTL ? 'row-reverse' : 'row'`** - NOT child reordering
2. **Call `I18nManager.forceRTL()` synchronously before first render** - especially on web
3. **Avoid nested flexDirection toggles** - only outermost container should toggle
4. **Accept that language switch requires reload/restart** - this is a platform limitation

The current implementation attempts this but has inconsistencies between web and mobile initialization paths that may cause issues.

---

## Questions for Diagnosis

Before proposing a fix, please clarify:

### 1. Which platforms have layout issues?

Are the layout problems (icons/text misaligned) happening on:
- [ ] Web only
- [ ] iOS only
- [ ] Android only
- [ ] All platforms
- [ ] Web + one mobile platform

### 2. Third-party libraries in use

Are you using any custom components or third-party libraries that handle layout or text rendering?

**Navigation:**
- React Navigation v7+ (yes - `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`)

**UI Components:**
- expo-blur
- react-native-reanimated
- react-native-gesture-handler
- react-native-safe-area-context
- react-native-svg
- react-native-qrcode-svg
- expo-linear-gradient
- expo-image

**Icons:**
- @expo/vector-icons (Feather icons)
- Custom `DDIcon` component for theme-aware icons

### 3. Fix preference

Do you want:
- [ ] **Fix existing implementation** - Debug and patch the current Replit setup
- [ ] **Clean minimal implementation** - Start fresh with a proven RTL pattern that avoids known issues

### 4. Specific components with issues

Which components are showing incorrect RTL behavior?
- [ ] VisitorRequestCard (date/time row, service icons)
- [ ] SectionHeader (title/action alignment)
- [ ] StatusBadge (icon/text order)
- [ ] ServiceIcons (icon arrangement)
- [ ] Navigation headers (back button, title)
- [ ] Other: _______________

---

## Expected Outcome

Once clarified, the goal is:
- Arabic content appears properly **right-aligned**
- English content remains **left-aligned**
- Icons appear on the **correct side** based on language direction
- Layout is **consistent across web, iOS, and Android**
