import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, statusColors } from '../tokens';

interface StatusPillProps {
  kind: 'review' | 'approved' | 'flagged' | 'missing' | 'queued' | 'submitted';
  children?: string;
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
