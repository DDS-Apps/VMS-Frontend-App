import fs from 'fs';
import path from 'path';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StatusDropdown } from '@/components/shared/RequestStatusDropdown';
import { AdminDateFilterChip } from '@/components/shared/AdminDateFilterChip';
import { en } from '@/constants/i18n/en';
import { ar } from '@/constants/i18n/ar';

let mockRTL = false;
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: { primary: '#f80', surface: '#fff', border: '#ddd', text: '#222' } }),
}));
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const dictionary = mockRTL ? require('@/constants/i18n/ar').ar : require('@/constants/i18n/en').en;
      return key.split('.').reduce((value: any, part: string) => value?.[part], dictionary) ?? key;
    },
  }),
}));
jest.mock('@/components/shared/FilterChip', () => ({ FilterChip: 'FilterChip' }));
jest.mock('@/components/DirectionalRow', () => ({
  getFlexDirection: (rtl: boolean) => rtl ? 'row-reverse' : 'row',
}));
jest.mock('@/components/ThemedText', () => ({ ThemedText: 'ThemedText' }));
jest.mock('@/components/DDIcon', () => ({ DDIcon: 'DDIcon' }));
jest.mock('react-native', () => ({
  Modal: 'Modal',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  View: 'View',
  Platform: { OS: 'web', select: (options: Record<string, unknown>) => options.web ?? options.default },
  StyleSheet: { create: (styles: object) => styles, absoluteFillObject: {} },
}));

const source = fs.readFileSync(
  path.resolve(__dirname, '../screens/BuildingAdmin/AllRequestsScreen.tsx'),
  'utf8',
);
const chipSource = fs.readFileSync(
  path.resolve(__dirname, '../components/shared/FilterChip.tsx'),
  'utf8',
);

describe('Building Admin All Requests filter layout', () => {
  it('puts the date range after Valet with separate edit and clear actions', () => {
    expect(source).not.toContain('<ActiveDateRangeLabel');
    expect(source).toContain('onPress={() => setShowDatePicker(true)}');
    const start = source.indexOf('contentContainerStyle={styles.filtersRow}');
    const end = source.indexOf('</RTLHorizontalScrollView>', start);
    const row = source.slice(start, end);
    expect(row.indexOf('typeFilters.map(filter =>')).toBeGreaterThan(-1);
    expect(row.indexOf('<AdminDateFilterChip')).toBeGreaterThan(row.indexOf('typeFilters.map(filter =>'));
    expect(row).toContain('onClear={clearDateFilter}');
    expect(row).toContain('onOpen={() => setShowDatePicker(true)}');
    expect(source).toContain('setDateRange({ startDate: null, endDate: null })');
    expect(source).toContain('setBuffetDate(null)');
    expect(source).toContain('getAdminDateQueryRange(activeDateRange)');
    expect(source).toContain('getAdminDateQueryRange(dateRange)');
    expect(source.match(/formatDate\(localCalendarDateToKey\(activeDateRange\./g)).toHaveLength(3);
  });

  it('keeps the precise picker last within the scrollable visitor status chips', () => {
    const start = source.indexOf('contentContainerStyle={styles.statusFiltersRow}');
    const end = source.indexOf('</RTLHorizontalScrollView>', start);
    const row = source.slice(start, end);
    expect(row).toContain('statusFilters.map(filter =>');
    expect(row.indexOf('<StatusDropdown')).toBeGreaterThan(row.indexOf('statusFilters.map(filter =>'));
    expect(row).toContain("typeFilter === 'visitor' ? (");
    expect(row).toContain('<StatusDropdown');
    expect(row).toContain('compact');
    expect(row).toContain('value={preciseStatusFilter}');
    expect(row).toContain('onChange={handlePreciseStatusChange}');
    expect(source.slice(end, source.indexOf('<Spacer height={Spacing.lg} />', end))).not.toContain('<StatusDropdown');
    expect(source).toContain("setPreciseStatusFilter(null);\n    setStatusFilter(filter);");
    expect(source).toContain("setPreciseStatusFilter(status as RequestStatus | null);\n    setStatusFilter('all');");
    expect(source).toContain('flexShrink: 0');
    expect(chipSource).toContain("compact ? theme.info : theme.primary");
    expect(chipSource).toContain("compact ? '12' : '15'");
    expect(chipSource).toContain("(compact ? 'transparent' : theme.surface)");
    expect(chipSource).toContain('compact && styles.compactChip');
  });
});

describe.each([
  ['English', false, en],
  ['Arabic', true, ar],
] as const)('date chip actions in %s', (_language, isRTL, dictionary) => {
  it('opens the calendar on the label and clears the chip only on ×', () => {
    const onOpen = jest.fn();
    const onClear = jest.fn();
    let tree!: ReactTestRenderer;
    const label = 'September 1 - September 30';
    const clearLabel = `${dictionary.common.clear} ${dictionary.bulkActions.date}: ${label}`;
    act(() => {
      tree = create(<AdminDateFilterChip
        label={label}
        clearLabel={clearLabel}
        color="#FF8800"
        isRTL={isRTL}
        onOpen={onOpen}
        onClear={onClear}
      />);
    });
    const actions = tree.root.findAllByType('Pressable' as any);
    expect(actions).toHaveLength(2);
    expect(actions[0].props.accessibilityLabel).toBe(label);
    expect(actions[1].props.accessibilityLabel).toBe(clearLabel);
    expect(tree.root.findByType('View' as any).props.style[1].flexDirection)
      .toBe(isRTL ? 'row-reverse' : 'row');
    act(() => actions[0].props.onPress());
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onClear).not.toHaveBeenCalled();
    act(() => actions[1].props.onPress());
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledTimes(1);
    act(() => tree.unmount());
  });
});

describe.each([
  ['English', false, en],
  ['Arabic', true, ar],
] as const)('inline status picker in %s', (_language, rtl, dictionary) => {
  let tree: ReactTestRenderer;
  beforeEach(() => { mockRTL = rtl; });
  afterEach(() => { if (tree) act(() => tree.unmount()); });

  it('opens its compact chip and selects or clears a precise status', () => {
    const onChange = jest.fn();
    act(() => {
      tree = create(<StatusDropdown
        compact
        value={null}
        onChange={onChange}
        statuses={['visitor_pending', 'checked_in']}
      />);
    });
    const chip = tree.root.findByType('FilterChip' as any);
    expect(chip.props.compact).toBe(true);
    expect(chip.props.label).toBe(`${dictionary.common.status}: ${dictionary.common.allStatuses}`);
    expect(chip.props.accessibilityLabel).toBe(chip.props.label);
    act(() => chip.props.onPress());
    expect(tree.root.findByType('Modal' as any).props.visible).toBe(true);
    const optionText = tree.root.findAllByType('ThemedText' as any)
      .find(node => node.props.children === dictionary.status.visitorPending)!;
    act(() => optionText.parent!.props.onPress());
    expect(onChange).toHaveBeenCalledWith('visitor_pending');
    act(() => tree.update(<StatusDropdown compact value="visitor_pending" onChange={onChange} statuses={['visitor_pending']} />));
    expect(tree.root.findByType('FilterChip' as any).props.isSelected).toBe(true);
    act(() => tree.root.findByType('FilterChip' as any).props.onPress());
    const allText = tree.root.findAllByType('ThemedText' as any)
      .find(node => node.props.children === dictionary.common.allStatuses)!;
    act(() => allText.parent!.props.onPress());
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});