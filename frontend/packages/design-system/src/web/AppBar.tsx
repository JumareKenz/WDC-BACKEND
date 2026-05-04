import React from 'react';
import { colors, spacing, typography } from '../tokens';

interface AppBarProps {
  title: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export const AppBar: React.FC<AppBarProps> = ({
  title,
  onBack,
  actions,
  className = '',
}) => {
  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${spacing['12']}px ${spacing['16']}px`,
    backgroundColor: colors.forestGreen,
    color: colors.warmWhite,
    minHeight: 56,
    position: 'sticky',
    top: 0,
    zIndex: 50,
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: typography.display,
    fontSize: 18,
    fontWeight: 600,
    flex: 1,
    textAlign: onBack ? 'left' : 'center',
    marginLeft: onBack ? spacing['12'] : 0,
  };

  const backButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: colors.warmWhite,
    cursor: 'pointer',
    padding: spacing['8'],
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
  };

  return (
    <header className={className} style={style}>
      {onBack && (
        <button
          style={backButtonStyle}
          onClick={onBack}
          aria-label="Back"
        >
          ←
        </button>
      )}
      <h1 style={titleStyle}>{title}</h1>
      {actions && (
        <div style={{ display: 'flex', gap: spacing['8'] }}>
          {actions}
        </div>
      )}
    </header>
  );
};

export default AppBar;
