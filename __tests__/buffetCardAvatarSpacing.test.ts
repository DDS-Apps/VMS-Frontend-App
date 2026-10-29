import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.resolve(__dirname, '../screens/BuffetAdmin/BuffetAllRequestsScreen.tsx'),
  'utf8',
);

describe('Buffet Admin card avatar spacing', () => {
  it('uses the existing content gap between avatar and name in either direction', () => {
    const header = source.match(/cardHeaderRow:\s*\{([^}]+)\}/)![1];
    expect(header).toContain('gap: LAYOUT.contentGap');
    expect(header).toContain("alignItems: 'center'");
    expect(source).toContain('<DirectionalRow style={styles.cardHeaderRow}>');
    const start = source.indexOf('<DirectionalRow style={styles.cardHeaderRow}>');
    const name = source.indexOf('<View style={styles.cardNameSection}>', start);
    expect(source.slice(start, name)).toContain('<VisitorAvatar');
  });

  it('removes the side-dependent margin without changing flexible name layout', () => {
    const nameSection = source.match(/cardNameSection:\s*\{([^}]+)\}/)![1];
    expect(nameSection).toContain('flex: 1');
    expect(nameSection).not.toMatch(/margin(?:Start|End|Left|Right|Horizontal)?:/);
    expect(source).toContain('const VisitorAvatar = ({ name, theme, size = 44 }');
    expect(source).toContain('{request.hostDepartment}');
    expect(source).toContain('<RequestStatusBadge status={request.status} />');
  });
});
