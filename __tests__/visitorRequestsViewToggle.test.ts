import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.resolve(__dirname, '../screens/Employee/VisitorRequestsScreen.tsx'), 'utf8',
);

describe('My Requests view controls', () => {
  it('puts the title right and controls left in Arabic while preserving English placement', () => {
    expect(source).toMatch(
      /<View style=\{\[\s*styles\.sectionTitleRow,\s*styles\.paddedContent,\s*\{ direction: "ltr", flexDirection: isRTL \? "row-reverse" : "row" \},\s*\]\}>/,
    );
    expect(source).toMatch(/\{titleElement\}\s*\{viewToggleElement\}/);
  });

  it('uses the same physical grid/list icon order as English', () => {
    const toggle = source.split('const viewToggleElement = (')[1].split('\n  return (')[0];
    expect(toggle).toContain('<View style={[styles.viewToggle, getPhysicalToggleStyle(isRTL)]}>');
    expect(toggle.indexOf('name="grid"')).toBeLessThan(toggle.indexOf('name="menu"'));
    expect(toggle).toContain('onPress={() => onViewModeChange("card")}');
    expect(toggle).toContain('onPress={() => onViewModeChange("list")}');
    expect(toggle).toContain('viewMode === "card" ? theme.primary : theme.surface');
    expect(toggle).toContain('viewMode === "list" ? theme.primary : theme.surface');
  });

  it('gives both buttons complete rounded borders without clipping the pair', () => {
    const group = source.match(/viewToggle:\s*\{([^}]+)\}/)?.[1];
    const button = source.match(/viewToggleButton:\s*\{([^}]+)\}/)?.[1];
    expect(group).toContain('gap: Spacing.xs');
    expect(group).not.toContain('overflow:');
    expect(button).toContain('borderWidth: 1');
    expect(button).toContain('borderRadius: BorderRadius.sm');
    expect(button).toContain('minWidth: 36');
    expect(button).toContain('height: 36');
    expect(source).not.toMatch(/viewToggleButton(?:Left|Right)/);
  });
});
