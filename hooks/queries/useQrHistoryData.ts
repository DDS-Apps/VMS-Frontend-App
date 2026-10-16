import { useMemo } from 'react';
import type { VisitMovementHistory } from '@/types/api.types';
import type { QrAccessSource } from '@/utils/qrAccess';
import { reconcileMovementEvents } from '@/utils/movementEventPresentation';

/** Arrival order is not a server revision. The dedicated history response owns
 * validity; a less-complete detail snapshot must never restore access. */
export function useQrHistoryData<T extends QrAccessSource & { movementHistory?: VisitMovementHistory }>(
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
      // A separate endpoint's restriction does not revoke the detail endpoint's
      // permission. Keep its embedded events, but withhold unverified QR claims.
      movementHistory: detail.movementHistory,
    };
    if (!history) return detail;
    const embedded = detail.movementHistory;
    return {
      ...detail,
      movementHistory: {
        ...embedded,
        ...history,
        qrValidity: { ...embedded?.qrValidity, ...history.qrValidity },
        data: reconcileMovementEvents([...(embedded?.data ?? []), ...history.data]),
      },
    };
  }, [detail, history, error, historyUpdatedAt, detailUpdatedAt]);
}
