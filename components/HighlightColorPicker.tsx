import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Reanimated, { 
  FadeIn, 
  FadeOut, 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  Easing
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { HIGHLIGHT_COLORS, HighlightColorKey } from '~/app/stores/highlightStore';
import analytics from '../utils/analytics';

interface HighlightColorPickerProps {
  isVisible: boolean;
  initialColor?: HighlightColorKey | null;
  onClose: () => void;
  onSelectColor: (colorKey: HighlightColorKey | null) => void;
  versePreview?: string;
  bookName?: string;
  chapter?: number;
  verseNumber?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AnimatedTouchable = Reanimated.createAnimatedComponent(TouchableOpacity);

const HighlightColorPicker: React.FC<HighlightColorPickerProps> = ({
  isVisible,
  initialColor,
  onClose,
  onSelectColor,
  versePreview,
  bookName,
  chapter,
  verseNumber
}) => {
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
      
      // Track color picker opened
      analytics.logEvent("Highlight_ColorPicker_Opened", {
        book: bookName || 'unknown',
        chapter: chapter || 0,
        verse: verseNumber || 0,
        initialColor: initialColor || 'none',
        hasExistingHighlight: !!initialColor
      });
      
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
  }, [isVisible, initialColor, defaultColor, modalScale, modalOpacity, bookName, chapter, verseNumber]);

  const handleColorSelect = (colorKey: HighlightColorKey) => {
    // Provide haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Track color selection
    analytics.logEvent("Highlight_ColorSelected", {
      book: bookName || 'unknown',
      chapter: chapter || 0,
      verse: verseNumber || 0,
      selectedColor: colorKey,
      previousColor: selectedColor || 'none'
    });
    
    setSelectedColor(colorKey);
  };

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Track highlight action
    const isRemoving = selectedColor === null && initialColor;
    analytics.logEvent(isRemoving ? "Highlight_Removed" : "Highlight_Applied", {
      book: bookName || 'unknown',
      chapter: chapter || 0,
      verse: verseNumber || 0,
      color: selectedColor || 'none',
      previousColor: initialColor || 'none',
      action: isRemoving ? 'remove' : 'apply'
    });
    
    // Pass the selected color (including null for removal) to parent
    onSelectColor(selectedColor);
    
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
    // Track cancel action
    analytics.logEvent("Highlight_ColorPicker_Cancelled", {
      book: bookName || 'unknown',
      chapter: chapter || 0,
      verse: verseNumber || 0,
      initialColor: initialColor || 'none',
      selectedColor: selectedColor || 'none'
    });
    
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
                <Text style={styles.title}>Choose Highlight Color</Text>
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
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.confirmButton, 
                    // Button should only be disabled if we have no selection and no initial color to remove
                    (selectedColor === null && !initialColor) && styles.disabledButton
                  ]} 
                  onPress={handleConfirm}
                  disabled={selectedColor === null && !initialColor}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmText}>
                    {selectedColor === null && initialColor ? 'Remove' : 'Apply'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* Remove highlight option */}
              {initialColor && (
                <TouchableOpacity 
                  style={styles.removeButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    
                    // Track remove highlight button tap
                    analytics.logEvent("Highlight_RemoveButtonTapped", {
                      book: bookName || 'unknown',
                      chapter: chapter || 0,
                      verse: verseNumber || 0,
                      currentColor: initialColor,
                      selectedColor: selectedColor || 'none'
                    });
                    
                    setSelectedColor(null);
                  }}
                >
                  <Feather name="trash-2" size={16} color="#888888" style={styles.removeIcon} />
                  <Text style={styles.removeText}>Remove Highlight</Text>
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
    borderColor: 'transparent',
    borderRadius: 20,
    borderWidth: 2,
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
    fontFamily: 'Nunito-Black',
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
    fontFamily: 'Nunito-Black',
    fontSize: 18,
  },
});

export default HighlightColorPicker; 