export type AllRequestsType = 'visitor' | 'buffet' | 'valet';

type SortableRequest = {
  id: string;
  createdAt?: string;
  date?: string;
  time?: string;
};

const toTimestamp = (value?: string): number | null => {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
};

const getFallbackVisitTimestamp = (request: SortableRequest): number | null => {
  if (!request.date) return null;
  const combined = request.time ? `${request.date}T${request.time}` : request.date;
  return toTimestamp(combined);
};

export const shouldShowAllRequestsStatusFilters = (type: AllRequestsType): boolean =>
  type === 'visitor';

export const getStatusFilterForRequestType = (
  type: AllRequestsType,
  currentStatus: string,
): string => (type === 'visitor' ? currentStatus : 'all');

export const formatAllRequestsDuration = (
  duration: string,
  translate: (key: string) => string,
  localizeNumber: (value: string) => string,
): string => {
  const isoMatch = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
  if (isoMatch) {
    const hours = isoMatch[1] ? Number(isoMatch[1]) : 0;
    const minutes = isoMatch[2] ? Number(isoMatch[2]) : 0;
    const parts: string[] = [];
    if (hours > 0) {
      parts.push(`${localizeNumber(hours.toString())} ${hours === 1 ? translate('time.hour') : translate('time.hours')}`);
    }
    if (minutes > 0) {
      parts.push(`${localizeNumber(minutes.toString())} ${minutes === 1 ? translate('time.minute') : translate('time.minutes')}`);
    }
    return parts.length > 0 ? parts.join(' ') : localizeNumber(duration);
  }

  const matches = Array.from(
    duration.matchAll(/(\d+(?:\.\d+)?)\s*(hour|hours|hr|hrs|minute|minutes|min|mins)/gi),
  );
  if (matches.length === 0) return localizeNumber(duration);
  return matches.map(match => {
    const amount = Number(match[1]);
    const isHours = match[2].toLowerCase().startsWith('h');
    const unit = isHours
      ? amount === 1 ? translate('time.hour') : translate('time.hours')
      : amount === 1 ? translate('time.minute') : translate('time.minutes');
    return `${localizeNumber(match[1])} ${unit}`;
  }).join(' ');
};

export const formatAllRequestsScheduledTime = (
  startTime: string | undefined,
  endTime: string | undefined,
  formatTime: (value: string) => string,
  rangeSeparator: string,
): string | null => {
  if (startTime && endTime) {
    return `${formatTime(startTime)} ${rangeSeparator} ${formatTime(endTime)}`;
  }
  if (startTime || endTime) return formatTime(startTime || endTime!);
  return null;
};

export const compareRequestsNewestFirst = <T extends SortableRequest>(a: T, b: T): number => {
  const aCreatedAt = toTimestamp(a.createdAt);
  const bCreatedAt = toTimestamp(b.createdAt);

  if (aCreatedAt !== null || bCreatedAt !== null) {
    if (aCreatedAt === null) return 1;
    if (bCreatedAt === null) return -1;
    if (aCreatedAt !== bCreatedAt) return bCreatedAt - aCreatedAt;
  }

  const aVisitAt = getFallbackVisitTimestamp(a);
  const bVisitAt = getFallbackVisitTimestamp(b);
  if (aVisitAt !== null || bVisitAt !== null) {
    if (aVisitAt === null) return 1;
    if (bVisitAt === null) return -1;
    if (aVisitAt !== bVisitAt) return bVisitAt - aVisitAt;
  }

  return a.id.localeCompare(b.id);
};