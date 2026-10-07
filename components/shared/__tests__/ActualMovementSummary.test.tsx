import React from 'react';
import { act, create } from 'react-test-renderer';
import { ActualMovementValue, ActualMovementSummary } from '../ActualMovementSummary';
let mockEnabled = true;
jest.mock('@/constants/movementSummary', () => ({ get MOVEMENT_SUMMARY_ENABLED() { return mockEnabled; } }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ isRTL: false }) }));
jest.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@/components/ThemedText', () => ({ ThemedText: 'ThemedText' }));

function render(element: React.ReactElement) {
  let tree!: ReturnType<typeof create>;
  act(() => { tree = create(element); });
  const output = JSON.stringify(tree.toJSON());
  act(() => tree.unmount());
  return output;
}
afterEach(() => { mockEnabled = true; });
it('preserves legacy output when disabled and identifies missing upgraded payloads when enabled', () => {
  expect(render(<ActualMovementValue source={{}} kind="out" legacy="legacy-out" />)).toContain('Unavailable');
  mockEnabled = false;
  expect(render(<ActualMovementValue source={{ movementSummary: { version: 1, latestCheckInAt: null, latestCheckOutAt: null } }} kind="out" legacy="legacy-out" />)).toContain('legacy-out');
  expect(render(<ActualMovementSummary source={{}} />)).toBe('null');
});
it('never falls back from an explicit null or invalid summary', () => {
  const source = { movementSummary: { version: 1 as const, latestCheckInAt: '2026-10-07T08:00:00Z', latestCheckOutAt: null } };
  expect(render(<ActualMovementValue source={source} kind="out" legacy="completion-time" />)).toContain('—');
  expect(render(<ActualMovementValue source={source} kind="out" legacy="completion-time" />)).not.toContain('completion-time');
  expect(render(<ActualMovementValue source={{ movementSummary: { version: 2 } as any }} kind="out" legacy="legacy-out" />)).toContain('Unavailable');
});
it('shows a historical checkout with its date, even when an entry is later', () => {
  const source = { movementSummary: { version: 1 as const, latestCheckInAt: '2026-10-07T08:00:00Z', latestCheckOutAt: '2026-10-06T07:00:00Z' } };
  const output = render(<ActualMovementSummary source={source} />);
  expect(output).toContain('11:00');
  expect(output).toContain('10:00');
  expect(output).toContain('Oct 6');
  expect(output).toContain('Oct 7');
});
