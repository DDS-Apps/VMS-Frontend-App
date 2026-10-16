import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useQrHistoryData } from '@/hooks/queries/useQrHistoryData';
import { canDisplayQr, getQrAccessState } from '@/utils/qrAccess';
import type { VisitMovementHistory } from '@/types/api.types';

const event = (time: string, recordedAt: string) => ({
  id: 'same', requestId: 'v1', eventType: 'administrative_completion' as const,
  occurredAt: time, recordedAt, source: 'system', timestampBasis: 'occurred_at' as const,
  actor: null, gate: null,
});
const oldEvent = event('2026-10-16T10:00:00Z', '2026-10-16T10:01:00Z');
const corrected = event('2026-10-16T09:59:00Z', '2026-10-16T10:02:00Z');
const embedded: VisitMovementHistory = { requestId: 'v1', timezone: 'Asia/Riyadh', data: [oldEvent] };
const history: VisitMovementHistory = { ...embedded, data: [corrected], qrValidity: {
  expiresAt: '2026-10-16T10:00:00Z', retainedUntilCheckout: false,
  expired: true, terminal: true, revocationPending: true,
} };
const detail = {
  qrCode: 'must-not-return', isExpired: false, status: 'completed', visitDate: '2026-10-16',
  visitTime: '12:00', endTime: '13:00', movementHistory: embedded,
};
const now = Date.parse('2026-10-16T11:00:00Z');
let result: ReturnType<typeof useQrHistoryData<typeof detail>>;
function Probe({ detailAt, historyAt, feed, error }: { detailAt: number; historyAt: number; feed?: VisitMovementHistory; error?: unknown }) {
  result = useQrHistoryData(detail, feed, error, historyAt, detailAt);
  return null;
}
let tree: ReactTestRenderer;
afterEach(() => act(() => tree?.unmount()));

it.each([[200, 100], [100, 200]])('keeps authoritative revocation and corrected events for either response order (%s,%s)', (detailAt, historyAt) => {
  act(() => { tree = create(<Probe detailAt={detailAt} historyAt={historyAt} feed={history} />); });
  expect(getQrAccessState(result!, now)).toBe('revocationPending');
  expect(canDisplayQr(result!, now)).toBe(false);
  expect(result!.movementHistory!.data).toEqual([corrected]);
  // Another detail poll cannot erase the history endpoint's negative decision.
  act(() => tree.update(<Probe detailAt={500} historyAt={historyAt} feed={history} />));
  expect(getQrAccessState(result!, now)).toBe('revocationPending');
  expect(result!.movementHistory!.data).toEqual([corrected]);
});
it.each([403, 500])('preserves permitted embedded history on separate-read HTTP %s and withholds QR', status => {
  act(() => { tree = create(<Probe detailAt={200} historyAt={100} feed={history} error={{ status }} />); });
  expect(result!.movementHistory!.data).toEqual([oldEvent]);
  expect(result!.accessReadUnavailable).toBe(true);
  expect(canDisplayQr(result!, now)).toBe(false);
  expect(getQrAccessState(result!, now)).toBe('unavailable');
});
it('accepts cleanup completion only when the authoritative history response changes', () => {
  act(() => { tree = create(<Probe detailAt={200} historyAt={100} feed={history} />); });
  const settled = { ...history, qrValidity: { ...history.qrValidity, revocationPending: false } };
  act(() => tree.update(<Probe detailAt={300} historyAt={250} feed={settled} />));
  expect(getQrAccessState(result!, now)).toBe('expired');
  expect(canDisplayQr(result!, now)).toBe(false);
});
