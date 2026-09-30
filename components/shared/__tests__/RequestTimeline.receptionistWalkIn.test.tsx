import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ReceptionistVisitTimeline, RequestTimeline, useTimelineSteps, type TimelineData } from '../RequestTimeline';
import { en } from '@/constants/i18n/en';
import { ar } from '@/constants/i18n/ar';
import type { VisitMovementHistory } from '@/types/api.types';

let mockRTL = false;
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ isRTL: mockRTL }) }));
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const dictionary = mockRTL ? require('@/constants/i18n/ar').ar : require('@/constants/i18n/en').en;
      return key.split('.').reduce((value: any, part: string) => value?.[part], dictionary) ?? key;
    },
  }),
}));
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: { surface: '#fff', border: '#ddd', success: '#093', primary: '#369', error: '#c33', text: '#222', textSecondary: '#777' } }),
}));
jest.mock('@/components/ThemedText', () => ({ ThemedText: 'ThemedText' }));
jest.mock('@/components/ThemedView', () => ({ ThemedView: 'ThemedView' }));
jest.mock('@/components/DDIcon', () => ({ DDIcon: 'DDIcon' }));

const emptyHistory: VisitMovementHistory = {
  requestId: 'visit', timezone: 'Asia/Riyadh', data: [],
};
const approvedWalkIn: TimelineData = {
  createdAt: '2026-09-30T07:00:00Z',
  status: 'approved',
  isWalkIn: true,
  approval: { requiresApproval: true, approvedAt: '2026-09-30T07:05:00Z' },
};

function OtherRoleTimeline({ data, role }: { data: TimelineData; role: 'employee' | 'manager' }) {
  const steps = useTimelineSteps({ data, role, flowType: 'standard' });
  return <RequestTimeline steps={steps} movementHistory={emptyHistory} visitStatus={data.status} />;
}

describe.each([
  ['English', false, en],
  ['Arabic', true, ar],
] as const)('Receptionist walk-in timeline in %s', (_language, rtl, dictionary) => {
  let tree: ReactTestRenderer | undefined;
  beforeEach(() => { mockRTL = rtl; });
  afterEach(() => { if (tree) act(() => tree!.unmount()); tree = undefined; });

  const render = (data: TimelineData, movementHistory: VisitMovementHistory | undefined = emptyHistory) => {
    act(() => { tree = create(<ReceptionistVisitTimeline data={data} movementHistory={movementHistory} />); });
    return tree!;
  };
  const labels = () => tree!.root.findAllByType('ThemedText' as any)
    .map(node => node.props.children).filter((text): text is string => typeof text === 'string');
  const expectApprovalNotCompleted = () => {
    const approval = tree!.root.findAllByType('ThemedText' as any)
      .find(node => node.props.children === dictionary.timeline.visitorAccepted)!;
    expect(approval.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ color: '#777' })]));
  };

  it('renders an approved walk-in with empty movement history as approved, without inventing entry or exit', () => {
    render(approvedWalkIn);
    const text = labels();
    expect(text).toContain(dictionary.timeline.managerApproved);
    expect(text).toContain(dictionary.timeline.visitorAccepted);
    expect(text).not.toContain(dictionary.timeline.awaitingVisitor);
    expect(text).not.toContain(dictionary.movementHistory.checkIn);
    expect(text).not.toContain(dictionary.movementHistory.checkOut);
    expect(text).not.toContain(dictionary.movementHistory.noHistory);
    expect(text).toContain(dictionary.timeline.visitCompleted);
    const completion = tree!.root.findAllByType('ThemedText' as any)
      .find(node => node.props.children === dictionary.timeline.visitCompleted)!;
    expect(completion.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ color: '#777' })]));
    expect(tree!.root.findAllByType('ThemedView' as any)).toHaveLength(1);
  });

  it('keeps manager and host approval pending instead of implying visit approval', () => {
    render({ ...approvedWalkIn, status: 'pending_approval' });
    expect(labels()).toContain(dictionary.timeline.pendingApproval);
    expectApprovalNotCompleted();
    act(() => tree!.unmount());
    tree = undefined;
    render({
      ...approvedWalkIn,
      status: 'pending_host_approval',
      hostApproval: { required: true },
    });
    expect(labels()).toContain(dictionary.timeline.pendingHostApproval);
    expectApprovalNotCompleted();
  });

  it('keeps approval and legacy movement fallback when the history field is absent', () => {
    act(() => { tree = create(<ReceptionistVisitTimeline data={approvedWalkIn} movementHistory={undefined} />); });
    expect(labels()).toContain(dictionary.timeline.managerApproved);
    expect(labels()).toContain(dictionary.timeline.visitorAccepted);
    expect(labels()).not.toContain(dictionary.timeline.awaitingVisitor);
    expect(labels()).toContain(dictionary.timeline.visitorCheckedIn);
    expect(labels()).toContain(dictionary.timeline.visitorCheckedOut);
    expect(labels()).toContain(dictionary.timeline.visitCompleted);
    const approval = tree!.root.findAllByType('ThemedText' as any)
      .find(node => node.props.children === dictionary.timeline.visitorAccepted)!;
    expect(approval.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ color: '#222' })]));
  });

  it('preserves rejected and cancelled walk-in terminal states', () => {
    render({ ...approvedWalkIn, status: 'rejected', approval: { requiresApproval: true, rejectedAt: '2026-09-30T07:06:00Z' } });
    expect(labels()).toContain(dictionary.timeline.rejected);
    expectApprovalNotCompleted();
    act(() => tree!.unmount());
    tree = undefined;
    render({ ...approvedWalkIn, status: 'cancelled' });
    expect(labels()).toContain(dictionary.timeline.cancelled);
    expect(labels()).not.toContain(dictionary.timeline.visitorAccepted);
  });

  it('leaves scheduled Receptionist and other-role approved visit invitation semantics unchanged', () => {
    render({ ...approvedWalkIn, isWalkIn: false });
    expect(labels()).toContain(dictionary.timeline.awaitingVisitor);
    expect(labels()).not.toContain(dictionary.timeline.visitorAccepted);
    act(() => tree!.unmount());
    tree = undefined;
    for (const role of ['employee', 'manager'] as const) {
      act(() => { tree = create(<OtherRoleTimeline data={approvedWalkIn} role={role} />); });
      expect(labels()).toContain(dictionary.timeline.awaitingVisitor);
      expect(labels()).not.toContain(dictionary.timeline.visitorAccepted);
      act(() => tree!.unmount());
      tree = undefined;
    }
  });

  it('retains movement event ordering and timestamp without adding checkout for a single check-in', () => {
    const history: VisitMovementHistory = {
      ...emptyHistory,
      data: [{
        id: 'entry', requestId: 'visit', eventType: 'checked_in',
        occurredAt: '2026-09-30T08:00:00Z', recordedAt: '2026-09-30T08:01:00Z',
        timestampBasis: 'occurred_at', source: 'reception', actor: null, gate: null,
      }],
    };
    render(approvedWalkIn, history);
    const text = labels();
    expect(text.indexOf(dictionary.timeline.visitorAccepted)).toBeLessThan(text.indexOf(dictionary.movementHistory.checkIn));
    expect(text.indexOf(dictionary.movementHistory.checkIn)).toBeLessThan(text.indexOf(dictionary.timeline.visitCompleted));
    expect(text).not.toContain(dictionary.movementHistory.checkOut);
    expect(text).not.toContain(dictionary.movementHistory.legacyRecordedTime);
    expect(text).toContain(rtl ? '١١:٠٠ ص' : '11:00 AM');
  });
});