import fs from 'node:fs';
import path from 'node:path';

// Source wiring guards complement the rendered component tests. Neither
// suite claims to exercise UIKit hit-testing or physical iPhone gestures.
const affectedScreens = [
  'screens/Employee/VisitorRequestsScreen.tsx',
  'screens/Employee/MyValetRequestsScreen.tsx',
  'screens/Manager/ManagerAllRequestsScreen.tsx',
  'screens/Receptionist/AllVisitorsScreen.tsx',
  'screens/Receptionist/AllVisitorsTodayScreen.tsx',
  'screens/Receptionist/WalkInVisitorsScreen.tsx',
];

describe('iOS list filter integration', () => {
  it.each(affectedScreens)('%s opts its filter row into the iOS layout', (file) => {
    const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    const rows = source.match(/<RTLHorizontalScrollView\b[\s\S]*?<\/RTLHorizontalScrollView>/g) ?? [];
    const filterRows = rows.filter(row => row.includes('<FilterChip'));
    expect(filterRows.length).toBeGreaterThan(0);
    for (const row of filterRows) {
      const openingTag = row.slice(0, row.indexOf('>'));
      expect(openingTag).toMatch(/\bwrapOnIOS\b/);
    }
  });

  it.each([
    'screens/Dashboard/OverviewScreen.tsx',
    'screens/Receptionist/ReceptionistDashboardScreen.tsx',
  ])('leaves the working dashboard %s on its existing layout', (file) => {
    expect(fs.readFileSync(path.join(process.cwd(), file), 'utf8')).not.toContain('wrapOnIOS');
  });
});
