import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useTimeBoundaryTick } from "./useTimeBoundaryTick";
import { ApprovalSchedule, getManagerApprovalEndMs, getManagerApprovalState } from "@/utils/managerApprovalEligibility";

/** Always resolve captured actions against the latest scoped records and clock. */
export function useManagerApprovalPolicy<T extends ApprovalSchedule & { id: string }>(records: T[]) {
  const latest = useRef(records);
  latest.current = records;
  const tick = useTimeBoundaryTick(records.map(record => {
    const end = getManagerApprovalEndMs(record);
    // Walk-ins retain their pre-existing strictly-after boundary.
    return end !== null && record.isWalkIn ? end + 1 : end;
  }), true);
  const [focusTick, setFocusTick] = useState(0);
  useFocusEffect(useCallback(() => { setFocusTick(n => n + 1); }, []));
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function" || typeof document === "undefined") return;
    const refresh = () => setFocusTick(n => n + 1);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const stateFor = useCallback((id: string) =>
    getManagerApprovalState(latest.current.find(record => record.id === id)), []);
  const canApprove = useCallback((id: string) => stateFor(id) === "eligible", [stateFor]);
  return { stateFor, canApprove, tick: tick + focusTick };
}
