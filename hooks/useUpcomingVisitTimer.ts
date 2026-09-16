import { useEffect, useState, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';

const MAX_TIMEOUT_MS = 60 * 1000;

/**
 * Parses a backend-provided ISO 8601 UTC timestamp (e.g. "2025-01-15T09:00:00Z")
 * into a Date. Returns null for missing, empty, or unparseable input.
 *
 * Always prefer this function when the backend supplies visitStartAt —
 * it avoids manual date/time string concatenation and handles UTC correctly.
 */
export function parseVisitStartAt(iso: string): Date | null {
  if (!iso || typeof iso !== 'string') return null;
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Pure function: returns true when 0 < remainingMs <= thresholdMs.
 * Accepts an ISO UTC timestamp.
 * Returns false when the timestamp is missing or invalid.
 * Injectable `nowFn` supports test fake-timer usage.
 */
export function isUpcomingVisitFromISO(
  visitStartAt: string,
  thresholdMinutes = 15,
  nowFn: () => number = Date.now
): boolean {
  const startDate = parseVisitStartAt(visitStartAt);
  if (!startDate) return false;
  const remainingMs = startDate.getTime() - nowFn();
  const thresholdMs = thresholdMinutes * 60 * 1000;
  return remainingMs > 0 && remainingMs <= thresholdMs;
}

interface UseUpcomingIndicatorParams {
  visitDate: string;
  visitTime: string;
  /** Pre-computed eligibility from status check — avoids coupling to RequestStatus type */
  eligible: boolean;
  thresholdMinutes?: number;
  /**
   * ISO 8601 UTC timestamp from the backend (e.g. "2025-01-15T09:00:00Z").
   * When present and parseable, this is preferred over visitDate + visitTime.
   * Falls back silently to the date/time string pair when absent or invalid.
   */
  visitStartAt?: string;
  /**
   * Optional clock override for testing (fake timers). When provided, replaces
   * Date.now() inside the hook so tests can control time precisely.
   */
  nowFn?: () => number;
  /**
   * Optional server–device clock offset in milliseconds. When the API returns
   * a server timestamp, callers can pass (serverTime - Date.now()) here so the
   * indicator accounts for any device clock drift.
   */
  serverTimeDeltaMs?: number;
}

/**
 * Hook that returns `isUpcoming: boolean`.
 *
 * Uses smart boundary timeouts (not polling): schedules the next recalculation
 * at exactly the moment the window opens or closes, capped at 60 s.
 * Also recalculates on app foreground (AppState) and tab focus (web).
 *
 * ## Time source priority
 * 1. `visitStartAt` ISO UTC string (preferred — parses UTC correctly)
 * 2. `visitDate` + `visitTime` string pair (legacy fallback)
 *
 * ## Stale-state protection (regression notes)
 *
 * **Layer 1 — render-time guard (synchronous):**
 * The hook always returns `eligible ? isUpcoming : false`. The moment the
 * parent component renders with a new status that makes `eligible` false
 * (e.g. `visitor_accepted` → `checked_in`), the indicator disappears
 * immediately — no wait for a `useEffect` or the next timer tick.
 *
 * **Layer 2 — effect re-run on prop changes:**
 * `calculate` is a `useCallback` that depends on `eligible`, `visitDate`,
 * `visitTime`, `visitStartAt`, `nowFn`, and `thresholdMinutes`. Any prop
 * change rebuilds `calculate`, which causes the main `useEffect` to fire and
 * call `setIsUpcoming(calculate())` synchronously after the render, keeping
 * the internal state in sync.
 *
 * **Key-by-visit-ID requirement:**
 * Parent lists MUST supply the visit's unique ID as the React key (via
 * `keyExtractor` for FlatList, or the `key` prop in `.map()`). Using a
 * stable, unique key ensures React remounts this component — and resets
 * the `useState` initialiser — when the underlying visit changes identity
 * (e.g. after a pull-to-refresh that replaces a record with a different ID).
 * Reusing the same component instance with a different visit's props is safe
 * due to Layer 1 and Layer 2 above, but relying on that for correctness is
 * fragile; always key by ID.
 *
 * **Do not remove the `return eligible ? isUpcoming : false` guard** at the
 * bottom of the hook. It is the primary line of defence against a brief flash
 * of the alert icon after a status transition, and it costs nothing at runtime.
 */
export function useUpcomingIndicator({
  visitDate,
  visitTime,
  eligible,
  thresholdMinutes = 15,
  visitStartAt,
  nowFn: nowFnProp,
  serverTimeDeltaMs = 0,
}: UseUpcomingIndicatorParams): boolean {
  const effectiveNowFn = useCallback(
    (): number => (nowFnProp ? nowFnProp() : Date.now()) + serverTimeDeltaMs,
    [nowFnProp, serverTimeDeltaMs]
  );

  // ISO-only: use visitStartAt exclusively. If absent or invalid, return null so
  // the upcoming indicator is hidden. Never fall back to device-local date parsing.
  const resolveStartDate = useCallback((): Date | null => {
    if (!visitStartAt) return null;
    return parseVisitStartAt(visitStartAt);
  }, [visitStartAt]);

  const calculate = useCallback((): boolean => {
    if (!eligible) return false;
    const startDate = resolveStartDate();
    if (!startDate) return false;
    const remainingMs = startDate.getTime() - effectiveNowFn();
    const thresholdMs = thresholdMinutes * 60 * 1000;
    return remainingMs > 0 && remainingMs <= thresholdMs;
  }, [eligible, resolveStartDate, thresholdMinutes, effectiveNowFn]);

  const [isUpcoming, setIsUpcoming] = useState<boolean>(() => calculate());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const scheduleNextCheck = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!eligible) return;

    const startDate = resolveStartDate();
    if (!startDate) return;

    const now = effectiveNowFn();
    const startMs = startDate.getTime();
    const thresholdMs = thresholdMinutes * 60 * 1000;
    const windowOpenMs = startMs - thresholdMs;
    const remainingMs = startMs - now;

    let nextCheckMs: number;

    if (now < windowOpenMs) {
      nextCheckMs = windowOpenMs - now;
    } else if (remainingMs > 0) {
      nextCheckMs = remainingMs;
    } else {
      return;
    }

    const cappedMs = Math.min(nextCheckMs, MAX_TIMEOUT_MS);

    timerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setIsUpcoming(calculate());
      scheduleNextCheck();
    }, cappedMs);
  }, [eligible, resolveStartDate, thresholdMinutes, effectiveNowFn, calculate]);

  useEffect(() => {
    mountedRef.current = true;
    setIsUpcoming(calculate());
    scheduleNextCheck();
    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [calculate, scheduleNextCheck]);

  useEffect(() => {
    const handleAppStateChange = (nextState: string) => {
      if (nextState === 'active' && mountedRef.current) {
        setIsUpcoming(calculate());
        scheduleNextCheck();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [calculate, scheduleNextCheck]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleVisibilityChange = () => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        mountedRef.current
      ) {
        setIsUpcoming(calculate());
        scheduleNextCheck();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [calculate, scheduleNextCheck]);

  return eligible ? isUpcoming : false;
}
