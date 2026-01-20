# RTL (Right-to-Left) Implementation Guide

> **Single Source of Truth for RTL/LTR handling in this codebase.**

---

## The Simple Rule

```typescript
// ALWAYS use flexDirection: 'row'
// I18nManager handles RTL on ALL platforms
flexDirection: 'row'
```

**Never use:**
- ❌ `flexDirection: 'row-reverse'` for RTL
- ❌ `I18nManager.forceRTL()` in components (only at app startup)
- ❌ Manual child swapping

---

## How It Works

When `I18nManager.forceRTL(true)` is called **before first render**:

| Platform | Mechanism | Result |
|----------|-----------|--------|
| **Mobile** | I18nManager flips layouts | `row` appears RTL |
| **Web** | I18nManager + `document.dir='rtl'` | RN Web handles RTL |

**This is why web was working fine** - React Native Web respects I18nManager when initialized early!

---

## Quick Reference

### DirectionalRow Component

```tsx
import { DirectionalRow } from '@/components/DirectionalRow';

<DirectionalRow gap={8}>
  <Icon name="user" />
  <Text>Username</Text>
</DirectionalRow>
// LTR: [Icon] [Username]
// RTL: [Username] [Icon]  ← I18nManager handles this!
```

### row() Helper

```tsx
import { row } from '@/utils/rtlStyles';

<View style={row(isRTL)}>
  <Icon name="user" />
  <Text>Username</Text>
</View>
```

### Text Alignment

```tsx
import { rtlText } from '@/utils/rtlStyles';

<Text style={rtlText(isRTL)}>{t('greeting')}</Text>
// RTL: textAlign: 'right'
// LTR: textAlign: 'left'
```

### Logical Properties

```tsx
// Use these for horizontal spacing - they auto-flip in RTL
style={{
  marginStart: 16,   // Left in LTR, Right in RTL
  marginEnd: 8,      // Right in LTR, Left in RTL
  paddingStart: 12,
  paddingEnd: 12,
}}
```

### Directional Icons

```tsx
import { getDirectionalChevron, mirrorIcon } from '@/utils/rtlStyles';

// Get correct icon name
const icon = getDirectionalChevron(isRTL, 'forward');
// RTL: 'chevron-left', LTR: 'chevron-right'

// Or mirror the icon
<Icon name="arrow-right" style={mirrorIcon(isRTL)} />
```

---

## Initialization (Already Set Up)

### index.js
```javascript
import { initializeRTL } from "@/utils/rtl";
initializeRTL();  // MUST be before registerRootComponent
```

### web/index.html
```html
<script>
  var lang = localStorage.getItem('@vms_language');
  if (lang === 'ar') {
    document.documentElement.dir = 'rtl';
  }
</script>
```

---

## Changing Language

```tsx
const { setLocale } = useLanguage();

await setLocale('ar'); // Arabic (RTL)
await setLocale('en'); // English (LTR)
// App will restart/reload automatically
```

---

## DON'Ts

| ❌ Don't | Why |
|---------|-----|
| Use `row-reverse` for RTL | I18nManager handles this |
| Call `forceRTL()` in components | Only call once at startup |
| Swap children manually | Not needed anymore |
| Mix different RTL approaches | Causes double-flip |

---

## File Reference

| File | Purpose |
|------|---------|
| `utils/rtl.ts` | Core initialization |
| `utils/rtlStyles.ts` | Style helpers |
| `utils/rtlInitializer.ts` | Backwards compatibility |
| `components/DirectionalRow.tsx` | Row component |
| `contexts/LanguageContext.tsx` | Language state |

---

## Summary

**Trust I18nManager.** When initialized correctly:
- Use `flexDirection: 'row'` everywhere
- Use `marginStart/marginEnd` for spacing
- Use `rtlText(isRTL)` for text alignment
- I18nManager handles the rest on ALL platforms!
