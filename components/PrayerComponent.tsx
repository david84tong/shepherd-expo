import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, Animated, Platform } from 'react-native';
import PrimaryButton from './PrimaryButton';
import { usePathStore } from '../store/pathStore';
import { Ionicons } from '@expo/vector-icons';

interface PrayerComponentProps {
  /** Whether the component should render. */
  visible: boolean;
  /** Callback function to trigger the animation back to default state. */
  onClose: () => void;
  /** Optional style for the PrimaryButton */
  buttonClassName?: string;
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
  buttonClassName,
}) => {
  // Animation values for button entry
  const buttonAnim = useRef(new Animated.Value(50)).current; // Start 50 units below final position
  const buttonOpacity = useRef(new Animated.Value(0)).current; // Start fully transparent
  // Animation values for card entry
  const cardAnim = useRef(new Animated.Value(-100)).current; // Start 100 units above final position
  const cardOpacity = useRef(new Animated.Value(0)).current; // Start fully transparent
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
        // Card animation
        Animated.timing(cardAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        // Button animation
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
      cardAnim.setValue(-100);
      cardOpacity.setValue(0);
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
    <View className="absolute inset-0 flex flex-col" pointerEvents="box-none">
      {/* Back Button */}
      <View className={`pt-[${Platform.OS === 'ios' ? 60 : 40}px] px-5 w-full absolute top-0 left-0 z-10`}>
        <TouchableOpacity 
          onPress={handleDonePress} 
          className="w-[44px] h-[44px] rounded-full bg-[rgba(255,244,217,0.95)] items-center justify-center shadow-card"
     
        >
          <Ionicons name="chevron-back" size={22} color="#2D3720" />
        </TouchableOpacity>
      </View>
      
      {/* Prayer Card - matched to BiblePreviewComponent styling */} 
      <Animated.View 
        className="w-[90%] bg-surfaceCream rounded-[28px] py-8 px-6 items-center z-10 mt-[120px] mx-auto border-4 border-border"
        style={{ 
          opacity: cardOpacity, 
          transform: [{ translateY: cardAnim }] 
        }}
      >
        <View className="w-full bg-surfaceCream/50 rounded-[18px] p-4">
          <Text className="text-body text-textPrimary text-center text-heading font-feather text-center">
            {typedText}
          </Text>
        </View>
      </Animated.View>
      {/* Spacer to push the "Done Praying" button to the bottom */}
      <View className="flex-1 h-96" />
      {/* Animated Primary Button */}
      <Animated.View 
        className="w-full px-5 mb-10 mt-auto items-center z-10 mt-36"
        style={{
          opacity: buttonOpacity,
          transform: [{ translateY: buttonAnim }]
        }}
      >
        <PrimaryButton 
          title="Done Praying" 
          onPress={handleDonePress} 
        />
      </Animated.View>
    </View>
  );
};

export default PrayerComponent;
