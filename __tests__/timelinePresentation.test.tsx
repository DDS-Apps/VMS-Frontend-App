import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { RequestTimeline, ReceptionistVisitTimeline, useTimelineSteps, type TimelineRole, type TimelineData } from '@/components/shared/RequestTimeline';
import { RequestStatusBadge } from '@/components/shared/RequestStatusBadge';
import type { VisitMovementHistory } from '@/types/api.types';
import { formatTimestamp } from '@/utils/dateTimeUtils';
import { en } from '@/constants/i18n/en';
import { ar } from '@/constants/i18n/ar';

let mockRTL = false;
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: {
    surface: '#fff', border: '#ddd', primary: '#369', success: '#093',
    error: '#c33', warning: '#c90', text: '#222', textSecondary: '#777', buttonText: '#fff',
  } }),
}));
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => {
    const dictionary = mockRTL ? require('@/constants/i18n/ar').ar : require('@/constants/i18n/en').en;
    return key.split('.').reduce((value: any, part: string) => value?.[part], dictionary) ?? key;
  } }),
}));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ isRTL: mockRTL }) }));
jest.mock('@/components/ThemedText', () => ({ ThemedText: 'ThemedText' }));
jest.mock('@/components/ThemedView', () => ({ ThemedView: 'ThemedView' }));
jest.mock('@/components/DDIcon', () => ({ DDIcon: 'DDIcon' }));
jest.mock('@/components/shared/StatusLabelBadge', () => ({ StatusLabelBadge: 'StatusLabelBadge' }));

const occurredAt = '2026-10-18T18:00:00.000Z';
const feed: VisitMovementHistory = {
  requestId: 'visit', timezone: 'Asia/Riyadh',
  data: [{
    id: 'closure', requestId: 'visit', eventType: 'administrative_completion',
    displayLabel: 'Admin closure', occurredAt, recordedAt: '2026-10-19T01:00:00Z',
    source: 'system', timestampBasis: 'occurred_at', actor: null, gate: null,
    qrEffect: 'visit_closed_not_physical_departure', completionReason: 'daily_cutoff',
  }],
  presentation: {
    statusLabelOverride: 'No-show', hideVisitCompleted: true, hideUnrecordedSteps: true,
    hiddenEventIds: ['closure'], hiddenQrEffects: ['arrival_recorded'],
    finalTimelineEvent: { sourceEventId: 'closure', displayLabel: 'No-show', occurredAt },
  },
};
const data: TimelineData = {
  createdAt: '2026-10-18T06:00:00Z', status: 'completed',
  approval: { requiresApproval: false, autoApproved: true, approvedAt: '2026-10-18T06:01:00Z' },
  timeline: { completedAt: occurredAt, visitorAcceptedAt: '2026-10-18T08:00:00Z' },
};

function Detail({ role, source = data, history = feed }: { role: TimelineRole; source?: TimelineData; history?: VisitMovementHistory }) {
  const steps = useTimelineSteps({ data: source, role });
  return <>
    <RequestStatusBadge status={source.status} presentationSource={{ ...source, movementHistory: history }} />
    {role === 'receptionist'
      ? <ReceptionistVisitTimeline data={source} movementHistory={history} />
      : <RequestTimeline steps={steps} visitStatus={source.status} movementHistory={history} presentationSource={source} />}
  </>;
}

describe.each([false, true])('rendered timeline presentation RTL=%s', rtl => {
  let tree: ReactTestRenderer | undefined;
  beforeEach(() => { mockRTL = rtl; });
  afterEach(() => { if (tree) act(() => tree!.unmount()); tree = undefined; });
  const dictionary = rtl ? ar : en;
  const texts = () => tree!.root.findAllByType('ThemedText' as any).map(node => node.props.children);

  it.each(['employee', 'manager', 'receptionist', 'security'] as const)(
    'renders localized No-show once and detail override for %s, keeping acceptance', role => {
      act(() => { tree = create(<Detail role={role} />); });
      expect(tree!.root.findByType('StatusLabelBadge' as any).props.label).toBe(dictionary.movementHistory.noShow);
      const rendered = texts();
      expect(rendered.filter(text => text === dictionary.movementHistory.noShow)).toHaveLength(1);
      expect(rendered).toContain(dictionary.movementHistory.visitorAccepted);
      expect(rendered).not.toContain(dictionary.timeline.visitCompleted);
      expect(rendered).not.toContain(dictionary.timeline.visitorCheckedIn);
      expect(rendered).not.toContain(dictionary.timeline.visitorCheckedOut);
      expect(rendered).not.toContain(dictionary.movementHistory.adminClosure);
      expect(rendered).not.toContain(dictionary.movementHistory.visit_closed_not_physical_departure);
      const stamp = formatTimestamp(occurredAt, rtl, 'Asia/Riyadh');
      expect(rendered).toContain(stamp.isToday ? stamp.time : `${stamp.time} · ${stamp.date}`);
    },
  );

  it('renders cutoff completion without a checkout or administrative explanation', () => {
    const history: VisitMovementHistory = {
      ...feed, presentation: { ...feed.presentation, statusLabelOverride: null, finalTimelineEvent: null, hideVisitCompleted: false },
      data: [{
        ...feed.data[0], id: 'entry', eventType: 'checked_in', displayLabel: 'Check In',
        occurredAt: '2026-10-18T11:57:00Z', qrEffect: 'arrival_recorded',
      }, ...feed.data],
    };
    act(() => { tree = create(<Detail role="employee" history={history} />); });
    expect(texts()).toContain(dictionary.movementHistory.checkIn);
    expect(texts()).toContain(dictionary.timeline.visitCompleted);
    expect(texts()).not.toContain(dictionary.timeline.visitorCheckedOut);
    expect(texts()).not.toContain(dictionary.movementHistory.adminClosure);
    expect(texts()).not.toContain(dictionary.movementHistory.arrival_recorded);
    expect(tree!.root.findByType('StatusLabelBadge' as any).props.label).not.toBe(dictionary.movementHistory.noShow);
  });

  it('does not change list badges without an explicitly supplied detail source', () => {
    act(() => { tree = create(<RequestStatusBadge status="completed" />); });
    const originalLabel = tree!.root.findByType('StatusLabelBadge' as any).props.label;
    expect(originalLabel).not.toBe(dictionary.movementHistory.noShow);
    act(() => tree!.update(<RequestStatusBadge status="cancelled" presentationSource={{ movementHistory: feed }} />));
    expect(tree!.root.findByType('StatusLabelBadge' as any).props.label).not.toBe(dictionary.movementHistory.noShow);
  });
});
