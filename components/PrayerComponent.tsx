import firestore from '@react-native-firebase/firestore';
import { useAssets } from 'expo-asset';
import { router } from 'expo-router';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Animated,
  Easing,
} from 'react-native';

import BackButton from './BackButton';
import PrimaryButton from './PrimaryButton';
import { useHomeStore, SuccessAnimationType } from '../app/stores/homeStore';
import { usePathStore } from '../app/stores/pathStore';
import { usePrayerStore } from '../app/stores/prayerStore';
import { useUserStore } from '../app/stores/userStore';

// Default prayer template if no user prayer is available
const DEFAULT_PRAYER_TEMPLATE =
  'Dear God, I come before you today with a heart full of gratitude. Please help me find inner peace and wisdom in all that I do. Amen.';

interface PrayerComponentProps {
  /** Whether the component should render. */
  visible: boolean;
  /** Callback function to trigger the animation back to default state. */
  onClose: () => void;
  /** Optional style for the PrimaryButton */
  buttonClassName?: string;
}

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

  // Get store functions
  const setSuccessType = useHomeStore((state) => state.setSuccessType);
  const setPrayerCompleted = useHomeStore((state) => state.setPrayerCompleted);
  const readingCompleted = useHomeStore((state) => state.readingCompleted);
  const reflectionCompleted = useHomeStore((state) => state.reflectionCompleted);
  const sawDailyBonus = useHomeStore((state) => state.sawDailyBonus);
  const setPathInProgress = usePathStore((state) => state.setPathInProgress);

  // Get userStore functions for saving prayer
  const addCompletedPrayer = useUserStore((state) => state.addCompletedPrayer);
  const setLastPrayerDate = useUserStore((state) => state.setLastPrayerDate);

  // Get prayer content from prayerStore
  const { recentPrayers } = usePrayerStore();
  const prayerTopic = recentPrayers.length > 0 ? recentPrayers[0] : '';

  // Generate prayer text based on the user's selected topic
  const generatePrayerText = () => {
    if (!prayerTopic) return DEFAULT_PRAYER_TEMPLATE;

    return `Dear God, I come before you today with a humble heart. Please help me with ${prayerTopic.toLowerCase()} in my life. Guide me through this journey and give me strength. Thank you for your endless love and grace. Amen.`;
  };

  // Prayer text to display (with the user's topic)
  const [prayerText, setPrayerText] = useState(generatePrayerText());

  // State for typing animation
  const [typedText, setTypedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load Rive assets (if needed in the future)
  const [riveAssets] = useAssets([require('../assets/riveAnimations/homeLamb.riv')]);

  // Run animation when component becomes visible
  useEffect(() => {
    console.log('PrayerComponent: visible =', visible);

    if (visible) {
      console.log('PrayerComponent: Showing prayer component');
      // Generate fresh prayer text
      const newPrayerText = generatePrayerText();
      setPrayerText(newPrayerText);

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
            if (prevIndex < newPrayerText.length) {
              setTypedText((prev) => newPrayerText.substring(0, prevIndex + 1));
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
        }),
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
            Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
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
  }, [
    visible,
    setPathInProgress,
    timerProgress,
    cardAnim,
    cardOpacity,
    buttonAnim,
    buttonOpacity,
    shakeAnimation,
    prayerTopic,
  ]);

  // Function to render prayer text with highlighted topic
  const renderPrayerText = () => {
    if (!prayerTopic || !typedText) {
      return <Text className="text-body text-textPrimary font-din">{typedText}</Text>;
    }

    // Check if the prayer topic is in the typed text (case insensitive)
    const lowerTypedText = typedText.toLowerCase();
    const lowerPrayerTopic = prayerTopic.toLowerCase();

    if (lowerTypedText.includes(lowerPrayerTopic)) {
      // Find the actual case as it appears in typed text
      const startIndex = lowerTypedText.indexOf(lowerPrayerTopic);
      const endIndex = startIndex + prayerTopic.length;

      // Split text into parts: before topic, topic, after topic
      const beforeTopic = typedText.substring(0, startIndex);
      const topicText = typedText.substring(startIndex, endIndex);
      const afterTopic = typedText.substring(endIndex);

      return (
        <Text className="text-body text-textPrimary font-din">
          {beforeTopic}
          <Text className="text-blue font-feather">{topicText}</Text>
          {afterTopic}
        </Text>
      );
    }

    // If topic not found, just return the text
    return <Text className="text-body text-textPrimary font-din">{typedText}</Text>;
  };

  // Interpolate derived values (memoised to prevent listener leaks)
  // IMPORTANT: These hooks must be before any conditional returns
  const progressBarWidth = useMemo(() => {
    return timerProgress.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
      extrapolate: 'clamp', // Ensure width doesn't go beyond 100%
    });
  }, []);

  const shakeTranslateX = useMemo(() => {
    return shakeAnimation.interpolate({
      inputRange: [-10, 0, 10],
      outputRange: [-5, 0, 5],
    });
  }, []);

  if (!visible) return null;

  const handleDonePress = () => {
    console.log('PrayerComponent: Amen button pressed, updating completion status');

    // Mark prayer as completed
    setPrayerCompleted(true);
    setPathInProgress(false);

    // Create current timestamp
    const now = firestore.Timestamp.now();

    // Save prayer data to userStore
    console.log('Saving prayer data to userStore');
    try {
      // Save the completed prayer
      addCompletedPrayer({
        date: now,
        type: 'standard', // You could add more prayer types later
        topic: prayerTopic || 'general', // Save the prayer topic
      });

      // Update last prayer date
      setLastPrayerDate(now);

      console.log('Prayer saved successfully');
    } catch (error) {
      console.error('Error saving prayer data:', error);
    }

    // Check if all three tasks are completed
    if (readingCompleted && reflectionCompleted && !sawDailyBonus) {
      setSuccessType(SuccessAnimationType.BONUS);
    } else {
      setSuccessType(SuccessAnimationType.PRAYER);
    }

    // Delayed navigation to ensure state updates first
    setTimeout(() => {
      try {
        // Use absolute path format to ensure proper navigation
        router.push('/success');
        console.log('Successfully navigated to success screen');
      } catch (error) {
        console.error('Error navigating to success screen:', error);
        // Fallback to onClose if navigation fails
        onClose && onClose();
      }
    }, 100); // Short delay to ensure state updates first
  };

  // New handler specifically for back button
  const handleBackPress = () => {
    console.log('PrayerComponent: Back button pressed, just closing');
    setPathInProgress(false);
    // Just call onClose without showing success screen
    onClose && onClose();
  };

  return (
    <View className="flex flex-col h-full w-full absolute" pointerEvents="box-none">
      {/* Back Button */}
      <BackButton onPress={handleBackPress} containerClassName="-pt-[4px]" />

      {/* Prayer Card */}
      <Animated.View
        className="w-[90%] bg-surfaceCream rounded-[28px] pt-8 pb-4 px-6 mt-[120px] items-center z-10 mx-auto border-4 border-border"
        style={{
          opacity: cardOpacity,
          transform: [{ translateY: cardAnim }],
        }}>
        <View className="w-full bg-surfaceCream/50 rounded-[18px] p-4 mb-4">
          {renderPrayerText()}
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
      <View className="flex-1 h-[100px]" />

      {/* Animated Button Container */}
      <Animated.View
        className="w-full px-5 mb-10 absolute -bottom-24"
        style={{
          opacity: buttonOpacity,
          transform: [{ translateY: buttonAnim }, { translateX: shakeTranslateX }],
        }}>
        <View className="mt-64">
          <PrimaryButton title="Amen" onPress={handleDonePress} disabled={isTimerActive} />
        </View>
      </Animated.View>
    </View>
  );
};

export default PrayerComponent;
