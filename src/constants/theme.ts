import '@/global.css';

import { Platform } from 'react-native';

const whiteTheme = {
  text: '#111827',
  background: '#ffffff',
  backgroundElement: '#f9fafb',
  backgroundSelected: '#f3efff',
  textSecondary: '#6b7280',
} as const;

// OutNow mobile is intentionally light-only. Keep both keys mapped to the
// same palette so any older shared component that asks for `dark` still
// renders the white theme instead of reintroducing dark UI.
export const Colors = {
  light: whiteTheme,
  dark: whiteTheme,
} as const;

export type ThemeColor = keyof typeof whiteTheme;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
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
