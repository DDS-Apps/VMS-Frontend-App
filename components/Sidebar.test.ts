jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { getMenuGroups } from './Sidebar';
import { getTranslation } from '@/constants/i18n';

describe('Employee and Manager sidebar visit labels', () => {
  it.each(['employee', 'manager'] as const)('updates only visit labels for %s', (role) => {
    const group = getMenuGroups(role).groups.find(group => group.id === 'visits')!;
    const items = group.items.slice(0, 2);
    expect(items).toEqual([
      { id: 'new_request', labelKey: 'sidebar.createVisit', icon: 'user-plus', screen: 'VisitorRequestForm' },
      { id: 'visitor_requests', labelKey: 'sidebar.myVisits', icon: 'list', screen: 'VisitorRequests' },
    ]);
    expect(items.map(item => getTranslation('en', item.labelKey))).toEqual(['Create Visit', 'My Visits']);
    expect(items.map(item => getTranslation('ar', item.labelKey))).toEqual(['طلب جديد', 'طلباتي']);
    if (role === 'manager') {
      expect(group.badgeKey).toBe('pendingApprovals');
      expect(group.items.slice(2).map(item => item.labelKey)).toEqual([
        'navigation.allRequests', 'navigation.pendingApprovals',
      ]);
    }
  });

  it('preserves labels shared with page headings', () => {
    expect(getTranslation('en', 'navigation.newRequest')).toBe('New Request');
    expect(getTranslation('en', 'navigation.myRequests')).toBe('My Requests');
    expect(getTranslation('ar', 'navigation.newRequest')).toBe('طلب جديد');
    expect(getTranslation('ar', 'navigation.myRequests')).toBe('طلباتي');
  });

  it.each(['receptionist', 'security', 'valet_driver', 'buffet_staff', 'buffet_admin', 'valet_admin', 'building_admin', 'visitor'] as const)(
    'does not apply visit labels to %s', role => {
      const menu = getMenuGroups(role);
      const items = [...menu.standalone, ...menu.groups.flatMap(group => group.items)];
      expect(items.some(item => ['sidebar.createVisit', 'sidebar.myVisits'].includes(item.labelKey))).toBe(false);
    },
  );
});

describe('Receptionist sidebar menu', () => {
  it('promotes the only visitor and registration destinations', () => {
    const menu = getMenuGroups('receptionist');

    expect(menu.groups).toEqual([]);
    expect(menu.standalone).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'all_visitors',
        screen: 'AllVisitors',
        badgeKey: 'todaysVisitors',
      }),
      expect.objectContaining({
        id: 'walk_in',
        screen: 'WalkInRegistration',
      }),
    ]));
  });

  it('does not flatten another role menu', () => {
    expect(getMenuGroups('manager').groups.length).toBeGreaterThan(0);
  });
});