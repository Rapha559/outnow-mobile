import { processColor, StyleSheet, type ColorSchemeName, type ColorValue } from 'react-native';

let currentScheme: ColorSchemeName = 'light';
let installed = false;

const backgroundDarkMap: Record<string, string> = {
  '#fff': '#0b0b10',
  '#ffffff': '#0b0b10',
  'white': '#0b0b10',
  '#fafafa': '#111118',
  '#f9fafb': '#111118',
  '#f8fafc': '#111118',
  '#f3f4f6': '#17171f',
  '#f5f3ff': '#1e192a',
  '#f3efff': '#1e192a',
  '#faf5ff': '#1a1523',
  '#faf8ff': '#1a1523',
  '#ede9fe': '#2a1f3d',
  '#ecfdf5': '#10271c',
  '#f0fdf4': '#10271c',
  '#fff7ed': '#2b1d12',
  '#fef2f2': '#2b1518',
  '#fefce8': '#2a2613',
};

const textDarkMap: Record<string, string> = {
  '#111827': '#f9fafb',
  '#1f2937': '#f3f4f6',
  '#374151': '#e5e7eb',
  '#4b5563': '#d1d5db',
  '#6b7280': '#aeb4c2',
  '#9ca3af': '#818898',
  '#dc2626': '#f87171',
  '#b91c1c': '#f87171',
  '#166534': '#4ade80',
  '#15803d': '#4ade80',
  '#c2410c': '#fb923c',
  '#92400e': '#fbbf24',
};

const borderDarkMap: Record<string, string> = {
  '#d1d5db': '#34343f',
  '#e5e7eb': '#282832',
  '#e9d5ff': '#3a2c4e',
  '#ddd6fe': '#3a3048',
  '#fecaca': '#5a2d34',
  '#bbf7d0': '#21472f',
  '#fed7aa': '#563821',
  '#fde68a': '#51451d',
};

function processor(map: Record<string, string>) {
  return (value: unknown) => {
    let next = value;
    if (currentScheme === 'dark' && typeof value === 'string') {
      next = map[value.toLowerCase()] ?? value;
    }
    return processColor(next as ColorValue);
  };
}

const processBackground = processor(backgroundDarkMap);
const processText = processor(textDarkMap);
const processBorder = processor(borderDarkMap);
const processUnchangedColor = processor({});

export function installSystemThemePreprocessors() {
  if (installed) return;
  installed = true;

  StyleSheet.setStyleAttributePreprocessor('backgroundColor', processBackground);
  StyleSheet.setStyleAttributePreprocessor('color', processText);
  StyleSheet.setStyleAttributePreprocessor('textDecorationColor', processText);

  for (const property of [
    'borderColor',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
  ]) {
    StyleSheet.setStyleAttributePreprocessor(property, processBorder);
  }

  StyleSheet.setStyleAttributePreprocessor('shadowColor', processUnchangedColor);
}

export function setSystemThemeScheme(scheme: ColorSchemeName | null) {
  currentScheme = scheme === 'dark' ? 'dark' : 'light';
}

export function systemThemeColors(scheme: ColorSchemeName | null) {
  const dark = scheme === 'dark';
  return {
    dark,
    background: dark ? '#0b0b10' : '#ffffff',
    surface: dark ? '#111118' : '#ffffff',
    elevated: dark ? '#17171f' : '#f9fafb',
    text: dark ? '#f9fafb' : '#111827',
    muted: dark ? '#aeb4c2' : '#6b7280',
    border: dark ? '#282832' : '#e5e7eb',
    purple: '#7c3aed',
  };
}
