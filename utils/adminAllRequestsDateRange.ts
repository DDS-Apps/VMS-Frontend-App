import {
  DEFAULT_SERVER_TIMEZONE,
  getBusinessDateKey,
} from "@/utils/dateTimeUtils";

export interface CalendarDateKeyRange {
  startDate: string;
  endDate: string;
}

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateKey(dateKey: string): {
  year: number;
  month: number;
  day: number;
} {
  const match = DATE_KEY_PATTERN.exec(dateKey);
  if (!match) {
    throw new Error(`Invalid calendar date key: ${dateKey}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date key: ${dateKey}`);
  }

  return { year, month, day };
}

export function getCurrentBusinessMonthRange(
  now: Date = new Date(),
  timezone: string = DEFAULT_SERVER_TIMEZONE,
): CalendarDateKeyRange {
  const todayKey = getBusinessDateKey(now, timezone);
  const { year, month } = parseDateKey(todayKey);
  const monthText = String(month).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    startDate: `${year}-${monthText}-01`,
    endDate: `${year}-${monthText}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function dateKeyToLocalNoon(dateKey: string): Date {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function localCalendarDateToKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function enumerateInclusiveDateKeys(
  startDate: string,
  endDate: string,
): string[] {
  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  const cursor = new Date(Date.UTC(start.year, start.month - 1, start.day));
  const endTime = Date.UTC(end.year, end.month - 1, end.day);

  if (cursor.getTime() > endTime) {
    throw new Error("Start date must not be after end date");
  }

  const keys: string[] = [];
  while (cursor.getTime() <= endTime) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}
