import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import * as Native from 'react-native';
import ValetAllRequestsScreen from '@/screens/ValetAdmin/ValetAllRequestsScreen';
import { en } from '@/constants/i18n/en';
import { ar } from '@/constants/i18n/ar';

let mockRTL = false;
let mockQuery: any;
const mockRefetch = jest.fn(async () => undefined);
const mockRefreshKpis = jest.fn(async () => undefined);
jest.mock('@/hooks/queries/useValetAdminQueries', () => ({ useValetParkingDashboard: () => mockQuery }));
jest.mock('@/hooks/queries/useDashboardKpiQuery', () => ({ useRefreshDashboardKpis: () => mockRefreshKpis }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: 'valet_admin' } }) }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ isRTL: mockRTL, localeCode: mockRTL ? 'ar-SA' : 'en-US' }) }));
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => {
    const dict = mockRTL ? require('@/constants/i18n/ar').ar : require('@/constants/i18n/en').en;
    return key.split('.').reduce((value: any, part: string) => value?.[part], dict) ?? key;
  } }),
}));
jest.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ theme: {
  primary: '#f80', surface: '#fff', background: '#fff', surfaceSecondary: '#eee',
  error: '#c00', text: '#111', textSecondary: '#666', border: '#ddd', info: '#369',
  success: '#093', buttonText: '#fff',
} }) }));
jest.mock('@/hooks/useUpcomingVisitTimer', () => ({ useUpcomingIndicator: () => false }));
jest.mock('@/components/DDIcon', () => ({ DDIcon: 'DDIcon' }));
jest.mock('@/components/ThemedText', () => ({ ThemedText: 'ThemedText' }));
jest.mock('@/components/ThemedView', () => ({ ThemedView: 'ThemedView' }));
jest.mock('@/components/ScreenScrollView', () => ({ ScreenScrollView: 'ScreenScrollView' }));
jest.mock('@/components/CalendarDatePicker', () => ({ CalendarDatePicker: 'CalendarDatePicker' }));
jest.mock('@/components/shared/LoadingSpinner', () => ({ LoadingSpinner: 'LoadingSpinner' }));
jest.mock('@/components/shared/ActualMovementSummary', () => ({ ActualMovementSummary: () => null }));
jest.mock('@/components/shared/RequestStatusBadge', () => ({ RequestStatusBadge: 'RequestStatusBadge' }));
jest.mock('@/components/shared', () => ({
  DashboardKpiSection: 'DashboardKpiSection',
  VisitorMatrixTable: 'VisitorMatrixTable',
  WalkInBadge: () => null,
}));

const response = { data: [{
  requestId: 'fixture', visitorName: 'Retained visitor', visitorCompany: '',
  hostName: 'Host', hostDepartment: 'Operations', visitDate: '2026-10-09',
  visitTime: '09:00', status: 'visitor_accepted', visitorNeedsParking: true,
  parkingType: 'valet', isWalkIn: false,
}] };
let tree: ReactTestRenderer;
const nodes = (name: string) => tree.root.findAllByType(name as any);
const button = (label: string) => tree.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
function pressRetry() {
  let node = nodes('ThemedText').find(item => item.props.children === en.common.retry)!;
  while (typeof node.props.onPress !== 'function' && node.parent) node = node.parent;
  node.props.onPress();
}
function mount(width = 390) {
  jest.spyOn(require('react-native'), 'useWindowDimensions').mockReturnValue({ width, height: 844, scale: 3, fontScale: 1 });
  act(() => { tree = create(<ValetAllRequestsScreen />); });
}
beforeEach(() => {
  mockRTL = false;
  mockRefetch.mockClear(); mockRefreshKpis.mockClear();
  mockQuery = { data: response, isLoading: false, isFetching: false, isError: false, isRefetching: false, refetch: mockRefetch };
});
afterEach(() => { if (tree) act(() => tree.unmount()); jest.restoreAllMocks(); });

it.each([false, true])('uses one shared spinner only during cold loading (RTL=%s)', rtl => {
  mockRTL = rtl;
  mockQuery = { ...mockQuery, data: undefined, isLoading: true, isFetching: true };
  mount();
  expect(nodes('LoadingSpinner')).toHaveLength(1);
  expect(nodes('VisitorMatrixTable')).toHaveLength(0);
  expect(nodes('LoadingSpinner')[0].props.message).toBe((rtl ? ar : en).common.loading);
  mockQuery = { ...mockQuery, data: response, isLoading: false, isFetching: false };
  act(() => tree.update(<ValetAllRequestsScreen />));
  expect(nodes('LoadingSpinner')).toHaveLength(0);
  expect(nodes('VisitorMatrixTable')[0].props.visitors[0].visitorName).toBe('Retained visitor');
});

it('keeps retained visitors during date loading and failure; retries and refreshes remain wired', async () => {
  mount();
  act(() => button(en.form.selectDate).props.onPress());
  expect(nodes('CalendarDatePicker')[0].props.visible).toBe(true);
  mockQuery = { ...mockQuery, data: undefined, isLoading: true, isFetching: true };
  act(() => nodes('CalendarDatePicker')[0].props.onDateSelect(new Date(2026, 9, 10)));
  expect(nodes('CalendarDatePicker')[0].props.visible).toBe(false);
  expect(nodes('LoadingSpinner')).toHaveLength(0);
  expect(nodes('VisitorMatrixTable')[0].props.visitors).toHaveLength(1);
  mockQuery = { ...mockQuery, isLoading: false, isFetching: false, isError: true };
  act(() => tree.update(<ValetAllRequestsScreen />));
  expect(nodes('VisitorMatrixTable')[0].props.visitors).toHaveLength(1);
  act(pressRetry);
  expect(mockRefetch).toHaveBeenCalledTimes(1);
  await act(async () => nodes('ScreenScrollView')[0].props.refreshControl.props.onRefresh());
  expect(mockRefreshKpis).toHaveBeenCalledTimes(1);
  expect(mockRefetch).toHaveBeenCalledTimes(2);
});

it('renders retry rather than an endless spinner when the initial request fails', () => {
  mockQuery = { ...mockQuery, data: undefined, isError: true };
  mount();
  expect(nodes('LoadingSpinner')).toHaveLength(0);
  act(pressRetry);
  expect(mockRefetch).toHaveBeenCalledTimes(1);
});

describe.each([320, 390, 430, 1280])('viewport width %s', width => {
  it.each([false, true])('keeps both view controls and date selection functional (RTL=%s)', rtl => {
    mockRTL = rtl;
    const dict = rtl ? ar : en;
    mount(width);
    const controls = tree.root.findAllByProps({ testID: 'valet-requests-controls' })[0];
    const controlsStyle = Native.StyleSheet.flatten(controls.props.style);
    if (width < 600) {
      expect(controlsStyle).toMatchObject({ width: '100%', direction: 'ltr', flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'nowrap' });
      const toggle = tree.root.findAllByProps({ testID: 'valet-requests-view-toggle' })[0];
      expect(Native.StyleSheet.flatten(toggle.props.style)).toMatchObject({ direction: 'ltr', flexDirection: 'row', flexShrink: 0 });
    } else {
      expect(controlsStyle.width).toBeUndefined();
      expect(controlsStyle.direction).toBe(rtl ? 'rtl' : 'ltr');
    }
    expect(button(dict.common.tableView).props.accessibilityState.selected).toBe(true);
    act(() => button(dict.common.cardView).props.onPress());
    expect(button(dict.common.cardView).props.accessibilityState.selected).toBe(true);
    expect(nodes('VisitorMatrixTable')).toHaveLength(0);
    expect(nodes('ThemedText').some(node => node.props.children === 'Retained visitor')).toBe(true);
    act(() => button(dict.common.tableView).props.onPress());
    expect(nodes('VisitorMatrixTable')).toHaveLength(1);
    act(() => button(dict.form.selectDate).props.onPress());
    expect(nodes('CalendarDatePicker')[0].props.visible).toBe(true);
    act(() => nodes('CalendarDatePicker')[0].props.onClose());
    expect(nodes('CalendarDatePicker')[0].props.visible).toBe(false);
  });
});
