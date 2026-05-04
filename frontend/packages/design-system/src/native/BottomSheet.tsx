import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal as RNModal,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors, spacing, radius } from '../tokens';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  return (
    <RNModal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              {title && (
                <View style={styles.header}>
                  <Text style={styles.title}>{title}</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                    accessibilityLabel="Close"
                  >
                    <Text style={styles.closeText}>×</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.content}>{children}</View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.warmWhite,
    borderTopLeftRadius: radius.cardLarge,
    borderTopRightRadius: radius.cardLarge,
    paddingTop: spacing['8'],
    paddingBottom: spacing['24'],
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.lineStrong,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing['8'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['20'],
    paddingVertical: spacing['12'],
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.charcoal,
  },
  closeButton: {
    padding: spacing['8'],
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 20,
    color: colors.charcoal2,
  },
  content: {
    padding: spacing['20'],
  },
});

export default BottomSheet;
