import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

const mockUseDashboardKpisQuery = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'user-1', role: 'manager' },
  }),
}));

jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      surface: '#ffffff',
      border: '#dddddd',
      error: '#cc0000',
      primary: '#0044cc',
      warning: '#cc8800',
      success: '#008844',
      info: '#0077aa',
      secondary: '#666666',
      textSecondary: '#555555',
    },
  }),
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    locale: 'en',
    t: (key: string) => ({
      'dashboard.totalVisitors': 'Localized Total Visitors',
      'dashboard.kpiToday': 'Today',
      'dashboard.kpiThisMonth': 'This month',
      'dashboard.kpiAccessError': 'Access changed',
      'dashboard.kpiLoadError': 'Unable to load KPIs',
      'common.retry': 'Retry',
    }[key] ?? key),
  }),
}));

jest.mock('@/hooks/queries/useDashboardKpiQuery', () => ({
  useDashboardKpisQuery: (...args: unknown[]) => mockUseDashboardKpisQuery(...args),
}));

jest.mock('@/components/DDIcon', () => ({
  DDIcon: (props: Record<string, unknown>) =>
    require('react').createElement('DDIcon', props),
}));

jest.mock('@/components/ThemedText', () => ({
  ThemedText: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    require('react').createElement('ThemedText', props, children),
}));

jest.mock('@/components/shared/KPICard', () => ({
  KPICard: (props: Record<string, unknown>) =>
    require('react').createElement('KPICard', props),
  KPICardRow: ({ children }: React.PropsWithChildren) =>
    require('react').createElement('KPICardRow', null, children),
}));

jest.mock('@/components/shared/Skeleton', () => ({
  SkeletonCard: (props: Record<string, unknown>) =>
    require('react').createElement('SkeletonCard', props),
}));

import { DashboardKpiSection } from '@/components/shared/DashboardKpiSection';

const cachedKpiData = {
  role: 'manager',
  generatedAt: '2026-09-09T09:30:00.000Z',
  timezone: 'Asia/Riyadh',
  periods: {
    month: { start: '2026-09-01', end: '2026-09-30' },
  },
  kpis: [
    {
      key: 'totalVisitors',
      label: 'Total Visitors',
      value: 27,
      duration: 'monthly',
    },
  ],
};

const queryResult = (overrides: Record<string, unknown> = {}) => ({
  data: cachedKpiData,
  error: null,
  isFetching: false,
  refetch: jest.fn(),
  ...overrides,
});

const renderSection = () => {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<DashboardKpiSection />);
  });
  return renderer;
};

describe('DashboardKpiSection mounted states', () => {
  beforeEach(() => {
    mockUseDashboardKpisQuery.mockReset();
  });

  it('suppresses cached protected values after a warm 403', () => {
    mockUseDashboardKpisQuery.mockReturnValue(
      queryResult({
        error: { code: 'FORBIDDEN', message: 'Forbidden', status: 403 },
      }),
    );

    const renderer = renderSection();

    expect(renderer.root.findAllByType('KPICard')).toHaveLength(0);
    expect(JSON.stringify(renderer.toJSON())).toContain('Access changed');
  });

  it('suppresses cached values and offers retry after a warm network error', () => {
    mockUseDashboardKpisQuery.mockReturnValue(
      queryResult({
        error: { code: 'NETWORK_ERROR', message: 'Offline' },
      }),
    );

    const renderer = renderSection();

    expect(renderer.root.findAllByType('KPICard')).toHaveLength(0);
    expect(JSON.stringify(renderer.toJSON())).toContain('Unable to load KPIs');
    expect(JSON.stringify(renderer.toJSON())).toContain('Retry');
  });

  it('replaces cached values with section skeletons while refetching', () => {
    mockUseDashboardKpisQuery.mockReturnValue(queryResult({ isFetching: true }));

    const renderer = renderSection();

    expect(renderer.root.findAllByType('KPICard')).toHaveLength(0);
    expect(renderer.root.findAllByType('SkeletonCard')).toHaveLength(1);
  });

  it('renders known labels locally and unknown cards from the backend fallback', () => {
    mockUseDashboardKpisQuery.mockReturnValue(
      queryResult({
        data: {
          ...cachedKpiData,
          kpis: [
            cachedKpiData.kpis[0],
            {
              key: 'newBackendMetric',
              label: 'New Backend Metric',
              value: 1234,
              duration: 'today',
            },
          ],
        },
      }),
    );

    const renderer = renderSection();
    const cards = renderer.root.findAllByType('KPICard');

    expect(cards).toHaveLength(2);
    expect(cards[0].props.title).toBe('Localized Total Visitors');
    expect(cards[0].props.subtitle).toBeUndefined();
    expect(cards[1].props.title).toBe('New Backend Metric');
    expect(cards[1].props.value).toBe('1,234');
    expect(cards[1].props.subtitle).toBeUndefined();
    expect(cards[1].props.icon).toBe('bar-chart-2');
  });

  it('renders no section for a successful empty KPI array', () => {
    mockUseDashboardKpisQuery.mockReturnValue(
      queryResult({ data: { ...cachedKpiData, kpis: [] } }),
    );

    const renderer = renderSection();

    expect(renderer.toJSON()).toBeNull();
  });
});