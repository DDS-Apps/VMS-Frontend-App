import React from "react";
import { act, create } from "react-test-renderer";
import { useManagerApprovalPolicy } from "@/hooks/useManagerApprovalPolicy";

let mockForeground: ((state: string) => void) | undefined;
let mockFocus: (() => void) | undefined;
jest.mock("react-native", () => ({
  AppState: { addEventListener: (_event: string, listener: (state: string) => void) => {
    mockForeground = listener;
    return { remove: jest.fn() };
  } },
}));
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (listener: () => void) => { mockFocus = listener; },
}));
const record = {
  id: "one", status: "pending", visitDate: "2026-10-19",
  visitTime: "14:00", endTime: "15:00", isWalkIn: false,
};

describe("active approval policy", () => {
  let policy: ReturnType<typeof useManagerApprovalPolicy>;
  let renderer: ReturnType<typeof create>;
  function Harness({ records = [record] }: { records?: typeof record[] }) {
    policy = useManagerApprovalPolicy(records);
    return null;
  }
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-10-19T11:59:59Z"));
  });
  afterEach(() => {
    act(() => renderer?.unmount());
    jest.useRealTimers();
  });
  it("updates rendered eligibility exactly at the cutoff", () => {
    act(() => { renderer = create(<Harness />); });
    expect(policy!.canApprove("one")).toBe(true);
    const tick = policy!.tick;
    act(() => jest.advanceTimersByTime(1000));
    expect(policy!.tick).toBeGreaterThan(tick);
    expect(policy!.canApprove("one")).toBe(false);
  });
  it("rechecks captured actions even before the timer fires", () => {
    act(() => { renderer = create(<Harness />); });
    const staleHandler = policy!.canApprove;
    jest.setSystemTime(new Date("2026-10-19T12:00:00Z"));
    expect(staleHandler("one")).toBe(false);
  });
  it("resolves captured actions against the latest scoped data", () => {
    act(() => { renderer = create(<Harness />); });
    const staleHandler = policy!.canApprove;
    act(() => renderer.update(<Harness records={[]} />));
    expect(staleHandler("one")).toBe(false);
  });
  it.each(["VISIT_APPROVAL_EXPIRED", "VISIT_APPROVAL_INVALID_SCHEDULE", "VISIT_APPROVAL_ALREADY_PROCESSED"])(
    "remembers %s for unchanged data but allows a corrected schedule", code => {
      act(() => { renderer = create(<Harness />); });
      const captured = policy!.canApprove;
      act(() => policy!.rememberServerRejection("one", code));
      expect(captured("one")).toBe(false);
      act(() => renderer.update(<Harness records={[{ ...record }]} />));
      expect(policy!.canApprove("one")).toBe(false);
      act(() => renderer.update(<Harness records={[{ ...record, endTime: "16:00" }]} />));
      expect(policy!.canApprove("one")).toBe(true);
    },
  );
  it("does not infer a permanent eligibility block from generic transport failures", () => {
    act(() => { renderer = create(<Harness />); });
    act(() => policy!.rememberServerRejection("one", "NETWORK_ERROR"));
    expect(policy!.canApprove("one")).toBe(true);
  });
  it("recomputes when native foreground and navigation focus resume", () => {
    act(() => { renderer = create(<Harness />); });
    const before = policy!.tick;
    jest.setSystemTime(new Date("2026-10-19T12:30:00Z"));
    act(() => mockForeground?.("active"));
    act(() => mockFocus?.());
    expect(policy!.tick).toBeGreaterThan(before);
    expect(policy!.stateFor("one")).toBe("expired");
  });
});
