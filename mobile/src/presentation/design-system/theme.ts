/**
 * ANVESA Design System — theme tokens.
 *
 * Visual language: modern minimalism + soft neo-brutalism.
 * Purple primary, green accent, warm-white background, Inter typography,
 * large rounded corners, soft elevation. Light and dark themes.
 *
 * Design references: Requirement 32 (design system & accessibility).
 */

export const palette = {
  // Primary — purple
  purple50: '#F3EEFF',
  purple100: '#E6DBFF',
  purple200: '#C9B4FF',
  purple500: '#7C3AED',
  purple600: '#6D28D9',
  purple700: '#5B21B6',

  // Accent — green
  green50: '#E9FBF0',
  green100: '#CFF7DE',
  green500: '#16A34A',
  green600: '#15803D',

  // Feedback
  orange500: '#F59E0B',
  red500: '#EF4444',

  // Neutrals
  black: '#0B0B0F',
  ink: '#16151A',
  gray700: '#3A3A44',
  gray500: '#6B6B78',
  gray400: '#9A9AA6',
  gray300: '#CFCFD8',
  gray200: '#E7E7EE',
  gray100: '#F1F0F6',
  warmWhite: '#FBFAFF',
  white: '#FFFFFF',
} as const;

export interface Theme {
  mode: 'light' | 'dark';
  colors: {
    background: string;
    surface: string;
    surfaceAlt: string;
    primary: string;
    primarySoft: string;
    onPrimary: string;
    accent: string;
    accentSoft: string;
    text: string;
    textMuted: string;
    border: string;
    borderStrong: string;
    success: string;
    warning: string;
    error: string;
  };
  shadow: {
    soft: object;
    lifted: object;
  };
}

/**
 * Neo-Brutalist palette: cream paper background, ink borders everywhere, vivid
 * blocks, and hard offset shadows (no blur). Purple stays the brand primary.
 */
export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: '#FDFBF3',
    surface: palette.white,
    surfaceAlt: '#F3ECD9',
    primary: palette.purple500,
    primarySoft: palette.purple50,
    onPrimary: palette.white,
    accent: '#16A34A',
    accentSoft: '#DFF7E6',
    text: '#111111',
    textMuted: '#5A5A64',
    border: '#111111',
    borderStrong: '#111111',
    success: '#16A34A',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  shadow: {
    // Hard, offset, un-blurred shadows are the core of the neo-brutalist look.
    soft: {
      shadowColor: '#111111',
      shadowOpacity: 1,
      shadowRadius: 0,
      shadowOffset: { width: 4, height: 4 },
      elevation: 4,
    },
    lifted: {
      shadowColor: '#111111',
      shadowOpacity: 1,
      shadowRadius: 0,
      shadowOffset: { width: 6, height: 6 },
      elevation: 8,
    },
  },
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: palette.black,
    surface: '#141319',
    surfaceAlt: '#1D1C24',
    primary: palette.purple200,
    primarySoft: '#241C3B',
    onPrimary: palette.black,
    accent: '#4ADE80',
    accentSoft: '#132A1C',
    text: '#F4F3F8',
    textMuted: palette.gray400,
    border: '#2A2933',
    borderStrong: '#F4F3F8',
    success: '#4ADE80',
    warning: '#FBBF24',
    error: '#F87171',
  },
  shadow: {
    soft: {
      shadowColor: '#000000',
      shadowOpacity: 0.4,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    lifted: {
      shadowColor: '#000000',
      shadowOpacity: 0.5,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 12 },
      elevation: 6,
    },
  },
};

/** 8pt spacing grid. */
export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

/** Chunky-but-boxy corners for the neo-brutalist look. */
export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 16,
  pill: 999,
} as const;

/** Standard neo-brutalist border weight. */
export const BORDER_WIDTH = 3;

/** Typography hierarchy: heavy, high-contrast weights. */
export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '900' as const, letterSpacing: -0.8 },
  heading: { fontSize: 26, lineHeight: 32, fontWeight: '900' as const, letterSpacing: -0.5 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '800' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '700' as const },
} as const;

/** Minimum accessible touch target (Requirement 32.6). */
export const MIN_TOUCH_TARGET = 44;
