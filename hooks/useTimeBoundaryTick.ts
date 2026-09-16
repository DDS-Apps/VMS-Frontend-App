import { useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";

const MAX_TIMEOUT_MS = 2_147_000_000;

/**
 * Refreshes time-derived UI immediately after the next supplied boundary and
 * whenever the app returns to the foreground.
 */
export function useTimeBoundaryTick(
  boundaryTimes: Array<number | null | undefined>,
): number {
  const [tick, setTick] = useState(0);
  const boundaryKey = useMemo(
    () =>
      boundaryTimes
        .filter((value): value is number => Number.isFinite(value))
        .sort((left, right) => left - right)
        .join(","),
    [boundaryTimes],
  );

  useEffect(() => {
    const refresh = () => setTick((current) => current + 1);
    const now = Date.now();
    const nextBoundary = boundaryKey
      .split(",")
      .map(Number)
      .find((value) => value >= now);
    const timer =
      nextBoundary === undefined
        ? undefined
        : setTimeout(
            refresh,
            Math.min(
              MAX_TIMEOUT_MS,
              Math.max(1, nextBoundary - now + 1),
            ),
          );
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });

    return () => {
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, [boundaryKey, tick]);

  return tick;
}