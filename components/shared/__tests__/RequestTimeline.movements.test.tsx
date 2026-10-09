import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { RequestTimeline, useTimelineSteps, type TimelineData } from '../RequestTimeline';
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

function ScheduledTimeline({ data, history }: { data: TimelineData; history?: VisitMovementHistory }) {
  const steps = useTimelineSteps({ data, role: 'employee', flowType: 'standard' });
  return <RequestTimeline steps={steps} movementHistory={history} visitStatus={data.status} />;
}

function SecurityTimeline({ data }: { data: TimelineData }) {
  const steps = useTimelineSteps({ data, role: 'security', flowType: 'security_gate' });
  return <RequestTimeline steps={steps} visitStatus={data.status} />;
}

describe.each([false, true])('inline movement rendering (RTL=%s)', rtl => {
  let tree: ReactTestRenderer;
  beforeEach(() => { mockRTL = rtl; });
  afterEach(() => { if (tree) act(() => tree.unmount()); });

  it('keeps administrative completion separate from an unrecorded physical exit in legacy Security', () => {
    const dictionary = rtl ? ar : en;
    act(() => {
      tree = create(<SecurityTimeline data={{
        status: 'completed', checkedInAt: '2026-10-09T09:00:00Z',
        completedAt: '2026-10-09T09:20:00Z',
      }} />);
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain(dictionary.timeline.visitCompleted);
    const exit = tree.root.findAllByType('ThemedText' as any).find(node => node.props.children === dictionary.timeline.exitRecorded)!;
    expect(exit.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ color: '#777' })]));
  });

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

  it('shows awaiting response followed by grey check-in, checkout and completion with empty history', () => {
    const dictionary = rtl ? ar : en;
    const data: TimelineData = {
      createdAt: '2026-09-30T07:00:00Z',
      status: 'visitor_pending',
      approval: { requiresApproval: false, autoApproved: true },
    };
    act(() => {
      tree = create(<ScheduledTimeline data={data} history={{ ...movementHistory, data: [] }} />);
    });
    const nodes = tree.root.findAllByType('ThemedText' as any);
    const text = nodes.map(node => node.props.children);
    const labels = [
      dictionary.timeline.awaitingVisitor,
      dictionary.timeline.visitorCheckedIn,
      dictionary.timeline.visitorCheckedOut,
      dictionary.timeline.visitCompleted,
    ];
    expect(labels.map(label => text.indexOf(label))).toEqual([...labels.map(label => text.indexOf(label))].sort((a, b) => a - b));
    for (const label of labels.slice(1)) {
      const node = nodes.find(item => item.props.children === label)!;
      expect(node.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ color: '#777' })]));
    }
    expect(text).not.toContain(dictionary.movementHistory.noHistory);
  });

  it('keeps checkout pending when a real check-in is recorded, and keeps completion pending after checkout', () => {
    const dictionary = rtl ? ar : en;
    const data: TimelineData = { createdAt: '2026-09-30T07:00:00Z', status: 'checked_in' };
    act(() => {
      tree = create(<ScheduledTimeline data={data} history={{ ...movementHistory, data: [movementHistory.data[0]] }} />);
    });
    let nodes = tree.root.findAllByType('ThemedText' as any);
    expect(nodes.find(node => node.props.children === dictionary.movementHistory.checkIn)!.props.style)
      .toEqual(expect.arrayContaining([expect.objectContaining({ color: '#222' })]));
    expect(nodes.find(node => node.props.children === dictionary.timeline.visitorCheckedOut)!.props.style)
      .toEqual(expect.arrayContaining([expect.objectContaining({ color: '#777' })]));
    act(() => tree.update(<ScheduledTimeline
      data={{ ...data, status: 'checked_out' }}
      history={{ ...movementHistory, data: movementHistory.data.slice(0, 2) }}
    />));
    nodes = tree.root.findAllByType('ThemedText' as any);
    expect(nodes.find(node => node.props.children === dictionary.movementHistory.checkOut)!.props.style)
      .toEqual(expect.arrayContaining([expect.objectContaining({ color: '#222' })]));
    expect(nodes.find(node => node.props.children === dictionary.timeline.visitCompleted)!.props.style)
      .toEqual(expect.arrayContaining([expect.objectContaining({ color: '#777' })]));
  });

  it('keeps planned checkout in legacy responses and only makes completion green for server-completed visits', () => {
    const dictionary = rtl ? ar : en;
    const data: TimelineData = { createdAt: '2026-09-30T07:00:00Z', status: 'visitor_pending' };
    act(() => { tree = create(<ScheduledTimeline data={data} />); });
    let text = tree.root.findAllByType('ThemedText' as any).map(node => node.props.children);
    expect(text).toContain(dictionary.timeline.visitorCheckedIn);
    expect(text).toContain(dictionary.timeline.visitorCheckedOut);
    act(() => tree.update(<ScheduledTimeline
      data={{ ...data, status: 'completed' }}
      history={{ ...movementHistory, data: movementHistory.data.slice(0, 2) }}
    />));
    const nodes = tree.root.findAllByType('ThemedText' as any);
    text = nodes.map(node => node.props.children);
    expect(text).not.toContain(dictionary.timeline.visitorCheckedIn);
    expect(text).not.toContain(dictionary.timeline.visitorCheckedOut);
    expect(nodes.find(node => node.props.children === dictionary.timeline.visitCompleted)!.props.style)
      .toEqual(expect.arrayContaining([expect.objectContaining({ color: '#222' })]));
  });
});