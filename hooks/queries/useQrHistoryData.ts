import { useMemo } from 'react';
import type { VisitMovementHistory } from '@/types/api.types';
import type { QrAccessSource } from '@/utils/qrAccess';

/** Do not turn each render into a new detail identity (form initialization
 * effects depend on it). Failed history reads cannot expose a cached feed. */
export function useQrHistoryData<T extends QrAccessSource>(
  detail: T | undefined,
  history: VisitMovementHistory | undefined,
  error: unknown,
  historyUpdatedAt: number,
  detailUpdatedAt: number,
) {
  return useMemo(() => {
    if (!detail) return detail;
    if (error) return {
      ...detail,
      accessReadUnavailable: true,
      movementHistory: { requestId: '', timezone: detail.timezone || 'Asia/Riyadh', data: [] },
    };
    if (!history || (detail.movementHistory && detailUpdatedAt > historyUpdatedAt)) return detail;
    return { ...detail, movementHistory: history };
  }, [detail, history, error, historyUpdatedAt, detailUpdatedAt]);
}
