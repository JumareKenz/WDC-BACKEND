import React from 'react';
import { colors, radius, spacing } from '../tokens';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    backgroundColor: colors.forestGreen,
    color: colors.warmWhite,
    border: 'none',
  },
  secondary: {
    backgroundColor: colors.warmWhite2,
    color: colors.charcoal,
    border: `1px solid ${colors.line}`,
  },
  ghost: {
    backgroundColor: 'transparent',
    color: colors.forestGreen,
    border: 'none',
  },
  danger: {
    backgroundColor: colors.softRedSoft,
    color: colors.softRed,
    border: `1px solid ${colors.softRed}`,
  },
};

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { padding: `${spacing['8']}px ${spacing['12']}px`, fontSize: 12 },
  md: { padding: `${spacing['12']}px ${spacing['16']}px`, fontSize: 14 },
  lg: { padding: `${spacing['16']}px ${spacing['24']}px`, fontSize: 16 },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  children,
  onClick,
  className = '',
}) => {
  const baseStyle: React.CSSProperties = {
    borderRadius: radius.card,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    fontFamily: "'Inter', sans-serif",
    fontWeight: 500,
    transition: 'opacity 150ms ease, background-color 150ms ease',
    minHeight: 44, // tap target
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...variantStyles[variant],
    ...sizeStyles[size],
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!disabled) {
      (e.currentTarget as HTMLElement).style.opacity = '0.9';
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!disabled) {
      (e.currentTarget as HTMLElement).style.opacity = '1';
    }
  };

  return (
    <button
      className={className}
      style={baseStyle}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {children}
    </button>
  );
};

export default Button;
