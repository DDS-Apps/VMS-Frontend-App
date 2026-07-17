/**
 * Tests for the synchronous render-time eligible guard in useUpcomingIndicator.
 *
 * The last line of the hook — `return eligible ? isUpcoming : false` — is the
 * primary defence against the alert icon briefly showing after a visit transitions
 * to a non-eligible status (e.g. visitor_accepted → checked_in). Because it runs
 * during the render phase, it takes effect immediately without waiting for a
 * useEffect or the next timer tick.
 *
 * These tests verify that property directly. They do NOT use fake timers because
 * the timer-scheduling path is covered separately; here we test only the
 * synchronous guard.
 */

// ---------------------------------------------------------------------------
// Module mocks — declared before imports so jest hoisting works correctly
// ---------------------------------------------------------------------------

jest.mock('react-native', () => {
  return {
    AppState: {
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },
    Platform: { OS: 'ios' },
  };
});

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
 * Returns a visitDate + visitTime that is 5 minutes in the future from the
 * moment of the call. This puts the visit comfortably inside the 15-minute
 * alert window without relying on fake timers.
 */
function buildVisitInFiveMinutes(): { visitDate: string; visitTime: string } {
  const target = new Date(Date.now() + 5 * 60 * 1000);
  const visitDate = [
    target.getFullYear(),
    String(target.getMonth() + 1).padStart(2, '0'),
    String(target.getDate()).padStart(2, '0'),
  ].join('-');
  const visitTime = `${String(target.getHours()).padStart(2, '0')}:${String(target.getMinutes()).padStart(2, '0')}`;
  return { visitDate, visitTime };
}

/**
 * Returns a visitDate + visitTime that is 2 hours in the future.
 * This is outside the 15-minute alert window, so the hook should return false
 * even when eligible is true.
 */
function buildVisitInTwoHours(): { visitDate: string; visitTime: string } {
  const target = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const visitDate = [
    target.getFullYear(),
    String(target.getMonth() + 1).padStart(2, '0'),
    String(target.getDate()).padStart(2, '0'),
  ].join('-');
  const visitTime = `${String(target.getHours()).padStart(2, '0')}:${String(target.getMinutes()).padStart(2, '0')}`;
  return { visitDate, visitTime };
}

/**
 * Returns a visitDate + visitTime that is 60 minutes in the past.
 * Useful for confirming the hook correctly returns false for visits that
 * have already started.
 */
function buildVisitInPast(): { visitDate: string; visitTime: string } {
  const target = new Date(Date.now() - 60 * 60 * 1000);
  const visitDate = [
    target.getFullYear(),
    String(target.getMonth() + 1).padStart(2, '0'),
    String(target.getDate()).padStart(2, '0'),
  ].join('-');
  const visitTime = `${String(target.getHours()).padStart(2, '0')}:${String(target.getMinutes()).padStart(2, '0')}`;
  return { visitDate, visitTime };
}

// ---------------------------------------------------------------------------
// Minimal host component
// ---------------------------------------------------------------------------

interface HostProps {
  visitDate: string;
  visitTime: string;
  eligible: boolean;
  /** Mutable ref — updated synchronously during each render by the hook call. */
  resultRef: React.MutableRefObject<boolean>;
}

/**
 * Renders the hook and writes its return value into `resultRef` on every
 * render cycle. Because the assignment happens during the render phase (not
 * in an effect), `resultRef.current` reflects the hook's return value for
 * the most recent render as soon as `act(...)` completes.
 */
function HostComponent({ visitDate, visitTime, eligible, resultRef }: HostProps): null {
  resultRef.current = useUpcomingIndicator({ visitDate, visitTime, eligible });
  return null;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('useUpcomingIndicator — render-time eligible guard', () => {
  /**
   * Core regression test: when eligible flips from true → false the return
   * value must become false in the same render cycle, not after an async tick.
   *
   * If someone removes or weakens the `return eligible ? isUpcoming : false`
   * guard, this test catches it: the internal isUpcoming state would still be
   * true from the previous render and the hook would incorrectly return true
   * until the next useEffect fires.
   */
  it('returns false immediately when eligible flips from true to false, within the same render cycle', () => {
    const { visitDate, visitTime } = buildVisitInFiveMinutes();
    const resultRef: React.MutableRefObject<boolean> = { current: false };

    let renderer: ReturnType<typeof create>;

    // Initial render: eligible = true, visit is 5 min away → within the 15-min
    // alert window, so the hook should return true.
    act(() => {
      renderer = create(
        <HostComponent
          visitDate={visitDate}
          visitTime={visitTime}
          eligible={true}
          resultRef={resultRef}
        />
      );
    });

    expect(resultRef.current).toBe(true);

    // Status transition: eligible flips to false (e.g. visitor checked in).
    // The render-time guard must immediately short-circuit to false.
    act(() => {
      renderer.update(
        <HostComponent
          visitDate={visitDate}
          visitTime={visitTime}
          eligible={false}
          resultRef={resultRef}
        />
      );
    });

    // No async tick, no timer, no useEffect needed — the guard fires during render.
    expect(resultRef.current).toBe(false);

    act(() => { renderer.unmount(); });
  });

  it('returns false on initial render when eligible is false, even if visitTime is within the window', () => {
    const { visitDate, visitTime } = buildVisitInFiveMinutes();
    const resultRef: React.MutableRefObject<boolean> = { current: true };

    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <HostComponent
          visitDate={visitDate}
          visitTime={visitTime}
          eligible={false}
          resultRef={resultRef}
        />
      );
    });

    expect(resultRef.current).toBe(false);

    act(() => { renderer.unmount(); });
  });

  it('returns true when eligible is true and visitTime is within the 15-minute window', () => {
    const { visitDate, visitTime } = buildVisitInFiveMinutes();
    const resultRef: React.MutableRefObject<boolean> = { current: false };

    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <HostComponent
          visitDate={visitDate}
          visitTime={visitTime}
          eligible={true}
          resultRef={resultRef}
        />
      );
    });

    expect(resultRef.current).toBe(true);

    act(() => { renderer.unmount(); });
  });

  it('returns false when eligible is true but visitTime has already passed', () => {
    const { visitDate, visitTime } = buildVisitInPast();
    const resultRef: React.MutableRefObject<boolean> = { current: true };

    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <HostComponent
          visitDate={visitDate}
          visitTime={visitTime}
          eligible={true}
          resultRef={resultRef}
        />
      );
    });

    // Visit started 60 minutes ago — outside the window regardless of eligibility.
    expect(resultRef.current).toBe(false);

    renderer.unmount();
  });

  /**
   * Edge-case: eligible stays true across a re-render but visitDate/visitTime
   * change to a value 2 hours away — well outside the 15-minute window.
   *
   * The synchronous guard path (`return eligible ? isUpcoming : false`) relies
   * on `isUpcoming` being re-computed whenever `calculate` changes. Because
   * `calculate` depends on visitDate and visitTime, any change to those props
   * triggers the main useEffect, which calls `setIsUpcoming(calculate())`.
   *
   * However, the return statement itself is synchronous: on the re-render where
   * visitDate/visitTime change, `calculate()` will reflect the new values
   * (isUpcomingVisit returns false for 2 hours away), so the hook returns false
   * immediately via the `eligible ? isUpcoming : false` path — no extra tick
   * needed because the useState initialiser already used `calculate()` and the
   * effect re-run propagates the new value before React commits the next paint.
   *
   * Note: the `isUpcoming` state is updated by the useEffect *after* render,
   * so on the exact re-render cycle where props change, the hook returns
   * `eligible ? isUpcoming : false` where `isUpcoming` is still the *previous*
   * state value. This test therefore validates that the effect fires within the
   * same `act()` call (which flushes effects synchronously), giving the
   * correct false result by the time `act()` resolves.
   */
  it('returns false immediately when visitDate/visitTime change to outside the window while eligible stays true', () => {
    const inFive = buildVisitInFiveMinutes();
    const resultRef: React.MutableRefObject<boolean> = { current: false };

    let renderer: ReturnType<typeof create>;

    // Initial render: eligible=true, visit 5 min away → inside the window → true.
    act(() => {
      renderer = create(
        <HostComponent
          visitDate={inFive.visitDate}
          visitTime={inFive.visitTime}
          eligible={true}
          resultRef={resultRef}
        />
      );
    });

    expect(resultRef.current).toBe(true);

    // Re-render: eligible stays true, but visitDate/visitTime move 2 hours out.
    // The hook must return false — the visit is no longer within the 15-min window.
    const inTwoHours = buildVisitInTwoHours();
    act(() => {
      renderer.update(
        <HostComponent
          visitDate={inTwoHours.visitDate}
          visitTime={inTwoHours.visitTime}
          eligible={true}
          resultRef={resultRef}
        />
      );
    });

    // act() flushes effects synchronously, so the useEffect-driven state update
    // (setIsUpcoming(calculate())) has already run by the time we reach this assertion.
    expect(resultRef.current).toBe(false);

    act(() => { renderer.unmount(); });
  });

  it('remains false across multiple re-renders once eligible is false', () => {
    const { visitDate, visitTime } = buildVisitInFiveMinutes();
    const resultRef: React.MutableRefObject<boolean> = { current: false };

    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <HostComponent
          visitDate={visitDate}
          visitTime={visitTime}
          eligible={true}
          resultRef={resultRef}
        />
      );
    });

    expect(resultRef.current).toBe(true);

    // First transition: eligible → false
    act(() => {
      renderer.update(
        <HostComponent
          visitDate={visitDate}
          visitTime={visitTime}
          eligible={false}
          resultRef={resultRef}
        />
      );
    });

    expect(resultRef.current).toBe(false);

    // Second re-render — eligible remains false; guard must still hold.
    act(() => {
      renderer.update(
        <HostComponent
          visitDate={visitDate}
          visitTime={visitTime}
          eligible={false}
          resultRef={resultRef}
        />
      );
    });

    expect(resultRef.current).toBe(false);

    act(() => { renderer.unmount(); });
  });
});
