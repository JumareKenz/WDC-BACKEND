import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFormatMessage } from '@wdc/i18n';
import { useAuth } from '../../src/contexts/AuthContext';
import { colors, spacing, radius } from '@wdc/design-system';
import { mockReports } from '../../src/lib/mock-reports';
import {
  mockCoordinatorReports,
  mockWardsForCoordinator,
} from '../../src/lib/mock-coordinator';
import { getPendingCount } from '../../src/hooks/useOfflineQueue';

function IconCard({
  icon,
  value,
  subtitle,
  color,
}: {
  icon: string;
  value: string | number;
  subtitle: string;
  color: string;
}) {
  return (
    <View style={styles.iconCard}>
      <View style={[styles.iconCardIcon, { backgroundColor: color + '20' }]}>
        <Text style={[styles.iconCardIconText, { color }]}>{icon}</Text>
      </View>
      <Text style={styles.iconCardValue}>{value}</Text>
      <Text style={styles.iconCardSubtitle}>{subtitle}</Text>
    </View>
  );
}

function StatusAlert({ submitted, month }: { submitted: boolean; month: string }) {
  const t = useFormatMessage();
  return (
    <View
      style={[
        styles.statusAlert,
        { backgroundColor: submitted ? colors.successBg : colors.warningBg },
      ]}
    >
      <Text style={styles.statusAlertIcon}>{submitted ? '✓' : '⏳'}</Text>
      <View style={styles.statusAlertContent}>
        <Text
          style={[
            styles.statusAlertTitle,
            { color: submitted ? colors.successText : colors.warningText },
          ]}
        >
          {submitted
            ? t('dashboard.submittedForMonth', { month })
            : t('dashboard.pendingForMonth', { month })}
        </Text>
      </View>
    </View>
  );
}

function CoordinatorOverview() {
  const router = useRouter();
  const t = useFormatMessage();
  const { user } = useAuth();
  const reports = mockCoordinatorReports;
  const wards = mockWardsForCoordinator;

  const pendingCount = reports.filter(
    (r) => r.state === 'submitted' || r.state === 'in_review'
  ).length;
  const approvedCount = reports.filter((r) => r.state === 'approved').length;
  const missingCount = wards.length - reports.filter((r) => r.state !== 'draft').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {t('auth.welcome')}, {user?.fullName ?? 'Coordinator'}
        </Text>
        <Text style={styles.subtitle}>{t('coordinator.overview')}</Text>
      </View>

      <View style={styles.statsGrid}>
        <IconCard
          icon="◎"
          value={wards.length}
          subtitle={t('coordinator.totalWards')}
          color={colors.primary600}
        />
        <IconCard
          icon="✓"
          value={approvedCount}
          subtitle={t('dashboard.stats.approved')}
          color={colors.success}
        />
        <IconCard
          icon="⏳"
          value={pendingCount}
          subtitle={t('coordinator.pendingReview')}
          color={colors.warning}
        />
        <IconCard
          icon="!"
          value={missingCount}
          subtitle={t('coordinator.missing')}
          color={colors.error}
        />
      </View>

      <Text style={styles.sectionTitle}>{t('coordinator.wards')}</Text>
      {wards.map((ward) => {
        const wardReport = reports.find((r) => r.wardName === ward.name);
        const hasSubmitted = !!wardReport && wardReport.state !== 'draft';
        return (
          <TouchableOpacity
            key={ward.id}
            style={[
              styles.wardCard,
              {
                borderLeftColor: hasSubmitted ? colors.success : colors.error,
                borderLeftWidth: 3,
              },
            ]}
            onPress={() => router.push('/(app)/reports')}
          >
            <View style={styles.wardRow}>
              <View>
                <Text style={styles.wardName}>{ward.name}</Text>
                <Text style={styles.wardMeta}>
                  {ward.reportCount} {t('coordinator.totalReports').toLowerCase()}
                </Text>
              </View>
              <View
                style={[
                  styles.wardStatus,
                  {
                    backgroundColor: hasSubmitted ? colors.successBg : colors.errorBg,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: hasSubmitted ? colors.successText : colors.errorText,
                  }}
                >
                  {hasSubmitted ? t('reportsList.filter.submitted') : 'Missing'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}

      <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionButtonPrimary}
          onPress={() => router.push('/(app)/reports')}
        >
          <Text style={styles.actionButtonPrimaryText}>
            {t('coordinator.queue')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButtonOutline}
          onPress={() => router.push('/(app)/send-reminder')}
        >
          <Text style={styles.actionButtonOutlineText}>
            {t('coordinator.sendReminder')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function SecretaryDashboard() {
  const router = useRouter();
  const t = useFormatMessage();
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    getPendingCount().then(setPendingCount);
  }, []);

  const submittedCount = mockReports.filter((r) => r.state === 'submitted').length;
  const approvedCount = mockReports.filter((r) => r.state === 'approved').length;
  const totalCount = mockReports.length;
  const currentMonth = new Date().toLocaleString('en', { month: 'long', year: 'numeric' });
  const hasSubmittedThisMonth = submittedCount > 0;

  const recentReports = mockReports.slice(0, 5);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {t('auth.welcome')}, {user?.fullName ?? 'Secretary'}
        </Text>
        <Text style={styles.subtitle}>{t('nav.dashboard')}</Text>
      </View>

      <StatusAlert submitted={hasSubmittedThisMonth} month={currentMonth} />

      <View style={styles.statsGrid}>
        <IconCard
          icon="📄"
          value={totalCount}
          subtitle={t('dashboard.stats.total')}
          color={colors.primary600}
        />
        <IconCard
          icon="✓"
          value={approvedCount}
          subtitle={t('dashboard.stats.approved')}
          color={colors.success}
        />
        <IconCard
          icon="📨"
          value={submittedCount}
          subtitle={t('dashboard.stats.submitted')}
          color={colors.info}
        />
        <IconCard
          icon="🔔"
          value={pendingCount}
          subtitle={t('offline.pending', { count: String(pendingCount) })}
          color={colors.warning}
        />
      </View>

      <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionButtonPrimary}
          onPress={() => router.push('/(app)/wizard')}
        >
          <Text style={styles.actionButtonPrimaryText}>
            {t('dashboard.newReport')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButtonOutline}
          onPress={() => router.push('/(app)/reports')}
        >
          <Text style={styles.actionButtonOutlineText}>
            {t('dashboard.myReports')}
          </Text>
        </TouchableOpacity>
      </View>

      {pendingCount > 0 && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            {t('offline.pending', { count: String(pendingCount) })}
          </Text>
          <Text style={styles.offlineBannerAction}>{t('offline.syncNow')}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>{t('dashboard.recentActivity')}</Text>
      {recentReports.length === 0 ? (
        <Text style={styles.emptyText}>{t('dashboard.emptyActivity')}</Text>
      ) : (
        recentReports.map((report) => (
          <TouchableOpacity
            key={report.id}
            style={styles.reportRow}
            onPress={() =>
              router.push({ pathname: '/(app)/report-detail', params: { id: report.id } })
            }
          >
            <View style={styles.reportRowLeft}>
              <Text style={styles.reportRowTitle}>{report.wardName}</Text>
              <Text style={styles.reportRowDate}>{report.createdAt.split('T')[0]}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    report.state === 'draft'
                      ? colors.warningBg
                      : report.state === 'submitted'
                        ? colors.infoBg
                        : report.state === 'approved'
                          ? colors.successBg
                          : report.state === 'returned'
                            ? colors.errorBg
                            : colors.neutral100,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    color:
                      report.state === 'draft'
                        ? colors.warningText
                        : report.state === 'submitted'
                          ? colors.infoText
                          : report.state === 'approved'
                            ? colors.successText
                            : report.state === 'returned'
                              ? colors.errorText
                              : colors.neutral600,
                  },
                ]}
              >
                {t(`reports.${report.state.replace('-', '')}`)}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const isCoordinator = user?.role === 'coordinator';

  if (isCoordinator) {
    return <CoordinatorOverview />;
  }

  return <SecretaryDashboard />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  content: { padding: spacing['16'], paddingBottom: spacing['32'] },
  header: { marginBottom: spacing['16'], paddingTop: spacing['16'] },
  greeting: { fontSize: 24, fontWeight: '600', color: colors.neutral900 },
  subtitle: { fontSize: 14, color: colors.neutral500, marginTop: spacing['4'] },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing['12'],
    marginBottom: spacing['16'],
  },
  iconCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing['14'],
    borderWidth: 1,
    borderColor: colors.neutral200,
  },
  iconCardIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['8'],
  },
  iconCardIconText: { fontSize: 16, fontWeight: '600' },
  iconCardValue: { fontSize: 22, fontWeight: '700', color: colors.neutral900 },
  iconCardSubtitle: { fontSize: 12, color: colors.neutral500, marginTop: spacing['4'] },
  statusAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing['14'],
    borderRadius: radius.lg,
    marginBottom: spacing['16'],
  },
  statusAlertIcon: { fontSize: 20, marginRight: spacing['12'] },
  statusAlertContent: { flex: 1 },
  statusAlertTitle: { fontSize: 14, fontWeight: '500' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral900,
    marginTop: spacing['20'],
    marginBottom: spacing['12'],
  },
  wardCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing['14'],
    marginBottom: spacing['10'],
    borderWidth: 1,
    borderColor: colors.neutral200,
  },
  wardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wardName: { fontSize: 15, fontWeight: '600', color: colors.neutral900 },
  wardMeta: { fontSize: 13, color: colors.neutral500, marginTop: spacing['4'] },
  wardStatus: {
    paddingHorizontal: spacing['10'],
    paddingVertical: spacing['4'],
    borderRadius: radius.full,
  },
  actionsRow: { flexDirection: 'row', gap: spacing['12'] },
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: colors.primary600,
    padding: spacing['14'],
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  actionButtonPrimaryText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  actionButtonOutline: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing['14'],
    borderRadius: radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary300,
  },
  actionButtonOutlineText: { color: colors.primary600, fontSize: 14, fontWeight: '600' },
  offlineBanner: {
    backgroundColor: colors.warningBg,
    borderRadius: radius.lg,
    padding: spacing['14'],
    marginTop: spacing['16'],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.warning,
  },
  offlineBannerText: { fontSize: 14, fontWeight: '500', color: colors.warningText },
  offlineBannerAction: { fontSize: 13, fontWeight: '600', color: colors.warning },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing['14'],
    marginBottom: spacing['8'],
    borderWidth: 1,
    borderColor: colors.neutral200,
  },
  reportRowLeft: { flex: 1 },
  reportRowTitle: { fontSize: 14, fontWeight: '500', color: colors.neutral900 },
  reportRowDate: { fontSize: 12, color: colors.neutral500, marginTop: spacing['4'] },
  statusBadge: {
    paddingHorizontal: spacing['10'],
    paddingVertical: spacing['4'],
    borderRadius: radius.full,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '500' },
  emptyText: {
    fontSize: 14,
    color: colors.neutral500,
    textAlign: 'center',
    marginTop: spacing['16'],
  },
});
