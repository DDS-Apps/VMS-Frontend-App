import fs from 'fs';
import path from 'path';

// Guard the real screen markup without mounting its unrelated API-backed panels.
const source = fs.readFileSync(
  path.join(__dirname, '../screens/Employee/RequestDetailsScreen.tsx'),
  'utf8',
);
const header = source.split('testID="visit-details-header"')[1]?.split('</DirectionalRow>')[0] ?? '';

describe('Request Details walk-in header', () => {
  it('lets the directional row mirror the same title-then-chip order for both languages', () => {
    expect(header).not.toBe('');
    expect(header).toContain('justifyContent: "space-between"');
    expect(header.indexOf('t("visitor.visitDetails")')).toBeGreaterThan(-1);
    expect(header.indexOf('<WalkInVisitorBadge')).toBeGreaterThan(
      header.indexOf('t("visitor.visitDetails")'),
    );
    expect(header).not.toMatch(/\bisRTL\s*\?/);
    expect(header).not.toContain('row-reverse');
  });

  it('keeps the existing chip conditional on a walk-in request', () => {
    expect(header).toContain('{request.isWalkIn ? (');
    expect(header.match(/<WalkInVisitorBadge/g)).toHaveLength(1);
    expect(header).toContain('<WalkInVisitorBadge icon="user-check" />');
  });
});
