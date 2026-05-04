import React from 'react';
import { colors, radius, spacing, statusColors } from '../tokens';

interface StatusPillProps {
  kind: 'review' | 'approved' | 'flagged' | 'missing' | 'queued' | 'submitted';
  children?: React.ReactNode;
  className?: string;
}

const kindLabels: Record<string, string> = {
  review: 'In Review',
  approved: 'Approved',
  flagged: 'Flagged',
  missing: 'Missing',
  queued: 'Queued',
  submitted: 'Submitted',
};

export const StatusPill: React.FC<StatusPillProps> = ({
  kind,
  children,
  className = '',
}) => {
  const color = statusColors[kind];
  const bgColor = `${color}18`; // 10% opacity hex

  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: `${spacing['6']}px ${spacing['12']}px`,
    borderRadius: radius.chip,
    backgroundColor: bgColor,
    color: color,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    lineHeight: 1,
    whiteSpace: 'nowrap',
  };

  return (
    <span className={className} style={style}>
      {children || kindLabels[kind]}
    </span>
  );
};

export default StatusPill;
