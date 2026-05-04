import React from 'react';
import { colors, radius } from '../tokens';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  variant = 'text',
  className = '',
}) => {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    backgroundColor: colors.line,
    borderRadius: variant === 'circular' ? '50%' : variant === 'text' ? 4 : radius.card,
    animation: 'pulse 1.5s ease-in-out infinite',
  };

  return (
    <span
      className={className}
      style={style}
      aria-hidden="true"
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </span>
  );
};

export default Skeleton;
