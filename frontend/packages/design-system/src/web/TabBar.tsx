import React from 'react';
import { colors, spacing, radius, typography } from '../tokens';

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabBarProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: 'default' | 'pills' | 'underlined';
  className?: string;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeId,
  onChange,
  variant = 'default',
  className = '',
}) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    gap: variant === 'pills' ? spacing['8'] : 0,
    borderBottom: variant === 'underlined' ? `2px solid ${colors.line}` : 'none',
    backgroundColor: variant === 'default' ? colors.warmWhite : 'transparent',
    padding: variant === 'pills' ? spacing['8'] : 0,
    overflowX: 'auto',
    scrollbarWidth: 'none',
  };

  return (
    <nav className={className} style={containerStyle} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;

        const tabStyle: React.CSSProperties = {
          display: 'flex',
          alignItems: 'center',
          gap: spacing['8'],
          padding: `${spacing['12']}px ${spacing['16']}px`,
          cursor: 'pointer',
          border: 'none',
          background: 'none',
          fontFamily: typography.ui,
          fontSize: 14,
          fontWeight: isActive ? 600 : 400,
          color: isActive ? colors.forestGreen : colors.charcoal2,
          borderBottom: variant === 'underlined' && isActive
            ? `2px solid ${colors.forestGreen}`
            : variant === 'underlined'
              ? '2px solid transparent'
              : 'none',
          borderRadius: variant === 'pills' ? radius.chip : 0,
          backgroundColor: variant === 'pills' && isActive
            ? colors.forestGreenSoft
            : 'transparent',
          whiteSpace: 'nowrap',
          minHeight: 44,
          transition: 'all 150ms ease',
        };

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            style={tabStyle}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
};

export default TabBar;
