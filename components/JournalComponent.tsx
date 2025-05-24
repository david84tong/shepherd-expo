import firestore from '@react-native-firebase/firestore';
import { useAssets } from 'expo-asset';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Platform,
  Keyboard,
  Dimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';
import Rive from 'rive-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BackButton from './BackButton';
import PrimaryButton from './PrimaryButton';
import { useHomeStore, SuccessAnimationType } from '../app/stores/homeStore';
import { usePathStore } from '../app/stores/pathStore';
import { useUserStore } from '../app/stores/userStore';
import { BIBLE_BOOK_IDS } from '../app/models/Path';
import analytics from '~/utils/analytics';

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

interface JournalProps {
  visible: boolean;
  onClose: () => void;
}

// Get screen dimensions
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Minimum characters required to enable the save button
const MIN_CHARS_REQUIRED = 10;

/**
 * Component for the Daily Reflection/Journaling feature.
 * Includes an auto-focusing TextInput and handles keyboard appearance.
 */
const JournalComponent: React.FC<JournalProps> = ({ visible, onClose }) => {
  const inputRef = useRef<TextInput>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const setPathInProgress = usePathStore((state) => state.setPathInProgress);
  const [reflectionContent, setReflectionContent] = useState('');

  // Get the current path from pathStore
  const currentPath = usePathStore((state) => state.currentPath);

  // Check if this reflection was initiated from the verse reading
  const tappedReflectAboutVerse = useHomeStore((state) => state.tappedReflectAboutVerse);

  // Calculate character count
  const charCount = useMemo(() => reflectionContent.length, [reflectionContent]);

  // Check if button should be enabled
  const isButtonEnabled = useMemo(() => charCount >= MIN_CHARS_REQUIRED, [charCount]);

  // Get store functions
  const setSuccessType = useHomeStore((state) => state.setSuccessType);
  const setReflectionCompleted = useHomeStore((state) => state.setReflectionCompleted);
  const readingCompleted = useHomeStore((state) => state.readingCompleted);
  const prayerCompleted = useHomeStore((state) => state.prayerCompleted);
  const sawDailyBonus = useHomeStore((state) => state.sawDailyBonus);

  // Get userStore functions for saving reflection
  const addCompletedReflection = useUserStore((state) => state.addCompletedReflection);
  const setLastReflectionDate = useUserStore((state) => state.setLastReflectionDate);

  // Animation values
  const cardAnimY = useRef(new Animated.Value(200)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const buttonAnimY = useRef(new Animated.Value(100)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const bottomContentAnimY = useRef(new Animated.Value(100)).current;
  const bottomContentOpacity = useRef(new Animated.Value(0)).current;

  // Load Rive assets
  const [riveAssets] = useAssets([require('../assets/riveAnimations/homeLamb.riv')]);

  const insets = useSafeAreaInsets();
  const isSmallDevice = insets.top < 25 || SCREEN_HEIGHT < 700; // Detect small/non-notch devices like iPhone SE

  // Get appropriate placeholder text based on whether this is verse reflection
  const getPlaceholderText = () => {
    if (tappedReflectAboutVerse && currentPath) {
      console.log('currentPath =', currentPath.bookId);
      // Get book name from book ID
      const bookName = currentPath.bookId ? getBookNameFromId(currentPath.bookId) : 'this passage';
      const chapterText = currentPath.startChapter
        ? `${currentPath.startChapter}${currentPath.endChapter > currentPath.startChapter ? `-${currentPath.endChapter}` : ''}`
        : '';

      // Create readable reference
      const reference = chapterText ? `${bookName} ${chapterText}` : bookName;

      return `What stands out to you in ${reference}? How does this passage speak to your life today?`;
    }
    return "What's on your mind today?";
  };

  // Keyboard event listeners with height information
  useEffect(() => {
    const handleKeyboardShow = (event: any) => {
      const keyboardHeight = event.endCoordinates.height;
      setKeyboardHeight(keyboardHeight);
      setKeyboardVisible(true);
    };

    const handleKeyboardHide = () => {
      setKeyboardHeight(0);
      setKeyboardVisible(false);
    };

    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      handleKeyboardShow
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      handleKeyboardHide
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Set initial reflection content if coming from verse reflection
  useEffect(() => {
    if (
      visible &&
      tappedReflectAboutVerse &&
      currentPath &&
      currentPath.reflection &&
      reflectionContent === ''
    ) {
      console.log('Setting initial reflection content from currentPath');
      // We set this as a suggestion/starter but don't count it toward the minimum character count
      const initialContent = currentPath.reflection;
      setReflectionContent('');
    }
  }, [visible, tappedReflectAboutVerse, currentPath, reflectionContent]);

  // Entry and exit animations
  useEffect(() => {
    console.log('JournalComponent: visible =', visible);

    if (visible) {
      console.log('JournalComponent: Showing journal component');
      console.log('tappedReflectAboutVerse =', tappedReflectAboutVerse);

      // Set path in progress when component becomes visible
      setPathInProgress(true);

      // First animate the container
      Animated.timing(containerOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      // Then animate the card
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        delay: 200,
      }).start();

      Animated.timing(cardAnimY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
        delay: 200,
      }).start();

      // Finally animate the button
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        delay: 500,
      }).start();

      Animated.timing(buttonAnimY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
        delay: 500,
      }).start();

      // Animate bottom content (Rive + Button)
      Animated.timing(bottomContentOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        delay: 500,
      }).start();

      Animated.timing(bottomContentAnimY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
        delay: 500,
      }).start();

      // Focus the input after animations complete
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 600);

      return () => clearTimeout(timer);
    } else {
      // Reset animations when hiding
      containerOpacity.setValue(0);
      cardAnimY.setValue(200);
      cardOpacity.setValue(0);
      buttonAnimY.setValue(100);
      buttonOpacity.setValue(0);
      bottomContentAnimY.setValue(100);
      bottomContentOpacity.setValue(0);
      setReflectionContent(''); // Clear content when closing
    }
  }, [
    visible,
    cardAnimY,
    cardOpacity,
    containerOpacity,
    buttonAnimY,
    buttonOpacity,
    bottomContentAnimY,
    bottomContentOpacity,
    setPathInProgress,
    tappedReflectAboutVerse,
  ]);

  // Pre-compute memoized values outside and before any conditional returns
  const cardStyle = useMemo(() => {
    return {
      opacity: cardOpacity,
      transform: [{ translateY: cardAnimY }],
      maxHeight: keyboardVisible ? SCREEN_HEIGHT - keyboardHeight - 200 : SCREEN_HEIGHT - 280,
      minHeight: 250,
    };
  }, [cardOpacity, cardAnimY, keyboardVisible, keyboardHeight]);

  const bottomContentStyle = useMemo(() => {
    return {
      opacity: bottomContentOpacity,
      transform: [{ translateY: bottomContentAnimY }],
      bottom: keyboardVisible ? keyboardHeight + -440 : -100,
    };
  }, [bottomContentOpacity, bottomContentAnimY, keyboardVisible, keyboardHeight]);

  if (!visible) return null;

  // Show loading indicator if assets aren't loaded yet
  if (!riveAssets) {
    return (
      <View
        className="absolute flex w-full h-full justify-center items-center"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}>
        <ActivityIndicator size="large" color="#3C584A" />
      </View>
    );
  }

  const handleSave = () => {
    console.log('handleSave called');
    // Don't save if not enough characters
    if (reflectionContent.length < MIN_CHARS_REQUIRED) return;
    analytics.logEvent('JournalScreen_SaveReflection', {
      reflection_length: reflectionContent.length,
      reflection_content: reflectionContent,
      prompt: currentPath?.reflection,
    });
    Keyboard.dismiss();
    setPathInProgress(false);
    setReflectionCompleted(true); // Set reflection as completed

    // Reset tappedReflectAboutVerse flag
    useHomeStore.getState().setTappedReflectAboutVerse(false);
    console.log('Reset tappedReflectAboutVerse flag to false');

    // Create current timestamp
    const now = firestore.Timestamp.now();

    // Save reflection to userStore
    console.log('Saving reflection data to userStore');
    try {
      // Save the reflection content
      addCompletedReflection({
        date: now,
        content:
          tappedReflectAboutVerse && currentPath && currentPath.bookId
            ? `[${getBookNameFromId(currentPath.bookId)} ${currentPath.startChapter}${currentPath.endChapter > currentPath.startChapter ? `-${currentPath.endChapter}` : ''}] ${reflectionContent.trim()}`
            : reflectionContent.trim() || 'Reflected on my spiritual journey today.',
      });

      // Update last reflection date
      setLastReflectionDate(now);

      console.log('Reflection saved successfully');
    } catch (error) {
      console.log('Error saving reflection data:', error);
    }

    if (readingCompleted && prayerCompleted && !sawDailyBonus) {
      setSuccessType(SuccessAnimationType.BONUS);
    } else {
      setSuccessType(SuccessAnimationType.REFLECTION);
    }

    // Navigate to success screen
    router.push('/success');
  };

  return (
    <Animated.View
      className="absolute flex w-full"
      style={{ opacity: containerOpacity }}
      pointerEvents="box-none">
      {/* Header Row: Back + (Save on small devices) */}
      <View className="flex-row items-center justify-between px-4 mt-0">
        <BackButton
          onPress={() => {
            setPathInProgress(false);
            analytics.logEvent('Journal_Tapped_Cancel', {
              prompt: currentPath?.reflection,
            });
            useHomeStore.getState().setTappedReflectAboutVerse(false);
            console.log('Reset tappedReflectAboutVerse flag to false (from back button)');
            onClose();
          }}
        />
        {isSmallDevice && (
          <View style={{ zIndex: 30, marginLeft: 64, marginTop: 24 }}>
            <PrimaryButton
              title="Save Thought"
              onPress={() => {
                console.log('Small device Save button pressed');
                handleSave();
              }}
              disabled={!isButtonEnabled}
              style="w-36"
            />
          </View>
        )}
      </View>

      {/* Animated Card with TextInput */}
      <Animated.View
        className={`w-[90%] bg-surfaceCream rounded-[28px] py-8 px-6 items-center z-10 mx-auto my-auto ${isSmallDevice ? 'mt-[20px]' : 'mt-[120px]'} border-4 border-border pb-4`}
        style={cardStyle}>
        <Text className="text-body font-feather text-textPrimary mb-2 text-center leading-tight">
          {tappedReflectAboutVerse ? (currentPath?.reflection ?? 'Reflection') : 'Reflection'}
        </Text>

        {tappedReflectAboutVerse && currentPath && currentPath.bookId && (
          <Text className="text-body font-din text-description mb-2 text-center">
            {currentPath?.bookId && typeof currentPath?.startChapter === 'number'
              ? `${getBookNameFromId(currentPath?.bookId)} ${currentPath?.startChapter}${currentPath?.endChapter > currentPath?.startChapter ? `-${currentPath?.endChapter}` : ''}`
              : 'Scripture Reading'}
          </Text>
        )}

        {/* Text input area with character counter */}
        <View className="w-full relative flex-1">
          <TextInput
            ref={inputRef}
            className="w-full bg-surfaceCream/50 rounded-[18px] p-4 border border-border text-body font-din text-textPrimary"
            placeholder={getPlaceholderText()}
            placeholderTextColor="#B89B4C"
            multiline
            textAlignVertical="top"
            scrollEnabled={true}
            style={{ flex: 1 }}
            value={reflectionContent}
            onChangeText={setReflectionContent}
          />

          {/* Character count bubble */}
          <View className="absolute -top-3 -right-2 bg-white rounded-full py-1 px-3  border border-[#FFE4A8]">
            <Text className="font-feather text-sm text-textPrimary">{charCount}</Text>
          </View>
        </View>

        {/* Character count instruction (only show when under minimum) */}
        {charCount < MIN_CHARS_REQUIRED && (
          <Text className="font-din text-sm text-description mt-2 text-right self-end">
            Please write at least {MIN_CHARS_REQUIRED} characters
          </Text>
        )}
      </Animated.View>

      {/* Animated Bottom Content (Rive + Button) */}
      <Animated.View
        className="absolute left-0 right-0 flex-row items-center px-5 z-10"
        style={bottomContentStyle}>
        {/* Rive Animation */}
        <View className="w-[100px] h-[100px] -ml-5 -mb-2">
          <Rive
            // url={riveAssets[0].uri!}
            resourceName={'home_lamb'}
            artboardName="lamb-writing"
            autoplay
            style={{ width: '130%', height: '130%' }}
          />
        </View>

        {/* Save Button (hidden on small devices since it's in header) */}
        {!isSmallDevice && (
          <View className="flex-1 items-end w-[280px] ml-8 mt-4">
            <PrimaryButton title="Save Thought" onPress={handleSave} disabled={!isButtonEnabled} />
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
};

export default JournalComponent;
