import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Reanimated, { 
  FadeIn, 
  FadeOut, 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withSequence,
  Easing
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { HIGHLIGHT_COLORS, HighlightColorKey } from '~/app/stores/highlightStore';

interface HighlightColorPickerProps {
  isVisible: boolean;
  initialColor?: HighlightColorKey | null;
  onClose: () => void;
  onSelectColor: (colorKey: HighlightColorKey) => void;
  versePreview?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AnimatedTouchable = Reanimated.createAnimatedComponent(TouchableOpacity);

const HighlightColorPicker: React.FC<HighlightColorPickerProps> = ({
  isVisible,
  initialColor,
  onClose,
  onSelectColor,
  versePreview
}) => {
  const { t } = useTranslation();
  // Create color options from the HIGHLIGHT_COLORS object
  const colorOptions = Object.entries(HIGHLIGHT_COLORS).map(([key, value]) => ({
    key: key as HighlightColorKey,
    color: value
  }));

  // Set default color to the first option if no initial color is provided
  const defaultColor = colorOptions[0]?.key || null;
  const [selectedColor, setSelectedColor] = useState<HighlightColorKey | null>(initialColor || defaultColor);
  const modalScale = useSharedValue(0.95);
  const modalOpacity = useSharedValue(0);

  // Reset selected color when modal opens
  useEffect(() => {
    if (isVisible) {
      setSelectedColor(initialColor || defaultColor);
      
      // Animate modal appearance
      modalScale.value = 0.95;
      modalOpacity.value = 0;
      
      modalScale.value = withTiming(1, { 
        duration: 300,
        easing: Easing.out(Easing.back(2))
      });
      
      modalOpacity.value = withTiming(1, { 
        duration: 250
      });
    }
  }, [isVisible, initialColor, defaultColor, modalScale, modalOpacity]);

  const handleColorSelect = (colorKey: HighlightColorKey) => {
    // Provide haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedColor(colorKey);
  };

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // For null selection, pass it to parent to remove the highlight
    if (selectedColor === null && initialColor) {
      onSelectColor(selectedColor as any);
    } else if (selectedColor) {
      // For regular color selection
      onSelectColor(selectedColor);
    }
    
    // Animate out before closing
    modalScale.value = withTiming(0.95, { duration: 200 });
    modalOpacity.value = withTiming(0, { 
      duration: 200,
      easing: Easing.in(Easing.cubic)
    });
    
    // Delay closing to allow animation to complete
    setTimeout(onClose, 200);
  };

  const handleCancel = () => {
    // Animate out
    modalScale.value = withTiming(0.95, { duration: 180 });
    modalOpacity.value = withTiming(0, { 
      duration: 180,
      easing: Easing.in(Easing.cubic)
    });
    
    // Delay closing to allow animation to complete
    setTimeout(onClose, 180);
  };

  // Animated styles for the modal
  const modalAnimatedStyle = useAnimatedStyle(() => ({
    opacity: modalOpacity.value,
    transform: [
      { scale: modalScale.value }
    ]
  }));

  // Don't render anything if not visible
  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={handleCancel}
    >
      <TouchableWithoutFeedback onPress={handleCancel}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <Reanimated.View style={[styles.modalContent, modalAnimatedStyle]}>
              <View style={styles.header}>
                <Text style={styles.title}>{t('highlightColorPicker.title')}</Text>
              </View>
              
              {/* Verse preview if provided */}
              {versePreview && (
                <View style={[
                  styles.previewContainer, 
                  selectedColor ? { backgroundColor: HIGHLIGHT_COLORS[selectedColor] } : {}
                ]}>
                  <Text style={styles.previewText} numberOfLines={2}>{versePreview}</Text>
                </View>
              )}
              
              {/* Color options */}
              <View style={styles.colorContainer}>
                {colorOptions.map(({ key, color }) => (
                  <AnimatedTouchable
                    key={key}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === key && styles.selectedColor
                    ]}
                    onPress={() => handleColorSelect(key)}
                    activeOpacity={0.7}
                  >
                    {selectedColor === key && (
                      <Reanimated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(100)}>
                        <Feather name="check" size={20} color="#3C584A" />
                      </Reanimated.View>
                    )}
                  </AnimatedTouchable>
                ))}
              </View>
              
              {/* Action buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={handleCancel}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelText}>{t('highlightColorPicker.cancel')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.confirmButton, 
                    // Only disable if no color is selected (which shouldn't happen now with default)
                    !selectedColor && styles.disabledButton
                  ]} 
                  onPress={handleConfirm}
                  disabled={!selectedColor}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmText}>
                    {selectedColor === null && initialColor ? t('highlightColorPicker.remove') : t('highlightColorPicker.apply')}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* Remove highlight option */}
              {initialColor && (
                <TouchableOpacity 
                  style={styles.removeButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedColor(null);
                  }}
                >
                  <Feather name="trash-2" size={16} color="#888888" style={styles.removeIcon} />
                  <Text style={styles.removeText}>{t('highlightColorPicker.removeHighlight')}</Text>
                </TouchableOpacity>
              )}
            </Reanimated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    width: '100%',
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    paddingVertical: 12,
  },
  cancelText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
  },
  colorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
    width: '100%',
  },
  colorOption: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    height: 40,
    justifyContent: 'center',
    marginBottom: 16,
    width: 40,
  },
  confirmButton: {
    alignItems: 'center',
    backgroundColor: '#DCB280',
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    paddingVertical: 12,
  },
  confirmText: {
    color: 'white',
    fontFamily: 'Feather Bold',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#DCB28077',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  modalContent: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxWidth: Math.min(SCREEN_WIDTH - 48, 340),
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    width: '85%',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    flex: 1,
    justifyContent: 'center',
  },
  previewContainer: {
    backgroundColor: 'rgba(220, 178, 128, 0.1)',
    borderRadius: 8,
    padding: 12,
    width: '100%',
  },
  previewText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 15,
    lineHeight: 21,
  },
  removeButton: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    padding: 8,
  },
  removeIcon: {
    marginRight: 6,
  },
  removeText: {
    color: '#888888',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 14,
  },
  selectedColor: {
    borderColor: '#3C584A',
    transform: [{ scale: 1.1 }],
  },
  title: {
    color: '#3C584A',
    fontFamily: 'Feather Bold',
    fontSize: 18,
  },
});

export default HighlightColorPicker; 