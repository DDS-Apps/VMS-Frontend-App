import { Platform } from 'react-native';

/**
 * Every custom font the app ships, with the weight each file actually is.
 *
 * - Native: the whole set is registered through expo-font before first render
 *   (see `nativeFontMap`), each file under its own family name.
 * - Web: the same names are declared as CSS `@font-face` rules with real
 *   `font-weight` descriptors and `font-display: swap`
 *   (see `utils/webFonts.ts`). The browser then downloads only the faces a
 *   page uses, never blocks first paint on them, and never fakes a bold on top
 *   of a face that is already bold.
 *
 * Only weights referenced by `constants/theme.ts` are listed.
 */
export interface AppFontFace {
  /** Family name used in styles (matches the expo-font key on native). */
  name: string;
  weight: 300 | 400 | 500 | 600 | 700 | 800;
  /** Metro asset module id from `require()`. */
  source: number;
}

export const APP_FONT_FACES: readonly AppFontFace[] = [
  { name: 'AlbertSans_300Light', weight: 300, source: require('@expo-google-fonts/albert-sans/300Light/AlbertSans_300Light.ttf') },
  { name: 'AlbertSans_400Regular', weight: 400, source: require('@expo-google-fonts/albert-sans/400Regular/AlbertSans_400Regular.ttf') },
  { name: 'AlbertSans_500Medium', weight: 500, source: require('@expo-google-fonts/albert-sans/500Medium/AlbertSans_500Medium.ttf') },
  { name: 'AlbertSans_600SemiBold', weight: 600, source: require('@expo-google-fonts/albert-sans/600SemiBold/AlbertSans_600SemiBold.ttf') },
  { name: 'AlbertSans_700Bold', weight: 700, source: require('@expo-google-fonts/albert-sans/700Bold/AlbertSans_700Bold.ttf') },
  { name: 'AlbertSans_800ExtraBold', weight: 800, source: require('@expo-google-fonts/albert-sans/800ExtraBold/AlbertSans_800ExtraBold.ttf') },
  { name: 'FSAlbertArabic_300Light', weight: 300, source: require('../assets/fonts/arabic/alfont_com_AlFont_com_FSAlbertArabic-Light.ttf') },
  { name: 'FSAlbertArabic_400Regular', weight: 400, source: require('../assets/fonts/arabic/alfont_com_AlFont_com_FSAlbertArabic-Regular.ttf') },
  { name: 'FSAlbertArabic_700Bold', weight: 700, source: require('../assets/fonts/arabic/alfont_com_AlFont_com_FSAlbertArabic-Bold.ttf') },
  { name: 'FSAlbertArabic_800ExtraBold', weight: 800, source: require('../assets/fonts/arabic/alfont_com_AlFont_com_FSAlbertArabic-ExtraBold.ttf') },
];

/**
 * Font map for expo-font's `useFonts` on native. Empty on web, where the CSS
 * declarations from `utils/webFonts.ts` take over and nothing is preloaded.
 */
export const nativeFontMap: Record<string, number> =
  Platform.OS === 'web'
    ? {}
    : APP_FONT_FACES.reduce<Record<string, number>>((map, font) => {
        map[font.name] = font.source;
        return map;
      }, {});
