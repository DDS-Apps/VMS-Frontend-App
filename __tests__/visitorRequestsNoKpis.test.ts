import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.resolve(__dirname, '../screens/Employee/VisitorRequestsScreen.tsx'),
  'utf8',
);

describe('My Requests page KPI removal', () => {
  it('does not render local KPI cards in either view mode', () => {
    expect(source).not.toContain('KPICard');
    expect(source).not.toContain('StatsCards');
    expect(source).not.toContain('totalVisitors');
    expect(source).not.toContain('todaysVisitors');
  });

  it('keeps the sidebar page controls and both request layouts', () => {
    expect(source).toContain('t("navigation.myRequests")');
    expect(source).toContain('if (viewMode === "list")');
    expect(source).toContain('<SectionHeader');
    expect(source).toContain('<ScreenFlatList');
    expect(source).toContain('<VisitorMatrixTable');
    expect(source).toContain('<SearchInput');
  });
});