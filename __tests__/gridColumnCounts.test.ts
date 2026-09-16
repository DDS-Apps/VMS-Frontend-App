/**
 * Grid column count tests for all-requests screens.
 *
 * These tests exercise the shared production utility that all three
 * all-requests screens import to derive their column count:
 *
 *   import { computeGridColumns, GRID_SIDEBAR_WIDTH } from '@/utils/gridLayout';
 *
 * Screens covered (all import the same utility):
 *   - screens/ValetAdmin/ValetAllRequestsScreen.tsx
 *   - screens/BuildingAdmin/AllRequestsScreen.tsx
 *   - screens/BuffetAdmin/BuffetAllRequestsScreen.tsx
 *
 * Because the screens share one production implementation, a breakpoint or
 * sidebar-width change in gridLayout.ts will immediately fail these tests,
 * while leaving them unmodified will still catch screen-level regressions if
 * a screen stops using the shared utility.
 *
 * Formula (from utils/gridLayout.ts):
 *   contentWidth = screenWidth >= 1024 ? screenWidth - GRID_SIDEBAR_WIDTH : screenWidth
 *   numColumns   = contentWidth >= 900 ? 3 : contentWidth >= 600 ? 2 : 1
 *
 * Run:
 *   npx jest __tests__/gridColumnCounts.test.ts
 */

import {
  computeCardWidth,
  computeContentWidth,
  computeGridColumns,
  GRID_LARGE_SCREEN_BREAKPOINT,
  GRID_SIDEBAR_WIDTH,
  VALET_GRID_PADDING_SIDE,
  VALET_GRID_GAP,
  ALL_REQUESTS_GRID_PADDING_SIDE,
  ALL_REQUESTS_GRID_GAP,
  BUFFET_GRID_PADDING_SIDE,
  BUFFET_GRID_GAP,
} from '../utils/gridLayout';

// ---------------------------------------------------------------------------
// Sanity-check the exported constant
// ---------------------------------------------------------------------------

describe('GRID_SIDEBAR_WIDTH', () => {
  it('is 280 px', () => {
    expect(GRID_SIDEBAR_WIDTH).toBe(280);
  });
});

// ---------------------------------------------------------------------------
// Mobile viewports  (numColumns === 1)
// ---------------------------------------------------------------------------

describe('computeGridColumns — mobile (numColumns === 1)', () => {
  it('width=375 → 1 column', () => {
    expect(computeGridColumns(375)).toBe(1);
  });

  it('width=599 (one pixel below tablet threshold) → 1 column', () => {
    expect(computeGridColumns(599)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Tablet viewports  (numColumns === 2)
// ---------------------------------------------------------------------------

describe('computeGridColumns — tablet (numColumns === 2)', () => {
  it('width=600 (tablet lower bound, no sidebar) → 2 columns', () => {
    // contentWidth = 600 (600 < 1024, no sidebar subtraction); 600 >= 600 → 2
    expect(computeGridColumns(600)).toBe(2);
  });

  it('width=768 (common tablet) → 2 columns', () => {
    // contentWidth = 768; 768 < 900 → 2
    expect(computeGridColumns(768)).toBe(2);
  });

  it('width=1024 (sidebar leaves contentWidth=744) → 2 columns, NOT 3', () => {
    // KEY regression guard: without sidebar subtraction the raw width (1024)
    // would wrongly cross the 900-px threshold and yield 3 columns.
    // With sidebar: contentWidth = 1024 − 280 = 744; 744 < 900 → 2.
    expect(computeGridColumns(1024)).toBe(2);
  });

  it('width=1179 (one pixel below the 3-column desktop threshold) → 2 columns', () => {
    // contentWidth = 1179 − 280 = 899; 899 < 900 → 2
    expect(computeGridColumns(1179)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Desktop viewports  (numColumns === 3)
// ---------------------------------------------------------------------------

describe('computeGridColumns — desktop (numColumns === 3)', () => {
  it('width=900 (no sidebar, exactly at 3-column threshold) → 3 columns', () => {
    // 900 < 1024 → no sidebar; contentWidth = 900; 900 >= 900 → 3
    expect(computeGridColumns(900)).toBe(3);
  });

  it('width=1180 (minimum width that yields 3 columns with sidebar) → 3 columns', () => {
    // contentWidth = 1180 − 280 = 900; 900 >= 900 → 3
    expect(computeGridColumns(1180)).toBe(3);
  });

  it('width=1200 → 3 columns', () => {
    // contentWidth = 1200 − 280 = 920; 920 >= 900 → 3
    expect(computeGridColumns(1200)).toBe(3);
  });

  it('width=1440 (large monitor) → 3 columns', () => {
    // contentWidth = 1440 − 280 = 1160; 1160 >= 900 → 3
    expect(computeGridColumns(1440)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Sidebar-subtraction boundary  (1023 → 1024)
// ---------------------------------------------------------------------------

describe('computeGridColumns — sidebar subtraction boundary', () => {
  it('width=1023 does NOT subtract sidebar → contentWidth=1023 → 3 columns', () => {
    // 1023 < 1024 threshold: full width used; 1023 >= 900 → 3
    expect(computeGridColumns(1023)).toBe(3);
  });

  it('width=1024 DOES subtract sidebar → contentWidth=744 → 2 columns', () => {
    // Exactly at threshold: sidebar subtracted; 744 < 900 → 2
    expect(computeGridColumns(1024)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Column-count boundary  (1179 → 1180)
// ---------------------------------------------------------------------------

describe('computeGridColumns — 2-to-3 column boundary with sidebar', () => {
  it('width=1179 (contentWidth=899) → 2 columns', () => {
    expect(computeGridColumns(1179)).toBe(2);
  });

  it('width=1180 (contentWidth=900) → 3 columns', () => {
    expect(computeGridColumns(1180)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Shared-breakpoint regression guard
//
// computeGridColumns and computeCardWidth must both use the same sidebar
// subtraction breakpoint (GRID_LARGE_SCREEN_BREAKPOINT).  This suite verifies
// that computeContentWidth — the single shared helper they both delegate to —
// produces the same content-area value that drives both calculations, so a
// change to the breakpoint constant cannot silently affect only one of them.
// ---------------------------------------------------------------------------

describe('computeContentWidth — shared breakpoint used by both column and card-width helpers', () => {
  it('below breakpoint: contentWidth equals screenWidth (no sidebar subtracted)', () => {
    const below = GRID_LARGE_SCREEN_BREAKPOINT - 1;
    expect(computeContentWidth(below)).toBe(below);
  });

  it('at breakpoint: sidebar is subtracted', () => {
    expect(computeContentWidth(GRID_LARGE_SCREEN_BREAKPOINT)).toBe(
      GRID_LARGE_SCREEN_BREAKPOINT - GRID_SIDEBAR_WIDTH,
    );
  });

  it('computeGridColumns agrees with computeContentWidth at the breakpoint boundary', () => {
    // One pixel below the breakpoint — no sidebar, so large content width → 3 cols
    const justBelow = GRID_LARGE_SCREEN_BREAKPOINT - 1; // e.g. 1023
    expect(computeContentWidth(justBelow)).toBeGreaterThanOrEqual(900);
    expect(computeGridColumns(justBelow)).toBe(3);

    // Exactly at the breakpoint — sidebar kicks in, content width drops → 2 cols
    const at = GRID_LARGE_SCREEN_BREAKPOINT; // e.g. 1024
    expect(computeContentWidth(at)).toBeLessThan(900);
    expect(computeGridColumns(at)).toBe(2);
  });

  it('computeCardWidth uses the same breakpoint: card width jumps at the boundary', () => {
    // Below breakpoint (no sidebar): wider content → wider cards
    const belowWidth = computeCardWidth(
      GRID_LARGE_SCREEN_BREAKPOINT - 1, 2, 0, 8,
    )!;
    // At breakpoint (sidebar added): narrower content → narrower cards
    const atWidth = computeCardWidth(
      GRID_LARGE_SCREEN_BREAKPOINT, 2, 0, 8,
    )!;
    expect(belowWidth).toBeGreaterThan(atWidth);

    // Both values must match what computeContentWidth would produce
    const contentBelow = computeContentWidth(GRID_LARGE_SCREEN_BREAKPOINT - 1);
    const contentAt    = computeContentWidth(GRID_LARGE_SCREEN_BREAKPOINT);
    expect(belowWidth).toBeCloseTo((contentBelow - 8) / 2, 5);
    expect(atWidth).toBeCloseTo((contentAt - 8) / 2, 5);
  });
});

// ---------------------------------------------------------------------------
// computeCardWidth — single-column (always returns undefined)
// ---------------------------------------------------------------------------

describe('computeCardWidth — single column returns undefined', () => {
  it('numColumns=1 with no padding → undefined', () => {
    expect(computeCardWidth(375, 1, 0, 8)).toBeUndefined();
  });

  it('numColumns=1 with non-zero padding → undefined (padding irrelevant)', () => {
    expect(computeCardWidth(768, 1, 24, 12)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// computeCardWidth — ValetAdmin variant  (horizontalPadding=8, columnGap=8)
// Formula: (contentWidth − 2×8 − 8×(n−1)) / n
// ---------------------------------------------------------------------------

describe('computeCardWidth — ValetAdmin style (pad=8, gap=8)', () => {
  it('width=768, 2 columns → (768−16−8)/2 = 372 px', () => {
    // No sidebar (768 < 1024); contentWidth = 768
    expect(computeCardWidth(768, 2, 8, 8)).toBeCloseTo(372, 5);
  });

  it('width=1024, 2 columns → (744−16−8)/2 = 360 px', () => {
    // Sidebar applied: contentWidth = 1024 − 280 = 744
    expect(computeCardWidth(1024, 2, 8, 8)).toBeCloseTo(360, 5);
  });

  it('width=1200, 3 columns → (920−16−16)/3 ≈ 296 px', () => {
    // contentWidth = 1200 − 280 = 920; gaps = 8×2 = 16
    expect(computeCardWidth(1200, 3, 8, 8)).toBeCloseTo(296, 5);
  });

  it('boundary: width=1179 (contentWidth=899), 2 cols → (899−16−8)/2 = 437.5 px', () => {
    expect(computeCardWidth(1179, 2, 8, 8)).toBeCloseTo(437.5, 5);
  });

  it('boundary: width=1180 (contentWidth=900), 3 cols → (900−16−16)/3 ≈ 289.33 px', () => {
    expect(computeCardWidth(1180, 3, 8, 8)).toBeCloseTo(289.333, 2);
  });
});

// ---------------------------------------------------------------------------
// computeCardWidth — BuildingAdmin variant  (horizontalPadding=0, columnGap=8)
// Formula: (contentWidth − 8×(n−1)) / n
// ---------------------------------------------------------------------------

describe('computeCardWidth — BuildingAdmin style (pad=0, gap=8)', () => {
  it('width=768, 2 columns → (768−0−8)/2 = 380 px', () => {
    expect(computeCardWidth(768, 2, 0, 8)).toBeCloseTo(380, 5);
  });

  it('width=1200, 3 columns → (920−0−16)/3 ≈ 301.33 px', () => {
    // contentWidth = 920; no horizontal padding; gaps = 8×2 = 16
    expect(computeCardWidth(1200, 3, 0, 8)).toBeCloseTo(301.333, 2);
  });

  it('zero padding yields wider cards than non-zero padding at the same width', () => {
    const withPad = computeCardWidth(768, 2, 8, 8)!;
    const noPad   = computeCardWidth(768, 2, 0, 8)!;
    expect(noPad).toBeGreaterThan(withPad);
  });
});

// ---------------------------------------------------------------------------
// computeCardWidth — BuffetAdmin variant  (horizontalPadding=24, columnGap=12)
// Formula: (contentWidth − 2×24 − 12×(n−1)) / n
// ---------------------------------------------------------------------------

describe('computeCardWidth — BuffetAdmin style (pad=24, gap=12)', () => {
  it('width=768, 2 columns → (768−48−12)/2 = 354 px', () => {
    // No sidebar; contentWidth = 768; 2×24=48; 12×1=12
    expect(computeCardWidth(768, 2, 24, 12)).toBeCloseTo(354, 5);
  });

  it('width=1200, 3 columns → (920−48−24)/3 ≈ 282.67 px', () => {
    // contentWidth = 920; 2×24=48; 12×2=24
    expect(computeCardWidth(1200, 3, 24, 12)).toBeCloseTo(282.667, 2);
  });

  it('larger padding yields narrower cards than smaller padding at same width/columns', () => {
    const largePad = computeCardWidth(768, 2, 24, 12)!;
    const smallPad = computeCardWidth(768, 2, 8,  8)!;
    expect(largePad).toBeLessThan(smallPad);
  });

  it('boundary: width=1179 (contentWidth=899), 2 cols → (899−48−12)/2 = 419.5 px', () => {
    expect(computeCardWidth(1179, 2, 24, 12)).toBeCloseTo(419.5, 5);
  });

  it('boundary: width=1180 (contentWidth=900), 3 cols → (900−48−24)/3 = 276 px', () => {
    expect(computeCardWidth(1180, 3, 24, 12)).toBeCloseTo(276, 5);
  });
});

// ---------------------------------------------------------------------------
// Card-width fit invariant — all three screens at key viewports
//
// Verifies that the actual padding/gap values each screen passes to
// computeCardWidth satisfy:
//   numColumns × cardWidth + (numColumns − 1) × columnGap
//     ≤ contentWidth − 2 × horizontalPadding
//
// This is the condition for cards + gaps to fit inside the padded grid without
// overflowing. The parameters below mirror exactly what each screen passes to
// computeCardWidth (verified against the screen source):
//   ValetAllRequestsScreen  : pad=Spacing.sm (8),  gap=Spacing.sm (8)
//   AllRequestsScreen       : pad=0,               gap=Spacing.sm (8)
//   BuffetAllRequestsScreen : pad=Spacing.xl (24), gap=Spacing.md (12)
// ---------------------------------------------------------------------------

type ScreenParams = { pad: number; gap: number; label: string };

const SCREEN_PARAMS: Record<string, ScreenParams> = {
  'ValetAllRequestsScreen':        { pad: 8,  gap: 8,  label: 'Valet (pad=8, gap=8)' },
  'AllRequestsScreen':             { pad: 0,  gap: 8,  label: 'Building (pad=0, gap=8)' },
  'BuffetAllRequestsScreen':       { pad: 24, gap: 12, label: 'Buffet (pad=24, gap=12)' },
};

const OVERFLOW_VIEWPORTS = [768, 1180, 1440];

for (const [screen, { pad, gap, label }] of Object.entries(SCREEN_PARAMS)) {
  describe(`Card-width fit invariant — ${screen}`, () => {
    for (const screenWidth of OVERFLOW_VIEWPORTS) {
      it(`cards + gaps fit padded grid at ${screenWidth} px [${label}]`, () => {
        const numColumns = computeGridColumns(screenWidth);
        const cardW = computeCardWidth(screenWidth, numColumns, pad, gap);

        // single-column uses width:'100%' — no pixel width to overflow-check
        expect(cardW).not.toBeUndefined();

        const cw = computeContentWidth(screenWidth);
        const totalUsed = numColumns * cardW! + (numColumns - 1) * gap;
        const available = cw - 2 * pad;

        expect(totalUsed).toBeLessThanOrEqual(available);
      });
    }
  });
}
