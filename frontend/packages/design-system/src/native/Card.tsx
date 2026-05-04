import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../tokens';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'outlined' | 'elevated';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
}) => {
  const cardStyle: ViewStyle = {
    backgroundColor: colors.warmWhite,
    borderRadius: radius.card,
    padding: spacing['16'],
    ...style,
  };

  if (variant === 'outlined') {
    cardStyle.borderWidth = 1;
    cardStyle.borderColor = colors.line;
  }

  if (variant === 'elevated') {
    cardStyle.shadowColor = '#000';
    cardStyle.shadowOffset = { width: 0, height: 2 };
    cardStyle.shadowOpacity = 0.08;
    cardStyle.shadowRadius = 8;
    cardStyle.elevation = 2;
  }

  return <View style={[styles.container, cardStyle]}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

export default Card;
