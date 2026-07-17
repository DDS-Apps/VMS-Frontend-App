/**
 * Tests for the cancellation / unmount path of useUpcomingIndicator.
 *
 * When a visit is cancelled while a card is mounted, the parent removes the
 * record from the list, which React translates into an unmount of the component
 * that hosts the hook. The scenarios here verify that:
 *
 *  1. The indicator is ON while the visit is 5 minutes away.
 *  2. Unmounting inside act() runs the cleanup without errors or warnings.
 *  3. If the scheduled timer fires *after* the unmount (the race window the
 *     mountedRef guard defends against), no state update is attempted and no
 *     React "update on unmounted component" warning is emitted.
 *
 * Mechanism under test:
 *  - The cleanup returned by the main useEffect sets `mountedRef.current = false`
 *    and calls clearTimeout on the pending timer.
 *  - The timer callback checks `if (!mountedRef.current) return` before calling
 *    setIsUpcoming, so even if clearTimeout races (e.g. the callback was already
 *    dequeued by the JS engine), the guard prevents the state update.
 */

// ---------------------------------------------------------------------------
// Module mocks — declared before imports so jest hoisting works correctly
// ---------------------------------------------------------------------------

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Platform: { OS: 'ios' },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import React from 'react';
import { act, create } from 'react-test-renderer';
import { useUpcomingIndicator } from '@/hooks/useUpcomingVisitTimer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a visitDate + visitTime that is `offsetMinutes` from now.
 * Positive  → future  (visit is `offsetMinutes` minutes away).
 * Negative  → past    (visit started `|offsetMinutes|` minutes ago).
 */
function buildVisitAt(offsetMinutes: number): { visitDate: string; visitTime: string } {
  const target = new Date(Date.now() + offsetMinutes * 60 * 1000);
  const visitDate = [
    target.getFullYear(),
    String(target.getMonth() + 1).padStart(2, '0'),
    String(target.getDate()).padStart(2, '0'),
  ].join('-');
  const visitTime = `${String(target.getHours()).padStart(2, '0')}:${String(target.getMinutes()).padStart(2, '0')}`;
  return { visitDate, visitTime };
}

// ---------------------------------------------------------------------------
// Minimal host component (mirrors the shape used in sibling test files)
// ---------------------------------------------------------------------------

interface HostProps {
  visitDate: string;
  visitTime: string;
  eligible: boolean;
  resultRef: React.MutableRefObject<boolean>;
}

/**
 * Renders the hook and writes its return value into `resultRef` during every
 * render phase, so callers can inspect the latest value after act() settles.
 */
function HostComponent({ visitDate, visitTime, eligible, resultRef }: HostProps): null {
  resultRef.current = useUpcomingIndicator({ visitDate, visitTime, eligible });
  return null;
}

// ---------------------------------------------------------------------------
// Suite — cancellation / unmount path
// ---------------------------------------------------------------------------

describe('useUpcomingIndicator — cancellation (component unmounted mid-session)', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    // Capture any React warnings about state updates on unmounted components.
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.runAllTimers();
    jest.useRealTimers();
    consoleErrorSpy.mockRestore();
  });

  /**
   * Core scenario: indicator is ON (visit 5 min away), then the parent
   * cancels the visit, unmounting the card. Cleanup must run without errors
   * and no React act() warning should be produced.
   */
  it('indicator is ON before unmount and cleanup runs without errors', () => {
    const resultRef: React.MutableRefObject<boolean> = { current: false };
    const visit5 = buildVisitAt(5);

    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <HostComponent
          visitDate={visit5.visitDate}
          visitTime={visit5.visitTime}
          eligible={true}
          resultRef={resultRef}
        />
      );
    });

    // Visit is 5 min away — inside the 15-min window — indicator must be ON.
    expect(resultRef.current).toBe(true);

    // Simulate the parent removing the card (visit cancelled).
    // Unmounting inside act() lets React flush any synchronous effects triggered
    // by the unmount (e.g. the cleanup in useEffect that clears the timer and
    // sets mountedRef.current = false).
    expect(() => {
      act(() => {
        renderer.unmount();
      });
    }).not.toThrow();

    // No React warnings about state updates on unmounted components.
    const reactWarnings = consoleErrorSpy.mock.calls.filter(
      (args) => typeof args[0] === 'string' && args[0].includes('unmounted')
    );
    expect(reactWarnings).toHaveLength(0);
  });

  /**
   * Race-condition guard: after unmounting, we advance fake timers past the
   * scheduled checkpoint so that any timer that was NOT cleared (or whose
   * callback was already dequeued) gets a chance to fire. The mountedRef guard
   * inside the callback must prevent setIsUpcoming from being called, so no
   * React act() warning is produced.
   */
  it('emits no React act() warning when the timer fires after unmount', () => {
    const resultRef: React.MutableRefObject<boolean> = { current: false };
    const visit5 = buildVisitAt(5);

    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <HostComponent
          visitDate={visit5.visitDate}
          visitTime={visit5.visitTime}
          eligible={true}
          resultRef={resultRef}
        />
      );
    });

    expect(resultRef.current).toBe(true);

    // Unmount the component — cleanup clears the timer and flips mountedRef.
    act(() => {
      renderer.unmount();
    });

    // Advance all fake timers outside of act() to simulate the race: the JS
    // engine had already dequeued the callback before clearTimeout ran. The
    // mountedRef guard inside the callback must suppress the setIsUpcoming call.
    // If the guard is missing, React would warn about a state update on an
    // unmounted component here.
    jest.runAllTimers();

    const actWarnings = consoleErrorSpy.mock.calls.filter(
      (args) =>
        typeof args[0] === 'string' &&
        (args[0].includes('unmounted') || args[0].includes('act('))
    );
    expect(actWarnings).toHaveLength(0);
  });

  /**
   * Verifies that the indicator is correctly OFF when a visit that is outside
   * the window (20 min away) is cancelled mid-session — the cleanup path works
   * regardless of whether the indicator was active at the time of unmount.
   */
  it('cleanup runs cleanly when indicator was OFF at the time of unmount', () => {
    const resultRef: React.MutableRefObject<boolean> = { current: false };
    const visit20 = buildVisitAt(20);

    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <HostComponent
          visitDate={visit20.visitDate}
          visitTime={visit20.visitTime}
          eligible={true}
          resultRef={resultRef}
        />
      );
    });

    // 20 min > 15 min threshold — indicator must be OFF.
    expect(resultRef.current).toBe(false);

    expect(() => {
      act(() => {
        renderer.unmount();
      });
    }).not.toThrow();

    jest.runAllTimers();

    const warnings = consoleErrorSpy.mock.calls.filter(
      (args) =>
        typeof args[0] === 'string' &&
        (args[0].includes('unmounted') || args[0].includes('act('))
    );
    expect(warnings).toHaveLength(0);
  });

  /**
   * Full lifecycle: mount → indicator ON → advance timers slightly (to confirm
   * the hook is alive) → unmount → advance remaining timers. No warnings at
   * any stage.
   */
  it('handles a mid-session unmount after at least one timer tick without warnings', () => {
    const resultRef: React.MutableRefObject<boolean> = { current: false };
    const visit5 = buildVisitAt(5);

    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <HostComponent
          visitDate={visit5.visitDate}
          visitTime={visit5.visitTime}
          eligible={true}
          resultRef={resultRef}
        />
      );
    });

    expect(resultRef.current).toBe(true);

    // Advance 30 seconds — inside the 60 s MAX_TIMEOUT_MS cap — so the hook
    // fires its capped timeout and reschedules. The component is still mounted
    // so this is a normal in-session tick.
    act(() => {
      jest.advanceTimersByTime(30_000);
    });

    // Indicator should still be ON (visit now ~4.5 min away).
    expect(resultRef.current).toBe(true);

    // Now unmount (visit cancelled mid-session).
    act(() => {
      renderer.unmount();
    });

    // Drain all remaining timers after unmount — mountedRef guard must block
    // any further state updates.
    jest.runAllTimers();

    const warnings = consoleErrorSpy.mock.calls.filter(
      (args) =>
        typeof args[0] === 'string' &&
        (args[0].includes('unmounted') || args[0].includes('act('))
    );
    expect(warnings).toHaveLength(0);
  });
});
