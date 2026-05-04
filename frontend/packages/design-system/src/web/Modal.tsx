import React from 'react';
import { colors, spacing, radius } from '../tokens';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

const sizeMap: Record<string, string> = {
  sm: '400px',
  md: '560px',
  lg: '800px',
  full: '100vw',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className = '',
}) => {
  if (!isOpen) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: spacing['16'],
  };

  const contentStyle: React.CSSProperties = {
    backgroundColor: colors.warmWhite,
    borderRadius: radius.cardLarge,
    width: '100%',
    maxWidth: sizeMap[size],
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${spacing['16']}px ${spacing['20']}px`,
    borderBottom: title ? `1px solid ${colors.line}` : 'none',
  };

  const closeStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 20,
    color: colors.charcoal2,
    padding: spacing['8'],
    minWidth: 44,
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div
      className={className}
      style={overlayStyle}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div style={headerStyle}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h2>
            <button style={closeStyle} onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        )}
        <div style={{ padding: `${spacing['20']}px` }}>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
