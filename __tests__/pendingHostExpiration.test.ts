import React from "react";
import { act, create } from "react-test-renderer";
import { AppState } from "react-native";
import { computeIsPendingHostWalkInExpired } from "@/utils/visitExpiredGuard";
import { useRiyadhBusinessDateKey } from "@/hooks/useRiyadhBusinessDateKey";

const request = {
  isWalkIn: true,
  status: "pending_host_approval",
  visitDate: "2026-09-11",
};

describe("pending Host walk-in expiration", () => {
  it.each([
    ["2026-09-11T20:59:59.999Z", false],
    ["2026-09-11T21:00:00.000Z", true],
    ["2026-09-12T09:00:00.000Z", true],
    ["2026-09-10T21:00:00.000Z", false],
  ])("evaluates the Riyadh calendar boundary at %s", (now, expected) => {
    expect(computeIsPendingHostWalkInExpired({
      ...request, nowFn: () => new Date(now),
    })).toBe(expected);
    expect(request.status).toBe("pending_host_approval");
  });

  it.each([undefined, null, "", "invalid", "2026-02-30", "2026-9-1"])(
    "does not falsely expire invalid date %s",
    (visitDate) => {
      expect(computeIsPendingHostWalkInExpired({
        ...request, visitDate, nowFn: () => new Date("2026-09-12T09:00:00Z"),
      })).toBe(false);
    },
  );

  it.each(["pending", "pending_approval", "approved", "checked_in", "completed", "rejected", "cancelled"])(
    "does not apply the pending-host rule to %s",
    (status) => {
      expect(computeIsPendingHostWalkInExpired({
        ...request, status, nowFn: () => new Date("2026-09-12T09:00:00Z"),
      })).toBe(false);
    },
  );

  it("does not apply to scheduled visits", () => {
    expect(computeIsPendingHostWalkInExpired({
      ...request, isWalkIn: false, nowFn: () => new Date("2026-09-12T09:00:00Z"),
    })).toBe(false);
  });
});

describe("rendered Riyadh date lifecycle", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-09-11T20:59:59.900Z"));
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  function mount() {
    let snapshot: { expired: boolean; status: string; canHostAct: boolean };
    const Probe = () => {
      const dateKey = useRiyadhBusinessDateKey();
      const expired = React.useMemo(
        () => computeIsPendingHostWalkInExpired(request), [dateKey],
      );
      snapshot = { expired, status: request.status, canHostAct: !expired };
      return null;
    };
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(React.createElement(Probe)); });
    return {
      get snapshot() { return snapshot!; },
      unmount() { act(() => tree.unmount()); },
    };
  }

  it("rerenders memoized presentation at midnight without data changes", () => {
    const probe = mount();
    expect(probe.snapshot.expired).toBe(false);
    act(() => jest.advanceTimersByTime(150));
    expect(probe.snapshot).toEqual({
      expired: true, status: "pending_host_approval", canHostAct: false,
    });
    probe.unmount();
  });

  it("recalculates after foreground without waiting for a suspended timer", () => {
    let foreground: (state: string) => void = () => {};
    const remove = jest.fn();
    jest.spyOn(AppState, "addEventListener").mockImplementation((_event, callback) => {
      foreground = callback;
      return { remove };
    });
    const probe = mount();
    act(() => {
      jest.setSystemTime(new Date("2026-09-12T07:00:00Z"));
      foreground("active");
    });
    expect(probe.snapshot.expired).toBe(true);
    expect(probe.snapshot.canHostAct).toBe(false);
    probe.unmount();
    expect(remove).toHaveBeenCalled();
  });
});