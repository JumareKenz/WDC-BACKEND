import { StyleSheet } from 'react-native';
import { colors, spacing, radius, typography, typeScale } from '../tokens';

export const nativeTheme = {
  colors,
  spacing,
  radius,
  typography,
  typeScale,
};

export type NativeTheme = typeof nativeTheme;

// Create RN styles from tokens
export function createStyles<T>(
  styleFn: (theme: NativeTheme) => StyleSheet.NamedStyles<T>
) {
  return (customTheme?: Partial<NativeTheme>) => {
    const theme = { ...nativeTheme, ...customTheme };
    return StyleSheet.create(styleFn(theme));
  };
}

// Common style utilities
export const nativeSpacing = {
  '4': 4,
  '6': 6,
  '8': 8,
  '10': 10,
  '12': 12,
  '14': 14,
  '16': 16,
  '20': 20,
  '24': 24,
  '32': 32,
} as const;

export const nativeRadius = {
  card: 12,
  cardLarge: 16,
  chip: 100,
} as const;
