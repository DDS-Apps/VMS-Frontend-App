import { Platform } from "react-native";

// ============================================
// DALLAH ALBARAKA Brand Theme
// ============================================

// Brand Core Colors (Dallah Albaraka Palette)
export const BrandColors = {
  // Primary: Dallah Orange
  brandOrange: "#F58423", // Primary CTAs, buttons, links, highlights
  brandOrange80: "#F79D4F", // 80% tint
  brandOrange60: "#F9B57B", // 60% tint
  brandOrange40: "#FBCEA7", // 40% tint
  brandOrange20: "#FDE6D3", // 20% tint (soft backgrounds)

  // Primary: Dallah Green
  brandGreen: "#009933", // Secondary accent, success states, badges
  brandGreen80: "#33AD5C", // 80% tint
  brandGreen60: "#66C285", // 60% tint
  brandGreen40: "#99D6AD", // 40% tint
  brandGreen20: "#CCEBD6", // 20% tint (soft backgrounds)

  // Secondary: Dallah Grey
  brandGrey: "#282829", // Primary dark background, sidebar, headers
  brandGrey80: "#535354", // 80% tint
  brandGrey60: "#7E7E7F", // 60% tint
  brandGrey40: "#A9A9A9", // 40% tint
  brandGrey20: "#D4D4D4", // 20% tint

  // Soft accent backgrounds
  softOrange: "#FDE6D3", // Subtle accent backgrounds for cards/info
  softGreen: "#CCEBD6", // Subtle green backgrounds
};

// Neutral Colors
export const NeutralColors = {
  grey900: "#535354", // Secondary text, muted icons (brandGrey80)
  grey600: "#7E7E7F", // Tertiary text (brandGrey60)
  grey400: "#A9A9A9", // Disabled states (brandGrey40)
  grey300: "#C7CCD3", // Borders, dividers, input outlines
  grey200: "#D4D4D4", // Card borders, subtle surfaces (brandGrey20)
  grey50: "#F5F7FA", // Light backgrounds
  offWhite: "#fafafa", // Content/sidebar backgrounds
  white: "#FFFFFF", // Surfaces, cards, modals, inputs
};

// Status Colors
export const StatusColors = {
  success: "#009933", // Dallah Green for Approve/Accept buttons
  warning: "#F58423", // Dallah Orange for warnings
  error: "#E53935", // Keep red for errors
  info: "#F58423", // Dallah Orange for info
};

// Gradient (for rare hero/CTA use)
export const GradientColors = {
  start: "#F58423", // brandOrange
  end: "#009933", // brandGreen
};

const tintColorLight = BrandColors.brandOrange;
const tintColorDark = BrandColors.brandOrange80;

export const Colors = {
  // Brand tokens (accessible directly)
  brand: BrandColors,
  neutral: NeutralColors,
  status: StatusColors,
  gradient: GradientColors,

  light: {
    // Brand colors - Orange as primary for CTAs/buttons
    primary: BrandColors.brandOrange,
    secondary: BrandColors.brandGreen,
    accent: BrandColors.softOrange,

    // Backgrounds - Light mode uses off-white for content/sidebar
    background: NeutralColors.offWhite,
    surface: NeutralColors.white,
    surfaceSecondary: NeutralColors.grey50,

    // Text - Grey for visibility on white
    text: BrandColors.brandGrey,
    textSecondary: NeutralColors.grey900,

    // Borders
    border: NeutralColors.grey200,
    borderLight: NeutralColors.grey300,

    // Status
    success: StatusColors.success,
    warning: StatusColors.warning,
    error: StatusColors.error,
    info: BrandColors.brandOrange,

    // Buttons - White text on orange buttons for proper contrast
    buttonText: NeutralColors.white,
    buttonSecondaryText: BrandColors.brandOrange,
    buttonTextOnError: NeutralColors.white,

    // Overlay
    overlay: "#000000",

    // Navigation
    tabIconDefault: NeutralColors.grey900,
    tabIconSelected: BrandColors.brandOrange,
    link: BrandColors.brandOrange,
    
    // Card icons - Grey for refined look on light surfaces
    cardIcon: BrandColors.brandGrey,

    // Additional backgrounds
    backgroundRoot: NeutralColors.offWhite,
    backgroundDefault: NeutralColors.offWhite,
    backgroundSecondary: NeutralColors.grey50,
    backgroundTertiary: NeutralColors.grey200,

    // Sidebar (light background with grey text in light mode)
    sidebarBg: NeutralColors.offWhite,
    sidebarActive: NeutralColors.white,
    sidebarText: BrandColors.brandGrey,
    sidebarTextMuted: NeutralColors.grey900,
    sidebarIcon: BrandColors.brandGrey,
    sidebarIconMuted: NeutralColors.grey900,

    // Charts
    chartOrange: BrandColors.brandOrange,
    chartGreen: BrandColors.brandGreen,
    chartPurple: "#A78BFA",
    chartPink: "#F472B6",
    chartYellow: "#FBBF24",

    // Soft backgrounds for cards/badges
    softOrange: BrandColors.softOrange,
    softGreen: BrandColors.softGreen,
    softSuccess: "#CCEBD6", // Light green background (brandGreen20)
    softWarning: "#FDE6D3", // Light orange background (brandOrange20)
    softError: "#FEECEB",
  },
  dark: {
    // Brand colors (adjusted for dark mode)
    primary: BrandColors.brandOrange80,
    secondary: BrandColors.brandGreen80,
    accent: "#3A3A3B",

    // Backgrounds - Dark mode uses grey
    background: BrandColors.brandGrey,
    surface: "#353536",
    surfaceSecondary: "#424243",

    // Text - White for visibility on dark
    text: NeutralColors.white,
    textSecondary: "#B0B0B1",

    // Borders
    border: "#4A4A4B",
    borderLight: "#5A5A5B",

    // Status
    success: BrandColors.brandGreen80,
    warning: BrandColors.brandOrange80,
    error: "#F87171",
    info: BrandColors.brandOrange80,

    // Buttons - Dark text on orange buttons for better contrast
    buttonText: BrandColors.brandGrey,
    buttonSecondaryText: BrandColors.brandOrange80,
    buttonTextOnError: NeutralColors.white,

    // Overlay
    overlay: "#000000",

    // Navigation
    tabIconDefault: "#B0B0B1",
    tabIconSelected: BrandColors.brandOrange80,
    link: BrandColors.brandOrange80,
    
    // Card icons - Orange for visibility on dark surfaces
    cardIcon: BrandColors.brandOrange80,

    // Additional backgrounds
    backgroundRoot: BrandColors.brandGrey,
    backgroundDefault: BrandColors.brandGrey,
    backgroundSecondary: "#353536",
    backgroundTertiary: "#424243",

    // Sidebar (same as background for consistent dark mode)
    sidebarBg: BrandColors.brandGrey,
    sidebarActive: "#353536",
    sidebarText: NeutralColors.white,
    sidebarTextMuted: "rgba(255, 255, 255, 0.7)",
    sidebarIcon: NeutralColors.white,
    sidebarIconMuted: "rgba(255, 255, 255, 0.7)",

    // Charts
    chartOrange: BrandColors.brandOrange,
    chartGreen: BrandColors.brandGreen80,
    chartPurple: "#A78BFA",
    chartPink: "#F472B6",
    chartYellow: "#FBBF24",

    // Soft backgrounds for cards/badges (dark variants)
    softOrange: "#3A2A1A",
    softGreen: "#1A2A1A",
    softSuccess: "#1A2A1A",
    softWarning: "#3A2A1A",
    softError: "#3A1A1A",
  },
};

// ============================================
// Spacing Scale
// ============================================
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  inputHeight: 44,
  buttonHeight: 48,
};

// ============================================
// Border Radius
// ============================================
export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
  card: 16,
  pill: 9999,
  small: 8,
};

// ============================================
// Typography System
// ============================================

// Font families for locale-aware rendering
// Using FS Albert Pro (Latin) and FS Albert Arabic Web (Arabic)
// Falls back to Inter/Noto Sans Arabic if FS Albert fonts are not available
export const FontFamily = {
  // Latin UI (English, numbers) - FS Albert Pro with fallbacks
  latinLight: Platform.select({
    web: "'FS Albert Pro', Inter, system-ui, -apple-system, sans-serif",
    default: "FSAlbertPro-Light",
  }) as string,
  latinRegular: Platform.select({
    web: "'FS Albert Pro', Inter, system-ui, -apple-system, sans-serif",
    default: "FSAlbertPro-Regular",
  }) as string,
  latinMedium: Platform.select({
    web: "'FS Albert Pro', Inter, system-ui, -apple-system, sans-serif",
    default: "FSAlbertPro-Regular",
  }) as string,
  latinSemiBold: Platform.select({
    web: "'FS Albert Pro', Inter, system-ui, -apple-system, sans-serif",
    default: "FSAlbertPro-Bold",
  }) as string,
  latinBold: Platform.select({
    web: "'FS Albert Pro', Inter, system-ui, -apple-system, sans-serif",
    default: "FSAlbertPro-Bold",
  }) as string,
  latinExtraBold: Platform.select({
    web: "'FS Albert Pro', Inter, system-ui, -apple-system, sans-serif",
    default: "FSAlbertPro-ExtraBold",
  }) as string,

  // Arabic UI - FS Albert Arabic Web with fallbacks
  arabicLight: Platform.select({
    web: "'FS Albert Arabic Web', 'Noto Sans Arabic', sans-serif",
    default: "FSAlbertArabicWeb-Light",
  }) as string,
  arabicRegular: Platform.select({
    web: "'FS Albert Arabic Web', 'Noto Sans Arabic', sans-serif",
    default: "FSAlbertArabicWeb-Regular",
  }) as string,
  arabicMedium: Platform.select({
    web: "'FS Albert Arabic Web', 'Noto Sans Arabic', sans-serif",
    default: "FSAlbertArabicWeb-Regular",
  }) as string,
  arabicSemiBold: Platform.select({
    web: "'FS Albert Arabic Web', 'Noto Sans Arabic', sans-serif",
    default: "FSAlbertArabicWeb-Bold",
  }) as string,
  arabicBold: Platform.select({
    web: "'FS Albert Arabic Web', 'Noto Sans Arabic', sans-serif",
    default: "FSAlbertArabicWeb-Bold",
  }) as string,
  arabicExtraBold: Platform.select({
    web: "'FS Albert Arabic Web', 'Noto Sans Arabic', sans-serif",
    default: "FSAlbertArabicWeb-ExtraBold",
  }) as string,

  // Display fonts (for marketing/hero sections)
  latinDisplay: Platform.select({
    web: "'FS Albert Pro', Inter, system-ui, sans-serif",
    default: "FSAlbertPro-ExtraBold",
  }) as string,
  arabicDisplay: Platform.select({
    web: "'FS Albert Arabic Web', 'Noto Sans Arabic', sans-serif",
    default: "FSAlbertArabicWeb-ExtraBold",
  }) as string,
};

// Fallback font family tokens (used when FS Albert fonts are not loaded)
export const FontFamilyFallback = {
  latinRegular: "Inter_400Regular",
  latinMedium: "Inter_500Medium",
  latinSemiBold: "Inter_600SemiBold",
  latinBold: "Inter_700Bold",
  arabicRegular: "NotoSansArabic_400Regular",
  arabicMedium: "NotoSansArabic_500Medium",
  arabicSemiBold: "NotoSansArabic_600SemiBold",
  arabicBold: "NotoSansArabic_700Bold",
};

// Typography tokens with type scale
export const Typography = {
  // Headings (ExtraBold for headlines)
  h1: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "800" as const,
    fontFamily: FontFamily.latinExtraBold,
    letterSpacing: 0.5,
  },
  h2: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800" as const,
    fontFamily: FontFamily.latinExtraBold,
    letterSpacing: 0.4,
  },
  h3: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "700" as const,
    fontFamily: FontFamily.latinBold,
    letterSpacing: 0.3,
  },

  // Body text (Regular weight)
  bodyL: {
    fontSize: 18,
    lineHeight: 27,
    fontWeight: "400" as const,
    fontFamily: FontFamily.latinRegular,
    letterSpacing: 0.3,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
    fontFamily: FontFamily.latinRegular,
    letterSpacing: 0.3,
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "400" as const,
    fontFamily: FontFamily.latinRegular,
    letterSpacing: 0.2,
  },

  // Captions & labels
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400" as const,
    fontFamily: FontFamily.latinRegular,
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
    fontFamily: FontFamily.latinMedium,
    letterSpacing: 0.4,
  },

  // Legacy aliases for backwards compatibility
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "800" as const,
    fontFamily: FontFamily.latinExtraBold,
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700" as const,
    fontFamily: FontFamily.latinBold,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "700" as const,
    fontFamily: FontFamily.latinBold,
    letterSpacing: 0.3,
  },
  bodyLarge: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "400" as const,
    fontFamily: FontFamily.latinRegular,
    letterSpacing: 0.3,
  },
};

// ============================================
// Icon Sizes
// ============================================
export const IconSizes = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  xxl: 32,
};

// ============================================
// Shadows (Platform-specific)
// ============================================
export const Shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: BrandColors.brandGrey,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
    },
    android: {
      elevation: 2,
    },
    default: {
      shadowColor: BrandColors.brandGrey,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
    },
  }),
  md: Platform.select({
    ios: {
      shadowColor: BrandColors.brandGrey,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
    default: {
      shadowColor: BrandColors.brandGrey,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: BrandColors.brandGrey,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    },
    android: {
      elevation: 8,
    },
    default: {
      shadowColor: BrandColors.brandGrey,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    },
  }),
};

// ============================================
// Platform-specific fonts (legacy support)
// ============================================
export const Fonts = Platform.select({
  ios: {
    sans: "FS Albert Pro",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "FS Albert Pro",
    serif: "serif",
    rounded: "FS Albert Pro",
    mono: "monospace",
  },
  web: {
    sans: "'FS Albert Pro', Inter, 'Noto Sans Arabic', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'FS Albert Pro', Inter, 'SF Pro Rounded', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// ============================================
// Theme Type Export
// ============================================
export type ThemeColors = typeof Colors.light;
export type ThemeMode = "light" | "dark";
