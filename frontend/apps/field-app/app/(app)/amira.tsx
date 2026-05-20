import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFormatMessage } from '@wdc/i18n';
import { colors, spacing, radius } from '@wdc/design-system';
import { useAudioRecorder } from '../../src/hooks/useAudioRecorder';

function Waveform({ active }: { active: boolean }) {
  const bars = [12, 24, 18, 32, 28, 20, 36, 16, 22, 30, 14, 26, 20, 34, 18];
  return (
    <View style={styles.waveform}>
      {bars.map((h, i) => (
        <View
          key={i}
          style={[
            styles.waveBar,
            {
              height: active ? h + Math.random() * 16 : h * 0.3,
              backgroundColor: active ? colors.primary500 : colors.neutral300,
              opacity: active ? 0.8 + Math.random() * 0.2 : 0.4,
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function AmiraScreen() {
  const router = useRouter();
  const t = useFormatMessage();
  const { state, durationMs, transcript, result, startRecording, stopRecording, reset } =
    useAudioRecorder();

  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const handleUseRecording = useCallback(() => {
    if (result) {
      router.back();
    }
  }, [result, router]);

  const handleRetake = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('amira.title')}</Text>
        <Text style={styles.subtitle}>{t('amira.instruction')}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Waveform */}
        <Waveform active={state === 'recording'} />

        {/* Duration */}
        <Text style={styles.duration}>{timeDisplay}</Text>

        {/* Recording controls */}
        {state === 'idle' || state === 'error' ? (
          <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
            <View style={styles.recordCircle}>
              <View style={styles.recordDot} />
            </View>
            <Text style={styles.recordLabel}>{t('amira.tapToRecord')}</Text>
          </TouchableOpacity>
        ) : state === 'recording' ? (
          <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
            <View style={styles.stopCircle}>
              <View style={styles.stopSquare} />
            </View>
            <Text style={styles.stopLabel}>{t('amira.stop')}</Text>
          </TouchableOpacity>
        ) : state === 'processing' ? (
          <View style={styles.processingBox}>
            <ActivityIndicator color={colors.primary600} size="large" />
            <Text style={styles.processingText}>{t('ai.thinking')}</Text>
            <Text style={styles.processingSubtext}>Transcribing audio...</Text>
          </View>
        ) : (
          <View style={styles.doneBox}>
            <View style={styles.doneIcon}>
              <Text style={styles.doneIconText}>✓</Text>
            </View>
            <Text style={styles.doneLabel}>Recording complete</Text>
          </View>
        )}

        {/* Transcript */}
        {state === 'done' && transcript && (
          <View style={styles.transcriptCard}>
            <View style={styles.transcriptHeader}>
              <Text style={styles.transcriptTitle}>{t('amira.transcript')}</Text>
              {result && (
                <View style={styles.confidenceBadge}>
                  <Text style={styles.confidenceText}>
                    {Math.round(result.confidence * 100)}%
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </View>
        )}
      </ScrollView>

      {/* Footer Actions */}
      {state === 'done' && result && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
            <Text style={styles.retakeButtonText}>{t('amira.retake')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.useButton} onPress={handleUseRecording}>
            <Text style={styles.useButtonText}>{t('amira.useRecording')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  header: {
    padding: spacing['16'],
    paddingTop: spacing['24'],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral200,
  },
  backButton: { marginBottom: spacing['8'] },
  backText: { fontSize: 14, color: colors.primary600, fontWeight: '500' },
  title: { fontSize: 20, fontWeight: '600', color: colors.neutral900 },
  subtitle: { fontSize: 14, color: colors.neutral500, marginTop: spacing['4'] },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing['24'], alignItems: 'center', paddingBottom: spacing['32'] },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
    gap: 3,
    marginBottom: spacing['16'],
    marginTop: spacing['20'],
  },
  waveBar: { width: 4, borderRadius: 2, minHeight: 4 },
  duration: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.neutral900,
    fontVariant: ['tabular-nums'],
    marginBottom: spacing['24'],
  },
  recordButton: { alignItems: 'center', marginVertical: spacing['16'] },
  recordCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['10'],
  },
  recordDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.error,
  },
  recordLabel: { fontSize: 14, color: colors.neutral500 },
  stopButton: { alignItems: 'center', marginVertical: spacing['16'] },
  stopCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.primary600,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['10'],
  },
  stopSquare: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: colors.primary600,
  },
  stopLabel: { fontSize: 14, color: colors.neutral500, fontWeight: '500' },
  processingBox: { alignItems: 'center', marginVertical: spacing['24'] },
  processingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral900,
    marginTop: spacing['14'],
  },
  processingSubtext: {
    fontSize: 13,
    color: colors.neutral500,
    marginTop: spacing['4'],
  },
  doneBox: { alignItems: 'center', marginVertical: spacing['16'] },
  doneIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.successBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['10'],
  },
  doneIconText: { fontSize: 28, color: colors.success },
  doneLabel: { fontSize: 14, color: colors.neutral500 },
  transcriptCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing['16'],
    borderWidth: 1,
    borderColor: colors.neutral200,
    marginTop: spacing['20'],
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing['10'],
  },
  transcriptTitle: { fontSize: 14, fontWeight: '600', color: colors.neutral900 },
  confidenceBadge: {
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing['8'],
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  confidenceText: { fontSize: 11, fontWeight: '500', color: colors.successText },
  transcriptText: { fontSize: 15, color: colors.neutral700, lineHeight: 22 },
  footer: {
    flexDirection: 'row',
    gap: spacing['12'],
    padding: spacing['16'],
    borderTopWidth: 1,
    borderTopColor: colors.neutral200,
    backgroundColor: colors.white,
  },
  retakeButton: {
    flex: 1,
    padding: spacing['12'],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.neutral300,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  retakeButtonText: { fontSize: 14, fontWeight: '600', color: colors.neutral700 },
  useButton: {
    flex: 2,
    padding: spacing['12'],
    borderRadius: radius.lg,
    backgroundColor: colors.primary600,
    alignItems: 'center',
  },
  useButtonText: { fontSize: 14, fontWeight: '600', color: colors.white },
});
