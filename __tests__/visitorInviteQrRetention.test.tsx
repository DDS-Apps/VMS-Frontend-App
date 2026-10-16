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
