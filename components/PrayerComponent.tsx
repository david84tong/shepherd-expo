import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Text,
  View,
} from 'react-native';

import { SuccessAnimationType, useHomeStore } from '../app/stores/homeStore';
import { usePathStore } from '../app/stores/pathStore';
import { usePrayerStore } from '../app/stores/prayerStore';
import { useUserStore } from '../app/stores/userStore';
import BackButton from './BackButton';
import PrimaryButton from './PrimaryButton';
import { BIBLE_BOOK_IDS } from '../app/models/Path';

// Helper function to get book name from book ID
const getBookNameFromId = (bookId: number): string => {
  // Find the book name by looking through the BIBLE_BOOK_IDS object
  for (const [bookName, id] of Object.entries(BIBLE_BOOK_IDS)) {
    if (id === bookId) {
      return bookName;
    }
  }
  return 'Scripture'; // Fallback if book ID not found
};

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
  const tappedPrayAboutVerse = useHomeStore((state) => state.tappedPrayAboutVerse);
  const setPathInProgress = usePathStore((state) => state.setPathInProgress);
  
  // Get current path from pathStore for scripture-specific prayer
  const currentPath = usePathStore((state) => state.currentPath);

  // Get userStore functions for saving prayer
  const addCompletedPrayer = useUserStore((state) => state.addCompletedPrayer);
  const setLastPrayerDate = useUserStore((state) => state.setLastPrayerDate);

  // Get prayer content from prayerStore
  const { recentPrayers } = usePrayerStore();
  const prayerTopic = recentPrayers.length > 0 ? recentPrayers[0] : '';

  // Generate prayer text based on the user's selected topic or currentPath
  const generatePrayerText = () => {
    // If we're praying about the verse (coming from reading success)
    if (tappedPrayAboutVerse && currentPath && currentPath.prayer) {
      console.log('Using path-specific prayer text from currentPath');
      return currentPath.prayer;
    }

    // Otherwise use topic-based prayer or default
    if (!prayerTopic) return DEFAULT_PRAYER_TEMPLATE;

    return `Dear God, I come before you today with a humble heart. Please help me with ${prayerTopic.toLowerCase()} in my life. Guide me through this journey and give me strength. Thank you for your endless love and grace. Amen.`;
  };

  // Prayer text to display (with the user's topic)
  const [prayerText, setPrayerText] = useState('');

  // State for typing animation
  const [typedText, setTypedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load Rive assets (if needed in the future)

  // Run animation when component becomes visible
  useEffect(() => {
    console.log('PrayerComponent: visible =', visible);

    if (visible) {
      console.log('PrayerComponent: Showing prayer component');
      console.log('tappedPrayAboutVerse =', tappedPrayAboutVerse);
      
      let newPrayerText = '';
      
      // Check if this is a scripture-specific prayer
      if (tappedPrayAboutVerse && currentPath && currentPath.prayer) {
        console.log('Using scripture-specific prayer:', currentPath.prayer);
        newPrayerText = currentPath.prayer;
      } else {
        // Get latest prayer topic and generate prayer text
        const currentPrayerTopic = usePrayerStore.getState().recentPrayers[0] || '';
        console.log('Current prayer topic:', currentPrayerTopic);

        // Generate fresh prayer text based on the current topic
        if (currentPrayerTopic) {
          newPrayerText = `Dear God, I come before you today with a humble heart. Please help me with ${currentPrayerTopic.toLowerCase()} in my life. Guide me through this journey and give me strength. Thank you for your endless love and grace. Amen.`;
          console.log('Generated custom prayer text for:', currentPrayerTopic);
        } else {
          console.log('No prayer topic found, using default prayer');
          newPrayerText = DEFAULT_PRAYER_TEMPLATE;
        }
      }

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
              if (typingIntervalRef.current) {
                clearInterval(typingIntervalRef.current);
                typingIntervalRef.current = null;
              }
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
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
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
    tappedPrayAboutVerse,
    currentPath,
  ]);

  // Function to render prayer text with highlighted topic
  const renderPrayerText = () => {
    // Only log when typing is complete, not on every character
    if (typedText && typedText.length === prayerText.length) {
      console.log('Typing completed.');
    }
    
    if (!typedText) {
      return <Text className="text-body text-textPrimary font-din">{typedText}</Text>;
    }
    
    // If this is a scripture prayer, just display it without highlighting
    if (tappedPrayAboutVerse && currentPath && currentPath.prayer) {
      return <Text className="text-body text-textPrimary font-din">{typedText}</Text>;
    }

    // For topic-based prayers, highlight the topic
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
    console.log('Prayer completed');
    
    // Disable Button while praying
    if (isTimerActive) return;

    // Disable animations if we're already done
    shakeAnimation.setValue(0);
    
    // Set path in progress to false
    setPathInProgress(false);
    
    // Reset tappedPrayAboutVerse flag
    useHomeStore.getState().setTappedPrayAboutVerse(false);
    console.log('Reset tappedPrayAboutVerse flag to false');

    // Flip isPraying in the HomeStore to hide this component
    setPrayerCompleted(true);

    // Create current timestamp 
    const now = firestore.Timestamp.now();
    
    // Save prayer data to userStore
    console.log('Saving prayer data to userStore');
    try {
      // Add completed prayer with topic and scripture context if applicable
      addCompletedPrayer({
        date: now,
        topic: tappedPrayAboutVerse && currentPath ? 
          `${getBookNameFromId(currentPath.bookId) || 'shimate'} ${currentPath.startChapter}-${currentPath.endChapter}` : 
          (prayerTopic || 'general prayer'),
        type: tappedPrayAboutVerse ? 'scripture' : 'general',
      });
      
      // Update last prayer date
      setLastPrayerDate(now);
      
      console.log('Prayer data saved successfully');
    } catch (error) {
      console.error('Error saving prayer data:', error);
    }

    // Navigate to success screen, or trigger animation on home
    if (readingCompleted && reflectionCompleted && !sawDailyBonus) {
      setSuccessType(SuccessAnimationType.BONUS);
    } else {
      setSuccessType(SuccessAnimationType.PRAYER);
    }

    // Navigate to success screen
    router.push('/success');
  };

  // New handler specifically for back button
  const handleBackPress = () => {
    console.log('Back button pressed - canceling prayer');
    setPathInProgress(false);
    
    // Reset tappedPrayAboutVerse flag when canceling
    useHomeStore.getState().setTappedPrayAboutVerse(false);
    console.log('Reset tappedPrayAboutVerse flag to false (from back button)');
    
    // Invoke the callback provided by the parent
    onClose();
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
        {/* Header title */}
        <Text className="text-heading font-feather text-textPrimary mb-1 text-center">
          {tappedPrayAboutVerse && currentPath && currentPath.unitTitle 
            ? currentPath.unitTitle 
            : "Prayer"}
        </Text>
        
        {/* Subtitle with book and chapter range */}
        {tappedPrayAboutVerse && currentPath && currentPath.bookId && (
          <Text className="text-body font-din text-description mb-4 text-center">
            {currentPath.bookId && typeof currentPath.startChapter === 'number' && typeof currentPath.endChapter === 'number'
              ? `${getBookNameFromId(currentPath.bookId) || ''} ${currentPath.startChapter}${currentPath.endChapter > currentPath.startChapter ? `-${currentPath.endChapter}` : ''}`
              : 'Scripture Reading'
            }
          </Text>
        )}
        {!tappedPrayAboutVerse && <View className="mb-4" />}

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
