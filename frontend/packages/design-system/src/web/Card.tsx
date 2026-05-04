import React from 'react';
import { colors, radius, spacing } from '../tokens';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'default' | 'outlined' | 'elevated';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  style,
  variant = 'default',
}) => {
  const baseStyle: React.CSSProperties = {
    backgroundColor: colors.warmWhite,
    borderRadius: radius.card,
    padding: spacing['16'],
    ...style,
  };

  if (variant === 'outlined') {
    baseStyle.border = `1px solid ${colors.line}`;
  }

  if (variant === 'elevated') {
    baseStyle.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
  }

  return (
    <div className={className} style={baseStyle}>
      {children}
    </div>
  );
};

export default Card;
