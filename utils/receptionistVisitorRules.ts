import { getBusinessDateKey } from './dateTimeUtils';

export type ReceptionistDateFilter = 'all' | 'today' | 'this_week' | 'this_month' | 'custom';
export type ReceptionistStatusSource = 'waiting_acceptance' | 'accepted';

interface ReceptionistVisitorLike {
  isWalkIn?: boolean;
  status: string;
  visitDate?: string | null;
}

const SCHEDULED_VISIBLE_STATUSES = new Set([
  'waiting_acceptance',
  'accepted',
  'visitor_accepted',
  'checked_in',
  'checked_out',
  'completed',
]);

const TODAY_HIDDEN_STATUSES = new Set([
  'rejected',
  'visitor_rejected',
  'cancelled',
  'auto_cancelled',
]);

export const isReceptionistDashboardVisitorVisible = (
  visitor: ReceptionistVisitorLike,
): boolean => !TODAY_HIDDEN_STATUSES.has(visitor.status.toLowerCase());

export const keepReceptionistAllVisitorsRecord = (
  visitor: ReceptionistVisitorLike,
): boolean => visitor.isWalkIn === true || SCHEDULED_VISIBLE_STATUSES.has(visitor.status);

export const isReceptionistAllVisitorsRecordVisible = (
  visitor: ReceptionistVisitorLike,
  now = new Date(),
): boolean => {
  const todayKey = getBusinessDateKey(now, 'Asia/Riyadh');
  return visitor.visitDate === todayKey
    ? isReceptionistDashboardVisitorVisible(visitor)
    : keepReceptionistAllVisitorsRecord(visitor);
};

export const getReceptionistStatusSources = (
  apiStatuses?: string,
): ReceptionistStatusSource[] => {
  const statusTokens = new Set(
    apiStatuses
      ?.split(',')
      .map((status) => status.trim().toLowerCase())
      .filter(Boolean) ?? [],
  );
  const sources: ReceptionistStatusSource[] = [];

  if (statusTokens.has('waiting_acceptance')) {
    sources.push('waiting_acceptance');
  }
  if (statusTokens.has('accepted') || statusTokens.has('visitor_accepted')) {
    sources.push('accepted');
  }

  return sources;
};

const shiftDateKey = (dateKey: string, days: number): string => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
};

export const getReceptionistDateRange = (
  filter: ReceptionistDateFilter,
  now = new Date(),
): { startDate?: string; endDate?: string } => {
  const todayKey = getBusinessDateKey(now, 'Asia/Riyadh');
  const [year, month] = todayKey.split('-').map(Number);

  switch (filter) {
    case 'today':
      return { startDate: todayKey, endDate: todayKey };
    case 'this_week': {
      const dayOfWeek = new Date(`${todayKey}T12:00:00Z`).getUTCDay();
      const startDate = shiftDateKey(todayKey, -dayOfWeek);
      const workWeekEndDate = shiftDateKey(startDate, 4);
      return {
        startDate,
        endDate: todayKey > workWeekEndDate ? todayKey : workWeekEndDate,
      };
    }
    case 'this_month': {
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      return {
        startDate: `${prefix}-01`,
        endDate: `${prefix}-${String(lastDay).padStart(2, '0')}`,
      };
    }
    default:
      return {};
  }
};