import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

type Refetcher = (options?: { cancelRefetch?: boolean }) => unknown;

/**
 * Re-runs the given React Query refetchers when a screen comes back into
 * focus, so the user sees fresh data after navigating away and back.
 *
 * Two request-saving rules compared with calling `refetch()` from a bare
 * `useFocusEffect`:
 * - The first focus after mount is skipped. The queries' own mount fetch is
 *   already in flight, and `refetch()` would cancel and restart it.
 * - Later refetches pass `cancelRefetch: false`, so a fetch that is already
 *   running (for example a background refresh) is joined instead of restarted.
 *
 * Only queries that are enabled at mount belong here; `refetch()` bypasses the
 * `enabled` flag, so callers keep their own role guards.
 */
export function useRefetchOnRefocus(refetchers: readonly Refetcher[], enabled: boolean = true): void {
  const refetchersRef = useRef<readonly Refetcher[]>(refetchers);
  const enabledRef = useRef(enabled);
  const hasFocusedRef = useRef(false);

  useEffect(() => {
    refetchersRef.current = refetchers;
    enabledRef.current = enabled;
  });

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedRef.current) {
        hasFocusedRef.current = true;
        return;
      }
      if (!enabledRef.current) return;
      for (const refetch of refetchersRef.current) {
        void refetch({ cancelRefetch: false });
      }
    }, []),
  );
}
