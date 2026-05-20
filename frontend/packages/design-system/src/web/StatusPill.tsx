import React from 'react';
import { radius, spacing, statusColors } from '../tokens';

interface StatusPillProps {
  kind: 'in_review' | 'reviewed' | 'approved' | 'flagged' | 'missing' | 'queued' | 'submitted' | 'draft' | 'returned' | 'declined' | 'sealed';
  children?: React.ReactNode;
  className?: string;
}

const kindLabels: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  in_review: 'In Review',
  reviewed: 'Reviewed',
  approved: 'Approved',
  flagged: 'Flagged',
  returned: 'Returned',
  declined: 'Declined',
  sealed: 'Sealed',
  missing: 'Missing',
  queued: 'Queued',
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
