import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFormatMessage } from '@wdc/i18n';
import { colors, spacing, radius } from '@wdc/design-system';
import { useOcr } from '../../src/hooks/useOcr';

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const t = useFormatMessage();
  let label: string;
  let color: string;
  let bg: string;
  if (confidence >= 0.9) {
    label = t('snap.confidenceHigh');
    color = colors.successText;
    bg = colors.successBg;
  } else if (confidence >= 0.7) {
    label = t('snap.confidenceMedium');
    color = colors.warningText;
    bg = colors.warningBg;
  } else {
    label = t('snap.confidenceLow');
    color = colors.errorText;
    bg = colors.errorBg;
  }

  return (
    <View style={[styles.confidenceBadge, { backgroundColor: bg }]}>
      <Text style={[styles.confidenceBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

function EdgeOverlay() {
  return (
    <View style={styles.overlay}>
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />
      <View style={styles.guideBox}>
        <Text style={styles.guideText}>Document</Text>
      </View>
    </View>
  );
}

export default function SnapScreen() {
  const router = useRouter();
  const t = useFormatMessage();
  const { state, capturedUri, result, progress, capture, process, confirm, retake } =
    useOcr();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [showOriginal, setShowOriginal] = useState(false);

  const handleCapture = useCallback(() => {
    capture();
    const mockUri = `file://photo_${Date.now()}.jpg`;
    process(mockUri);
  }, [capture, process]);

  const handleConfirm = useCallback(() => {
    if (!result) return;
    const confirmed = result.fields.map((f) => ({
      ...f,
      value: editedValues[f.key] ?? f.value,
    }));
    confirm(confirmed);
    router.back();
  }, [result, editedValues, confirm, router]);

  const handleEdit = useCallback((key: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('snap.title')}</Text>
        <Text style={styles.subtitle}>{t('snap.instruction')}</Text>
      </View>

      {/* Capture State */}
      {state === 'capture' && (
        <View style={styles.captureContainer}>
          <View style={styles.cameraPreview}>
            <EdgeOverlay />
          </View>
          <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
            <View style={styles.captureCircle}>
              <View style={styles.captureInner} />
            </View>
            <Text style={styles.captureLabel}>{t('snap.capture')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Processing State */}
      {state === 'processing' && (
        <View style={styles.processingContainer}>
          <View style={styles.previewThumb}>
            <Text style={styles.previewThumbText}>📄</Text>
          </View>
          <Text style={styles.processingTitle}>{t('snap.processing')}</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(progress * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
          <ActivityIndicator color={colors.primary600} style={styles.spinner} />
        </View>
      )}

      {/* Review State */}
      {state === 'review' && result && (
        <>
          <ScrollView
            style={styles.reviewScroll}
            contentContainerStyle={styles.reviewContent}
          >
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewTitle}>{t('snap.review')}</Text>
              <Text style={styles.reviewSubtitle}>
                {result.fields.length} fields extracted
              </Text>
            </View>

            <TouchableOpacity
              style={styles.viewOriginalButton}
              onPress={() => setShowOriginal(true)}
            >
              <Text style={styles.viewOriginalText}>📄 {t('snap.viewOriginal')}</Text>
            </TouchableOpacity>

            {result.fields.map((field) => (
              <View key={field.key} style={styles.fieldCard}>
                <View style={styles.fieldHeader}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <ConfidenceBadge confidence={field.confidence} />
                </View>
                {editingField === field.key ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedValues[field.key] ?? field.value}
                    onChangeText={(text) => handleEdit(field.key, text)}
                    autoFocus
                    onBlur={() => setEditingField(null)}
                  />
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      setEditingField(field.key);
                      setEditedValues((prev) => ({
                        ...prev,
                        [field.key]: prev[field.key] ?? field.value,
                      }));
                    }}
                  >
                    <Text style={styles.fieldValue}>
                      {editedValues[field.key] ?? field.value}
                    </Text>
                    <Text style={styles.editHint}>{t('snap.editValue')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.retakeButton} onPress={retake}>
              <Text style={styles.retakeButtonText}>{t('snap.retake')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.useButton} onPress={handleConfirm}>
              <Text style={styles.useButtonText}>{t('snap.useData')}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* View Original Modal */}
      <Modal
        visible={showOriginal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOriginal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('snap.viewOriginal')}</Text>
            <View style={styles.originalPlaceholder}>
              <Text style={styles.originalPlaceholderText}>📄 Document Preview</Text>
              <Text style={styles.originalPlaceholderSubtext}>
                {result?.uri ?? capturedUri}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowOriginal(false)}
            >
              <Text style={styles.modalCloseText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  captureContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cameraPreview: {
    width: '85%',
    aspectRatio: 3 / 4,
    backgroundColor: colors.neutral800,
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: colors.primary400 },
  cornerTL: { top: 32, left: 32, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: 32, right: 32, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: 32, left: 32, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: 32, right: 32, borderBottomWidth: 3, borderRightWidth: 3 },
  guideBox: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    borderStyle: 'dashed',
    width: '70%',
    height: '60%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '500' },
  captureButton: { alignItems: 'center', marginTop: spacing['24'] },
  captureCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: colors.neutral900,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['8'],
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.neutral900,
  },
  captureLabel: { fontSize: 14, color: colors.neutral500 },

  processingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['24'],
  },
  previewThumb: {
    width: 100,
    height: 130,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['20'],
    borderWidth: 1,
    borderColor: colors.neutral200,
  },
  previewThumbText: { fontSize: 40 },
  processingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral900,
    marginBottom: spacing['16'],
  },
  progressBar: {
    width: '70%',
    height: 6,
    backgroundColor: colors.neutral200,
    borderRadius: 3,
    marginBottom: spacing['8'],
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.primary500,
    borderRadius: 3,
  },
  progressText: { fontSize: 14, color: colors.neutral500, marginBottom: spacing['16'] },
  spinner: { marginTop: spacing['8'] },

  reviewScroll: { flex: 1 },
  reviewContent: { padding: spacing['16'], paddingBottom: spacing['32'] },
  reviewHeader: { marginBottom: spacing['12'] },
  reviewTitle: { fontSize: 18, fontWeight: '600', color: colors.neutral900 },
  reviewSubtitle: { fontSize: 13, color: colors.neutral500, marginTop: spacing['4'] },
  viewOriginalButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral200,
    borderRadius: radius.lg,
    padding: spacing['12'],
    alignItems: 'center',
    marginBottom: spacing['16'],
  },
  viewOriginalText: { fontSize: 14, color: colors.neutral700, fontWeight: '500' },
  fieldCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing['14'],
    marginBottom: spacing['10'],
    borderWidth: 1,
    borderColor: colors.neutral200,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing['8'],
  },
  fieldLabel: { fontSize: 13, color: colors.neutral500, fontWeight: '500' },
  confidenceBadge: {
    paddingHorizontal: spacing['8'],
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  confidenceBadgeText: { fontSize: 11, fontWeight: '500' },
  fieldValue: { fontSize: 16, color: colors.neutral900, fontWeight: '600' },
  editHint: { fontSize: 12, color: colors.primary600, marginTop: spacing['4'] },
  editInput: {
    borderWidth: 1,
    borderColor: colors.primary500,
    borderRadius: radius.md,
    padding: spacing['10'],
    fontSize: 16,
    color: colors.neutral900,
    backgroundColor: colors.primary50,
  },
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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['24'],
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing['20'],
    width: '100%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral900,
    marginBottom: spacing['16'],
  },
  originalPlaceholder: {
    backgroundColor: colors.neutral100,
    borderRadius: radius.lg,
    padding: spacing['32'],
    alignItems: 'center',
    marginBottom: spacing['16'],
  },
  originalPlaceholderText: { fontSize: 16, color: colors.neutral700 },
  originalPlaceholderSubtext: {
    fontSize: 12,
    color: colors.neutral500,
    marginTop: spacing['8'],
  },
  modalCloseButton: {
    backgroundColor: colors.primary600,
    borderRadius: radius.lg,
    padding: spacing['12'],
    alignItems: 'center',
  },
  modalCloseText: { fontSize: 14, fontWeight: '600', color: colors.white },
});
