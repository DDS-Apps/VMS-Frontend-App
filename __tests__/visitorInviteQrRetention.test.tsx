import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import VisitorInviteScreen from '@/screens/Visitor/VisitorInviteScreen';

let mockInvite: any;
let mockError: any;
const mockAccept = { isPending: false, mutateAsync: jest.fn(), reset: jest.fn(), error: null };
const mockReject = { isPending: false, mutateAsync: jest.fn(), reset: jest.fn(), error: null };
jest.mock('@/hooks/queries', () => ({
  usePublicInviteQuery: () => ({ data: mockInvite, error: mockError, isLoading: false, isFetching: false, refetch: jest.fn() }),
  useAcceptInviteMutation: () => mockAccept,
  useRejectInviteMutation: () => mockReject,
}));
jest.mock('@/hooks/useActiveVisitView', () => ({ useQrClock: () => Date.parse('2026-10-16T11:00:00Z') }));
jest.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ theme: {} }) }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ isRTL: false }) }));
jest.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@/hooks/useFormatters', () => ({ useFormatters: () => ({
  formatDate: (v: unknown) => String(v), formatDateShort: (v: unknown) => String(v),
  formatTimeFromString: (v: unknown) => String(v), formatDateTime: (v: unknown) => String(v),
}) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('@/components/ThemedText', () => ({ ThemedText: 'ThemedText' }));
jest.mock('@/components/DDIcon', () => ({ DDIcon: 'DDIcon' }));
jest.mock('@/components/shared/LoadingButton', () => ({ LoadingButton: 'LoadingButton' }));
jest.mock('react-native-qrcode-svg', () => 'QRCode');

const renderScreen = () => <VisitorInviteScreen route={{ params: { token: 'offline-fixture' } } as any} />;
let tree: ReactTestRenderer;
beforeEach(() => {
  jest.clearAllMocks();
  mockAccept.mutateAsync.mockReset();
  mockReject.mutateAsync.mockReset();
  mockError = undefined;
  mockInvite = {
    id: 'v1', status: 'visitor_accepted', hostName: 'Fixture',
    visitDate: '2026-10-16', visitTime: '12:00', endTime: '13:00',
    canAccept: false, canReject: false, expiresAt: '2026-10-16T18:00:00Z',
    qrCode: 'current-qr', purpose: 'meeting',
  };
});
afterEach(() => { if (tree) act(() => tree.unmount()); });
const qrNodes = () => tree.root.findAllByType('QRCode' as any);

it('shows the returned QR after meeting end, including completed visits', () => {
  mockInvite.status = 'completed';
  act(() => { tree = create(renderScreen()); });
  expect(qrNodes()).toHaveLength(1);
  expect(qrNodes()[0].props.value).toBe('current-qr');
});
it('keeps the future accepted QR visible without the Not active yet message', () => {
  mockInvite = { ...mockInvite, visitDate: '2026-10-20', expiresAt: '2026-10-20T18:00:00Z' };
  act(() => { tree = create(renderScreen()); });
  expect(qrNodes()).toHaveLength(1);
  expect(JSON.stringify(tree.toJSON())).not.toContain('Not active yet');
  expect(JSON.stringify(tree.toJSON())).not.toContain('qr-access-notActive');
  expect(JSON.stringify(tree.toJSON())).toContain('visitor.invitationAccepted');
});
it.each([403, 410])('a later HTTP %s supersedes an accepted cached QR', status => {
  act(() => { tree = create(renderScreen()); });
  mockError = { response: { status } };
  act(() => tree.update(renderScreen()));
  expect(qrNodes()).toHaveLength(0);
  expect(JSON.stringify(tree.toJSON())).toContain(status === 410 ? 'visitorInvite.invitationExpired' : 'security.accessDenied');
});
it('does not resurrect a QR removed or expired by a later response', () => {
  act(() => { tree = create(renderScreen()); });
  mockInvite = { ...mockInvite, qrCode: undefined };
  act(() => tree.update(renderScreen()));
  expect(qrNodes()).toHaveLength(0);
  mockInvite = { ...mockInvite, qrCode: 'stale', isExpired: true };
  act(() => tree.update(renderScreen()));
  expect(qrNodes()).toHaveLength(0);
});
it('disabled acceptance also guards direct handler invocation', async () => {
  mockInvite = { ...mockInvite, qrCode: undefined, status: 'pending' };
  act(() => { tree = create(renderScreen()); });
  const buttons = tree.root.findAllByType('LoadingButton' as any);
  const accept = buttons.find(button => button.props.children === 'actions.accept')!;
  expect(accept.props.disabled).toBe(true);
  await act(async () => { await accept.props.onPress(); });
  expect(mockAccept.mutateAsync).not.toHaveBeenCalled();
});
it('does not discard the valid QR when only canAccept is false', () => {
  act(() => { tree = create(renderScreen()); });
  expect(qrNodes()).toHaveLength(1);
  expect(mockAccept.mutateAsync).not.toHaveBeenCalled();
});

const action = (name: string) => tree.root.findAllByType('LoadingButton' as any)
  .find(button => button.props.children === `actions.${name}`)!;
const pendingInvite = (status = 'visitor_pending') => ({
  ...mockInvite, status, visitorDecision: null, canAccept: true, canReject: true,
});

it.each(['pending', 'visitor_pending'])('keeps %s invitations unanswered even when a QR already exists', status => {
  mockInvite = pendingInvite(status);
  act(() => { tree = create(renderScreen()); });
  expect(JSON.stringify(tree.toJSON())).not.toContain('visitor.invitationAccepted');
  expect(JSON.stringify(tree.toJSON())).not.toContain('visitor.invitationDeclined');
  expect(qrNodes()).toHaveLength(0);
  expect(action('accept').props.disabled).toBe(false);
  expect(action('reject').props.disabled).toBe(false);
  expect(mockAccept.mutateAsync).not.toHaveBeenCalled();
  expect(mockReject.mutateAsync).not.toHaveBeenCalled();
});

it('also keeps pending invitations without a QR actionable', () => {
  mockInvite = { ...pendingInvite(), qrCode: undefined };
  act(() => { tree = create(renderScreen()); });
  expect(action('accept').props.disabled).toBe(false);
  expect(action('reject').props.disabled).toBe(false);
  expect(qrNodes()).toHaveLength(0);
});

it('uses backend acceptance permission even when a pending invitation contains a QR', async () => {
  mockInvite = { ...pendingInvite(), canAccept: false };
  act(() => { tree = create(renderScreen()); });
  expect(action('accept').props.disabled).toBe(true);
  expect(action('reject').props.disabled).toBe(false);
  await act(async () => { await action('accept').props.onPress(); });
  expect(mockAccept.mutateAsync).not.toHaveBeenCalled();
});

it('shows accepted only after the current query confirms the response, and uses its QR', async () => {
  mockInvite = pendingInvite();
  mockAccept.mutateAsync.mockImplementation(async () => {
    mockInvite = { ...mockInvite, status: 'visitor_accepted', canAccept: false, canReject: false, qrCode: 'fresh-query-qr' };
    return { status: 'visitor_accepted', qrCode: 'mutation-only-qr' };
  });
  act(() => { tree = create(renderScreen()); });
  await act(async () => { await action('accept').props.onPress(); });
  expect(mockAccept.mutateAsync).toHaveBeenCalledTimes(1);
  expect(mockAccept.mutateAsync).toHaveBeenCalledWith({ needsParking: false });
  expect(JSON.stringify(tree.toJSON())).toContain('visitor.invitationAccepted');
  expect(qrNodes()[0].props.value).toBe('fresh-query-qr');
});

it('does not use a successful mutation or its QR to override a still-pending query', async () => {
  mockInvite = pendingInvite();
  mockAccept.mutateAsync.mockResolvedValue({ status: 'visitor_accepted', qrCode: 'mutation-only-qr' });
  act(() => { tree = create(renderScreen()); });
  await act(async () => { await action('accept').props.onPress(); });
  expect(JSON.stringify(tree.toJSON())).not.toContain('visitor.invitationAccepted');
  expect(qrNodes()).toHaveLength(0);
});

it('lets a later cancellation override the acceptance result', async () => {
  mockInvite = pendingInvite();
  mockAccept.mutateAsync.mockImplementation(async () => {
    mockInvite = { ...mockInvite, status: 'cancelled', canAccept: false, canReject: false };
    return { status: 'visitor_accepted', qrCode: 'stale-mutation-qr' };
  });
  act(() => { tree = create(renderScreen()); });
  await act(async () => { await action('accept').props.onPress(); });
  expect(JSON.stringify(tree.toJSON())).toContain('visitorInvite.invitationCancelled');
  expect(JSON.stringify(tree.toJSON())).not.toContain('visitor.invitationAccepted');
  expect(qrNodes()).toHaveLength(0);
});

it.each(['accepted', 'visitor_accepted', 'checked_in', 'checked_out', 'completed'])(
  'preserves existing %s QR access without requiring a decision timestamp', status => {
    mockInvite = { ...mockInvite, status, visitorDecision: null };
    act(() => { tree = create(renderScreen()); });
    expect(JSON.stringify(tree.toJSON())).toContain('visitor.invitationAccepted');
    expect(qrNodes()).toHaveLength(1);
    expect(tree.root.findAllByType('LoadingButton' as any).filter(button => button.props.children === 'actions.accept')).toHaveLength(0);
  },
);

it.each(['rejected', 'visitor_rejected'])('does not show a QR or accepted label for %s invitations', status => {
  mockInvite = { ...mockInvite, status, visitorDecision: null };
  act(() => { tree = create(renderScreen()); });
  expect(JSON.stringify(tree.toJSON())).toContain('visitor.invitationDeclined');
  expect(JSON.stringify(tree.toJSON())).not.toContain('visitor.invitationAccepted');
  expect(qrNodes()).toHaveLength(0);
});

it('shows an authoritative decision without requiring decidedAt', () => {
  mockInvite = { ...mockInvite, status: 'approved', visitorDecision: { accepted: true } };
  act(() => { tree = create(renderScreen()); });
  expect(JSON.stringify(tree.toJSON())).toContain('visitor.invitationAccepted');
  expect(qrNodes()).toHaveLength(1);
});

it('keeps an expired pending invitation blocked even when it has a retained QR', () => {
  mockInvite = { ...pendingInvite(), isExpired: true, qrValidity: { retainedUntilCheckout: true, expired: false } };
  act(() => { tree = create(renderScreen()); });
  expect(JSON.stringify(tree.toJSON())).toContain('visitorInvite.invitationExpired');
  expect(qrNodes()).toHaveLength(0);
  expect(tree.root.findAllByType('LoadingButton' as any).filter(button => button.props.children === 'actions.accept')).toHaveLength(0);
});

it('preserves pending-revocation presentation and withholds the QR of a responded invitation', () => {
  mockInvite = { ...mockInvite, qrValidity: { expired: true, terminal: true, revocationPending: true } };
  act(() => { tree = create(renderScreen()); });
  expect(JSON.stringify(tree.toJSON())).toContain('visitor.invitationAccepted');
  expect(JSON.stringify(tree.toJSON())).toContain('Revocation pending');
  expect(qrNodes()).toHaveLength(0);
});

it('does not infer a visitor decision from an approved status and an issued QR', () => {
  mockInvite = { ...pendingInvite('approved'), canAccept: false, canReject: false };
  act(() => { tree = create(renderScreen()); });
  expect(JSON.stringify(tree.toJSON())).not.toContain('visitor.invitationAccepted');
  expect(qrNodes()).toHaveLength(0);
  expect(action('accept').props.disabled).toBe(true);
});

it('submits rejection only when permitted and follows the current rejected query', async () => {
  mockInvite = pendingInvite();
  mockReject.mutateAsync.mockImplementation(async () => {
    mockInvite = {
      ...mockInvite, status: 'visitor_rejected', canAccept: false, canReject: false,
      visitorDecision: { accepted: false, reason: 'Offline fixture reason' },
    };
    return { status: 'visitor_rejected' };
  });
  act(() => { tree = create(renderScreen()); });
  act(() => action('reject').props.onPress());
  const modal = tree.root.findAll(node => typeof node.props.onConfirm === 'function' && !!node.props.translations)[0];
  await act(async () => { await modal.props.onConfirm('Offline fixture reason'); });
  expect(mockReject.mutateAsync).toHaveBeenCalledTimes(1);
  expect(mockReject.mutateAsync).toHaveBeenCalledWith({ reason: 'Offline fixture reason' });
  expect(JSON.stringify(tree.toJSON())).toContain('visitor.invitationDeclined');
  expect(JSON.stringify(tree.toJSON())).not.toContain('visitor.invitationAccepted');
  expect(qrNodes()).toHaveLength(0);
});

it('does not submit rejection when the backend disallows it', async () => {
  mockInvite = { ...pendingInvite(), canReject: false };
  act(() => { tree = create(renderScreen()); });
  expect(action('reject').props.disabled).toBe(true);
  const modal = tree.root.findAll(node => typeof node.props.onConfirm === 'function' && !!node.props.translations)[0];
  await act(async () => { await modal.props.onConfirm('Offline fixture reason'); });
  expect(mockReject.mutateAsync).not.toHaveBeenCalled();
});

it('does not let local acceptance override a subsequent HTTP 410', async () => {
  mockInvite = pendingInvite();
  mockAccept.mutateAsync.mockImplementation(async () => {
    mockInvite = { ...mockInvite, status: 'visitor_accepted' };
    mockError = { response: { status: 410 } };
    return { status: 'visitor_accepted', qrCode: 'stale-mutation-qr' };
  });
  act(() => { tree = create(renderScreen()); });
  await act(async () => { await action('accept').props.onPress(); });
  expect(JSON.stringify(tree.toJSON())).toContain('visitorInvite.invitationExpired');
  expect(JSON.stringify(tree.toJSON())).not.toContain('visitor.invitationAccepted');
  expect(qrNodes()).toHaveLength(0);
});

it('lets a refreshed pending status replace local acceptance even while QR presence is unchanged', async () => {
  mockInvite = pendingInvite();
  mockAccept.mutateAsync.mockImplementation(async () => {
    mockInvite = { ...mockInvite, status: 'visitor_accepted', canAccept: false, canReject: false };
    return { status: 'visitor_accepted' };
  });
  act(() => { tree = create(renderScreen()); });
  await act(async () => { await action('accept').props.onPress(); });
  expect(JSON.stringify(tree.toJSON())).toContain('visitor.invitationAccepted');
  mockInvite = pendingInvite();
  act(() => tree.update(renderScreen()));
  expect(JSON.stringify(tree.toJSON())).not.toContain('visitor.invitationAccepted');
  expect(action('accept').props.disabled).toBe(false);
  expect(qrNodes()).toHaveLength(0);
});
