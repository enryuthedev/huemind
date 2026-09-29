import { useColorScheme, type TextStyle, type ViewStyle } from 'react-native';
import { useStore } from '@/src/store/useStore';

// ---------------------------------------------------------------------------
// Palettes — warm, neutral foundations so the round's game color stays the
// focus. Light values come straight from the design system; dark is a calm,
// warm charcoal counterpart.
// ---------------------------------------------------------------------------

export interface Palette {
  bg: string;
  card: string;
  cardAlt: string;
  inset: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  onPrimary: string;
  secondaryBtn: string;
  onSecondaryBtn: string;
  error: string;
  errorContainer: string;
  onErrorContainer: string;
  overlay: string;
  scheme: 'light' | 'dark';
}

export const lightPalette: Palette = {
  bg: '#FDF8F8',
  card: '#FFFFFF',
  cardAlt: '#F7F3F2',
  inset: '#EBE7E6',
  border: '#E5E2E1',
  borderStrong: '#C4C7C7',
  text: '#171717',
  textMuted: '#6B6B6B',
  textFaint: '#9A9694',
  primary: '#171717',
  onPrimary: '#FDF8F8',
  secondaryBtn: '#EBE7E6',
  onSecondaryBtn: '#171717',
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#93000A',
  overlay: 'rgba(23,23,23,0.20)',
  scheme: 'light',
};

export const darkPalette: Palette = {
  bg: '#141413',
  card: '#1E1D1C',
  cardAlt: '#242322',
  inset: '#2B2A28',
  border: '#332F2E',
  borderStrong: '#4A4644',
  text: '#F4F0EF',
  textMuted: '#A8A3A0',
  textFaint: '#74706E',
  primary: '#F4F0EF',
  onPrimary: '#1C1B1B',
  secondaryBtn: '#2B2A28',
  onSecondaryBtn: '#F4F0EF',
  error: '#FFB4AB',
  errorContainer: '#5C0006',
  onErrorContainer: '#FFDAD6',
  overlay: 'rgba(0,0,0,0.45)',
  scheme: 'dark',
};

// ---------------------------------------------------------------------------
// Spacing (8px scale) & radii
// ---------------------------------------------------------------------------

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  huge: 48,
  containerPadding: 24,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  full: 9999,
} as const;

// ---------------------------------------------------------------------------
// Typography — Manrope (loaded via @expo-google-fonts/manrope in the root
// layout). RN needs an explicit family per weight.
// ---------------------------------------------------------------------------

export const fontFamily = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

export const typography = {
  display: {
    fontFamily: fontFamily.extrabold,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.8,
  },
  headlineLg: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  headlineMd: {
    fontFamily: fontFamily.semibold,
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.2,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  bodyLg: {
    fontFamily: fontFamily.medium,
    fontSize: 18,
    lineHeight: 28,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    lineHeight: 24,
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
  },
  caption: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
  },
} satisfies Record<string, TextStyle>;

// ---------------------------------------------------------------------------
// Elevation
// ---------------------------------------------------------------------------

export function ambientShadow(scheme: 'light' | 'dark'): ViewStyle {
  if (scheme === 'dark') {
    return {
      shadowColor: '#000000',
      shadowOpacity: 0.35,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    };
  }
  return {
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  };
}

export interface Theme {
  colors: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  font: typeof fontFamily;
  shadow: ViewStyle;
}

export function makeTheme(scheme: 'light' | 'dark'): Theme {
  return {
    colors: scheme === 'dark' ? darkPalette : lightPalette,
    spacing,
    radius,
    typography,
    font: fontFamily,
    shadow: ambientShadow(scheme),
  };
}

/** Resolve the active scheme from the user's themeMode + the OS scheme. */
export function useThemeScheme(): 'light' | 'dark' {
  const system = useColorScheme();
  const mode = useStore((s) => s.settings.themeMode);
  if (mode === 'light') return 'light';
  if (mode === 'dark') return 'dark';
  return system === 'dark' ? 'dark' : 'light';
}

export function useTheme(): Theme {
  return makeTheme(useThemeScheme());
}
