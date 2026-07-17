/**
 * Tests for the reschedule path of useUpcomingIndicator.
 *
 * When a visit is rescheduled the hook receives new visitDate/visitTime props.
 * These tests verify that:
 *
 *  1. Starting 20 min away  → indicator is OFF  (outside 15-min window)
 *  2. Rescheduling to 5 min → indicator turns ON  (inside window)
 *  3. Rescheduling to 30 min→ indicator turns OFF (outside window again)
 *  4. No flicker / double-fire during the prop-change transition
 *
 * The mechanism under test:
 *  - `calculate` is a useCallback whose identity changes when visitDate,
 *    visitTime, eligible, or thresholdMinutes changes.
 *  - The main useEffect depends on [calculate, scheduleNextCheck], so it
 *    re-runs on every reschedule, clears the old timer, calls
 *    setIsUpcoming(calculate()) synchronously, and arms a fresh timer.
 *  - The render-time guard `return eligible ? isUpcoming : false` ensures
 *    the returned value is always consistent with the current props.
 */

// ---------------------------------------------------------------------------
// Module mocks — must appear BEFORE imports so jest hoisting works
// ---------------------------------------------------------------------------

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Platform: { OS: 'ios' },
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import React from 'react';
import { act, create } from 'react-test-renderer';
import { useUpcomingIndicator } from '@/hooks/useUpcomingVisitTimer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a visitDate + visitTime for a moment that is `offsetMinutes` from now.
 * Positive  → future (visit is `offsetMinutes` minutes away).
 * Negative  → past   (visit started `|offsetMinutes|` minutes ago).
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
// Minimal host component
// ---------------------------------------------------------------------------

interface HostProps {
  visitDate: string;
  visitTime: string;
  eligible: boolean;
  resultRef: React.MutableRefObject<boolean>;
  /** Optional counter incremented whenever the hook returns a new truthy value. */
  onTrueRef?: React.MutableRefObject<number>;
}

/**
 * Renders the hook and writes its return value into `resultRef` on every
 * render. The write happens during the render phase so `resultRef.current`
 * reflects the hook value for the most recent render as soon as `act()` settles.
 */
function HostComponent({ visitDate, visitTime, eligible, resultRef, onTrueRef }: HostProps): null {
  const value = useUpcomingIndicator({ visitDate, visitTime, eligible });
  resultRef.current = value;
  if (onTrueRef && value) {
    onTrueRef.current += 1;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Suite — reschedule / prop-change path
// ---------------------------------------------------------------------------

describe('useUpcomingIndicator — reschedule (visitDate/visitTime prop changes)', () => {
  /**
   * The core reschedule scenario:
   *  20 min away  → OFF
   *  5 min away   → ON
   *  30 min away  → OFF
   */
  it('toggles the indicator correctly across two successive reschedules', () => {
    const resultRef: React.MutableRefObject<boolean> = { current: false };

    // --- Step 1: visit is 20 minutes away (outside the 15-min window) ---
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

    expect(resultRef.current).toBe(false); // 20 min > 15 min threshold → OFF

    // --- Step 2: reschedule to 5 minutes away (inside the 15-min window) ---
    const visit5 = buildVisitAt(5);

    act(() => {
      renderer.update(
        <HostComponent
          visitDate={visit5.visitDate}
          visitTime={visit5.visitTime}
          eligible={true}
          resultRef={resultRef}
        />
      );
    });

    expect(resultRef.current).toBe(true); // 5 min < 15 min threshold → ON

    // --- Step 3: reschedule back to 30 minutes away (outside window again) ---
    const visit30 = buildVisitAt(30);

    act(() => {
      renderer.update(
        <HostComponent
          visitDate={visit30.visitDate}
          visitTime={visit30.visitTime}
          eligible={true}
          resultRef={resultRef}
        />
      );
    });

    expect(resultRef.current).toBe(false); // 30 min > 15 min threshold → OFF

    act(() => { renderer.unmount(); });
  });

  /**
   * Rescheduling from outside the window into the window must turn the
   * indicator ON immediately — within the same render cycle, not after an
   * async tick or the next timer fire.
   */
  it('turns the indicator ON synchronously when rescheduled into the alert window', () => {
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

    expect(resultRef.current).toBe(false);

    const visit7 = buildVisitAt(7);

    act(() => {
      renderer.update(
        <HostComponent
          visitDate={visit7.visitDate}
          visitTime={visit7.visitTime}
          eligible={true}
          resultRef={resultRef}
        />
      );
    });

    // Must be true immediately — no setTimeout, no setInterval needed.
    expect(resultRef.current).toBe(true);

    act(() => { renderer.unmount(); });
  });

  /**
   * Rescheduling from inside the window to outside must turn the indicator
   * OFF immediately — the old timer must be cleared and the new state must
   * reflect the updated visitTime.
   */
  it('turns the indicator OFF synchronously when rescheduled out of the alert window', () => {
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

    expect(resultRef.current).toBe(true); // inside window

    const visit25 = buildVisitAt(25);

    act(() => {
      renderer.update(
        <HostComponent
          visitDate={visit25.visitDate}
          visitTime={visit25.visitTime}
          eligible={true}
          resultRef={resultRef}
        />
      );
    });

    expect(resultRef.current).toBe(false); // outside window after reschedule

    act(() => { renderer.unmount(); });
  });

  /**
   * No double-fire: when the visit is rescheduled into the window, the
   * indicator must fire exactly once (not flash true → false → true or
   * any other spurious sequence).  We count how many render cycles produce
   * a truthy value; it must be exactly 1 after the reschedule update.
   */
  it('does not double-fire when rescheduled into the alert window', () => {
    const resultRef: React.MutableRefObject<boolean> = { current: false };
    const trueCountRef: React.MutableRefObject<number> = { current: 0 };

    const visit20 = buildVisitAt(20);
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <HostComponent
          visitDate={visit20.visitDate}
          visitTime={visit20.visitTime}
          eligible={true}
          resultRef={resultRef}
          onTrueRef={trueCountRef}
        />
      );
    });

    expect(resultRef.current).toBe(false);
    expect(trueCountRef.current).toBe(0); // no truthy renders yet

    const visit8 = buildVisitAt(8);

    act(() => {
      renderer.update(
        <HostComponent
          visitDate={visit8.visitDate}
          visitTime={visit8.visitTime}
          eligible={true}
          resultRef={resultRef}
          onTrueRef={trueCountRef}
        />
      );
    });

    expect(resultRef.current).toBe(true);
    // Should be exactly 1 truthy render — no spurious flicker back to false then true.
    expect(trueCountRef.current).toBe(1);

    act(() => { renderer.unmount(); });
  });

  /**
   * When eligible is false the indicator must stay OFF regardless of
   * the visitTime, even after a reschedule into the alert window.
   */
  it('stays OFF when eligible is false, even after a reschedule into the window', () => {
    const resultRef: React.MutableRefObject<boolean> = { current: false };
    const visit20 = buildVisitAt(20);
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <HostComponent
          visitDate={visit20.visitDate}
          visitTime={visit20.visitTime}
          eligible={false}
          resultRef={resultRef}
        />
      );
    });

    expect(resultRef.current).toBe(false);

    // Reschedule into window but eligible is still false
    const visit5 = buildVisitAt(5);

    act(() => {
      renderer.update(
        <HostComponent
          visitDate={visit5.visitDate}
          visitTime={visit5.visitTime}
          eligible={false}
          resultRef={resultRef}
        />
      );
    });

    expect(resultRef.current).toBe(false); // render-time guard holds

    act(() => { renderer.unmount(); });
  });

  /**
   * Combined transition: eligible starts false, visit is rescheduled into the
   * window, then eligible flips to true — indicator must then turn ON.
   */
  it('turns ON after reschedule + eligible flip, in the correct order', () => {
    const resultRef: React.MutableRefObject<boolean> = { current: false };
    const visit20 = buildVisitAt(20);
    let renderer: ReturnType<typeof create>;

    // Initial: outside window, not eligible
    act(() => {
      renderer = create(
        <HostComponent
          visitDate={visit20.visitDate}
          visitTime={visit20.visitTime}
          eligible={false}
          resultRef={resultRef}
        />
      );
    });
    expect(resultRef.current).toBe(false);

    // Reschedule into window, still not eligible
    const visit5 = buildVisitAt(5);
    act(() => {
      renderer.update(
        <HostComponent
          visitDate={visit5.visitDate}
          visitTime={visit5.visitTime}
          eligible={false}
          resultRef={resultRef}
        />
      );
    });
    expect(resultRef.current).toBe(false); // eligible guard blocks it

    // Now eligible flips to true — indicator should turn ON
    act(() => {
      renderer.update(
        <HostComponent
          visitDate={visit5.visitDate}
          visitTime={visit5.visitTime}
          eligible={true}
          resultRef={resultRef}
        />
      );
    });
    expect(resultRef.current).toBe(true);

    act(() => { renderer.unmount(); });
  });

  /**
   * Three-step full-cycle regression:
   *  20 min away, eligible  → OFF
   *  5 min away,  eligible  → ON
   *  30 min away, eligible  → OFF
   * (Explicit copy of the "Done looks like" scenario in the task spec.)
   */
  it('passes the full 20→5→30 min reschedule cycle described in the task spec', () => {
    const resultRef: React.MutableRefObject<boolean> = { current: false };
    let renderer: ReturnType<typeof create>;

    // 20 min away → indicator OFF
    const v20 = buildVisitAt(20);
    act(() => {
      renderer = create(
        <HostComponent visitDate={v20.visitDate} visitTime={v20.visitTime} eligible={true} resultRef={resultRef} />
      );
    });
    expect(resultRef.current).toBe(false);

    // reschedule to 5 min → indicator ON
    const v5 = buildVisitAt(5);
    act(() => {
      renderer.update(
        <HostComponent visitDate={v5.visitDate} visitTime={v5.visitTime} eligible={true} resultRef={resultRef} />
      );
    });
    expect(resultRef.current).toBe(true);

    // reschedule back to 30 min → indicator OFF
    const v30 = buildVisitAt(30);
    act(() => {
      renderer.update(
        <HostComponent visitDate={v30.visitDate} visitTime={v30.visitTime} eligible={true} resultRef={resultRef} />
      );
    });
    expect(resultRef.current).toBe(false);

    act(() => { renderer.unmount(); });
  });
});
