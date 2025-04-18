import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import PrimaryButton from './PrimaryButton';

interface BiblePreviewProps {
  /** Whether the preview overlay should be shown. */
  visible: boolean;
  /** Callback to close the preview */
  onClose: () => void;
}

/**
 * Full‑screen overlay that shows a placeholder "Bible Preview" screen.
 * Rendered only when `visible` is true.
 */
const BiblePreviewComponent: React.FC<BiblePreviewProps> = ({ visible, onClose }) => {
  const cardAnim = useRef(new Animated.Value(-100)).current; // Y offset for entry
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(cardAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      cardAnim.setValue(-100);
      cardOpacity.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const handleBack = () => {
    onClose();
  };

  const handleStart = () => {
    console.log('Start Pressed');
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </View>

      {/* Animated Card Preview at the top */}
      <Animated.View style={[styles.card, {
        opacity: cardOpacity,
        transform: [{ translateY: cardAnim }],
        alignSelf: 'center',
        marginTop: 24,
      }]}
      >
        {/* Pillar Title */}
        <Text style={styles.pillarTitle}>The Good Shepherd</Text>
        {/* Date or subtitle */}
        <Text style={styles.dateText}>Today's Reading · June 7, 2024</Text>
        {/* Summary Section */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>Summary</Text>
          <Text style={styles.summaryText}>
            Jesus describes Himself as the Good Shepherd who lays down His life for the sheep. 
          </Text>
        </View>
      </Animated.View>

      {/* Bottom Button */}
      <View style={styles.bottomButton}>
        <PrimaryButton title="Start Reading" onPress={handleStart} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    width: '100%',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 244, 217, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 24,
    color: '#3C584A',
    fontFamily: 'Inter-Bold',
  },
  card: {
    width: '90%',
    backgroundColor: '#FFF4D9',
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 24,
    shadowColor: '#EAA800',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
  },
  pillarTitle: {
    fontSize: 28,
    fontFamily: 'Feather Bold',
    color: '#EAA800',
    marginBottom: 8,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  dateText: {
    fontSize: 15,
    color: '#B89B4C',
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
    textAlign: 'center',
  },
  summarySection: {
    width: '100%',
    backgroundColor: '#FFF9ED',
    borderRadius: 18,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FFE4A8',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#B89B4C',
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryText: {
    fontSize: 16,
    color: '#3C584A',
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
    textAlign: 'center',
  },
  bottomButton: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
});

export default BiblePreviewComponent;
