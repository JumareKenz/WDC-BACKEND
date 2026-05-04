import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
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
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeId,
  onChange,
  variant = 'default',
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.container,
        variant === 'pills' && styles.pillsContainer,
      ]}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              variant === 'pills' && [
                styles.pill,
                isActive && styles.pillActive,
              ],
              variant === 'underlined' && [
                styles.underlined,
                isActive && styles.underlinedActive,
              ],
            ]}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            {tab.icon}
            <Text
              style={[
                styles.label,
                isActive && styles.labelActive,
                variant === 'pills' && isActive && styles.pillLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.warmWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  pillsContainer: {
    padding: spacing['8'],
    gap: spacing['8'],
    borderBottomWidth: 0,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['8'],
    paddingVertical: spacing['12'],
    paddingHorizontal: spacing['16'],
    minHeight: 44,
  },
  pill: {
    borderRadius: radius.chip,
    backgroundColor: 'transparent',
  },
  pillActive: {
    backgroundColor: colors.forestGreenSoft,
  },
  underlined: {
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  underlinedActive: {
    borderBottomColor: colors.forestGreen,
  },
  label: {
    fontFamily: typography.ui,
    fontSize: 14,
    color: colors.charcoal2,
  },
  labelActive: {
    fontWeight: '600',
    color: colors.forestGreen,
  },
  pillLabelActive: {
    color: colors.forestGreen,
  },
});

export default TabBar;
