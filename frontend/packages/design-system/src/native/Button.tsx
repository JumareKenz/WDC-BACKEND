import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { colors, radius } from '../tokens';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  children: string;
  onPress?: () => void;
}

const variantStyles: Record<string, ViewStyle> = {
  primary: { backgroundColor: colors.primary600 },
  secondary: { backgroundColor: colors.neutral100 },
  outline: { backgroundColor: colors.transparent, borderWidth: 1, borderColor: colors.primary300 },
  ghost: { backgroundColor: colors.transparent },
  danger: { backgroundColor: colors.danger },
  success: { backgroundColor: colors.primary600 },
};

const textStyles: Record<string, TextStyle> = {
  primary: { color: colors.white },
  secondary: { color: colors.neutral900 },
  outline: { color: colors.primary600 },
  ghost: { color: colors.neutral700 },
  danger: { color: colors.white },
  success: { color: colors.white },
};

const sizeStyles: Record<string, ViewStyle> = {
  sm: { paddingVertical: 6, paddingHorizontal: 12 },
  md: { paddingVertical: 10, paddingHorizontal: 16 },
  lg: { paddingVertical: 12, paddingHorizontal: 24 },
  xl: { paddingVertical: 16, paddingHorizontal: 32 },
};

const textSizeStyles: Record<string, TextStyle> = {
  sm: { fontSize: 14 },
  md: { fontSize: 14 },
  lg: { fontSize: 16 },
  xl: { fontSize: 18 },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  children,
  onPress,
}) => {
  return (
    <TouchableOpacity
      onPress={disabled || loading ? undefined : onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={textStyles[variant]?.color ?? colors.white}
          size="small"
        />
      ) : (
        <Text style={[styles.text, textStyles[variant], textSizeStyles[size]]}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  text: {
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.5,
  },
  fullWidth: {
    width: '100%',
  },
});

export default Button;
