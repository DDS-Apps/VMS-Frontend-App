# RTL (Right-to-Left) Architecture Documentation

## Overview

This document describes the RTL (Right-to-Left) architecture implemented in the VMS application for **both mobile and web**, the refactoring work completed in January 2026, and guidelines for future development.

---

## Table of Contents

1. [Architecture Summary](#architecture-summary)
2. [How RTL Works](#how-rtl-works)
3. [Single Source of Truth](#single-source-of-truth)
4. [Developer Guidelines](#developer-guidelines)
5. [Common Patterns](#common-patterns)
6. [Troubleshooting](#troubleshooting)
7. [ESLint Rules](#eslint-rules)

---

## Architecture Summary

### Single Source of Truth: DirectionalRow

The application uses **DirectionalRow component** as the single source of truth for RTL row layouts. This works identically on **web and mobile**.

```
┌─────────────────────────────────────────────────────────────────┐
│                     RTL Flow (All Platforms)                    │
├─────────────────────────────────────────────────────────────────┤
│  1. LanguageContext provides { isRTL } based on locale          │
│  2. DirectionalRow reads isRTL from context                     │
│  3. Applies flexDirection: isRTL ? 'row-reverse' : 'row'       │
│  4. Same behavior on iOS, Android, and Web                      │
│  5. NO reliance on I18nManager auto-flip or document.dir        │
└─────────────────────────────────────────────────────────────────┘
```

### Key Files

| File                            | Purpose                                                  |
| ------------------------------- | -------------------------------------------------------- |
| `components/DirectionalRow.tsx` | **SINGLE SOURCE OF TRUTH** - Handles all RTL row layouts |
| `contexts/LanguageContext.tsx`  | Provides `isRTL` flag derived from locale                |
| `utils/localeManager.ts`        | Locale storage and RTL derivation                        |

---

## How RTL Works

### The DirectionalRow Approach

DirectionalRow explicitly applies `flexDirection: 'row-reverse'` for RTL instead of relying on platform-specific behavior:

```tsx
// DirectionalRow component
const flexDirection = isRTL ? "row-reverse" : "row";

// Usage:
<DirectionalRow gap={8}>
  <Icon name="user" />
  <Text>Username</Text>
</DirectionalRow>;

// In LTR: [Icon] [Username]
// In RTL: [Username] [Icon]
```

### Why This Approach?

1. **Single source of truth**: Same JavaScript logic on all platforms
2. **No browser dependency**: Doesn't rely on `<html dir="rtl">`
3. **No I18nManager quirks**: iOS I18nManager doesn't always auto-flip
4. **Explicit control**: `row-reverse` is clear intent

### Advanced Features

DirectionalRow includes:

- **Double-flip prevention**: Detects if browser sets `dir="rtl"` and adjusts
- **Nested row handling**: Context prevents nested DirectionalRows from double-flipping
- **RTLWrapper**: Component for wrapping third-party libraries

---

## Single Source of Truth

### DirectionalRow API

```tsx
import {
  DirectionalRow,
  useDirectionalStyle,
  getFlexDirection,
  RTLWrapper
} from '@/components/DirectionalRow';

// 1. DirectionalRow - Most common usage
<DirectionalRow gap={8}>
  <Icon name="user" />
  <Text>Username</Text>
</DirectionalRow>

// 2. useDirectionalStyle - For Pressable or custom components
const directionalStyle = useDirectionalStyle();
<Pressable style={[styles.container, directionalStyle]}>
  <Icon name="settings" />
  <Text>Settings</Text>
</Pressable>

// 3. getFlexDirection - For inline styles (less common)
<View style={{ flexDirection: getFlexDirection() }}>
  <Icon name="arrow" />
  <Text>Next</Text>
</View>

// 4. RTLWrapper - For third-party components
<RTLWrapper>
  <ThirdPartyCarousel items={items} />
</RTLWrapper>
```

### How It Works Internally

```tsx
// Simplified implementation of DirectionalRow
export const DirectionalRow = ({ children, style, ...props }) => {
  const { isRTL } = useLanguage();
  const { isInsideDirectionalRow } = useDirectionalContext();

  // Calculate direction considering nesting and browser state
  const flexDirection = calculateFlexDirection(isRTL, isInsideDirectionalRow);

  return (
    <DirectionalContext.Provider value={{ isInsideDirectionalRow: true }}>
      <View style={[{ flexDirection }, style]} {...props}>
        {children}
      </View>
    </DirectionalContext.Provider>
  );
};

// Core logic - same on ALL platforms
function calculateFlexDirection(isRTL, isNestedRow) {
  // Nested DirectionalRows don't double-flip
  if (isNestedRow) return "row";

  // Explicit row-reverse for RTL
  return isRTL ? "row-reverse" : "row";
}
```

### Edge Cases Handled

| Scenario                 | Solution                                       |
| ------------------------ | ---------------------------------------------- |
| Nested DirectionalRows   | Context tracks nesting, inner rows use `'row'` |
| Browser sets `dir="rtl"` | `browserWillAutoFlip()` detects and adjusts    |
| Third-party components   | Use `RTLWrapper` to isolate them               |
| Pressable components     | Use `useDirectionalStyle()` hook               |

---

## Developer Guidelines

### ✅ DO: Use DirectionalRow for All Row Layouts

```tsx
// For any icon + text or horizontal layout
<DirectionalRow gap={8}>
  <DDIcon name="clock" size={14} />
  <ThemedText>9:00 AM</ThemedText>
</DirectionalRow>
```

### ✅ DO: Use useDirectionalStyle for Pressable

```tsx
const directionalStyle = useDirectionalStyle();

<Pressable style={[styles.menuItem, directionalStyle]}>
  <DDIcon name="settings" />
  <ThemedText>Settings</ThemedText>
</Pressable>;
```

### ✅ DO: Use Logical Properties for Margins/Padding

```tsx
style={{
  marginStart: 8,      // Not marginLeft
  marginEnd: 8,        // Not marginRight
  paddingStart: 16,    // Not paddingLeft
  paddingEnd: 16,      // Not paddingRight
}}
```

### ✅ DO: Use RTLWrapper for Third-Party Components

```tsx
import { RTLWrapper } from "@/components/DirectionalRow";

<RTLWrapper>
  <ThirdPartyComponent />
</RTLWrapper>;
```

### ❌ DON'T: Use Inline flexDirection: 'row'

```tsx
// ❌ This will trigger an ESLint warning
<View style={{ flexDirection: 'row' }}>

// ✅ Use DirectionalRow instead
<DirectionalRow>
```

### ❌ DON'T: Manually Check isRTL for Layout

```tsx
// ❌ Never do this for layout
const direction = isRTL ? 'row-reverse' : 'row';
<View style={{ flexDirection: direction }}>

// ✅ Let DirectionalRow handle it
<DirectionalRow>
```

### ❌ DON'T: Override flexDirection in Styles

```tsx
// ❌ This overrides DirectionalRow's RTL handling
const styles = StyleSheet.create({
  menuItem: {
    flexDirection: "row", // Bad - overrides DirectionalRow
  },
});

// ✅ Remove flexDirection from styles
const styles = StyleSheet.create({
  menuItem: {
    alignItems: "center",
    padding: 12,
  },
});
```

### ❌ DON'T: Use Physical Properties for Directional Layout

```tsx
// ❌ Avoid these
style={{
  marginLeft: 8,    // Use marginStart
  marginRight: 8,   // Use marginEnd
  paddingLeft: 16,  // Use paddingStart
  paddingRight: 16, // Use paddingEnd
}}
```

---

## Common Patterns

### Pattern 1: Icon + Label Button

```tsx
<Pressable>
  <DirectionalRow gap={8}>
    <DDIcon name="plus" size={16} color={theme.primary} />
    <ThemedText>Add Item</ThemedText>
  </DirectionalRow>
</Pressable>
```

### Pattern 2: Menu Item with Pressable

```tsx
const directionalStyle = useDirectionalStyle();

<Pressable style={[styles.menuItem, directionalStyle]}>
  <DDIcon name="settings" size={20} />
  <ThemedText style={{ marginStart: 12, flex: 1 }}>Settings</ThemedText>
  <DDIcon name="chevron-right" size={16} />
</Pressable>;
```

### Pattern 3: List Item with Avatar

```tsx
<DirectionalRow style={styles.listItem}>
  <Avatar source={user.avatar} />
  <View style={{ marginStart: 12, flex: 1 }}>
    <ThemedText>{user.name}</ThemedText>
    <ThemedText variant="caption">{user.email}</ThemedText>
  </View>
  <Badge status={user.status} />
</DirectionalRow>
```

### Pattern 4: Notification Item

```tsx
const directionalStyle = useDirectionalStyle();

<Pressable style={[styles.notification, directionalStyle]}>
  <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
    <DDIcon name={iconName} size={20} color={iconColor} />
  </View>
  <View style={{ marginStart: 12, flex: 1 }}>
    <ThemedText numberOfLines={2}>{notification.message}</ThemedText>
    <ThemedText variant="caption">{timeAgo}</ThemedText>
  </View>
</Pressable>;
```

### Pattern 5: Sidebar Menu Item

```tsx
// In Sidebar.tsx - styles should NOT include flexDirection
const styles = StyleSheet.create({
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 12,
    // NO flexDirection here - DirectionalRow handles it
  },
});

<DirectionalRow style={styles.menuItem}>
  <DDIcon name={item.icon} size={20} />
  <ThemedText style={{ flex: 1 }}>{item.label}</ThemedText>
</DirectionalRow>;
```

---

## Troubleshooting

### Issue: Layout Not Flipping in RTL

**Cause**: Not using DirectionalRow or useDirectionalStyle.

**Solution**: Replace inline `flexDirection: 'row'` with DirectionalRow:

```tsx
// ❌ Before
<View style={{ flexDirection: 'row' }}>

// ✅ After
<DirectionalRow>
```

### Issue: Icons Still on Left in Arabic

**Cause**: Style object has `flexDirection: 'row'` that overrides DirectionalRow.

**Solution**: Remove flexDirection from StyleSheet:

```tsx
// ❌ This overrides DirectionalRow
const styles = StyleSheet.create({
  menuItem: { flexDirection: "row", padding: 12 },
});

// ✅ Remove flexDirection
const styles = StyleSheet.create({
  menuItem: { padding: 12 },
});
```

### Issue: Double-Flip (Elements Flipping Twice)

**Cause**: Browser `dir="rtl"` + DirectionalRow's `row-reverse` = double flip.

**Solution**:

1. Do NOT set `document.dir = 'rtl'` in web code
2. If third-party code sets it, DirectionalRow detects and adjusts via `browserWillAutoFlip()`

### Issue: Nested DirectionalRows Not Working

**Cause**: Nested rows could double-flip each other.

**Solution**: This is handled automatically! DirectionalRow uses Context to detect nesting and inner rows use `'row'` instead of `'row-reverse'`.

### Issue: Third-Party Component Not Respecting RTL

**Solution**: Wrap with RTLWrapper:

```tsx
import { RTLWrapper } from "@/components/DirectionalRow";

<RTLWrapper>
  <ThirdPartyCarousel items={items} />
</RTLWrapper>;
```

### Issue: Text Alignment Wrong in RTL

**Cause**: Using explicit `textAlign: 'left'` or `textAlign: 'right'`.

**Solution**: Omit textAlign for body text (defaults to start), or use `textAlign: 'start'` / `textAlign: 'end'`.

---

## ESLint Rules

An ESLint rule warns developers when using inline `flexDirection: 'row'`:

```js
// eslint.config.js
{
  rules: {
    "no-restricted-syntax": [
      "warn",
      {
        selector: "Property[key.name='flexDirection'][value.value='row']",
        message: "Avoid inline flexDirection: 'row'. Use DirectionalRow or useDirectionalStyle() for RTL support."
      }
    ]
  }
}
```

### What Triggers the Warning

```tsx
// ⚠️ Warning: Avoid inline flexDirection: 'row'
<View style={{ flexDirection: 'row' }}>

// ⚠️ Warning: Also in StyleSheet.create
const styles = StyleSheet.create({
  container: { flexDirection: 'row' }
});
```

### How to Fix

```tsx
// ✅ Use DirectionalRow
<DirectionalRow>
  <Icon />
  <Text>Label</Text>
</DirectionalRow>

// ✅ Or useDirectionalStyle for Pressable
const directionalStyle = useDirectionalStyle();
<Pressable style={[styles.container, directionalStyle]}>
```

---

## Testing Checklist

For every new screen or component, verify:

- [ ] Uses DirectionalRow or useDirectionalStyle() for horizontal layouts
- [ ] No inline `flexDirection: 'row'` (ESLint warns on this)
- [ ] Styles don't override flexDirection from DirectionalRow
- [ ] Uses `marginStart`/`marginEnd` (not `marginLeft`/`marginRight`)
- [ ] Uses `paddingStart`/`paddingEnd` (not `paddingLeft`/`paddingRight`)
- [ ] Text alignment looks correct in both LTR and RTL
- [ ] Icons point in the correct logical direction
- [ ] Test on both web and mobile in Arabic

---

## Summary

| Aspect                 | Implementation                                        |
| ---------------------- | ----------------------------------------------------- |
| Single source of truth | ✅ DirectionalRow component                           |
| RTL detection          | ✅ LanguageContext `isRTL` flag                       |
| Row direction          | ✅ Explicit `row-reverse` for RTL (not browser-based) |
| Browser dir="rtl"      | ❌ Not used - removed for consistency                 |
| Platform support       | ✅ Same code on iOS, Android, Web                     |
| Nested rows            | ✅ Context prevents double-flip                       |
| Third-party components | ✅ RTLWrapper available                               |
| Pressable components   | ✅ useDirectionalStyle() hook                         |
| ESLint enforcement     | ✅ Warns on inline flexDirection: 'row'               |
| Documentation          | ✅ This document                                      |

---

## References

- [React Native RTL Support](https://reactnative.dev/blog/2016/08/19/right-to-left-support-for-react-native-apps)
- [Logical Properties in React Native](https://reactnative.dev/docs/layout-props)

---

_Last Updated: January 2026_
_Architecture: DirectionalRow as single source of truth for all platforms_
