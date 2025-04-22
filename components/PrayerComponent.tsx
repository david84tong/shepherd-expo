import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, Animated, Platform, Easing } from 'react-native';
import PrimaryButton from './PrimaryButton';
import { usePathStore } from '../app/stores/pathStore';
import BackButton from './BackButton';

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
const WAIT_DURATION_S = 10; // 10 seconds wait time

/**
 * PrayerComponent owns the UI **and** the logic for ending a prayer session.
 * When the user taps the "Done Praying" button we:
 *   1. Flip `isPraying` back to `false` so Home can hide this overlay.
 *   2. Trigger the `onDoneAnimation` callback provided by Home.
 */
const PrayerComponent: React.FC<PrayerComponentProps> = ({
  visible,
  onClose,
  buttonClassName, // Note: buttonClassName is not used currently, PrimaryButton handles its own styles
}) => {
  // Animation values for button entry
  const buttonAnim = useRef(new Animated.Value(50)).current; // Start 50 units below final position
  const buttonOpacity = useRef(new Animated.Value(0)).current; // Start fully transparent
  // Animation values for card entry
  const cardAnim = useRef(new Animated.Value(-100)).current; // Start 100 units above final position
  const cardOpacity = useRef(new Animated.Value(0)).current; // Start fully transparent
  
  // State and animation for the 10-second timer/progress bar
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerProgress = useRef(new Animated.Value(0)).current; // 0 to 1 for progress
  const shakeAnimation = useRef(new Animated.Value(0)).current; // For button shake

  const setPathInProgress = usePathStore((state) => state.setPathInProgress);

  // State for typing animation
  const [typedText, setTypedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Run animation when component becomes visible
  useEffect(() => {
    if (visible) {
      // Reset states immediately
      setPathInProgress(true);
      setIsTimerActive(true); 
      timerProgress.setValue(0);
      shakeAnimation.setValue(0);
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
      }, 600); // Start typing after entry animations start

      // Entry animations (Card + Button)
      Animated.parallel([
        Animated.timing(cardAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(buttonAnim, {
          toValue: 0,
          duration: 500,
          delay: 100, // Slight delay for button
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 400,
          delay: 100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      ]).start();

      // Timer and Progress Bar Animation
      Animated.timing(timerProgress, {
        toValue: 1,
        duration: WAIT_DURATION_S * 1000,
        easing: Easing.linear, // Linear fill for progress
        useNativeDriver: false, // Width animation is not supported by native driver
      }).start(({ finished }) => {
        if (finished) {
          setIsTimerActive(false); // Enable button
          // Trigger shake animation
          Animated.sequence([
            Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true })
          ]).start();
        }
      });

      // Cleanup timers on unmount or visibility change
      return () => {
        clearTimeout(typingTimer);
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
        timerProgress.stopAnimation(); // Stop progress animation if component hides
        shakeAnimation.stopAnimation();
      };
    } else {
      // Reset animations and state when component is hidden
      buttonAnim.setValue(50);
      buttonOpacity.setValue(0);
      cardAnim.setValue(-100);
      cardOpacity.setValue(0);
      timerProgress.setValue(0);
      shakeAnimation.setValue(0);
      setIsTimerActive(false);
      setTypedText('');
      setCurrentIndex(0);
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    }
  }, [visible, setPathInProgress, timerProgress, cardAnim, cardOpacity, buttonAnim, buttonOpacity, shakeAnimation]);

  if (!visible) return null;

  const handleDonePress = () => {

    // console.log('Triggering done praying animation...'); // Less noisy logs
    setPathInProgress(false);
    onClose(); // Trigger the animation controlled by Home.
  };

  // Interpolate progress bar width
  const progressBarWidth = timerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp', // Ensure width doesn't go beyond 100%
  });

  // Interpolate shake transform
  const shakeTranslateX = shakeAnimation.interpolate({
    inputRange: [-10, 0, 10],
    outputRange: [-5, 0, 5], // Adjust amplitude of shake here
  });

  return (
    <View className="absolute inset-0 flex flex-col" pointerEvents="box-none">
      {/* Back Button */}
      <BackButton 
        onPress={handleDonePress}
      />
      
      {/* Prayer Card */} 
      <Animated.View 
        className={`w-[90%] bg-surfaceCream rounded-[28px] pt-8 pb-4 px-6 items-center z-10 mt-[120px] mx-auto border-4 border-border`}
        style={{ 
          opacity: cardOpacity, 
          transform: [{ translateY: cardAnim }] 
        }}
      >
        <View className="w-full bg-surfaceCream/50 rounded-[18px] p-4 mb-4">
          <Text className="text-body text-textPrimary text-heading font-feather text-center ">
            {typedText}
          </Text>
        </View>
        {/* Progress Bar Container */}
        <View className="w-full h-4 bg-blue-100 rounded-full overflow-hidden">
           {/* Filling Progress Bar */}
          <Animated.View 
            className="h-full rounded-full" 
            style={{ width: progressBarWidth, backgroundColor: '#06B6FE' }}
          />
        </View>
      </Animated.View>

      {/* Spacer to push the "Done Praying" button to the bottom */}
      <View className="flex-1 h-64" />

      {/* Animated Button Container */}
      <Animated.View 
        className="w-full px-5 mb-10 mt-64"
        style={{
          opacity: buttonOpacity,
          transform: [{ translateY: buttonAnim }, { translateX: shakeTranslateX }]
        }}
      >
        <PrimaryButton 
          title="Done Praying" 
          onPress={handleDonePress} 
          disabled={isTimerActive}
          isActive={!isTimerActive} // Button is visually inactive during timer
        />
      </Animated.View>
    </View>
  );
};

export default PrayerComponent;
