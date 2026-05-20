import { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useFormatMessage } from '@wdc/i18n';
import { colors, spacing, radius } from '@wdc/design-system';
import { useAuth } from '../../src/contexts/AuthContext';
import { mockReports } from '../../src/lib/mock-reports';
import { mockCoordinatorReports } from '../../src/lib/mock-coordinator';
import type { ReportState } from '@wdc/domain';

function StatusBadge({ state }: { state: ReportState }) {
  const t = useFormatMessage();
  const bgMap: Record<string, string> = {
    draft: colors.warningBg,
    submitted: colors.infoBg,
    in_review: colors.warningBg,
    approved: colors.successBg,
    returned: colors.errorBg,
    sealed: colors.neutral100,
  };
  const textMap: Record<string, string> = {
    draft: colors.warningText,
    submitted: colors.infoText,
    in_review: colors.warningText,
    approved: colors.successText,
    returned: colors.errorText,
    sealed: colors.neutral600,
  };
  return (
    <View style={[styles.badge, { backgroundColor: bgMap[state] ?? colors.neutral100 }]}>
      <Text style={[styles.badgeText, { color: textMap[state] ?? colors.neutral600 }]}>
        {t(`reports.${state.replace('-', '')}`)}
      </Text>
    </View>
  );
}

function CoordinatorQueue() {
  const router = useRouter();
  const t = useFormatMessage();
  const [filter, setFilter] = useState<'all' | 'submitted' | 'in_review' | 'returned'>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = mockCoordinatorReports;
    if (filter !== 'all') {
      result = result.filter((r) => r.state === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.wardName.toLowerCase().includes(q));
    }
    return result;
  }, [filter, search]);

  const renderItem = useCallback(
    ({ item }: { item: (typeof mockCoordinatorReports)[number] }) => (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({ pathname: '/(app)/report-review', params: { id: item.id } })
        }
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.wardName}</Text>
          <StatusBadge state={item.state} />
        </View>
        <Text style={styles.cardMeta}>
          {item.submittedBy} • {item.createdAt.split('T')[0]}
        </Text>
        <View style={styles.cardFooter}>
          <View style={styles.methodBadge}>
            <Text style={styles.methodBadgeText}>{item.submissionMethod}</Text>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [router]
  );

  const filters: Array<{ key: typeof filter; label: string }> = [
    { key: 'all', label: t('reportsList.filter.all') },
    { key: 'submitted', label: t('reportsList.filter.submitted') },
    { key: 'in_review', label: t('reports.inReview') },
    { key: 'returned', label: t('reportsList.filter.returned') },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('coordinator.queue')}</Text>
        <Text style={styles.subtitle}>
          {filtered.length} {t('coordinator.totalReports').toLowerCase()}
        </Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('common.search')}
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={colors.neutral400}
        />
      </View>

      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === f.key && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>{t('coordinator.queueEmpty')}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

function SecretaryReports() {
  const router = useRouter();
  const t = useFormatMessage();
  const [activeFilter, setActiveFilter] = useState<ReportState | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = mockReports;
    if (activeFilter !== 'all') {
      result = result.filter((r) => r.state === activeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.wardName.toLowerCase().includes(q) || r.state.toLowerCase().includes(q)
      );
    }
    return result;
  }, [activeFilter, search]);

  const filters = [
    { key: 'all' as const, labelKey: 'reportsList.filter.all' },
    { key: 'draft' as const, labelKey: 'reportsList.filter.draft' },
    { key: 'submitted' as const, labelKey: 'reportsList.filter.submitted' },
    { key: 'approved' as const, labelKey: 'reportsList.filter.approved' },
    { key: 'returned' as const, labelKey: 'reportsList.filter.returned' },
  ];

  const renderItem = useCallback(
    ({ item }: { item: (typeof mockReports)[number] }) => (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({ pathname: '/(app)/report-detail', params: { id: item.id } })
        }
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.wardName}</Text>
          <StatusBadge state={item.state} />
        </View>
        <Text style={styles.cardMeta}>{item.createdAt.split('T')[0]}</Text>
        <View style={styles.cardFooter}>
          <View style={styles.methodBadge}>
            <Text style={styles.methodBadgeText}>{item.submissionMethod}</Text>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [router]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('reportsList.title')}</Text>
        <Text style={styles.subtitle}>
          {filtered.length} {t('dashboard.stats.total').toLowerCase()}
        </Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('common.search')}
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={colors.neutral400}
        />
      </View>

      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              activeFilter === f.key && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter(f.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === f.key && styles.filterChipTextActive,
              ]}
            >
              {t(f.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📄</Text>
          <Text style={styles.emptyText}>{t('reportsList.empty')}</Text>
          <Text style={styles.emptyCta}>{t('reportsList.emptyCta')}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

export default function ReportsScreen() {
  const { user } = useAuth();
  const isCoordinator = user?.role === 'coordinator';

  if (isCoordinator) {
    return <CoordinatorQueue />;
  }

  return <SecretaryReports />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  header: { padding: spacing['16'], paddingTop: spacing['24'] },
  title: { fontSize: 24, fontWeight: '600', color: colors.neutral900 },
  subtitle: { fontSize: 14, color: colors.neutral500, marginTop: spacing['4'] },
  searchRow: { paddingHorizontal: spacing['16'], marginBottom: spacing['12'] },
  searchInput: {
    padding: spacing['12'],
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral300,
    fontSize: 14,
    color: colors.neutral900,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing['16'],
    gap: spacing['8'],
    marginBottom: spacing['12'],
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: spacing['12'],
    paddingVertical: spacing['6'],
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral300,
  },
  filterChipActive: {
    backgroundColor: colors.primary600,
    borderColor: colors.primary600,
  },
  filterChipText: { fontSize: 13, color: colors.neutral600 },
  filterChipTextActive: { color: colors.white, fontWeight: '500' },
  list: { paddingHorizontal: spacing['16'], paddingBottom: spacing['24'] },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing['14'],
    marginBottom: spacing['10'],
    borderWidth: 1,
    borderColor: colors.neutral200,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing['6'],
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.neutral900, flex: 1 },
  badge: {
    paddingHorizontal: spacing['10'],
    paddingVertical: spacing['4'],
    borderRadius: radius.full,
  },
  badgeText: { fontSize: 12, fontWeight: '500' },
  cardMeta: { fontSize: 13, color: colors.neutral500, marginBottom: spacing['6'] },
  cardFooter: { flexDirection: 'row', alignItems: 'center' },
  methodBadge: {
    backgroundColor: colors.neutral100,
    paddingHorizontal: spacing['8'],
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  methodBadgeText: {
    fontSize: 11,
    color: colors.neutral600,
    textTransform: 'capitalize',
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing['32'] },
  emptyIcon: { fontSize: 40, marginBottom: spacing['12'] },
  emptyText: { fontSize: 16, color: colors.neutral600, textAlign: 'center' },
  emptyCta: { fontSize: 14, color: colors.primary600, marginTop: spacing['8'] },
});
