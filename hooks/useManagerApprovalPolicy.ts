import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useTimeBoundaryTick } from "./useTimeBoundaryTick";
import { ApprovalSchedule, getManagerApprovalEndMs, getManagerApprovalState } from "@/utils/managerApprovalEligibility";
import { isApprovalServerBlocked } from "@/utils/approvalErrorMessage";

function scheduleKey(record: ApprovalSchedule): string {
  return JSON.stringify([record.status, record.canApprove, record.isWalkIn, record.visitDate,
    record.visitTime, record.visitStartAt, record.endTime, record.duration]);
}

/** Always resolve captured actions against the latest scoped records and clock. */
export function useManagerApprovalPolicy<T extends ApprovalSchedule & { id: string }>(records: T[]) {
  const latest = useRef(records);
  latest.current = records;
  const serverRejections = useRef(new Map<string, { schedule: string; expired: boolean }>());
  const [rejectionTick, setRejectionTick] = useState(0);
  const rememberServerRejection = useCallback((id: string, code?: string) => {
    const record = latest.current.find(record => record.id === id);
    if (!record || !isApprovalServerBlocked(code)) return;
    serverRejections.current.set(id, { schedule: scheduleKey(record), expired: code === "VISIT_APPROVAL_EXPIRED" });
    setRejectionTick(n => n + 1);
  }, []);
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
  const stateFor = useCallback((id: string) => {
    const record = latest.current.find(record => record.id === id);
    const state = getManagerApprovalState(record);
    const rejected = serverRejections.current.get(id);
    // Re-reading the same stale schedule cannot override a server rejection.
    // A corrected schedule/status/permission is evaluated normally.
    return state === "eligible" && record && rejected?.schedule === scheduleKey(record)
      ? rejected.expired ? "expired" : "unavailable" : state;
  }, []);
  const canApprove = useCallback((id: string) => stateFor(id) === "eligible", [stateFor]);
  return { stateFor, canApprove, rememberServerRejection, tick: tick + focusTick + rejectionTick };
}
