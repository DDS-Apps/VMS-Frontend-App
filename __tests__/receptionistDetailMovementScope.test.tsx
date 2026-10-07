import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Platform } from 'react-native';
import VisitorDetailScreen from '@/screens/Receptionist/VisitorDetailScreen';

let mockRTL = false;
let mockDetails: any;
const mockRefetch = jest.fn();
const mockMovementHook = jest.fn(() => ({ isPending: false, mutateAsync: jest.fn() }));
const mockDetailsQuery = jest.fn();
jest.mock('@/hooks/queries/useReceptionQueries', () => ({
  useReceptionCheckInMutation: () => mockMovementHook(),
  useReceptionCheckOutMutation: () => mockMovementHook(),
}));
jest.mock('@/hooks/queries/useApprovalQueries', () => ({
  useVisitDetailsQuery: (...args: unknown[]) => {
    mockDetailsQuery(...args);
    return { data: mockDetails, isLoading: false, isFetching: false, refetch: mockRefetch };
  },
}));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: () => undefined }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'receptionist', role: 'receptionist' } }),
}));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ isRTL: mockRTL }),
}));
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const dictionary = mockRTL ? require('@/constants/i18n/ar').ar : require('@/constants/i18n/en').en;
      return key.split('.').reduce((value: any, part: string) => value?.[part], dictionary) ?? key;
    },
  }),
}));
jest.mock('@/hooks/useFormatters', () => ({
  useFormatters: () => ({
    formatTime: (v: string) => v, formatTimeFromString: (v: string) => v,
    formatDateShort: (v: string) => v, toLocalNumerals: (v: string) => v,
  }),
}));
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: {
    surface: '#ffffff', surfaceSecondary: '#eeeeee', border: '#dddddd',
    primary: '#336699', success: '#009933', error: '#cc3333', warning: '#cc9900',
    text: '#222222', textSecondary: '#777777', buttonText: '#ffffff',
  } }),
}));
jest.mock('@/hooks/useRiyadhBusinessDateKey', () => ({ useRiyadhBusinessDateKey: () => '2026-10-07' }));
jest.mock('@/hooks/useTimeBoundaryTick', () => ({ useTimeBoundaryTick: () => 0 }));
jest.mock('@/components/ScreenScrollView', () => ({ ScreenScrollView: 'ScreenScrollView' }));
jest.mock('@/components/ThemedText', () => ({ ThemedText: 'ThemedText' }));
jest.mock('@/components/ThemedView', () => ({ ThemedView: 'ThemedView' }));
jest.mock('@/components/DDIcon', () => ({ DDIcon: 'DDIcon' }));
jest.mock('@/components/shared/RequestStatusBadge', () => ({ RequestStatusBadge: 'RequestStatusBadge' }));
jest.mock('@/components/shared/WalkInVisitorBadge', () => ({ WalkInVisitorBadge: 'WalkInVisitorBadge' }));
jest.mock('@/components/shared/LoadingButton', () => ({ LoadingButton: 'LoadingButton' }));
jest.mock('react-native-qrcode-svg', () => 'QRCode');

const history = {
  requestId: 'visit', timezone: 'Asia/Riyadh',
  data: ['checked_in', 'checked_out', 'checked_in', 'checked_out'].map((eventType, i) => ({
    id: `event-${i}`, requestId: 'visit', eventType,
    occurredAt: `2026-10-07T${String(i + 8).padStart(2, '0')}:00:00Z`,
    recordedAt: '2026-10-07T15:00:00Z', source: 'reception', actor: null, gate: null,
    timestampBasis: 'occurred_at',
  })),
};

describe.each(['web', 'ios', 'android'] as const)('Receptionist detail scope on %s', os => {
  let tree: ReactTestRenderer | undefined;
  const originalOS = Platform.OS;
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = os;
    jest.spyOn(require('react-native'), 'useWindowDimensions').mockReturnValue({
      width: os === 'web' ? 1280 : 390, height: 844, scale: 1, fontScale: 1,
    });
  });
  afterEach(() => {
    if (tree) act(() => tree!.unmount());
    tree = undefined;
    Platform.OS = originalOS;
    jest.restoreAllMocks();
  });

  it.each(
    [false, true].flatMap(rtl => [false, true].flatMap(isWalkIn =>
      ['visitId', 'visitor', 'legacyFallback'].flatMap(entry =>
        ['expected', 'approved', 'visitor_accepted', 'checked_in', 'checked_out',
          'completed', 'pending_approval', 'pending_host_approval', 'expired']
          .map(status => ({ rtl, isWalkIn, entry, status })),
      ),
    )),
  )('has no movement actions: $status, RTL=$rtl, walk-in=$isWalkIn, entry=$entry', ({ rtl, isWalkIn, entry, status }) => {
    mockRTL = rtl;
    mockDetails = {
      id: 'visit', visitor: { fullName: 'Test Visitor', company: 'Test Company' },
      employeeName: 'Test Host', visitDate: '2020-01-01', visitTime: '10:00', endTime: '11:00',
      status, isWalkIn, createdAt: '2020-01-01T07:00:00Z', qrCode: 'test-qr',
      movementHistory: history, timezone: 'Asia/Riyadh',
    };
    const visitor = {
      id: 'visit', name: 'Test Visitor', company: 'Test Company', host: 'Test Host',
      time: '10:00', endTime: '11:00', visitDate: '2020-01-01', status, isWalkIn,
      createdAt: '2020-01-01T07:00:00Z', qrCode: 'test-qr', email: '', phone: '',
    };
    if (entry === 'legacyFallback') mockDetails = undefined;
    act(() => {
      tree = create(<VisitorDetailScreen
        navigation={{ navigate: jest.fn() } as any}
        route={{ params: entry === 'visitId' ? { visitId: 'visit' } : { visitor } } as any}
      />);
    });
    const dictionary = rtl ? require('@/constants/i18n/ar').ar : require('@/constants/i18n/en').en;
    const text = tree!.root.findAllByType('ThemedText' as any).map(node => node.props.children);
    // Timeline labels may describe movements, but no actionable movement label is rendered.
    for (const node of tree!.root.findAll(node => typeof node.props.onPress === 'function')) {
      const actionText = node.findAllByType('ThemedText' as any).map(child => child.props.children);
      expect(actionText).not.toContain(dictionary.actions.checkIn);
      expect(actionText).not.toContain(dictionary.actions.checkOut);
    }
    expect(mockMovementHook).not.toHaveBeenCalled();
    expect(mockDetailsQuery).toHaveBeenCalledWith('visit', true);
    expect(tree!.root.findByType('QRCode' as any).props.value).toBe('test-qr');
    if (entry !== 'legacyFallback') {
      expect(text.filter(value => value === dictionary.movementHistory.checkIn)).toHaveLength(2);
      expect(text.filter(value => value === dictionary.movementHistory.checkOut)).toHaveLength(2);
    }
    const refresh = tree!.root.findByType('ScreenScrollView' as any).props.refreshControl;
    act(() => refresh.props.onRefresh());
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
