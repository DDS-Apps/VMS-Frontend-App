import { APP_FONT_FACES, nativeFontMap } from '@/constants/fonts';
import { FontFamily } from '@/constants/theme';
import { buildWebFontFaceCss } from '@/utils/webFonts';

describe('app font declarations', () => {
  it('declares every face the theme references, on both platforms', () => {
    const declared = new Set(APP_FONT_FACES.map((font) => font.name));
    const themeFaces = Object.values(FontFamily).map((family) => family.split(',')[0].trim());

    for (const face of themeFaces) {
      expect(declared.has(face)).toBe(true);
    }
    // Native (the test runtime reports iOS) preloads the whole set through expo-font.
    expect(Object.keys(nativeFontMap).sort()).toEqual([...declared].sort());
  });

  it('builds one @font-face rule per file with its real weight and swap display', () => {
    const css = buildWebFontFaceCss(
      [
        { name: 'AlbertSans_700Bold', weight: 700, source: 1 },
        { name: 'FSAlbertArabic_400Regular', weight: 400, source: 2 },
      ],
      (source) => `/assets/font-${source}.ttf`,
    );

    const rules = css.split('\n');
    expect(rules).toHaveLength(2);
    expect(rules[0]).toBe(
      '@font-face{font-family:"AlbertSans_700Bold";font-style:normal;font-weight:700;' +
        'font-display:swap;src:url("/assets/font-1.ttf") format("truetype")}',
    );
    expect(rules[1]).toContain('font-family:"FSAlbertArabic_400Regular"');
    expect(rules[1]).toContain('font-weight:400');
    expect(rules[1]).toContain('url("/assets/font-2.ttf")');
  });
});
