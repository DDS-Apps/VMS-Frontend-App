import React from 'react';
import { act, create } from 'react-test-renderer';
import { QueryClient } from '@tanstack/react-query';
import fixtures from './fixtures/latest-movement-offline.json';
import { readMovementDisplay, formatActualMovement, reportMovementDisplayIssue } from '@/utils/movementSummary';
import { ActualMovementSummary } from '@/components/shared/ActualMovementSummary';
import { beginMovement, applyMovementResult } from '@/hooks/queries/applyMovementResult';
import { mapVisitListItemToVisitorRequest } from '@/utils/requestMappers';
import { mapValetVisitorToMatrixItem } from '@/utils/valetAdminVisitorsTable';

jest.mock('@/constants/movementSummary', () => ({ MOVEMENT_SUMMARY_ENABLED: true }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ isRTL: false }) }));
jest.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@/components/ThemedText', () => ({ ThemedText: 'ThemedText' }));

function render(source: any) {
  let tree!: ReturnType<typeof create>;
  act(() => { tree = create(<ActualMovementSummary source={source} />); });
  const text = JSON.stringify(tree.toJSON());
  act(() => tree.unmount());
  return text;
}

describe('supplied OFFLINE fixtures — not deployed authorization/filter evidence', () => {
  it.each(fixtures.states)('$name: identical pair in all five envelopes, never history-derived', scenario => {
    const e = scenario.envelopes;
    const rows = [e.paginated.data[0], e.receptionToday.data[0], e.approvalHistory.data[0], e.valet.data.data[0], e.detail];
    for (const row of rows) {
      expect(readMovementDisplay(row as any)).toEqual({ state: 'supported', summary: e.detail.movementSummary });
      const text = render(row);
      for (const value of Object.values(e.detail.movementSummary).slice(1)) {
        expect(text).toContain(formatActualMovement(value as string | null, row.timezone, false, true));
      }
    }
    expect(e.approvalHistory.data[0].status).toBe('approved');
    const request = mapVisitListItemToVisitorRequest({
      ...e.paginated.data[0], ...scenario.currentCycleFields,
      visitor: { fullName: 'Offline example' }, visitDate: '2026-10-07',
    } as any);
    expect(request.checkedOutAt).toBe(scenario.currentCycleFields.checkedOutAt);
    expect(request.movementSummary).toEqual(e.detail.movementSummary);
    const valet = mapValetVisitorToMatrixItem(e.valet.data.data[0] as any);
    expect(valet.id).toBe(e.valet.data.data[0].requestId);
    expect(valet.movementSummary).toEqual(e.detail.movementSummary);
  });
  it('retains restricted rows without leaking contradictory summary values or raw errors', () => {
    const source: any = {
      ...fixtures.availability.restricted,
      movementSummary: fixtures.states[3].envelopes.detail.movementSummary,
      movementSummaryError: 'DO NOT DISPLAY private server details',
    };
    expect(readMovementDisplay(source).state).toBe('restricted');
    expect(render(source)).toContain('Restricted');
    expect(render(source)).not.toContain('11:00');
    expect(render(source)).not.toContain('DO NOT DISPLAY');
    const mapped = mapVisitListItemToVisitorRequest({ ...source, visitor: {} } as any);
    expect(mapped.id).toBe(source.id);
    expect(mapped.movementSummaryAvailability).toBe('restricted');
  });
  it('distinguishes unsupported, temporarily unavailable, null and malformed states', () => {
    expect(readMovementDisplay(undefined as any).state).toBe('malformed');
    expect(readMovementDisplay(null as any).state).toBe('malformed');
    expect(readMovementDisplay(fixtures.availability.olderResponse).state).toBe('unsupported');
    expect(readMovementDisplay(fixtures.availability.unavailableAfterSuccessfulMutation as any).state).toBe('temporarily-unavailable');
    expect(readMovementDisplay({ movementSummary: { version: 2 } as any }).state).toBe('unsupported-version');
    for (const date of ['', '2026-02-30T09:00:00Z', '2026-10-07T24:00:00Z', '2026-10-07T09:00:00', 'bad']) {
      expect(readMovementDisplay({ movementSummary: { version: 1, latestCheckInAt: date, latestCheckOutAt: null } }).state).toBe('malformed');
    }
    expect(readMovementDisplay({ movementSummary: { version: 1, latestCheckInAt: null, latestCheckOutAt: null } }).state).toBe('supported');
  });
  it('diagnostics include only bounded state codes', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    reportMovementDisplayIssue('malformed');
    reportMovementDisplayIssue('malformed');
    expect(warn.mock.calls.flat().every(value => value === '[movement-summary] malformed')).toBe(true);
    expect(warn.mock.calls.length).toBeLessThanOrEqual(1);
    warn.mockRestore();
  });
});

describe('safe movement response application', () => {
  let client: QueryClient;
  const key = ['requests', 'visit-detail', 'v1'];
  const old = { id: 'v1', status: 'checked_in', checkedOutAt: null, movementHistory: { data: [] }, movementSummary: fixtures.states[1].envelopes.detail.movementSummary };
  beforeEach(() => { client = new QueryClient(); client.setQueryData(key, old); });
  afterEach(() => client.clear());
  it('patches only the summary without replacing presence or history', () => {
    applyMovementResult(client, fixtures.states[3].envelopes.detail as any, beginMovement(client, 'v1'));
    const next: any = client.getQueryData(key);
    expect(next.checkedOutAt).toBeNull();
    expect(next.status).toBe(old.status);
    expect(next.movementHistory).toEqual(old.movementHistory);
    expect(next.movementSummary).toEqual(fixtures.states[3].envelopes.detail.movementSummary);
    expect(client.getQueryData(['security', 'visitor', 'v1'])).toBeUndefined();
  });
  it('does not let a delayed earlier action replace a newer successful response', () => {
    const first = beginMovement(client, 'v1');
    const second = beginMovement(client, 'v1');
    applyMovementResult(client, fixtures.states[5].envelopes.detail as any, second);
    applyMovementResult(client, fixtures.states[3].envelopes.detail as any, first);
    expect((client.getQueryData(key) as any).movementSummary).toEqual(fixtures.states[5].envelopes.detail.movementSummary);
  });
  it('post-success read failure removes stale summary but keeps action/current state', () => {
    applyMovementResult(client, fixtures.availability.unavailableAfterSuccessfulMutation as any, beginMovement(client, 'v1'));
    expect((client.getQueryData(key) as any).movementSummary).toBeUndefined();
    expect((client.getQueryData(key) as any).status).toBe('checked_in');
    expect(readMovementDisplay(client.getQueryData(key) as any).state).toBe('temporarily-unavailable');
  });
  it('does not overwrite a newer canonical read', () => {
    const write = beginMovement(client, 'v1');
    client.setQueryData(key, { ...old, movementSummaryAvailability: 'restricted' }, { updatedAt: write.started + 1 });
    applyMovementResult(client, fixtures.states[3].envelopes.detail as any, write);
    expect((client.getQueryData(key) as any).movementSummaryAvailability).toBe('restricted');
  });
});
