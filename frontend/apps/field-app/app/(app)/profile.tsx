import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFormatMessage } from '@wdc/i18n';
import { useAuth } from '../../src/contexts/AuthContext';
import { colors, spacing, radius } from '@wdc/design-system';
import { mockWardsForCoordinator } from '../../src/lib/mock-coordinator';

export default function ProfileScreen() {
  const t = useFormatMessage();
  const { user, signOut } = useAuth();
  const isCoordinator = user?.role === 'coordinator';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.title')}</Text>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.fullName ?? 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.profileName}>{user?.fullName ?? '—'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>
            {t(`role.${user?.role ?? 'secretary'}`)}
          </Text>
        </View>
      </View>

      {/* Details */}
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

      {/* Coordinator wards */}
      {isCoordinator && (
        <>
          <Text style={styles.sectionTitle}>{t('coordinator.myWards')}</Text>
          {mockWardsForCoordinator.map((ward) => (
            <View key={ward.id} style={styles.wardCard}>
              <Text style={styles.wardName}>{ward.name}</Text>
              <Text style={styles.wardCount}>
                {t('coordinator.wardReports', { count: String(ward.reportCount) })}
              </Text>
            </View>
          ))}
        </>
      )}

      {/* Actions */}
      <TouchableOpacity style={styles.actionRow} onPress={() => {}}>
        <Text style={styles.actionText}>{t('profile.editProfile')}</Text>
        <Text style={styles.actionArrow}>›</Text>
      </TouchableOpacity>

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
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing['24'],
    borderWidth: 1,
    borderColor: colors.neutral200,
    marginBottom: spacing['20'],
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['12'],
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: colors.primary600 },
  profileName: { fontSize: 20, fontWeight: '600', color: colors.neutral900, marginBottom: spacing['6'] },
  roleBadge: {
    backgroundColor: colors.primary50,
    paddingHorizontal: spacing['12'],
    paddingVertical: spacing['4'],
    borderRadius: radius.full,
  },
  roleBadgeText: { fontSize: 13, color: colors.primary700, fontWeight: '500' },
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
  rowLabel: { fontSize: 14, color: colors.neutral500 },
  rowValue: { fontSize: 14, fontWeight: '500', color: colors.neutral900 },
  divider: { height: 1, backgroundColor: colors.neutral100, marginHorizontal: spacing['14'] },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing['20'],
    marginBottom: spacing['10'],
  },
  wardCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing['12'],
    marginBottom: spacing['8'],
    borderWidth: 1,
    borderColor: colors.neutral200,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wardName: { fontSize: 14, fontWeight: '500', color: colors.neutral900 },
  wardCount: { fontSize: 13, color: colors.neutral500 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing['14'],
    borderWidth: 1,
    borderColor: colors.neutral200,
    marginTop: spacing['16'],
  },
  actionText: { fontSize: 15, color: colors.neutral900 },
  actionArrow: { fontSize: 18, color: colors.neutral400 },
  signOutButton: {
    marginTop: spacing['24'],
    backgroundColor: colors.errorBg,
    borderRadius: radius.lg,
    padding: spacing['14'],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: colors.error },
});
