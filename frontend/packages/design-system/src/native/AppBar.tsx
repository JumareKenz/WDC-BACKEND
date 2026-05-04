import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../tokens';

interface AppBarProps {
  title: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}

export const AppBar: React.FC<AppBarProps> = ({
  title,
  onBack,
  actions,
}) => {
  return (
    <View style={styles.container}>
      {onBack && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityLabel="Back"
          accessibilityRole="button"
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
      )}
      <Text
        style={[
          styles.title,
          { marginLeft: onBack ? spacing['12'] : 0 },
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>
      {actions && <View style={styles.actions}>{actions}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['16'],
    paddingVertical: spacing['12'],
    backgroundColor: colors.forestGreen,
    minHeight: 56,
  },
  backButton: {
    padding: spacing['8'],
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    color: colors.warmWhite,
    fontSize: 16,
  },
  title: {
    fontFamily: typography.display,
    fontSize: 18,
    fontWeight: '600',
    color: colors.warmWhite,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing['8'],
  },
});

export default AppBar;
