import { StyleSheet } from 'react-native';
import { colors, spacing, radius, typography, typeScale, shadows } from '../tokens';

export const nativeTheme = {
  colors,
  spacing,
  radius,
  typography,
  typeScale,
  shadows,
};

export type NativeTheme = typeof nativeTheme;

export function createStyles<T>(
  styleFn: (theme: NativeTheme) => StyleSheet.NamedStyles<T>
) {
  return (customTheme?: Partial<NativeTheme>) => {
    const theme = { ...nativeTheme, ...customTheme };
    return StyleSheet.create(styleFn(theme));
  };
}

export const nativeSpacing = spacing;
export const nativeRadius = radius;
