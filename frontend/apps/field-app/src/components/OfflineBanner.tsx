import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing } from '@wdc/design-system';
import { useFormatMessage } from '@wdc/i18n';

interface OfflineBannerProps {
  isOffline: boolean;
  isSyncing?: boolean;
  pendingCount?: number;
}

export function OfflineBanner({ isOffline, isSyncing, pendingCount }: OfflineBannerProps) {
  const t = useFormatMessage();

  if (!isOffline && !isSyncing) return null;

  if (isSyncing) {
    return (
      <View style={[styles.banner, styles.syncingBanner]}>
        <ActivityIndicator size="small" color={colors.infoText} />
        <Text style={[styles.bannerText, { color: colors.infoText }]}>
          Syncing {pendingCount ?? ''} reports...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.offlineIcon}>⚠</Text>
      <Text style={styles.bannerText}>{t('offline.banner')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warningBg,
    paddingHorizontal: spacing['16'],
    paddingVertical: spacing['10'],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['8'],
    borderBottomWidth: 1,
    borderBottomColor: colors.warning,
  },
  syncingBanner: {
    backgroundColor: colors.infoBg,
    borderBottomColor: colors.info,
  },
  offlineIcon: { fontSize: 14 },
  bannerText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.warningText,
  },
});
