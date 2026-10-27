import { readFileSync } from 'fs';
import { join } from 'path';

describe('Detail-page presentation scope', () => {
  it.each([
    ['Employee/RequestDetailsScreen.tsx', 'RequestTimeline'],
    ['Manager/ManagerApprovalDetailScreen.tsx', 'RequestTimeline'],
    ['Receptionist/VisitorDetailScreen.tsx', 'ReceptionistVisitTimeline'],
    ['Security/SecurityVisitorDetailScreen.tsx', 'RequestTimeline'],
  ])('keeps the timeline without added summary or QR-status blocks in %s', (screen, timeline) => {
    const source = readFileSync(join(__dirname, '..', 'screens', screen), 'utf8');
    expect(source).not.toContain('ActualMovementSummary');
    expect(source).not.toContain('QrAccessNotice');
    expect(source).toContain(`<${timeline}`);
  });

  it.each([
    'Employee/RequestDetailsScreen.tsx',
    'Receptionist/VisitorDetailScreen.tsx',
  ])('preserves time-aware QR visibility guards in %s', screen => {
    const source = readFileSync(join(__dirname, '..', 'screens', screen), 'utf8');
    expect(source).toContain('canDisplayQr(');
    expect(source).toContain('const qrNow = useQrClock();');
  });
});
