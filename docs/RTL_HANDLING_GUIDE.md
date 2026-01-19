# RTL (Right-to-Left) Handling Guide

## Overview

This document explains how RTL layout is handled differently on **Web** vs **Mobile (iOS/Android)** in the Dallah Albaraka VMS app.

## The Core Problem

When the app language is Arabic (RTL), icon + text rows need to display:
- **Icons on the RIGHT side**
- **Labels/text on the LEFT of icons**

However, web and mobile platforms behave differently with RTL:

| Platform | RTL Behavior | Solution |
|----------|--------------|----------|
| **Web** | Browser's `dir="rtl"` automatically reverses flex row layout | Do NOT swap children - browser handles it |
| **Mobile (iOS/Android)** | React Native's I18nManager does NOT auto-reverse flex | MUST manually swap children order |

---

## How Flex Direction Works

### LTR (English) - Same on both platforms:
```
[Icon] [Text]
  ↑       ↑
first   second (in DOM order)
```

### RTL (Arabic) - Web:
Browser's `dir="rtl"` reverses the flex row automatically:
```jsx
// DOM order: Icon first, Text second
<View style={{ flexDirection: 'row' }}>
  <Icon />   // Appears on RIGHT (because browser reverses)
  <Text />   // Appears on LEFT
</View>
```
Result: `[Text] [Icon]` ← Correct!

### RTL (Arabic) - Mobile:
React Native does NOT auto-reverse, so same DOM order stays:
```jsx
// DOM order: Icon first, Text second
<View style={{ flexDirection: 'row' }}>
  <Icon />   // Still appears on LEFT (no reversal)
  <Text />   // Still appears on RIGHT
</View>
```
Result: `[Icon] [Text]` ← WRONG! Icons should be on right!

---

## The Solution: Platform-Aware Child Swapping

### Helper Function: `shouldSwapChildrenForRTL(isRTL)`

Located in: `utils/rtlInitializer.ts`

```typescript
import { Platform } from 'react-native';

export function shouldSwapChildrenForRTL(isRTL: boolean): boolean {
  // Only swap on mobile (iOS/Android) when RTL
  // Web doesn't need swapping - browser handles it via dir="rtl"
  if (Platform.OS === 'web') {
    return false;
  }
  return isRTL;
}
```

### Usage Pattern

```tsx
import { shouldSwapChildrenForRTL } from '@/utils/rtlInitializer';
import { useLanguage } from '@/contexts/LanguageContext';

function MyComponent() {
  const { isRTL } = useLanguage();
  const shouldSwap = shouldSwapChildrenForRTL(isRTL);

  return (
    <View style={{ flexDirection: 'row' }}>
      {shouldSwap ? (
        <>
          <Text>Label</Text>
          <Icon />
        </>
      ) : (
        <>
          <Icon />
          <Text>Label</Text>
        </>
      )}
    </View>
  );
}
```

---

## Comparison: Before vs After Fix

### Before (Broken on Mobile):
```tsx
// This works on web but NOT on mobile
<View style={{ flexDirection: 'row' }}>
  <Icon />
  <Text>Label</Text>
</View>
```

### After (Works on Both):
```tsx
const shouldSwap = shouldSwapChildrenForRTL(isRTL);

<View style={{ flexDirection: 'row' }}>
  {shouldSwap ? (
    <>
      <Text>Label</Text>
      <Icon />
    </>
  ) : (
    <>
      <Icon />
      <Text>Label</Text>
    </>
  )}
</View>
```

---

## Key Rules

### DO:
1. Always use `flexDirection: 'row'` (never 'row-reverse')
2. Use `shouldSwapChildrenForRTL(isRTL)` to determine if children should be swapped
3. Use `justifyContent: 'flex-start'` - it will be right-aligned on web RTL automatically
4. Set `textAlign: isRTL ? 'right' : 'left'` for text elements

### DON'T:
1. Never use `flexDirection: 'row-reverse'` (causes double-inversion bugs)
2. Never use `getPlatformFlexDirection()` (deprecated)
3. Don't mix flex-direction reversal with child order manipulation

---

## Specific Components to Update

When fixing RTL issues, check these areas:

### RequestDetailsScreen.tsx
- Email row (icon + email text)
- Phone row (icon + phone text)
- Visit Details section:
  - Date/Time row
  - Duration row
  - Purpose row
  - Host Name row

### Pattern for Service Rows:
```tsx
<View style={[styles.serviceRowNew, { flexDirection: 'row', justifyContent: 'flex-start' }]}>
  {shouldSwap ? (
    <>
      <View>
        <ThemedText style={{ textAlign: 'right' }}>Label</ThemedText>
        <ThemedText style={{ textAlign: 'right' }}>Value</ThemedText>
      </View>
      <View style={styles.serviceIcon}>
        <DDIcon name="icon-name" />
      </View>
    </>
  ) : (
    <>
      <View style={styles.serviceIcon}>
        <DDIcon name="icon-name" />
      </View>
      <View>
        <ThemedText style={{ textAlign: 'left' }}>Label</ThemedText>
        <ThemedText style={{ textAlign: 'left' }}>Value</ThemedText>
      </View>
    </>
  )}
</View>
```

---

## Testing Checklist

Before releasing, test these scenarios:

| Scenario | Web | iOS | Android |
|----------|-----|-----|---------|
| English (LTR) - Icons on left | ✓ | ✓ | ✓ |
| Arabic (RTL) - Icons on right | ✓ | ✓ | ✓ |
| Text alignment matches language direction | ✓ | ✓ | ✓ |
| Dashboard cards clickable | ✓ | ✓ | ✓ |

---

## DirectionalRow Component

For simpler cases, use the `DirectionalRow` component:

Located in: `components/DirectionalRow.tsx`

```tsx
import { DirectionalRow } from '@/components/DirectionalRow';

<DirectionalRow style={{ gap: 8 }}>
  <Icon />
  <Text>Label</Text>
</DirectionalRow>
```

This component automatically handles child swapping based on platform and RTL state.

---

## Summary

| Platform | isRTL | shouldSwap | Children Order |
|----------|-------|------------|----------------|
| Web | false | false | Icon, Text |
| Web | true | false | Icon, Text (browser reverses display) |
| Mobile | false | false | Icon, Text |
| Mobile | true | **true** | **Text, Icon** (manual swap) |
