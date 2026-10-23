/**
 * Exercise the current absolute-time contract, including every hook boundary
 * formerly tested with the retired device-local date/time parser.
 */
import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { AppState } from 'react-native';
import { useUpcomingIndicator } from '@/hooks/useUpcomingVisitTimer';

jest.mock('react-native', () => ({
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
  Platform: { OS: 'ios' },
}));

const START = '2026-10-25T10:00:00Z';
const START_MS = Date.parse(START);
const MINUTE = 60_000;
type Options = Parameters<typeof useUpcomingIndicator>[0];

describe('useUpcomingIndicator absolute-time lifecycle', () => {
  let tree: ReactTestRenderer | undefined;
  let current: boolean;
  const defaults: Options = {
    visitDate: '1999-01-01', visitTime: '00:00',
    visitStartAt: START, eligible: true,
  };
  function Host(props: Options) {
    current = useUpcomingIndicator(props);
    return null;
  }
  function render(overrides: Partial<Options> = {}) {
    act(() => {
      const element = React.createElement(Host, { ...defaults, ...overrides });
      if (tree) tree.update(element);
      else tree = create(element);
    });
  }
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(START_MS - 20 * MINUTE);
    jest.clearAllMocks();
  });
  afterEach(() => {
    if (tree) act(() => tree!.unmount());
    tree = undefined;
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('opens at the inclusive 15-minute boundary and closes at the exact start', () => {
    render();
    expect(current!).toBe(false);
    act(() => jest.advanceTimersByTime(5 * MINUTE - 1));
    expect(current!).toBe(false);
    act(() => jest.advanceTimersByTime(1));
    expect(current!).toBe(true);
    act(() => jest.advanceTimersByTime(15 * MINUTE));
    expect(current!).toBe(false);
  });

  it.each([undefined, '', 'invalid', '2026-10-25T10:00:00'])(
    'does not guess a start from display fields when ISO is %s', visitStartAt => {
      render({ visitStartAt, visitDate: '2026-10-25', visitTime: '09:45' });
      expect(current!).toBe(false);
      expect(jest.getTimerCount()).toBe(0);
    },
  );

  it('uses the explicit offset regardless of conflicting display date/time', () => {
    jest.setSystemTime(START_MS - 5 * MINUTE);
    render({ visitStartAt: '2026-10-25T13:00:00+03:00' });
    expect(current!).toBe(true);
  });

  it('applies a changed threshold and server clock offset', () => {
    render({ thresholdMinutes: 30 });
    expect(current!).toBe(true);
    render({ thresholdMinutes: 15 });
    expect(current!).toBe(false);
    render({ serverTimeDeltaMs: 5 * MINUTE });
    expect(current!).toBe(true);
    render({ serverTimeDeltaMs: -5 * MINUTE });
    expect(current!).toBe(false);
  });

  it('removes the alert immediately when eligibility changes', () => {
    jest.setSystemTime(START_MS - 5 * MINUTE);
    render();
    expect(current!).toBe(true);
    render({ eligible: false });
    expect(current!).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('reschedules without retaining the previous visit window', () => {
    render();
    render({ visitStartAt: new Date(Date.now() + 5 * MINUTE).toISOString() });
    expect(current!).toBe(true);
    render({ visitStartAt: new Date(Date.now() + 30 * MINUTE).toISOString() });
    expect(current!).toBe(false);
    act(() => jest.advanceTimersByTime(15 * MINUTE));
    expect(current!).toBe(true);
  });

  it('recalculates on foreground after timers were suspended', () => {
    render();
    const listener = (AppState.addEventListener as jest.Mock).mock.calls.at(-1)![1];
    jest.setSystemTime(START_MS - 5 * MINUTE);
    act(() => listener('active'));
    expect(current!).toBe(true);
    jest.setSystemTime(START_MS);
    act(() => listener('active'));
    expect(current!).toBe(false);
  });

  it('removes its timer and foreground subscription on unmount', () => {
    render();
    const subscription = (AppState.addEventListener as jest.Mock).mock.results.at(-1)!.value;
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    act(() => tree!.unmount());
    tree = undefined;
    expect(jest.getTimerCount()).toBe(0);
    expect(subscription.remove).toHaveBeenCalledTimes(1);
  });
});
