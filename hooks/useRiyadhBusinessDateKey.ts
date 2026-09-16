import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { getBusinessDateKey, getServerDateParts } from "@/utils/dateTimeUtils";

const RIYADH_TIME_ZONE = "Asia/Riyadh";
const DAY_MS = 24 * 60 * 60 * 1000;

export function millisecondsUntilNextRiyadhDate(now: Date): number {
  const { hours, minutes } = getServerDateParts(now, RIYADH_TIME_ZONE);
  const normalizedHours = hours === 24 ? 0 : hours;
  const elapsedTodayMs =
    ((normalizedHours * 60 + minutes) * 60 + now.getSeconds()) * 1000 +
    now.getMilliseconds();

  return Math.max(1, DAY_MS - elapsedTodayMs + 25);
}

export function useRiyadhBusinessDateKey(): string {
  const [dateKey, setDateKey] = useState(() =>
    getBusinessDateKey(new Date(), RIYADH_TIME_ZONE),
  );

  useEffect(() => {
    let rolloverTimer: ReturnType<typeof setTimeout> | undefined;

    const refreshAndSchedule = () => {
      if (rolloverTimer) clearTimeout(rolloverTimer);

      const now = new Date();
      setDateKey(getBusinessDateKey(now, RIYADH_TIME_ZONE));
      rolloverTimer = setTimeout(
        refreshAndSchedule,
        millisecondsUntilNextRiyadhDate(now),
      );
    };

    refreshAndSchedule();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshAndSchedule();
    });

    return () => {
      if (rolloverTimer) clearTimeout(rolloverTimer);
      subscription.remove();
    };
  }, []);

  return dateKey;
}
