import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Animated, Platform } from 'react-native';
import PrimaryButton from './PrimaryButton';
import { usePathStore } from '../store/pathStore';

interface PrayerComponentProps {
  /** Whether the component should render. */
  visible: boolean;
  /** Callback function to trigger the animation back to default state. */
  onClose: () => void;
  /** Optional style for the PrimaryButton */
  buttonStyle?: object;
}

const TARGET_TEXT = "Dear God, I come before you...";
const TYPING_SPEED_MS = 50;

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
  const setPathInProgress = usePathStore((state) => state.setPathInProgress);

  // State for typing animation
  const [typedText, setTypedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Run animation when component becomes visible
  useEffect(() => {
    if (visible) {
      // Set path in progress when component becomes visible
      setPathInProgress(true);
      
      // Reset typing state immediately when becoming visible
      setTypedText('');
      setCurrentIndex(0);
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      
      // Start typing animation slightly after entry
      const typingTimer = setTimeout(() => {
        typingIntervalRef.current = setInterval(() => {
          setCurrentIndex((prevIndex) => {
            if (prevIndex < TARGET_TEXT.length) {
              setTypedText((prev) => TARGET_TEXT.substring(0, prevIndex + 1));
              return prevIndex + 1;
            } else {
              if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
              return prevIndex;
            }
          });
        }, TYPING_SPEED_MS);
      }, 400); // Start typing after button animation starts

      // Button animation
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

      // Cleanup timers on unmount or visibility change
      return () => {
        clearTimeout(typingTimer);
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      };
    } else {
      // Reset animations and typing state when component is hidden
      buttonAnim.setValue(50);
      buttonOpacity.setValue(0);
      setTypedText('');
      setCurrentIndex(0);
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    }
  }, [visible, setPathInProgress]);

  if (!visible) return null;

  const handleDonePress = () => {
    console.log('Triggering done praying animation...');
    setPathInProgress(false);
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
      
      {/* Typing Text */} 
      <View style={styles.typingTextContainer}>
        <Text style={styles.typingText}>{typedText}</Text>
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
    // Removed justifyContent to allow text at top
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40, // Adjusted padding for different platforms
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
  typingTextContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100, // Position below header
    left: 20,
    right: 20,
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(255, 244, 217, 0.8)', // Semi-transparent background
    borderRadius: 8,
  },
  typingText: {
    fontFamily: 'Feather Bold',
    fontSize: 18,
    color: '#3C584A',
    textAlign: 'center',
  },
});

export default PrayerComponent;
