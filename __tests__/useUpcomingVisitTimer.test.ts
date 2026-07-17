/**
 * Tests for hooks/useUpcomingVisitTimer.ts
 *
 * Covers:
 *  - parseVisitDateTime: 24-hour, 12-hour AM/PM, noon/midnight edge cases, invalid inputs
 *  - isUpcomingVisit: boundary conditions at window open/close, injectable nowFn
 *  - useUpcomingIndicator hook: window open/close with fake timers,
 *    ineligible status short-circuit, AppState foreground recalculation
 */

import React from 'react';
import { act, create } from 'react-test-renderer';
import { AppState } from 'react-native';

import {
  parseVisitDateTime,
  isUpcomingVisit,
  useUpcomingIndicator,
} from '../hooks/useUpcomingVisitTimer';

// ---------------------------------------------------------------------------
// Minimal renderHook using react-test-renderer (no extra testing library needed)
// ---------------------------------------------------------------------------
function renderHook<T>(hookFn: () => T): {
  readonly current: T;
  unmount: () => void;
  rerender: () => void;
} {
  let value!: T;

  const TestComp = () => {
    value = hookFn();
    return null;
  };

  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(React.createElement(TestComp));
  });

  return {
    get current() {
      return value;
    },
    unmount() {
      act(() => {
        renderer.unmount();
      });
    },
    rerender() {
      act(() => {
        renderer.update(React.createElement(TestComp));
      });
    },
  };
}

// ---------------------------------------------------------------------------
// parseVisitDateTime
// ---------------------------------------------------------------------------
describe('parseVisitDateTime', () => {
  it('parses 24-hour format "HH:MM"', () => {
    const result = parseVisitDateTime('2026-07-17', '09:30');
    expect(result).toEqual(new Date(2026, 6, 17, 9, 30, 0, 0));
  });

  it('parses single-digit hour in 24-hour format "H:MM"', () => {
    const result = parseVisitDateTime('2026-07-17', '8:05');
    expect(result).toEqual(new Date(2026, 6, 17, 8, 5, 0, 0));
  });

  it('parses 12-hour AM format "h:MM AM"', () => {
    const result = parseVisitDateTime('2026-07-17', '9:30 AM');
    expect(result).toEqual(new Date(2026, 6, 17, 9, 30, 0, 0));
  });

  it('parses 12-hour PM format "h:MM PM"', () => {
    const result = parseVisitDateTime('2026-07-17', '2:30 PM');
    expect(result).toEqual(new Date(2026, 6, 17, 14, 30, 0, 0));
  });

  it('parses 12:00 PM (noon) correctly', () => {
    const result = parseVisitDateTime('2026-07-17', '12:00 PM');
    expect(result).toEqual(new Date(2026, 6, 17, 12, 0, 0, 0));
  });

  it('parses 12:00 AM (midnight) correctly — hour must become 0', () => {
    const result = parseVisitDateTime('2026-07-17', '12:00 AM');
    expect(result).toEqual(new Date(2026, 6, 17, 0, 0, 0, 0));
  });

  it('parses uppercase AM/PM with extra whitespace', () => {
    const result = parseVisitDateTime('2026-07-17', '  3:15 PM  ');
    expect(result).toEqual(new Date(2026, 6, 17, 15, 15, 0, 0));
  });

  it('returns null when visitDate is empty', () => {
    expect(parseVisitDateTime('', '09:30')).toBeNull();
  });

  it('returns null when visitTime is empty', () => {
    expect(parseVisitDateTime('2026-07-17', '')).toBeNull();
  });

  it('returns null when visitDate has fewer than 3 parts', () => {
    expect(parseVisitDateTime('2026-07', '09:30')).toBeNull();
  });

  it('returns null for a completely invalid date string', () => {
    expect(parseVisitDateTime('not-a-date', '09:30')).toBeNull();
  });

  it('returns null for a completely invalid time string that produces NaN', () => {
    expect(parseVisitDateTime('2026-07-17', 'noon')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isUpcomingVisit
// ---------------------------------------------------------------------------
describe('isUpcomingVisit', () => {
  const VISIT_DATE = '2026-07-17';
  const VISIT_TIME = '10:00';
  const THRESHOLD = 15;

  const startMs = new Date(2026, 6, 17, 10, 0, 0, 0).getTime();
  const thresholdMs = THRESHOLD * 60 * 1000;
  const windowOpenMs = startMs - thresholdMs;

  it('returns true at the exact moment the window opens (remainingMs === thresholdMs)', () => {
    const nowFn = () => windowOpenMs;
    expect(isUpcomingVisit(VISIT_DATE, VISIT_TIME, THRESHOLD, nowFn)).toBe(true);
  });

  it('returns false 1 ms before the window opens', () => {
    const nowFn = () => windowOpenMs - 1;
    expect(isUpcomingVisit(VISIT_DATE, VISIT_TIME, THRESHOLD, nowFn)).toBe(false);
  });

  it('returns true 1 ms before the visit starts (remainingMs === 1)', () => {
    const nowFn = () => startMs - 1;
    expect(isUpcomingVisit(VISIT_DATE, VISIT_TIME, THRESHOLD, nowFn)).toBe(true);
  });

  it('returns false at the exact start moment (remainingMs === 0, window closed)', () => {
    const nowFn = () => startMs;
    expect(isUpcomingVisit(VISIT_DATE, VISIT_TIME, THRESHOLD, nowFn)).toBe(false);
  });

  it('returns false after the visit has started (remainingMs < 0)', () => {
    const nowFn = () => startMs + 60_000;
    expect(isUpcomingVisit(VISIT_DATE, VISIT_TIME, THRESHOLD, nowFn)).toBe(false);
  });

  it('returns true at the midpoint of the window', () => {
    const midpoint = windowOpenMs + thresholdMs / 2;
    expect(isUpcomingVisit(VISIT_DATE, VISIT_TIME, THRESHOLD, () => midpoint)).toBe(true);
  });

  it('returns false for invalid date/time inputs', () => {
    expect(isUpcomingVisit('', '', THRESHOLD, () => Date.now())).toBe(false);
    expect(isUpcomingVisit('2026-07-17', '', THRESHOLD, () => Date.now())).toBe(false);
    expect(isUpcomingVisit('', '10:00', THRESHOLD, () => Date.now())).toBe(false);
  });

  it('respects a custom threshold (e.g. 30 minutes)', () => {
    const thirtyMin = 30 * 60 * 1000;
    const windowStart30 = startMs - thirtyMin;
    expect(isUpcomingVisit(VISIT_DATE, VISIT_TIME, 30, () => windowStart30)).toBe(true);
    expect(isUpcomingVisit(VISIT_DATE, VISIT_TIME, 30, () => windowStart30 - 1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// useUpcomingIndicator hook
// ---------------------------------------------------------------------------
describe('useUpcomingIndicator', () => {
  const VISIT_DATE = '2026-07-20';
  const VISIT_TIME = '14:00';

  const startMs = new Date(2026, 6, 20, 14, 0, 0, 0).getTime();
  const THRESHOLD = 15;
  const thresholdMs = THRESHOLD * 60 * 1000;
  const windowOpenMs = startMs - thresholdMs;

  let dateSpy: jest.SpyInstance;
  let addEventListenerSpy: jest.SpyInstance;
  let capturedAppStateHandler: ((state: string) => void) | null;

  beforeEach(() => {
    jest.useFakeTimers();
    capturedAppStateHandler = null;

    addEventListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event: string, handler: (...args: unknown[]) => void) => {
        capturedAppStateHandler = handler as (state: string) => void;
        return { remove: jest.fn() };
      });

    dateSpy = jest.spyOn(Date, 'now').mockReturnValue(windowOpenMs - 60_000);
  });

  afterEach(() => {
    dateSpy.mockRestore();
    addEventListenerSpy.mockRestore();
    jest.useRealTimers();
  });

  it('returns false when eligible is false regardless of timing', () => {
    dateSpy.mockReturnValue(windowOpenMs);

    const hook = renderHook(() =>
      useUpcomingIndicator({
        visitDate: VISIT_DATE,
        visitTime: VISIT_TIME,
        eligible: false,
        thresholdMinutes: THRESHOLD,
      })
    );

    expect(hook.current).toBe(false);
    hook.unmount();
  });

  it('returns false before the alert window opens', () => {
    dateSpy.mockReturnValue(windowOpenMs - 60_000);

    const hook = renderHook(() =>
      useUpcomingIndicator({
        visitDate: VISIT_DATE,
        visitTime: VISIT_TIME,
        eligible: true,
        thresholdMinutes: THRESHOLD,
      })
    );

    expect(hook.current).toBe(false);
    hook.unmount();
  });

  it('returns true once the alert window opens', () => {
    dateSpy.mockReturnValue(windowOpenMs);

    const hook = renderHook(() =>
      useUpcomingIndicator({
        visitDate: VISIT_DATE,
        visitTime: VISIT_TIME,
        eligible: true,
        thresholdMinutes: THRESHOLD,
      })
    );

    expect(hook.current).toBe(true);
    hook.unmount();
  });

  it('window opens via timer: false → true when fake clock advances into the window', () => {
    const timeBeforeWindow = windowOpenMs - 5_000;
    dateSpy.mockReturnValue(timeBeforeWindow);

    let latestValue = false;
    const hook = renderHook(() => {
      latestValue = useUpcomingIndicator({
        visitDate: VISIT_DATE,
        visitTime: VISIT_TIME,
        eligible: true,
        thresholdMinutes: THRESHOLD,
      });
      return latestValue;
    });

    expect(hook.current).toBe(false);

    dateSpy.mockReturnValue(windowOpenMs + 1_000);
    act(() => {
      jest.advanceTimersByTime(5_001);
    });

    expect(hook.current).toBe(true);
    hook.unmount();
  });

  it('window closes via timer: true → false after visit start time passes', () => {
    const insideWindow = windowOpenMs + 1_000;
    dateSpy.mockReturnValue(insideWindow);

    const hook = renderHook(() =>
      useUpcomingIndicator({
        visitDate: VISIT_DATE,
        visitTime: VISIT_TIME,
        eligible: true,
        thresholdMinutes: THRESHOLD,
      })
    );

    expect(hook.current).toBe(true);

    dateSpy.mockReturnValue(startMs + 1_000);
    act(() => {
      jest.advanceTimersByTime(thresholdMs);
    });

    expect(hook.current).toBe(false);
    hook.unmount();
  });

  it('timer delay is capped at 60 seconds (MAX_TIMEOUT_MS) when window is far away', () => {
    const farAway = windowOpenMs - 10 * 60 * 1000;
    dateSpy.mockReturnValue(farAway);

    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    const hook = renderHook(() =>
      useUpcomingIndicator({
        visitDate: VISIT_DATE,
        visitTime: VISIT_TIME,
        eligible: true,
        thresholdMinutes: THRESHOLD,
      })
    );

    const delays = setTimeoutSpy.mock.calls.map((c) => c[1] as number);
    expect(delays.every((d) => d <= 60_000)).toBe(true);

    setTimeoutSpy.mockRestore();
    hook.unmount();
  });

  it('recalculates when AppState transitions to "active"', () => {
    dateSpy.mockReturnValue(windowOpenMs - 5_000);

    const hook = renderHook(() =>
      useUpcomingIndicator({
        visitDate: VISIT_DATE,
        visitTime: VISIT_TIME,
        eligible: true,
        thresholdMinutes: THRESHOLD,
      })
    );

    expect(hook.current).toBe(false);
    expect(capturedAppStateHandler).not.toBeNull();

    dateSpy.mockReturnValue(windowOpenMs + 1_000);

    act(() => {
      capturedAppStateHandler!('active');
    });

    expect(hook.current).toBe(true);
    hook.unmount();
  });

  it('ignores AppState transitions to "background" or "inactive"', () => {
    dateSpy.mockReturnValue(windowOpenMs - 5_000);

    const hook = renderHook(() =>
      useUpcomingIndicator({
        visitDate: VISIT_DATE,
        visitTime: VISIT_TIME,
        eligible: true,
        thresholdMinutes: THRESHOLD,
      })
    );

    expect(hook.current).toBe(false);

    dateSpy.mockReturnValue(windowOpenMs + 1_000);

    act(() => {
      capturedAppStateHandler!('background');
    });
    expect(hook.current).toBe(false);

    act(() => {
      capturedAppStateHandler!('inactive');
    });
    expect(hook.current).toBe(false);

    hook.unmount();
  });

  it('clears timers on unmount (no setState after unmount)', () => {
    dateSpy.mockReturnValue(windowOpenMs - 2_000);

    const hook = renderHook(() =>
      useUpcomingIndicator({
        visitDate: VISIT_DATE,
        visitTime: VISIT_TIME,
        eligible: true,
        thresholdMinutes: THRESHOLD,
      })
    );

    hook.unmount();

    dateSpy.mockReturnValue(windowOpenMs + 1_000);

    expect(() => {
      act(() => {
        jest.advanceTimersByTime(60_000);
      });
    }).not.toThrow();
  });
});
