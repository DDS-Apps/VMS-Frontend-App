---
name: Web fonts runtime injection
description: Decision to load web fonts through injected @font-face rules with swap instead of blocking on expo-font.
---

On web the app declares its fonts itself (@font-face with true weight descriptors and font-display: swap) under the same names expo-font uses as keys, and skips expo-font loading on web so nothing is fetched twice. Web font stacks end in system fallbacks, so first paint uses fallbacks and swaps when files arrive. Native keeps its bundled-font gate.

Each per-weight key stays its own CSS family on purpose: the family key is how the codebase selects weight, and many styles apply a Regular token plus a fontWeight override and rely on synthesized bold. Collapsing weights into one family is a visual redesign, not a performance change.

**Why:** Blocking first paint on every font file (over 2 MB) was the largest share of web startup time.

**How to apply:** Add new fonts to the single shared face list so native and web stay aligned; never add a second loading path. Right after a dev-server restart assets are served slowly, so a screenshot showing fallback fonts is expected swap behaviour, not a regression.
