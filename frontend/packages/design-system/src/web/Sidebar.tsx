import React from 'react';
import { colors, spacing, radius, typography } from '../tokens';

interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  badge?: number;
}

interface SidebarProps {
  items: NavItem[];
  onNavigate: (id: string) => void;
  bottomItems?: NavItem[];
  userChip?: { name: string; role: string };
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  items,
  onNavigate,
  bottomItems,
  userChip,
  className = '',
}) => {
  const sidebarStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: 260,
    height: '100vh',
    backgroundColor: colors.forestGreen,
    color: colors.warmWhite,
    padding: `${spacing['16']}px 0`,
    position: 'fixed',
    left: 0,
    top: 0,
    zIndex: 40,
  };

  const itemStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: spacing['12'],
    padding: `${spacing['12']}px ${spacing['16']}px`,
    margin: `0 ${spacing['8']}px`,
    borderRadius: radius.card,
    cursor: 'pointer',
    fontFamily: typography.ui,
    fontSize: 14,
    fontWeight: isActive ? 600 : 400,
    backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
    color: colors.warmWhite,
    border: 'none',
    textAlign: 'left',
    transition: 'background-color 150ms ease',
    minHeight: 44,
  });

  const badgeStyle: React.CSSProperties = {
    marginLeft: 'auto',
    backgroundColor: colors.amber,
    color: colors.warmWhite,
    fontSize: 11,
    fontWeight: 700,
    padding: `2px ${spacing['8']}px`,
    borderRadius: radius.chip,
    minWidth: 20,
    textAlign: 'center',
  };

  const renderItem = (item: NavItem) => (
    <button
      key={item.id}
      style={itemStyle(!!item.active)}
      onClick={() => onNavigate(item.id)}
      aria-current={item.active ? 'page' : undefined}
    >
      {item.icon}
      <span>{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span style={badgeStyle}>{item.badge}</span>
      )}
    </button>
  );

  return (
    <aside className={className} style={sidebarStyle}>
      <div style={{ padding: `0 ${spacing['16']}px ${spacing['24']}px` }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>WDC</h1>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: spacing['4'] }}>
        {items.map(renderItem)}
      </nav>

      {bottomItems && bottomItems.length > 0 && (
        <div style={{ borderTop: `1px solid rgba(255,255,255,0.2)`, paddingTop: spacing['12'], marginTop: spacing['12'] }}>
          {bottomItems.map(renderItem)}
        </div>
      )}

      {userChip && (
        <div style={{ padding: `${spacing['12']}px ${spacing['16']}px`, borderTop: `1px solid rgba(255,255,255,0.2)`, marginTop: 'auto' }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{userChip.name}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{userChip.role}</div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
