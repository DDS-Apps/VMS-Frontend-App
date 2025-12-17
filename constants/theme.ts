import { Platform } from "react-native";

// ============================================
// DALLAH DIGITAL Brand Theme
// ============================================

// Brand Core Colors
export const BrandColors = {
  brandBlue: "#307BF2", // Primary CTAs, buttons, links, highlights
  brandTeal: "#12E1D5", // Secondary accent, highlights, badges, progress
  brandNavy: "#0e2342", // Primary dark background, sidebar, headers
  brandNavyDark: "#041A3A", // Darker navy for text on light surfaces
  softTeal: "#E4FCF9", // Subtle accent backgrounds for cards/info
};

// Neutral Colors
export const NeutralColors = {
  grey900: "#526178", // Secondary text, muted icons
  grey300: "#C7CCD3", // Borders, dividers, input outlines
  grey200: "#DFE2E6", // Card borders, subtle surfaces, hover
  grey50: "#F5F7FA", // Light backgrounds
  white: "#FFFFFF", // Surfaces, cards, modals, inputs
};

// Status Colors
export const StatusColors = {
  success: "#1BBE7A",
  warning: "#FFA000",
  error: "#E53935",
  info: "#307BF2", // Uses brandBlue
};

// Gradient (for rare hero/CTA use)
export const GradientColors = {
  start: "#12E1D5", // brandTeal
  end: "#307BF2", // brandBlue
};

const tintColorLight = BrandColors.brandBlue;
const tintColorDark = BrandColors.brandTeal;

export const Colors = {
  // Brand tokens (accessible directly)
  brand: BrandColors,
  neutral: NeutralColors,
  status: StatusColors,
  gradient: GradientColors,

  light: {
    // Brand colors - Blue as primary for CTAs/buttons
    primary: BrandColors.brandBlue,
    secondary: BrandColors.brandTeal,
    accent: BrandColors.softTeal,

    // Backgrounds - Light mode uses white
    background: NeutralColors.white,
    surface: NeutralColors.white,
    surfaceSecondary: NeutralColors.grey50,

    // Text - Navy for visibility on white
    text: BrandColors.brandNavyDark,
    textSecondary: NeutralColors.grey900,

    // Borders
    border: NeutralColors.grey200,
    borderLight: NeutralColors.grey300,

    // Status
    success: StatusColors.success,
    warning: StatusColors.warning,
    error: StatusColors.error,
    info: BrandColors.brandBlue,

    // Buttons - White text on blue buttons for proper contrast
    buttonText: NeutralColors.white,
    buttonSecondaryText: BrandColors.brandBlue,
    buttonTextOnError: NeutralColors.white,

    // Overlay
    overlay: "#000000",

    // Navigation
    tabIconDefault: NeutralColors.grey900,
    tabIconSelected: BrandColors.brandBlue,
    link: BrandColors.brandBlue,
    
    // Card icons - Navy dark for refined look on light surfaces
    cardIcon: BrandColors.brandNavyDark,

    // Additional backgrounds
    backgroundRoot: NeutralColors.white,
    backgroundDefault: NeutralColors.white,
    backgroundSecondary: NeutralColors.grey50,
    backgroundTertiary: NeutralColors.grey200,

    // Sidebar (light background with navy text in light mode)
    sidebarBg: NeutralColors.grey50,
    sidebarActive: NeutralColors.white,
    sidebarText: BrandColors.brandNavyDark,
    sidebarTextMuted: NeutralColors.grey900,
    sidebarIcon: BrandColors.brandNavyDark,
    sidebarIconMuted: NeutralColors.grey900,

    // Charts
    chartBlue: BrandColors.brandBlue,
    chartTeal: BrandColors.brandTeal,
    chartPurple: "#A78BFA",
    chartPink: "#F472B6",
    chartYellow: "#FBBF24",

    // Soft backgrounds for cards/badges
    softTeal: BrandColors.softTeal,
    softBlue: "#EBF4FF",
    softSuccess: "#E6F9F0",
    softWarning: "#FFF7E6",
    softError: "#FEECEB",
  },
  dark: {
    // Brand colors (slightly adjusted for dark mode)
    primary: BrandColors.brandTeal,
    secondary: BrandColors.brandBlue,
    accent: "#1A3A5A",

    // Backgrounds - Dark mode uses navy #0e2342
    background: BrandColors.brandNavy,
    surface: "#1a3a5a",
    surfaceSecondary: "#254a6a",

    // Text - White for visibility on dark
    text: NeutralColors.white,
    textSecondary: "#94A3B8",

    // Borders
    border: "#2A4a6a",
    borderLight: "#3A5a7a",

    // Status
    success: "#34D399",
    warning: "#FBBF24",
    error: "#F87171",
    info: BrandColors.brandTeal,

    // Buttons - Navy text on teal buttons for better contrast
    buttonText: BrandColors.brandNavyDark,
    buttonSecondaryText: BrandColors.brandTeal,
    buttonTextOnError: NeutralColors.white,

    // Overlay
    overlay: "#000000",

    // Navigation
    tabIconDefault: "#94A3B8",
    tabIconSelected: BrandColors.brandTeal,
    link: BrandColors.brandTeal,
    
    // Card icons - Teal for visibility on dark surfaces
    cardIcon: BrandColors.brandTeal,

    // Additional backgrounds
    backgroundRoot: "#050D1A",
    backgroundDefault: BrandColors.brandNavy,
    backgroundSecondary: "#1a3a5a",
    backgroundTertiary: "#254a6a",

    // Sidebar (same as background for consistent dark mode)
    sidebarBg: BrandColors.brandNavy,
    sidebarActive: "#1a3a5a",
    sidebarText: NeutralColors.white,
    sidebarTextMuted: "rgba(255, 255, 255, 0.7)",
    sidebarIcon: NeutralColors.white,
    sidebarIconMuted: "rgba(255, 255, 255, 0.7)",

    // Charts
    chartBlue: BrandColors.brandBlue,
    chartTeal: BrandColors.brandTeal,
    chartPurple: "#A78BFA",
    chartPink: "#F472B6",
    chartYellow: "#FBBF24",

    // Soft backgrounds for cards/badges (dark variants)
    softTeal: "#0A2A2A",
    softBlue: "#0A1A3A",
    softSuccess: "#0A2A1A",
    softWarning: "#2A2A0A",
    softError: "#2A0A0A",
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
  // Brand spacing scale: [4, 8, 12, 16, 24, 32, 48]
};

// ============================================
// Border Radius
// ============================================
export const BorderRadius = {
  xs: 4,
  sm: 8, // radiusSmall
  md: 12,
  lg: 16, // radiusCard
  xl: 20,
  xxl: 24,
  full: 9999, // radiusPill
  // Aliases for brand guide
  card: 16,
  pill: 9999,
  small: 8,
};

// ============================================
// Typography System
// ============================================

// Font families for locale-aware rendering
export const FontFamily = {
  // Latin UI (English, numbers)
  latinRegular: "Inter_400Regular",
  latinMedium: "Inter_500Medium",
  latinSemiBold: "Inter_600SemiBold",
  latinBold: "Inter_700Bold",

  // Arabic UI
  arabicRegular: "NotoSansArabic_400Regular",
  arabicMedium: "NotoSansArabic_500Medium",
  arabicSemiBold: "NotoSansArabic_600SemiBold",
  arabicBold: "NotoSansArabic_700Bold",

  // Display fonts (optional, for marketing/hero)
  latinDisplay: "Poppins_600SemiBold",
  arabicDisplay: "Tajawal_700Bold",
};

// Typography tokens with type scale
export const Typography = {
  // Headings
  h1: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "600" as const,
    fontFamily: FontFamily.latinSemiBold,
    letterSpacing: 0.5,
  },
  h2: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "600" as const,
    fontFamily: FontFamily.latinSemiBold,
    letterSpacing: 0.4,
  },
  h3: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "600" as const,
    fontFamily: FontFamily.latinSemiBold,
    letterSpacing: 0.3,
  },

  // Body text
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
    fontWeight: "700" as const,
    fontFamily: FontFamily.latinBold,
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 24,
    fontWeight: "600" as const,
    fontFamily: FontFamily.latinSemiBold,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "600" as const,
    fontFamily: FontFamily.latinSemiBold,
    letterSpacing: 0.3,
  },
  bodyLarge: {
    fontSize: 18,
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
      shadowColor: BrandColors.brandNavyDark,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
    },
    android: {
      elevation: 2,
    },
    default: {
      shadowColor: BrandColors.brandNavyDark,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
    },
  }),
  md: Platform.select({
    ios: {
      shadowColor: BrandColors.brandNavyDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
    default: {
      shadowColor: BrandColors.brandNavyDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: BrandColors.brandNavyDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    },
    android: {
      elevation: 8,
    },
    default: {
      shadowColor: BrandColors.brandNavyDark,
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
    sans: "Inter",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "Inter",
    serif: "serif",
    rounded: "Inter",
    mono: "monospace",
  },
  web: {
    sans: "Inter, 'Noto Sans Arabic', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "Inter, 'SF Pro Rounded', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// ============================================
// Theme Type Export
// ============================================
export type ThemeColors = typeof Colors.light;
export type ThemeMode = "light" | "dark";
