function toCalendarDate(value: Date | string): Date | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate(), 12));
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date
    : null;
}

export function formatFilterDate(value: Date | string, isRTL: boolean): string {
  const date = toCalendarDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(isRTL ? "ar-SA-u-ca-gregory" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatActiveDateRange(
  startDate: Date | string,
  endDate: Date | string,
  isRTL: boolean,
  fromLabel: string,
  toLabel: string,
): string {
  const from = formatFilterDate(startDate, isRTL);
  const to = formatFilterDate(endDate, isRTL);
  if (!from || !to) return "";
  return from === to ? from : `${fromLabel} ${from} – ${toLabel} ${to}`;
}