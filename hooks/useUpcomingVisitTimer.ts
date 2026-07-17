import { useEffect, useState, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';

const MAX_TIMEOUT_MS = 60 * 1000;

/**
 * Parses "YYYY-MM-DD" + "HH:MM" (or "H:MM AM/PM") into a Date in device-local time.
 * Returns null for invalid or missing input.
 */
export function parseVisitDateTime(visitDate: string, visitTime: string): Date | null {
  if (!visitDate || !visitTime) return null;
  try {
    const cleanTime = visitTime.trim().toUpperCase();
    let hours: number;
    let minutes: number;

    const ampmMatch = cleanTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    if (ampmMatch) {
      hours = parseInt(ampmMatch[1], 10);
      minutes = parseInt(ampmMatch[2], 10);
      if (ampmMatch[3] === 'PM' && hours !== 12) hours += 12;
      if (ampmMatch[3] === 'AM' && hours === 12) hours = 0;
    } else {
      const timePart = cleanTime.replace(/\s*(AM|PM)\s*/i, '').trim();
      const parts = timePart.split(':');
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1] ?? '0', 10);
    }

    const dateParts = visitDate.split('-').map(Number);
    if (dateParts.length < 3) return null;
    const [year, month, day] = dateParts;
    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) return null;

    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  } catch {
    return null;
  }
}

/**
 * Pure function: returns true when 0 < remainingMs <= thresholdMs.
 * The window opens `thresholdMinutes` before start and closes at the moment of start.
 * Injectable `nowFn` supports test fake-timer usage.
 */
export function isUpcomingVisit(
  visitDate: string,
  visitTime: string,
  thresholdMinutes = 15,
  nowFn: () => number = Date.now
): boolean {
  const startDate = parseVisitDateTime(visitDate, visitTime);
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
}

/**
 * Hook that returns `isUpcoming: boolean`.
 *
 * Uses smart boundary timeouts (not polling): schedules the next recalculation
 * at exactly the moment the window opens or closes, capped at 60 s.
 * Also recalculates on app foreground (AppState) and tab focus (web).
 */
export function useUpcomingIndicator({
  visitDate,
  visitTime,
  eligible,
  thresholdMinutes = 15,
}: UseUpcomingIndicatorParams): boolean {
  const calculate = useCallback((): boolean => {
    if (!eligible) return false;
    return isUpcomingVisit(visitDate, visitTime, thresholdMinutes);
  }, [eligible, visitDate, visitTime, thresholdMinutes]);

  const [isUpcoming, setIsUpcoming] = useState<boolean>(() => calculate());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const scheduleNextCheck = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!eligible) return;

    const startDate = parseVisitDateTime(visitDate, visitTime);
    if (!startDate) return;

    const now = Date.now();
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
  }, [eligible, visitDate, visitTime, thresholdMinutes, calculate]);

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
