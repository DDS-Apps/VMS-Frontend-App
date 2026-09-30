import React from 'react';
import { act, create } from 'react-test-renderer';
import type { ValetParkingVisitorDto } from '@/types/api.types';
import { VisitorCard } from '@/screens/ValetAdmin/ValetAllRequestsScreen';
import { DDIcon } from '@/components/DDIcon';
import { StyleSheet } from 'react-native';
import { BorderRadius } from '@/constants/theme';
import { applyOpacity } from '@/utils/statusStyles';

jest.mock('@/components/DDIcon', () => ({ DDIcon: 'DDIcon' }));
jest.mock('@/components/ScreenScrollView', () => ({ ScreenScrollView: 'ScreenScrollView' }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ isRTL: false }) }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: 'valet_admin' } }) }));
jest.mock('@/components/ThemedText', () => ({ ThemedText: 'ThemedText' }));
jest.mock('@/components/ThemedView', () => ({ ThemedView: 'ThemedView' }));
jest.mock('@/components/shared/RequestStatusBadge', () => ({ RequestStatusBadge: () => null }));
jest.mock('@/components/shared', () => ({
  DashboardKpiSection: () => null,
  VisitorMatrixTable: () => null,
  WalkInBadge: () => null,
}));
jest.mock('@/components/DirectionalRow', () => ({
  DirectionalRow: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  getFlexDirection: (rtl: boolean) => rtl ? 'row-reverse' : 'row',
}));
jest.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ theme: { error: '#c00' } }) }));
jest.mock('@/hooks/useUpcomingVisitTimer', () => ({ useUpcomingIndicator: () => false }));

const theme = {
  surface: '#fff', primary: '#960', info: '#369', textSecondary: '#777',
} as any;
const baseVisitor: ValetParkingVisitorDto = {
  requestId: 'visit-1',
  visitorName: 'Visitor One',
  visitorCompany: 'Company',
  hostName: 'Host',
  hostDepartment: 'Operations',
  visitDate: '2026-09-30',
  visitTime: '09:00',
  status: 'visitor_accepted',
  visitorNeedsParking: true,
  parkingType: 'valet',
  isWalkIn: false,
};

describe.each([false, true])('Valet parking tile (RTL=%s)', isRTL => {
  it('shows the approved parking icon only for parking-required visitors', () => {
    let tree: ReturnType<typeof create>;
    act(() => {
      tree = create(<VisitorCard visitor={baseVisitor} theme={theme} t={key => key} isRTL={isRTL} />);
    });
    expect(tree!.root.findAllByType(DDIcon as any).map(node => node.props.name)).toContain('parking');
    expect(tree!.root.findAllByType(DDIcon as any).map(node => node.props.name)).not.toContain('map-pin');
    const parking = tree!.root.findAllByType(DDIcon as any).find(node => node.props.name === 'parking')!;
    expect(parking.props.size).toBe(14);
    expect(parking.props.color).toBe(theme.info);
    const badgeStyle = StyleSheet.flatten(parking.parent!.props.style);
    expect(badgeStyle).toMatchObject({
      width: 32,
      height: 32,
      borderRadius: BorderRadius.full,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: applyOpacity(theme.info, '20'),
    });
    expect(badgeStyle).not.toHaveProperty('flex');

    act(() => {
      tree!.update(<VisitorCard visitor={{ ...baseVisitor, visitorNeedsParking: false, parkingType: 'none' }} theme={theme} t={key => key} isRTL={isRTL} />);
    });
    expect(tree!.root.findAllByType(DDIcon as any).map(node => node.props.name)).not.toContain('parking');
    act(() => tree!.unmount());
  });
});