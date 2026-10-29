import fs from 'fs';
import path from 'path';

describe('request creation Arabic value alignment', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../screens/Employee/VisitorRequestFormScreen.tsx'), 'utf8',
  );

  it('limits the baseline adjustment to the date and both time values on Arabic iOS', () => {
    const correctedValues = Array.from(source.matchAll(
      /Platform\.OS === "ios" && isRTL && styles\.nativeArabicFieldValue,\s*\]\}\s*>\s*\{([^}]+)\}/g,
    ), match => match[1]);
    expect(correctedValues).toEqual([
      'formatPickerDate(selectedDate)',
      'formatPickerTime(selectedTime)',
      'formatPickerTime(selectedEndTime)',
    ]);
  });

  it('adjusts only visual position, not field sizing or font metrics', () => {
    const style = source.match(/nativeArabicFieldValue:\s*\{([\s\S]*?)\n  \},/)?.[1];
    expect(style).toContain('transform: [{ translateY: 1 }]');
    expect(style).not.toMatch(/\b(?:fontSize|lineHeight|height|minHeight|padding|margin)\s*:/);
  });
});
