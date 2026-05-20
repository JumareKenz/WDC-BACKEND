import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { Text, View, StyleSheet } from 'react-native';
import { useFormatMessage } from '@wdc/i18n';
import { colors } from '@wdc/design-system';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const iconMap: Record<string, string> = {
    dashboard: '◻',
    submit: '✎',
    reports: '☑',
    messages: '✉',
    alerts: '●',
    wards: '◎',
    settings: '⚙',
  };
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Text style={[styles.icon, focused && styles.iconActive]}>
        {iconMap[name] ?? '•'}
      </Text>
    </View>
  );
}

export default function AppLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const t = useFormatMessage();

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/pin" />;

  const isCoordinator = user?.role === 'coordinator';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary600,
        tabBarInactiveTintColor: colors.neutral400,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.neutral200,
          paddingBottom: 4,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="dashboard" focused={focused} />,
          tabBarLabel: t('nav.dashboard'),
        }}
      />
      {!isCoordinator && (
        <Tabs.Screen
          name="wizard"
          options={{
            tabBarIcon: ({ focused }) => <TabIcon name="submit" focused={focused} />,
            tabBarLabel: t('nav.submit'),
          }}
        />
      )}
      <Tabs.Screen
        name="reports"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={isCoordinator ? 'wards' : 'reports'} focused={focused} />
          ),
          tabBarLabel: isCoordinator ? t('nav.wards') : t('nav.reports'),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="messages" focused={focused} />,
          tabBarLabel: t('nav.messages'),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="alerts" focused={focused} />,
          tabBarLabel: t('nav.alerts'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
          tabBarLabel: t('nav.settings'),
          href: null, // hidden from tabs, accessible via profile
        }}
      />
      <Tabs.Screen
        name="report-detail"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="report-review"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="snap"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="amira"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="send-reminder"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{ href: null }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.primary50,
  },
  icon: {
    fontSize: 16,
    color: colors.neutral400,
  },
  iconActive: {
    color: colors.primary600,
  },
});
