import React from 'react';
import { act, create } from 'react-test-renderer';
import { ActualMovementValue, ActualMovementSummary } from '../ActualMovementSummary';
import { formatActualMovement, type MovementSummarySource } from '@/utils/movementSummary';

let mockEnabled = true;
let mockRTL = false;
jest.mock('@/constants/movementSummary', () => ({ get MOVEMENT_SUMMARY_ENABLED() { return mockEnabled; } }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ get isRTL() { return mockRTL; } }) }));
jest.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@/components/ThemedText', () => ({ ThemedText: 'ThemedText' }));

function render(element: React.ReactElement) {
  let tree!: ReturnType<typeof create>;
  act(() => { tree = create(element); });
  const output = JSON.stringify(tree.toJSON());
  act(() => tree.unmount());
  return output;
}
const at = (hour: number) => `2026-10-25T${String(hour - 3).padStart(2, '0')}:00:00.000Z`;
afterEach(() => { mockEnabled = true; mockRTL = false; });

it('keeps rollout gated without presenting operational timestamps as historical evidence', () => {
  mockEnabled = false;
  const source = {
    movementSummary: { version: 1 as const, latestCheckInAt: at(9), latestCheckOutAt: at(10) },
    checkedInAt: at(11), checkedOutAt: at(12),
  };
  const output = render(<ActualMovementValue source={source} kind="in" />);
  expect(output).toContain('Unavailable');
  expect(output).not.toContain('9:00');
  expect(output).not.toContain('11:00');
  expect(render(<ActualMovementSummary source={source} />)).toBe('null');
});

describe.each([false, true])('revised V1 first-IN/last-OUT contract (Arabic=%s)', rtl => {
  it.each([
    { name: 'no movements', first: null, last: null },
    { name: 'first IN 09:00', first: 9, last: null },
    { name: 'OUT 10:00', first: 9, last: 10 },
    { name: 're-entry 11:00', first: 9, last: 10 },
    { name: 'OUT 12:00', first: 9, last: 12 },
    { name: 're-entry 13:00', first: 9, last: 12 },
    { name: 'administrative completion without OUT', first: 9, last: null },
    { name: 'checkout-only evidence', first: null, last: 10 },
  ])('$name: displays the supplied historical pair independently of current cycle', ({ first, last }) => {
    mockRTL = rtl;
    const source = {
      movementSummary: { version: 1 as const, latestCheckInAt: first === null ? null : at(first), latestCheckOutAt: last === null ? null : at(last) },
      timezone: 'Asia/Riyadh',
      checkedInAt: at(13), checkedOutAt: undefined, completedAt: at(14),
      status: 'checked_in',
    };
    for (const kind of ['in', 'out'] as const) {
      const timestamp = kind === 'in' ? source.movementSummary.latestCheckInAt : source.movementSummary.latestCheckOutAt;
      const output = render(<ActualMovementValue source={source} kind={kind} includeDate={false} />);
      expect(output).toContain(formatActualMovement(timestamp, source.timezone, rtl));
      expect(output).not.toContain(formatActualMovement(at(13), source.timezone, rtl));
    }
  });

  it('counts parking arrival before reception and preserves full dates for accessibility', () => {
    mockRTL = rtl;
    const source = { movementSummary: {
      version: 1 as const, latestCheckInAt: '2026-10-25T05:30:00Z', latestCheckOutAt: '2026-10-26T07:00:00Z',
    }, timezone: 'Asia/Riyadh' };
    const output = render(<ActualMovementSummary source={source} />);
    expect(output).toContain(formatActualMovement(source.movementSummary.latestCheckInAt, source.timezone, rtl, true));
    expect(output).toContain(formatActualMovement(source.movementSummary.latestCheckOutAt, source.timezone, rtl, true));
  });
});

it.each([
  { movementSummaryAvailability: 'restricted', movementSummary: { version: 1, latestCheckInAt: at(9), latestCheckOutAt: at(10) } },
  { movementSummaryAvailability: 'unavailable', movementSummary: { version: 1, latestCheckInAt: at(9), latestCheckOutAt: at(10) } },
  {},
  { movementSummary: null },
  { movementSummary: { version: 2, latestCheckInAt: at(9), latestCheckOutAt: at(10) } },
  { movementSummary: { version: 1, latestCheckInAt: '2026-10-25T09:00:00', latestCheckOutAt: at(10) } },
])('does not expose historical or operational times from a non-supported response: %p', fields => {
  const source = { ...fields, checkedInAt: at(13), checkedOutAt: at(14) };
  const output = render(<ActualMovementSummary source={source as MovementSummarySource} />);
  expect(output).toContain('movementSummaryAvailability' in fields && fields.movementSummaryAvailability === 'restricted' ? 'Restricted' : 'Unavailable');
  for (const hour of [9, 10, 13, 14]) expect(output).not.toContain(formatActualMovement(at(hour), 'Asia/Riyadh', false));
});
