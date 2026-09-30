import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { RequestTimeline } from '../RequestTimeline';
import { en } from '@/constants/i18n/en';
import { ar } from '@/constants/i18n/ar';
import type { VisitMovementHistory } from '@/types/api.types';

let mockRTL = false;
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ isRTL: mockRTL }) }));
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const dictionary = mockRTL ? require('@/constants/i18n/ar').ar : require('@/constants/i18n/en').en;
      return key.split('.').reduce((v: any, part: string) => v?.[part], dictionary) ?? key;
    },
  }),
}));
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: { surface: '#fff', border: '#ddd', success: '#093', text: '#222', textSecondary: '#777' } }),
}));
jest.mock('@/components/ThemedText', () => ({ ThemedText: 'ThemedText' }));
jest.mock('@/components/ThemedView', () => ({ ThemedView: 'ThemedView' }));
jest.mock('@/components/DDIcon', () => ({ DDIcon: 'DDIcon' }));

const movementHistory: VisitMovementHistory = {
  requestId: 'visit', timezone: 'Asia/Riyadh',
  data: ['checked_in', 'checked_out', 'checked_in', 'checked_out'].map((eventType, i) => ({
    id: `event-${i}`, requestId: 'visit',
    eventType: eventType as 'checked_in' | 'checked_out',
    occurredAt: `2026-09-30T${String(i + 8).padStart(2, '0')}:00:00Z`,
    recordedAt: '2026-09-30T15:00:00Z', source: 'reception',
    timestampBasis: 'legacy_audit_time', actor: null, gate: null,
  })),
};

describe.each([false, true])('inline movement rendering (RTL=%s)', rtl => {
  let tree: ReactTestRenderer;
  beforeEach(() => { mockRTL = rtl; });
  afterEach(() => { if (tree) act(() => tree.unmount()); });

  it('renders repeat entry and exit labels inside one request timeline without a history title', () => {
    act(() => {
      tree = create(<RequestTimeline
        steps={[
          { id: 'approval', label: 'Approval marker', status: 'completed', icon: 'check' },
          { id: 'completed', label: 'Completion marker', status: 'pending', icon: 'check' },
        ]}
        movementHistory={movementHistory}
        visitStatus="checked_out"
      />);
    });
    const text = tree.root.findAllByType('ThemedText' as any).map(node => node.props.children).filter(v => typeof v === 'string');
    const dictionary = rtl ? ar : en;
    expect(text.filter(v => v === dictionary.movementHistory.checkIn)).toHaveLength(2);
    expect(text.filter(v => v === dictionary.movementHistory.checkOut)).toHaveLength(2);
    expect(text).not.toContain(dictionary.movementHistory.title);
    expect(text).not.toContain(dictionary.movementHistory.legacyRecordedTime);
    expect(text.indexOf('Approval marker')).toBeLessThan(text.indexOf(dictionary.movementHistory.checkIn));
    expect(text.indexOf('Completion marker')).toBeGreaterThan(text.lastIndexOf(dictionary.movementHistory.checkOut));
  });

  it('shows neither an empty history message nor a separate card', () => {
    act(() => {
      tree = create(<RequestTimeline steps={[]} movementHistory={{ ...movementHistory, data: [] }} visitStatus="approved" />);
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).not.toContain((rtl ? ar : en).movementHistory.noHistory);
    expect(tree.root.findAllByType('ThemedView' as any)).toHaveLength(1);
  });
});