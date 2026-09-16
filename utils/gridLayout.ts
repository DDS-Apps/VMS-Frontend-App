/**
 * Shared grid-layout utilities used by all-requests screens.
 *
 * Screens that use this:
 *   - screens/ValetAdmin/ValetAllRequestsScreen.tsx
 *   - screens/BuildingAdmin/AllRequestsScreen.tsx
 *   - screens/BuffetAdmin/BuffetAllRequestsScreen.tsx
 *
 * Keeping the constants and formula in one place means a sidebar-width change
 * or breakpoint adjustment is made once and propagates to every screen
 * automatically.
 */

import { Spacing } from '@/constants/theme';

/** Width of the persistent sidebar shown on large screens. */
export const GRID_SIDEBAR_WIDTH = 280;

/**
 * Screen width at which the sidebar becomes visible and must be subtracted
 * from the available content area. Both `computeGridColumns` and
 * `computeCardWidth` consume this constant via `computeContentWidth`, so
 * changing the breakpoint is a single-line edit that propagates everywhere.
 */
export const GRID_LARGE_SCREEN_BREAKPOINT = 1024;

/**
 * Returns the usable content width after subtracting the sidebar on large
 * screens. This is the single source of truth for the sidebar breakpoint.
 */
export function computeContentWidth(screenWidth: number): number {
  return screenWidth >= GRID_LARGE_SCREEN_BREAKPOINT
    ? screenWidth - GRID_SIDEBAR_WIDTH
    : screenWidth;
}

/**
 * Returns the number of grid columns that fits a given screen width.
 *
 * On large screens (≥ GRID_LARGE_SCREEN_BREAKPOINT) the sidebar occupies
 * GRID_SIDEBAR_WIDTH px, which is subtracted before applying the column
 * breakpoints.
 *
 * Breakpoints (content width):
 *   < 600  → 1 column  (mobile)
 *   600–899 → 2 columns (tablet)
 *   ≥ 900  → 3 columns (desktop)
 */
export function computeGridColumns(screenWidth: number): number {
  const contentWidth = computeContentWidth(screenWidth);
  return contentWidth >= 900 ? 3 : contentWidth >= 600 ? 2 : 1;
}

/** ValetAllRequestsScreen — paddedContent paddingHorizontal (one side). */
export const VALET_GRID_PADDING_SIDE = Spacing.sm;
/**
 * Card width for ValetAllRequestsScreen.
 *
 * paddedContent: paddingHorizontal VALET_GRID_PADDING_SIDE (each side).
 * cardGrid: gap VALET_GRID_GAP between columns.
 */
export function computeValetCardWidth(
  contentWidth: number,
  numColumns: number,
): number | undefined {
  if (numColumns <= 1) return undefined;
  return (
    (contentWidth - 2 * VALET_GRID_PADDING_SIDE - VALET_GRID_GAP * (numColumns - 1)) /
    numColumns
  );
}

/**
 * Returns the pixel width each card should occupy in a multi-column grid,
 * or `undefined` for single-column layouts (where `width: '100%'` is used).
 *
 * Both the sidebar subtraction breakpoint and the sidebar width are shared
 * with `computeGridColumns` via `computeContentWidth`, so the two functions
 * can never drift apart.
 *
 * @param screenWidth       - Full device/window width in pixels.
 * @param numColumns        - Column count (typically from `computeGridColumns`).
 * @param horizontalPadding - Padding applied to the grid container on *each*
 *                            side (e.g. `Spacing.sm`).
 * @param columnGap         - Space between adjacent columns (e.g. `Spacing.sm`).
 *
 * Formula:
 *   contentWidth = computeContentWidth(screenWidth)
 *   cardWidth    = (contentWidth − 2×horizontalPadding − columnGap×(numColumns−1)) / numColumns
 */
export function computeCardWidth(
  screenWidth: number,
  numColumns: number,
  horizontalPadding: number,
  columnGap: number,
): number | undefined {
  if (numColumns === 1) return undefined;
  const contentWidth = computeContentWidth(screenWidth);
  return (
    (contentWidth - 2 * horizontalPadding - columnGap * (numColumns - 1)) /
    numColumns
  );
}

/**
 * Card width for AllRequestsScreen (BuildingAdmin).
 *
 * paddedContent: paddingHorizontal ALL_REQUESTS_GRID_PADDING_SIDE (= 0).
 * cardGrid: effective gap ALL_REQUESTS_GRID_GAP (via space-between).
 */
export function computeAllRequestsCardWidth(
  contentWidth: number,
  numColumns: number,
): number | undefined {
  if (numColumns <= 1) return undefined;
  return (contentWidth - ALL_REQUESTS_GRID_GAP * (numColumns - 1)) / numColumns;
}

/**
 * Card width for BuffetAllRequestsScreen.
 *
 * paddedContent: paddingHorizontal BUFFET_GRID_PADDING_SIDE (each side).
 * cardGrid: gap BUFFET_GRID_GAP between columns.
 */
export function computeBuffetCardWidth(
  contentWidth: number,
  numColumns: number,
): number | undefined {
  if (numColumns <= 1) return undefined;
  return (
    (contentWidth - 2 * BUFFET_GRID_PADDING_SIDE - BUFFET_GRID_GAP * (numColumns - 1)) /
    numColumns
  );
}

/** BuffetAllRequestsScreen — paddedContent paddingHorizontal (one side). */
export const BUFFET_GRID_PADDING_SIDE = Spacing.xl;

/** AllRequestsScreen (BuildingAdmin) — paddedContent has no horizontal padding. */
export const ALL_REQUESTS_GRID_PADDING_SIDE = 0;

/** BuffetAllRequestsScreen — cardGrid gap between columns. */
export const BUFFET_GRID_GAP = Spacing.md;

/** ValetAllRequestsScreen — cardGrid gap between columns. */
export const VALET_GRID_GAP = Spacing.sm;

/**
 * AllRequestsScreen (BuildingAdmin) — effective inter-column gap.
 *
 * The cardGrid uses `justifyContent: 'space-between'` without a CSS gap
 * property. The explicit pixel cardWidth bakes in this gap so that
 * space-between distributes exactly the right remainder.
 */
export const ALL_REQUESTS_GRID_GAP = Spacing.sm;
