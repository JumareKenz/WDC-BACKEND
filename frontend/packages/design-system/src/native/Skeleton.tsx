import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius } from '../tokens';

interface SkeletonProps {
  width?: number;
  height?: number;
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%' as unknown as number,
  height = 16,
  variant = 'text',
}) => {
  const borderRadius = variant === 'circular' ? height / 2 : variant === 'text' ? 4 : radius.card;

  return (
    <View
      style={[
        styles.container,
        {
          width: typeof width === 'number' ? width : '100%',
          height,
          borderRadius,
        },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.line,
    opacity: 0.7,
  },
});

export default Skeleton;
