import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '../tokens';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onDismiss?: () => void;
  action?: { label: string; onPress: () => void };
}

const variantStyles: Record<ToastVariant, { bg: string; border: string; icon: string }> = {
  success: { bg: colors.forestGreenSoft, border: colors.forestGreen, icon: '✓' },
  error: { bg: colors.softRedSoft, border: colors.softRed, icon: '!' },
  warning: { bg: colors.amberSoft, border: colors.amber, icon: '⚠' },
  info: { bg: colors.aubergineSoft, border: colors.aubergine, icon: 'i' },
};

export const Toast: React.FC<ToastProps> = ({
  message,
  variant = 'info',
  onDismiss,
  action,
}) => {
  const style = variantStyles[variant];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: style.bg, borderColor: style.border },
      ]}
      accessibilityRole="alert"
    >
      <View style={[styles.icon, { backgroundColor: style.border }]}>
        <Text style={styles.iconText}>{style.icon}</Text>
      </View>
      <Text style={styles.message}>{message}</Text>
      {action && (
        <TouchableOpacity onPress={action.onPress} style={styles.actionButton}>
          <Text style={[styles.actionText, { color: style.border }]}>
            {action.label}
          </Text>
        </TouchableOpacity>
      )}
      {onDismiss && (
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.dismissButton}
          accessibilityLabel="Dismiss"
        >
          <Text style={styles.dismissText}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['12'],
    paddingVertical: spacing['12'],
    paddingHorizontal: spacing['16'],
    borderWidth: 1,
    borderRadius: radius.card,
    maxWidth: 400,
    margin: spacing['16'],
  },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconText: {
    color: colors.warmWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  message: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: colors.charcoal,
  },
  actionButton: {
    paddingVertical: spacing['4'],
    paddingHorizontal: spacing['8'],
  },
  actionText: {
    fontWeight: '600',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  dismissButton: {
    padding: spacing['4'],
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 18,
    color: colors.charcoal2,
  },
});

export default Toast;
