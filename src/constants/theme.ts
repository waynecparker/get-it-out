/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Placeholder brand palette — swap for the real Men-Tality / Mindset Man
// brand colours once they're supplied. The app forces dark mode
// (userInterfaceStyle: "dark" in app.json) since the design direction is a
// single deliberate charcoal/navy look, not a light/dark adaptive one; the
// light tokens are kept for completeness (web, future toggle).
export const Colors = {
  light: {
    text: '#14161A',
    textSecondary: '#5B6270',
    textMuted: '#8B909B',
    background: '#F7F7F5',
    backgroundElevated: '#FFFFFF',
    backgroundElement: '#EFEFEC',
    backgroundSelected: '#E4E4E0',
    border: '#D8D8D3',
    accent: '#B96A2E',
    accentPressed: '#A15C27',
    safety: '#B03D34',
  },
  dark: {
    text: '#F3F4F6',
    textSecondary: '#9AA2B1',
    textMuted: '#6B7280',
    background: '#12151B',
    backgroundElevated: '#1B1F27',
    backgroundElement: '#232833',
    backgroundSelected: '#2C323F',
    border: '#323848',
    accent: '#D98A4A',
    accentPressed: '#C17A3E',
    safety: '#C4544A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
