import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useFormatMessage } from '@wdc/i18n';
import { useLocale } from '@wdc/i18n';
import { useAuth } from '../../src/contexts/AuthContext';
import { colors, spacing, radius } from '@wdc/design-system';
import { useState } from 'react';

export default function SettingsScreen() {
  const t = useFormatMessage();
  const { toggleLocale, label } = useLocale();
  const { user, signOut } = useAuth();
  const [notifications, setNotifications] = useState(true);

  const isCoordinator = user?.role === 'coordinator';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.title')}</Text>
      </View>

      {/* Profile card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.fullName ?? 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.fullName ?? '—'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {t(`role.${user?.role ?? 'secretary'}`)}
            </Text>
          </View>
        </View>
      </View>

      {/* Account section */}
      <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('profile.phone')}</Text>
          <Text style={styles.rowValue}>{user?.phone ?? '—'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('profile.lga')}</Text>
          <Text style={styles.rowValue}>{isCoordinator ? 'Chikun' : 'Birnin Gwari'}</Text>
        </View>
        {!isCoordinator && (
          <>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('profile.ward')}</Text>
              <Text style={styles.rowValue}>Birnin Gwari Ward 1</Text>
            </View>
          </>
        )}
      </View>

      {/* Preferences */}
      <Text style={styles.sectionTitle}>{t('settings.preferences')}</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.row} onPress={toggleLocale}>
          <Text style={styles.rowLabel}>{t('settings.language')}</Text>
          <Text style={styles.rowValuePrimary}>{label}</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('settings.notifications')}</Text>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: colors.neutral300, true: colors.primary200 }}
            thumbColor={notifications ? colors.primary600 : colors.neutral400}
          />
        </View>
      </View>

      {/* About */}
      <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('settings.version')}</Text>
          <Text style={styles.rowValue}>1.0.0</Text>
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>{t('auth.signOut')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  content: { padding: spacing['16'], paddingBottom: spacing['32'] },
  header: { paddingTop: spacing['16'], marginBottom: spacing['20'] },
  title: { fontSize: 24, fontWeight: '600', color: colors.neutral900 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing['16'],
    borderWidth: 1,
    borderColor: colors.neutral200,
    marginBottom: spacing['20'],
    gap: spacing['14'],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: colors.primary600 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '600', color: colors.neutral900 },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary50,
    paddingHorizontal: spacing['10'],
    paddingVertical: 2,
    borderRadius: radius.full,
    marginTop: spacing['4'],
  },
  roleBadgeText: { fontSize: 12, color: colors.primary700, fontWeight: '500' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing['20'],
    marginBottom: spacing['8'],
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.neutral200,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing['14'],
  },
  rowLabel: { fontSize: 15, color: colors.neutral700 },
  rowValue: { fontSize: 15, color: colors.neutral500 },
  rowValuePrimary: { fontSize: 15, fontWeight: '600', color: colors.primary600 },
  divider: { height: 1, backgroundColor: colors.neutral100, marginHorizontal: spacing['14'] },
  signOutButton: {
    marginTop: spacing['32'],
    backgroundColor: colors.errorBg,
    borderRadius: radius.lg,
    padding: spacing['14'],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: colors.error },
});
