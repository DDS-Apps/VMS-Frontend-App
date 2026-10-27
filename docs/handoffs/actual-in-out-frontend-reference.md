# Actual In / Actual Out — Frontend Reference

This document collects the frontend rendering path and conditions responsible
for Actual In / Actual Out labels. The table section is an excerpt, not the
entire table component. The shared value renderer, interpretation helpers,
formatter, and types are included below.

This is a source-code snapshot, not confirmation of the currently deployed
frontend or backend. No application behavior or backend data was changed to
prepare this document.

## 1. Table component

File: `components/shared/VisitorMatrixTable.tsx`

The table imports:

```tsx
import { ActualMovementValue } from './ActualMovementSummary';
```

Actual In and Actual Out cells:

```tsx
<View style={[styles.matrixDataCell, { width: LAYOUT.matrixColWidth }, rowBorderStyle]}>
  <ActualMovementValue source={item} kind="in" includeDate={false} />
</View>

<View style={[styles.matrixDataCell, { width: LAYOUT.matrixColWidth }, rowBorderStyle]}>
  <ActualMovementValue source={item} kind="out" includeDate={false} />
</View>
```

`item` is the frontend-mapped row. The renderer reads its `movementSummary`,
`movementSummaryAvailability`, and `timezone` fields. It does not use legacy
`actualInTime`, `actualOutTime`, `checkedInAt`, or `checkedOutAt` as fallbacks.

## 2. Shared display component

File: `components/shared/ActualMovementSummary.tsx`

```tsx
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/hooks/useTranslation';
import { formatActualMovement, readMovementDisplay, reportMovementDisplayIssue, type MovementSummarySource } from '@/utils/movementSummary';
import { MOVEMENT_SUMMARY_ENABLED } from '@/constants/movementSummary';

/** Read-only historical values. Never feeds action guards or lifecycle timelines. */
export function ActualMovementValue({ source, kind, includeDate = true }: {
  source: MovementSummarySource;
  kind: 'in' | 'out';
  includeDate?: boolean;
}) {
  const { isRTL } = useLanguage();
  const result = readMovementDisplay(source);
  useEffect(() => {
    if (MOVEMENT_SUMMARY_ENABLED) reportMovementDisplayIssue(result.state);
  }, [result.state]);
  const timestamp = result.state === 'supported'
    ? result.summary[kind === 'in' ? 'latestCheckInAt' : 'latestCheckOutAt'] : null;
  const unavailable = isRTL ? 'غير متاح' : 'Unavailable';
  const label = result.state === 'restricted' ? (isRTL ? 'مقيّد' : 'Restricted')
    : !MOVEMENT_SUMMARY_ENABLED || result.state !== 'supported' ? unavailable
    : formatActualMovement(timestamp, source.timezone, isRTL, includeDate);
  const accessibleLabel = MOVEMENT_SUMMARY_ENABLED && result.state === 'supported'
    ? formatActualMovement(timestamp, source.timezone, isRTL, true) : label;
  return <ThemedText accessibilityLabel={accessibleLabel} style={{ fontSize: 12 }} testID={`actual-${kind}-summary`}>
    {label}
  </ThemedText>;
}

export function ActualMovementSummary({ source }: { source?: MovementSummarySource }) {
  const { t } = useTranslation();
  if (!MOVEMENT_SUMMARY_ENABLED || !source) return null;
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingVertical: 12 }}>
    {(['in', 'out'] as const).map(kind => <View key={kind} style={{ flexShrink: 1 }}>
      <ThemedText style={{ fontSize: 12, fontWeight: '600' }}>{t(kind === 'in' ? 'visitor.actualIn' : 'visitor.actualOut')}</ThemedText>
      <ActualMovementValue source={source} kind={kind} />
    </View>)}
  </View>;
}
```

## 3. Response interpretation and time formatting

File: `utils/movementSummary.ts`

```ts
import type { MovementSummary, MovementSummaryMetadata } from '@/types/movementSummary';

export interface MovementSummarySource extends MovementSummaryMetadata {
  movementSummary?: MovementSummary;
  timezone?: string;
}

function validTimestamp(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== 'string') return false;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.exec(value);
  if (!parts || !Number.isFinite(Date.parse(value))) return false;
  const [, y, m, d, h, min, sec] = parts.map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return m >= 1 && m <= 12 && d >= 1 && d <= days && h < 24 && min < 60 && sec < 60;
}

/** Availability wins over contradictory data, especially restricted responses. */
export function readMovementDisplay(source: MovementSummarySource) {
  if (!source || typeof source !== 'object') return { state: 'malformed' as const };
  if (source.movementSummaryAvailability === 'restricted') return { state: 'restricted' as const };
  if (source.movementSummaryAvailability === 'unavailable') return { state: 'temporarily-unavailable' as const };
  if (source.movementSummaryAvailability !== undefined) return { state: 'malformed' as const };
  if (source.movementSummary === undefined) return { state: 'unsupported' as const };
  const value = source.movementSummary;
  if (value && typeof value === 'object' && typeof value.version === 'number' && value.version !== 1) {
    return { state: 'unsupported-version' as const };
  }
  const result = readMovementSummary(value);
  return result.state === 'supported' ? result : { state: 'malformed' as const };
}

const reported = new Set<string>();
/** Bounded diagnostics: never log payloads, identifiers, timestamps or server errors. */
export function reportMovementDisplayIssue(state: ReturnType<typeof readMovementDisplay>['state']) {
  if (!['malformed', 'unsupported-version', 'unsupported'].includes(state) || reported.has(state)) return;
  reported.add(state);
  console.warn(`[movement-summary] ${state}`);
}

export function readMovementSummary(value: unknown):
  | { state: 'legacy' | 'unavailable' }
  | { state: 'supported'; summary: MovementSummary } {
  if (value === undefined) return { state: 'legacy' };
  if (value === null || typeof value !== 'object') return { state: 'unavailable' };
  const candidate = value as Partial<MovementSummary>;
  if (candidate.version !== 1 ||
      !validTimestamp(candidate.latestCheckInAt) ||
      !validTimestamp(candidate.latestCheckOutAt)) return { state: 'unavailable' };
  return { state: 'supported', summary: candidate as MovementSummary };
}

export function formatActualMovement(value: string | null, timezone: string | undefined, rtl: boolean, includeDate = false): string {
  if (value === null) return '—';
  if (!validTimestamp(value)) return '—';
  try {
    return new Intl.DateTimeFormat(rtl ? 'ar-SA' : 'en-US', {
      timeZone: timezone ?? 'Asia/Riyadh',
      hour: 'numeric', minute: '2-digit', hour12: true,
      ...(includeDate ? { year: 'numeric', month: 'short', day: 'numeric' } as const : {}),
    }).format(new Date(value));
  } catch {
    // Do not silently reinterpret a bad server timezone as device-local time.
    return '—';
  }
}
```

## 4. Expected summary types and semantics

File: `types/movementSummary.ts`

```ts
/**
 * Revised backend V1 contract: latestCheckInAt is FIRST physical arrival,
 * including parking. The legacy wire name is deliberately retained.
 * latestCheckOutAt is the latest physical departure, retained across re-entry.
 * Historical display only: never use this pair for current-presence decisions.
 * Older V1 deployments used latest-IN, so version alone cannot prove readiness.
 */
export interface MovementSummary {
  version: 1;
  latestCheckInAt: string | null;
  latestCheckOutAt: string | null;
}

export interface MovementSummaryMetadata {
  movementSummaryAvailability?: 'restricted' | 'unavailable';
  movementSummaryError?: string;
}
```

The displayed label does not inspect `movementSummaryError`.

## 5. Frontend display gate

File: `constants/movementSummary.ts`

```ts
/**
 * Enable only after backend contract fixtures and authenticated QA pass.
 * Revised V1 uses latestCheckInAt for FIRST arrival (legacy wire name).
 * Backend source was not restarted/published at handoff. The old and revised
 * contracts both report version 1; verify the serving build before enabling.
 * Disabled historical columns show Unavailable, never operational timestamps.
 */
export const MOVEMENT_SUMMARY_ENABLED = false;
```

The comment records the rollout rationale at implementation time; it does not
establish the backend's current deployment status.

## 6. Exact display conditions

| Condition | Display |
| --- | --- |
| `movementSummaryAvailability === 'restricted'` | `Restricted` / `مقيّد`, regardless of timestamps or display flag |
| No restricted marker, but `MOVEMENT_SUMMARY_ENABLED === false` | `Unavailable` / `غير متاح`, even with valid summary timestamps |
| Display enabled, but summary is missing, unsupported, unavailable, or malformed | `Unavailable` / `غير متاح` |
| Display enabled and supported summary contains a null timestamp | `—` for that timestamp |
| Display enabled and supported summary contains a valid timestamp | Localized 12-hour time |
| Formatter encounters an invalid timezone | `—` |

Additional details:

- The availability marker is evaluated before summary values.
- An availability marker of `null`, an empty string, or an unrecognized value
  is considered malformed; only an absent marker passes to summary validation.
- Supported summaries require numeric `version: 1` and both timestamp
  properties. Each timestamp must be null or a valid timezone-qualified ISO
  timestamp; undefined or empty strings fail.
- The formatter defaults to `Asia/Riyadh` when timezone is absent.
- Both table cells use `includeDate={false}`; their accessibility labels
  include the date when the summary display is enabled and supported.

## 7. Suggested verification sequence

1. Compare the raw API record with the mapped table row, checking whether the
   availability marker and summary are preserved correctly.
2. If the label is Restricted, inspect the row's
   `movementSummaryAvailability === 'restricted'` condition first.
3. If the label is Unavailable, account for the currently disabled frontend
   display flag before attributing the problem to backend timestamps.
4. Confirm the serving backend implements first-arrival and last-departure
   semantics. Numeric V1 alone does not establish that, because the legacy and
   revised contracts use the same version number.
5. Do not change backend movement data merely to bypass a frontend display
   gate. Do not discard a genuine permission restriction to force a timestamp.
