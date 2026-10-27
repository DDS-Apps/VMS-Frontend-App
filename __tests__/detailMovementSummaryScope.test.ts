import { readFileSync } from 'fs';
import { join } from 'path';

describe('Actual In/Out detail-page scope', () => {
  it.each([
    ['Employee/RequestDetailsScreen.tsx', 'RequestTimeline'],
    ['Manager/ManagerApprovalDetailScreen.tsx', 'RequestTimeline'],
    ['Receptionist/VisitorDetailScreen.tsx', 'ReceptionistVisitTimeline'],
    ['Security/SecurityVisitorDetailScreen.tsx', 'RequestTimeline'],
  ])('keeps the existing timeline without the added summary in %s', (screen, timeline) => {
    const source = readFileSync(join(__dirname, '..', 'screens', screen), 'utf8');
    expect(source).not.toContain('ActualMovementSummary');
    expect(source).toContain(`<${timeline}`);
  });
});
