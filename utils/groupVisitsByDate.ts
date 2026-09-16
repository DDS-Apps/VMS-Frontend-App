import { getBusinessDateKey } from "@/utils/dateTimeUtils";

export interface VisitDateGroup<T> {
  date: string;
  visits: T[];
}

const BUSINESS_TIME_ZONE = "Asia/Riyadh";

function addCalendarDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Formats a YYYY-MM-DD visit date as the same calendar day everywhere.
 * Date-only API values must not be passed directly to new Date(), which treats
 * them as UTC midnight and can display the previous day in negative timezones.
 */
export function formatVisitDateLabel(
  dateKey: string,
  locale: string,
  labels?: { today: string; tomorrow: string },
  referenceDate: Date = new Date(),
): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);

  if (!match) {
    return dateKey;
  }

  if (labels) {
    const todayKey = getBusinessDateKey(referenceDate, BUSINESS_TIME_ZONE);
    if (dateKey === todayKey) {
      return labels.today;
    }
    if (dateKey === addCalendarDays(todayKey, 1)) {
      return labels.tomorrow;
    }
  }

  const [, year, month, day] = match;
  const calendarDate = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), 12),
  );

  const parts = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).formatToParts(calendarDate);
  const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const dayPart = getPart("day");
  const monthPart = new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone: "UTC",
  }).format(calendarDate);
  const yearPart = getPart("year");
  const separator = locale.toLowerCase().startsWith("ar") ? "، " : ", ";

  return `${dayPart}${separator}${monthPart} ${yearPart}`;
}

/**
 * Groups visit-like records into chronological calendar-date sections.
 * A missing date is kept in a final fallback group so a record is never
 * dropped from the dashboard simply because its date is incomplete.
 */
export function groupVisitsByDate<T extends { visitDate?: string | null }>(
  visits: readonly T[],
  requiredDateKeys: readonly string[] = [],
): VisitDateGroup<T>[] {
  const groups = new Map<string, T[]>();

  for (const visit of visits) {
    const date = visit.visitDate || "unknown";
    const existing = groups.get(date);

    if (existing) {
      existing.push(visit);
    } else {
      groups.set(date, [visit]);
    }
  }

  for (const dateKey of requiredDateKeys) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey) && !groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
  }

  return Array.from(groups, ([date, groupedVisits]) => ({
    date,
    visits: groupedVisits,
  })).sort((first, second) => {
    if (first.date === "unknown") return 1;
    if (second.date === "unknown") return -1;
    return first.date.localeCompare(second.date);
  });
}