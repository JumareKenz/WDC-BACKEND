import React from 'react';
import { colors, spacing, radius, typography } from '../tokens';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onDismiss?: () => void;
  action?: { label: string; onClick: () => void };
  className?: string;
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
  className = '',
}) => {
  const style = variantStyles[variant];

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing['12'],
    padding: `${spacing['12']}px ${spacing['16']}px`,
    backgroundColor: style.bg,
    border: `1px solid ${style.border}`,
    borderRadius: radius.card,
    fontFamily: typography.ui,
    fontSize: 14,
    color: colors.charcoal,
    maxWidth: 400,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  };

  const iconStyle: React.CSSProperties = {
    width: 24,
    height: 24,
    borderRadius: '50%',
    backgroundColor: style.border,
    color: colors.warmWhite,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  };

  return (
    <div className={className} style={containerStyle} role="alert">
      <span style={iconStyle}>{style.icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
      {action && (
        <button
          style={{
            background: 'none',
            border: 'none',
            color: style.border,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 13,
            textDecoration: 'underline',
            padding: 0,
            minHeight: 44,
          }}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
      {onDismiss && (
        <button
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 18,
            color: colors.charcoal2,
            padding: spacing['4'],
            minWidth: 36,
            minHeight: 36,
          }}
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default Toast;
