import { AxiosError } from 'axios';
import { httpClient, clearTokens } from '@/api/httpClient';
import { securityApiService } from '@/services/api/securityApiService';
import { requestApiService } from '@/services/api/requestApiService';
import { isManualBuildingGateAllowed } from '@/utils/manualBuildingGates';
import { movementDetailPollingInterval } from '@/utils/movementPolling';
import { readMovementDisplay, formatActualMovement } from '@/utils/movementSummary';
import { mergeVisitMovementTimeline } from '@/utils/visitMovementTimeline';
import type { VisitMovementHistory } from '@/types/api.types';

const adapter = jest.fn();
const inside = '2026-10-09T09:20:00.000Z';
const outside = '2026-10-09T09:10:00.000Z';
const t = (key: string) => key;
function response(data: unknown) {
  adapter.mockImplementation(async config => ({ status: 200, statusText: 'OK', headers: {}, config, data: { success: true, data } }));
}
beforeEach(() => { clearTokens(); adapter.mockReset(); httpClient.defaults.adapter = adapter; });

describe('explicit manual Security building assertions', () => {
  it.each(['gate_parking', 'd_9', 'd_10', 'unknown', '', ' main '])('rejects %s without any HTTP request', async gateId => {
    for (const action of ['gateCheckIn', 'gateCheckOut'] as const) {
      await expect(securityApiService[action]({ visitId: 'fixture', gateId })).rejects.toMatchObject({ code: 'VALIDATION_ERROR', status: 400 });
    }
    expect(adapter).not.toHaveBeenCalled();
  });
  it.each(['d_2', 'd_3', 'd_6', 'd_7'])('allows %s only for building IN', async gateId => {
    response({ id: 'fixture', status: 'checked_in' });
    await expect(securityApiService.gateCheckIn({ visitId: 'fixture', gateId })).resolves.toMatchObject({ status: 'checked_in' });
    await expect(securityApiService.gateCheckOut({ visitId: 'fixture', gateId })).rejects.toMatchObject({ status: 400 });
    expect(adapter).toHaveBeenCalledTimes(1);
  });
  it.each(['d_1', 'd_4', 'd_5', 'd_8'])('allows %s only for building OUT and preserves server completion', async gateId => {
    response({ id: 'fixture', status: 'completed', movementSummary: { version: 1, latestCheckInAt: outside, latestCheckOutAt: inside } });
    await expect(securityApiService.gateCheckOut({ visitId: 'fixture', gateId })).resolves.toMatchObject({ status: 'completed' });
    await expect(securityApiService.gateCheckIn({ visitId: 'fixture', gateId })).rejects.toMatchObject({ status: 400 });
    expect(adapter).toHaveBeenCalledTimes(1);
  });
  it.each(['main', 'gate_main_entrance', 'gate_side_entrance', 'gate_vip'])('preserves generic operator assertion %s', gateId => {
    expect(isManualBuildingGateAllowed('check_in', gateId)).toBe(true);
    expect(isManualBuildingGateAllowed('check_out', gateId)).toBe(true);
  });
  it.each([400, 403, 410])('preserves backend denial %s without retrying a valid reader action', async status => {
    adapter.mockImplementation(async config => {
      throw new AxiosError('action denied', 'ERR_BAD_REQUEST', config, {}, {
        status, statusText: '', headers: {}, config, data: { message: 'Backend eligibility denied' },
      });
    });
    await expect(securityApiService.gateCheckIn({ visitId: 'fixture', gateId: 'main' })).rejects.toMatchObject({ status, message: 'Backend eligibility denied' });
    expect(adapter).toHaveBeenCalledTimes(1);
  });
});

describe('reader movement read compatibility (not backend enforcement)', () => {
  it('keeps an approved parking-entry snapshot unchanged without a building action', async () => {
    const body = { id: 'parking-fixture', status: 'approved', isVisitorNeedsParking: true,
      timezone: 'Asia/Riyadh', movementSummary: { version: 1, latestCheckInAt: null, latestCheckOutAt: null } };
    response(body);
    expect(await requestApiService.getVisitById('parking-fixture')).toEqual(body);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(adapter.mock.calls[0][0].method).toBe('get');
  });
  it.each([true, false])('retains independent OUT after re-entry, parking required=%s', async parking => {
    const body = { id: 'fixture', status: 'checked_in', isVisitorNeedsParking: parking, checkedInAt: inside,
      checkedOutAt: null, completedAt: null, timezone: 'Asia/Riyadh',
      movementSummary: { version: 1, latestCheckInAt: inside, latestCheckOutAt: outside } };
    response(body);
    const read = await requestApiService.getVisitById('fixture');
    expect(read).toEqual(body);
    expect(readMovementDisplay(read).state).toBe('supported');
    expect(read.movementSummary?.latestCheckOutAt).toBe(outside);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(adapter.mock.calls[0][0].method).toBe('get');
  });
  it('does not convert parking arrival, nulls or administrative completion into physical summary values', async () => {
    const body = { id: 'fixture', status: 'completed', completedAt: inside,
      timezone: 'Asia/Riyadh', movementSummary: { version: 1, latestCheckInAt: null, latestCheckOutAt: null } };
    response(body);
    const read = await requestApiService.getVisitById('fixture');
    expect(read.movementSummary).toEqual(body.movementSummary);
    expect(formatActualMovement(read.movementSummary!.latestCheckOutAt, read.timezone, false)).toBe('—');
  });
  it('keeps restriction stronger than historical values and marks unavailable summaries separately', () => {
    const movementSummary = { version: 1 as const, latestCheckInAt: inside, latestCheckOutAt: outside };
    expect(readMovementDisplay({ movementSummary, movementSummaryAvailability: 'restricted' }).state).toBe('restricted');
    expect(readMovementDisplay({ movementSummary, movementSummaryAvailability: 'unavailable' }).state).toBe('temporarily-unavailable');
    expect(readMovementDisplay({ movementSummary: { version: 9 } } as any).state).toBe('unsupported-version');
  });
  it('retains every reported cycle and deduplicates event replays without manufacturing parity events', () => {
    const events: VisitMovementHistory['data'] = ['checked_in', 'checked_out', 'checked_in', 'checked_out'].map((eventType, index) => ({
      id: `event-${index}`, eventType: eventType as 'checked_in' | 'checked_out',
      occurredAt: `2026-10-09T09:${index}0:00.000Z`,
    }));
    const history: VisitMovementHistory = { requestId: 'fixture', timezone: 'Asia/Riyadh', data: [...events, events[1]] };
    const steps = mergeVisitMovementTimeline([{ id: 'completed', label: 'completed', status: 'completed', timestamp: inside }], history, t, 'completed');
    expect(steps.filter(step => step.id.startsWith('movement-')).map(step => step.timestamp)).toEqual(events.map(event => event.occurredAt));
    expect(steps.at(-1)?.status).toBe('completed');
    expect(steps.filter(step => step.id.startsWith('movement-'))).toHaveLength(4);
  });
  it.each(['approved', 'accepted', 'checked_in', 'checked_out', 'completed'])('continues canonical detail polling for %s without granting eligibility', status => {
    expect(movementDetailPollingInterval(status)).toBe(60000);
  });
  it.each([undefined, 'rejected', 'cancelled', 'expired', 'unknown'])('does not poll ineligible/unknown status %s', status => {
    expect(movementDetailPollingInterval(status)).toBe(false);
  });
});
