import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, radius, spacing } from '../tokens';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children: string;
  onPress?: () => void;
}

const variantStyles: Record<string, ViewStyle> = {
  primary: {
    backgroundColor: colors.forestGreen,
  },
  secondary: {
    backgroundColor: colors.warmWhite2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.softRedSoft,
    borderWidth: 1,
    borderColor: colors.softRed,
  },
};

const textStyles: Record<string, TextStyle> = {
  primary: { color: colors.warmWhite },
  secondary: { color: colors.charcoal },
  ghost: { color: colors.forestGreen },
  danger: { color: colors.softRed },
};

const sizeStyles: Record<string, ViewStyle> = {
  sm: { paddingVertical: spacing['8'], paddingHorizontal: spacing['12'] },
  md: { paddingVertical: spacing['12'], paddingHorizontal: spacing['16'] },
  lg: { paddingVertical: spacing['16'], paddingHorizontal: spacing['24'] },
};

const textSizeStyles: Record<string, TextStyle> = {
  sm: { fontSize: 12 },
  md: { fontSize: 14 },
  lg: { fontSize: 16 },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  children,
  onPress,
}) => {
  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        variantStyles[variant],
        sizeStyles[size],
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.text, textStyles[variant], textSizeStyles[size]]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.card,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default Button;
