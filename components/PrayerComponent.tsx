import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Animated } from 'react-native';
import PrimaryButton from './PrimaryButton';

interface PrayerComponentProps {
  /** Whether the component should render. */
  visible: boolean;
  /** Callback function to trigger the animation back to default state. */
  onClose: () => void;
  /** Optional style for the PrimaryButton */
  buttonStyle?: object;
}

/**
 * PrayerComponent owns the UI **and** the logic for ending a prayer session.
 * When the user taps the "Done Praying" button we:
 *   1. Flip `isPraying` back to `false` so Home can hide this overlay.
 *   2. Trigger the `onDoneAnimation` callback provided by Home.
 */
const PrayerComponent: React.FC<PrayerComponentProps> = ({
  visible,
  onClose,
  buttonStyle,
}) => {
  // Animation values for button entry
  const buttonAnim = useRef(new Animated.Value(50)).current; // Start 50 units below final position
  const buttonOpacity = useRef(new Animated.Value(0)).current; // Start fully transparent

  // Run animation when component becomes visible
  useEffect(() => {
    if (visible) {
      // Slight delay to let background transition first
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(buttonAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(buttonOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          })
        ]).start();
      }, 100);
    } else {
      // Reset animations when component is hidden
      buttonAnim.setValue(50);
      buttonOpacity.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const handleDonePress = () => {
    console.log('Triggering done praying animation...');
    // Trigger the animation controlled by Home.
    onClose();
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Back Button (styled like BiblePreviewComponent) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleDonePress} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </View>
      
      {/* Animated Primary Button */}
      <Animated.View style={{
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        opacity: buttonOpacity,
        transform: [{ translateY: buttonAnim }]
      }}>
        <PrimaryButton 
          title="Done Praying" 
          onPress={handleDonePress} 
          style={buttonStyle} 
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    alignItems: 'flex-start',
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
});

export default PrayerComponent;
