import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { radius, spacing, statusColors } from '../tokens';

interface StatusPillProps {
  kind: 'in_review' | 'reviewed' | 'approved' | 'flagged' | 'missing' | 'queued' | 'submitted' | 'draft' | 'returned' | 'declined' | 'sealed';
  children?: string;
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
}) => {
  const color = statusColors[kind];

  return (
    <View style={[styles.container, { backgroundColor: color + '18' }]}>
      <Text style={[styles.text, { color }]}>
        {children || kindLabels[kind]}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing['6'],
    paddingHorizontal: spacing['12'],
    borderRadius: radius.chip,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
});

export default StatusPill;
