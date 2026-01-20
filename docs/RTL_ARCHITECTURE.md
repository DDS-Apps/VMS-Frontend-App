# RTL (Right-to-Left) Architecture Documentation

## Overview

This document describes the RTL (Right-to-Left) architecture implemented in the VMS mobile application, the refactoring work completed in January 2026, and guidelines for future development.

---

## Table of Contents

1. [Architecture Summary](#architecture-summary)
2. [How RTL Works](#how-rtl-works)
3. [Refactoring Completed](#refactoring-completed)
4. [Developer Guidelines](#developer-guidelines)
5. [Common Patterns](#common-patterns)
6. [Troubleshooting](#troubleshooting)
7. [Future Considerations](#future-considerations)

---

## Architecture Summary

### Single Source of Truth

The application uses **React Native's I18nManager** as the single source of truth for RTL handling. This is initialized at app startup before the first render.

```
┌─────────────────────────────────────────────────────────────────┐
│                     App Startup Flow                            │
├─────────────────────────────────────────────────────────────────┤
│  1. App.tsx loads                                               │
│  2. bootstrapLocale() called (from utils/localeManager.ts)      │
│  3. Reads stored locale from AsyncStorage                       │
│  4. Determines if RTL (Arabic = RTL, English = LTR)            │
│  5. Calls I18nManager.forceRTL(isRTL) BEFORE first render      │
│  6. React Native automatically flips:                           │
│     - flexDirection: 'row' → appears as 'row-reverse'          │
│     - marginStart/marginEnd → swap sides                        │
│     - paddingStart/paddingEnd → swap sides                      │
│     - textAlign: 'left'/'right' → swap                          │
│     - Absolute positioning with start/end                       │
└─────────────────────────────────────────────────────────────────┘
```

### Key Files

| File                            | Purpose                                                                 |
| ------------------------------- | ----------------------------------------------------------------------- |
| `utils/localeManager.ts`        | Single source of truth for locale storage and RTL derivation            |
| `utils/rtlInitializer.ts`       | Bootstrap function that initializes I18nManager before first render     |
| `utils/rtlHelpers.ts`           | Contains deprecated helper functions (kept for backwards compatibility) |
| `components/DirectionalRow.tsx` | Simple wrapper using `flexDirection: 'row'`                             |
| `App.tsx`                       | Calls `bootstrapLocale()` at startup                                    |

---

## How RTL Works

### The I18nManager Approach

When `I18nManager.forceRTL(true)` is called **before the first render**, React Native automatically transforms layout properties:

```tsx
// What you write:
<View style={{ flexDirection: "row" }}>
  <Text>First</Text>
  <Text>Second</Text>
</View>

// In LTR: [First] [Second]
// In RTL: [Second] [First]  ← Automatic flip!
```

### Why This Works

1. **Timing is critical**: `I18nManager.forceRTL()` must be called before any component renders
2. **No manual swapping needed**: React Native handles the transformation at the native level
3. **Consistent behavior**: All `flexDirection: 'row'` layouts are flipped automatically

### The DirectionalRow Component

```tsx
// components/DirectionalRow.tsx
export const DirectionalRow: React.FC<DirectionalRowProps> = ({
  children,
  style,
  ...props
}) => {
  return (
    <View style={[{ flexDirection: "row" }, style]} {...props}>
      {children}
    </View>
  );
};
```

This component simply applies `flexDirection: 'row'`. The I18nManager handles the RTL flip automatically.

---

## Refactoring Completed

### January 2026 Audit & Refactoring

An audit identified **~90 instances** of anti-patterns that were manually swapping children or using deprecated helper functions. These have been refactored.

### Anti-Patterns Removed

#### 1. ConditionalChildren Component (DELETED)

```tsx
// ❌ BEFORE - Anti-pattern (component deleted)
<ConditionalChildren swap={shouldSwapChildrenForRTL()}>
  <Icon name="arrow" />
  <Text>Label</Text>
</ConditionalChildren>

// ✅ AFTER - Correct approach
<DirectionalRow>
  <Icon name="arrow" />
  <Text>Label</Text>
</DirectionalRow>
```

#### 2. shouldSwapChildrenForRTL() Usage (DEPRECATED)

```tsx
// ❌ BEFORE - Anti-pattern
const swap = shouldSwapChildrenForRTL();
{
  swap ? (
    <>
      <Text>Label</Text>
      <Icon name="arrow" />
    </>
  ) : (
    <>
      <Icon name="arrow" />
      <Text>Label</Text>
    </>
  );
}

// ✅ AFTER - Correct approach
<DirectionalRow>
  <Icon name="arrow" />
  <Text>Label</Text>
</DirectionalRow>;
```

#### 3. Manual Array Reversal (REMOVED)

```tsx
// ❌ BEFORE - Anti-pattern
const items = isRTL ? [...data].reverse() : data;

// ✅ AFTER - Let I18nManager handle it
// Just render items in logical order
```

### Files Refactored

| Category                 | Files Modified                                                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **Admin Screens**        | BuffetSettingsScreen, ParkingValetSettingsScreen, ReminderRulesScreen, UserDetailScreen, UsersRolesScreen, ValetTasksScreen |
| **Common Screens**       | NotificationPreferencesScreen                                                                                               |
| **Employee Screens**     | VisitorRequestFormScreen, VisitorRequestsScreen                                                                             |
| **Receptionist Screens** | ReceptionistDashboardScreen, UpcomingVisitorsListScreen, WalkInVisitorsScreen                                               |
| **Security Screens**     | SecurityCheckInScreen                                                                                                       |
| **Visitor Screens**      | VisitorInviteScreen                                                                                                         |
| **Components**           | TimePicker                                                                                                                  |

### Deprecated Functions

The following functions in `utils/rtlHelpers.ts` are now deprecated and always return safe defaults:

```tsx
/** @deprecated - I18nManager handles RTL automatically. Always returns false. */
export function shouldSwapChildrenForRTL(): boolean {
  return false;
}

/** @deprecated - Use marginStart/marginEnd instead */
export function getDirectionalMargin(value: number): object {
  return { marginStart: value };
}

/** @deprecated - Use paddingStart/paddingEnd instead */
export function getDirectionalPadding(value: number): object {
  return { paddingStart: value };
}
```

---

## Developer Guidelines

### ✅ DO: Use Logical Properties

```tsx
// Use start/end instead of left/right
style={{
  marginStart: 8,      // Not marginLeft
  marginEnd: 8,        // Not marginRight
  paddingStart: 16,    // Not paddingLeft
  paddingEnd: 16,      // Not paddingRight
  textAlign: 'left',   // I18nManager flips this automatically
}}
```

### ✅ DO: Use DirectionalRow for Icon + Text Patterns

```tsx
<DirectionalRow>
  <DDIcon name="clock" size={14} />
  <ThemedText style={{ marginStart: 4 }}>9:00 AM</ThemedText>
</DirectionalRow>
```

### ✅ DO: Use flexDirection: 'row' Directly

```tsx
// This is automatically flipped in RTL
<View style={{ flexDirection: "row", alignItems: "center" }}>
  <Avatar />
  <Text>Username</Text>
</View>
```

### ❌ DON'T: Manually Swap Children

```tsx
// Never do this
const isRTL = I18nManager.isRTL;
{
  isRTL ? (
    <>
      <Text>Label</Text>
      <Icon />
    </>
  ) : (
    <>
      <Icon />
      <Text>Label</Text>
    </>
  );
}
```

### ❌ DON'T: Use shouldSwapChildrenForRTL()

```tsx
// This function is deprecated and always returns false
const swap = shouldSwapChildrenForRTL(); // ❌ Don't use
```

### ❌ DON'T: Use Physical Properties for Directional Layout

```tsx
// Avoid these for directional layout
style={{
  marginLeft: 8,   // ❌ Use marginStart
  marginRight: 8,  // ❌ Use marginEnd
  paddingLeft: 16, // ❌ Use paddingStart
  paddingRight: 16,// ❌ Use paddingEnd
}}
```

### ❌ DON'T: Use row-reverse for RTL

```tsx
// I18nManager handles this automatically
style={{
  flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', // ❌ Wrong
  flexDirection: 'row', // ✅ Correct - auto-flipped
}}
```

---

## Common Patterns

### Pattern 1: Icon + Label Button

```tsx
<Pressable>
  <DirectionalRow>
    <DDIcon name="plus" size={16} color={theme.primary} />
    <ThemedText style={{ marginStart: 8 }}>Add Item</ThemedText>
  </DirectionalRow>
</Pressable>
```

### Pattern 2: List Item with Chevron

```tsx
<Pressable style={{ flexDirection: "row", justifyContent: "space-between" }}>
  <View style={{ flexDirection: "row", alignItems: "center" }}>
    <Avatar source={user.avatar} />
    <ThemedText style={{ marginStart: 12 }}>{user.name}</ThemedText>
  </View>
  <DDIcon name="chevron-right" /> {/* Flips to chevron-left in RTL */}
</Pressable>
```

### Pattern 3: Form Field with Icon

```tsx
<View style={{ flexDirection: "row", alignItems: "center" }}>
  <DDIcon name="mail" size={20} />
  <TextInput style={{ flex: 1, marginStart: 12 }} placeholder="Email" />
</View>
```

### Pattern 4: Status Badge Row

```tsx
<View style={{ flexDirection: "row", justifyContent: "space-between" }}>
  <ThemedText>{item.name}</ThemedText>
  <View style={[styles.badge, { backgroundColor: statusColor }]}>
    <ThemedText>{status}</ThemedText>
  </View>
</View>
```

---

## Troubleshooting

### Issue: Layout Not Flipping in RTL

**Cause**: `I18nManager.forceRTL()` was called after components rendered.

**Solution**: Ensure `bootstrapLocale()` is called in `App.tsx` before any component mounts:

```tsx
// App.tsx
import { bootstrapLocale } from "@/utils/localeManager";

// Call BEFORE component definition
bootstrapLocale();

export default function App() {
  // ...
}
```

### Issue: Text Alignment Wrong in RTL

**Cause**: Using explicit `textAlign: 'left'` or `textAlign: 'right'`.

**Solution**: For body text, omit textAlign (defaults to start). For specific alignment needs, the I18nManager will flip 'left' to 'right' automatically.

### Issue: Icons Pointing Wrong Direction

**Cause**: Directional icons (arrows, chevrons) may need to be different icons in RTL.

**Solution**: Use icon names that indicate direction logically:

- `chevron-right` → points to "forward/next" direction
- `chevron-left` → points to "back/previous" direction
- Icons are NOT automatically mirrored; consider using different icons for RTL if needed

### Issue: Absolute Positioned Elements Misaligned

**Cause**: Using `left`/`right` instead of `start`/`end`.

**Solution**:

```tsx
// ❌ Wrong
style={{ position: 'absolute', right: 16 }}

// ✅ Correct
style={{ position: 'absolute', end: 16 }}
```

---

## Future Considerations

### 1. Icon Mirroring Strategy

Some icons should be mirrored in RTL (arrows, chevrons), while others should not (logos, checkmarks). Consider:

- Creating an `<RTLAwareIcon>` component that mirrors specific icons
- Or using different icon names for RTL vs LTR

### 2. Animation Direction

Slide animations may need to be reversed in RTL:

- Slide-in from right → Slide-in from left
- Consider using `I18nManager.isRTL` for animation direction

### 3. Gesture Handling

Swipe gestures may need adjustment:

- Swipe right to go back → Swipe left to go back in RTL
- Review gesture handlers in navigation

### 4. Third-Party Components

When adding new third-party components, verify they support RTL:

- Check if they use logical properties
- Test in RTL mode before integrating

### 5. Testing Checklist

For every new screen or component, verify:

- [ ] Uses `flexDirection: 'row'` (not `row-reverse`)
- [ ] Uses `marginStart`/`marginEnd` (not `marginLeft`/`marginRight`)
- [ ] Uses `paddingStart`/`paddingEnd` (not `paddingLeft`/`paddingRight`)
- [ ] Text alignment looks correct in both LTR and RTL
- [ ] Icons point in the correct logical direction
- [ ] No manual `I18nManager.isRTL` checks for layout

### 6. Cleanup Remaining Deprecated Code

The following deprecated functions in `utils/rtlHelpers.ts` can be fully removed once all usages are verified gone:

- `shouldSwapChildrenForRTL()`
- `getDirectionalMargin()`
- `getDirectionalPadding()`
- `getTextAlign()`

### 7. Consider Automated Linting

Add ESLint rules to prevent anti-patterns:

- Warn on `marginLeft`/`marginRight` usage
- Warn on `paddingLeft`/`paddingRight` usage
- Warn on `flexDirection: 'row-reverse'` usage
- Warn on imports from deleted `ConditionalChildren` component

---

## Summary

| Aspect                   | Status                                |
| ------------------------ | ------------------------------------- |
| Single source of truth   | ✅ I18nManager + localeManager.ts     |
| Anti-patterns removed    | ✅ ~90 instances refactored           |
| ConditionalChildren      | ✅ Deleted                            |
| shouldSwapChildrenForRTL | ✅ Deprecated (returns false)         |
| DirectionalRow           | ✅ Uses standard flexDirection: 'row' |
| Documentation            | ✅ This document                      |

---

## References

- [React Native RTL Support](https://reactnative.dev/blog/2016/08/19/right-to-left-support-for-react-native-apps)
- [I18nManager API](https://reactnative.dev/docs/i18nmanager)
- [Logical Properties in React Native](https://reactnative.dev/docs/layout-props)

---

_Last Updated: January 20, 2026_
_Refactoring completed by: Development Team_
