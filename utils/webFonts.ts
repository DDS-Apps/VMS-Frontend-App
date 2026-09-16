import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { APP_FONT_FACES, type AppFontFace } from '@/constants/fonts';

export const WEB_FONT_STYLE_ID = 'vms-app-fonts';

/**
 * Builds the `@font-face` rules for the web build. Each face is declared under
 * the same family name the theme uses on native, with its true weight so the
 * browser never synthesises a bold on top of a bold file, and with
 * `font-display: swap` so text paints immediately in the fallback font and
 * swaps once the file arrives.
 */
export function buildWebFontFaceCss(
  faces: readonly AppFontFace[],
  resolveUri: (source: number) => string,
): string {
  return faces
    .map((font) => {
      const uri = resolveUri(font.source);
      return (
        `@font-face{font-family:"${font.name}";font-style:normal;font-weight:${font.weight};` +
        `font-display:swap;src:url("${uri}") format("truetype")}`
      );
    })
    .join('\n');
}

/**
 * Registers the app fonts with the browser. Idempotent; a no-op off web.
 *
 * Runs at module-evaluation time from App.tsx so the rules exist before the
 * first React render. The browser fetches each file lazily on first use, which
 * keeps first paint independent of font downloads.
 */
export function injectWebFontFaces(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }
  if (document.getElementById(WEB_FONT_STYLE_ID)) {
    return;
  }

  try {
    const style = document.createElement('style');
    style.id = WEB_FONT_STYLE_ID;
    style.textContent = buildWebFontFaceCss(APP_FONT_FACES, (source) => Asset.fromModule(source).uri);
    document.head.appendChild(style);
  } catch (error) {
    console.warn('[webFonts] Failed to register web fonts, falling back to system fonts:', error);
  }
}
