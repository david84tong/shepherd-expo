import firestore from '@react-native-firebase/firestore';
import { useAssets } from 'expo-asset';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHomeStore, SuccessAnimationType } from '../app/stores/homeStore';
import { usePathStore } from '../app/stores/pathStore';
import { useUserStore } from '../app/stores/userStore';
import { BIBLE_BOOK_IDS } from '../app/models/Path';
import analytics from '~/utils/analytics';
import { getLevelData } from '~/utils/levelUtils';
import SuccessMessage from './SuccessMessage';
import { RPH } from '~/app/helper/helper';

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

// Add interface for ref methods
export interface JournalComponentRef {
  handleSave: () => void;
  handleCancel: () => void;
  setReflectionContent: (content: string) => void;
  getReflectionContent: () => string;
}

interface JournalProps {
  visible: boolean;
  onClose: ({isCompleted}:{isCompleted?:boolean}) => void;
  setFinishReading: (finishReading: boolean) => void;
  setJournalButtonEnabled: (enabled: boolean) => void;
}

// Get screen dimensions
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Minimum characters required to enable the save button
const MIN_CHARS_REQUIRED = 10;

/**
 * Component for the Daily Reflection/Journaling feature.
 * Includes an auto-focusing TextInput and handles keyboard appearance.
 */
const JournalComponent = forwardRef<JournalComponentRef, JournalProps>(({ visible, onClose, setFinishReading, setJournalButtonEnabled }, ref) => {
  // All hooks must be called at the top level, before any conditional returns
  const inputRef = useRef<TextInput>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const setPathInProgress = usePathStore((state) => state.setPathInProgress);
  const [reflectionContent, setReflectionContent] = useState('');
  const [buttonsEnabled, setButtonsEnabled] = useState(false);
  const [success, setSuccess] = useState(false);

  // Get the current path from pathStore
  const currentPath = usePathStore((state) => state.currentPath);

  // Check if this reflection was initiated from the verse reading
  const tappedReflectAboutVerse = useHomeStore((state) => state.tappedReflectAboutVerse);

  // Calculate character count
  const charCount = useMemo(() => reflectionContent.length, [reflectionContent]);

  // Check if button should be enabled
  const isButtonEnabled = useMemo(() => charCount >= MIN_CHARS_REQUIRED, [charCount]);

  useEffect(() => {
    if(isButtonEnabled){
      setJournalButtonEnabled(true);
    }
  }, [isButtonEnabled]);

  // Get store functions
  const setSuccessType = useHomeStore((state) => state.setSuccessType);
  const setReflectionCompleted = useHomeStore((state) => state.setReflectionCompleted);
  const readingCompleted = useHomeStore((state) => state.readingCompleted);
  const prayerCompleted = useHomeStore((state) => state.prayerCompleted);
  const sawDailyBonus = useHomeStore((state) => state.sawDailyBonus);
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

  const progressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animatedXP = useRef(new Animated.Value(0)).current;
  const animatedHearts = useRef(new Animated.Value(0)).current;
  const animatedTextOpacity = useRef(new Animated.Value(0.4)).current;

  const lambHearts = useUserStore((state) => state?.getLambHearts?.());
  const lamb = useUserStore((state) => state.getLamb?.());

  const animatedBlueOpacity = useRef(new Animated.Value(0.3)).current;
  const animatedGoldOpacity = useRef(new Animated.Value(0.4)).current;

  const MAX_HEARTS = 100;

  const levelInfo = useMemo(() => {
    if (!lamb || lamb.xp === undefined)
      return {
        level: 1,
        xp: 0,
        xpForCurrentLevel: 0,
        xpForNextLevel: 90,
        xpProgress: 0,
        xpNeeded: 90,
        progress: 0,
      };

    return getLevelData(lamb.xp);
  }, [lamb?.xp]);

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

    useHomeStore.getState().setShowGlobalButtons(true);
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
      useHomeStore.getState().setShowGlobalButtons(false);
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

  // Delayed progress animation for success view
  useEffect(() => {
    if (success) {
      animatedXP.setValue(0);
      animatedHearts.setValue(0);
      animatedTextOpacity.setValue(0.4);
      if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
      progressTimeoutRef.current = setTimeout(() => {
        Animated.timing(animatedXP, {
          toValue: levelInfo.progress,
          duration: 1200,
          useNativeDriver: false,
        }).start();
        Animated.timing(animatedHearts, {
          toValue: lambHearts,
          duration: 1200,
          useNativeDriver: false,
        }).start();
        setTimeout(() => {
          Animated.timing(animatedTextOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: false,
          }).start();
          setTimeout(() => {
            // Animate the opacity changes
            Animated.timing(animatedBlueOpacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }).start();

            Animated.timing(animatedGoldOpacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }).start();

            // Still update the state for disabled/enabled logic
            setButtonsEnabled(true);
            // setBlueButtonOpacity(1);
            // setGoldButtonOpacity(1);
          }, 1000);
        }, 1200);
      }, 500);
    } else {
      animatedXP.setValue(0);
      animatedHearts.setValue(0);
      animatedTextOpacity.setValue(0.4);
      // Reset to default opacity values
      animatedBlueOpacity.setValue(0.3);
      animatedGoldOpacity.setValue(0.4);
      setButtonsEnabled(false);
      // setBlueButtonOpacity(0.3);
      // setGoldButtonOpacity(0.4);
      if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
    }
    // Cleanup on unmount
    return () => {
      if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
    };
  }, [success, levelInfo.progress, lambHearts]);

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
      bottom: keyboardVisible ? keyboardHeight + -440 : -RPH(5),
    };
  }, [bottomContentOpacity, bottomContentAnimY, keyboardVisible, keyboardHeight]);

  // Expose methods through ref - must be called before any conditional returns
  useImperativeHandle(ref, () => ({
    handleSave: () => {
      useHomeStore.getState().setShowGlobalButtons(false);
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
      setFinishReading(true)
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
      setSuccess(true);
    },
    handleCancel: () => {
      useHomeStore.getState().setShowGlobalButtons(false);
      setPathInProgress(false);
      analytics.logEvent('Journal_Tapped_Cancel', {
        prompt: currentPath?.reflection,
      });
      useHomeStore.getState().setTappedReflectAboutVerse(false);
      console.log('Reset tappedReflectAboutVerse flag to false (from back button)');
      onClose({});
    },
    setReflectionContent: (content: string) => {
      setReflectionContent(content);
    },
    getReflectionContent: () => {
      return reflectionContent;
    }
  }));

  // Render logic
  if (!visible) return null;

  if (!riveAssets) {
    return (
      <View
        className="absolute flex w-full h-full justify-center items-center"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}>
        <ActivityIndicator size="large" color="#3C584A" />
      </View>
    );
  }

  return success ? (
    <Animated.View
      className="flex-1 w-full"
      style={{ opacity: containerOpacity, paddingHorizontal: 24 }}
      pointerEvents="box-none">
      <SuccessMessage
        title="Reflection Complete!"
        level={levelInfo.level}
        prevLevel={levelInfo.level}
        buttonsEnabled={buttonsEnabled}
        onGoHome={() => {
          setTimeout(() => {
            setFinishReading(false)
          }, 2000);

          const sawStreakToday = useHomeStore.getState().sawStreakToday;
          const isFirstReadingOfDay = !sawStreakToday;
          if (readingCompleted && prayerCompleted && isFirstReadingOfDay) {
            const setSawStreakToday = useHomeStore.getState().setSawStreakToday;
            const setSawDailyBonus = useHomeStore.getState().setSawDailyBonus;
            setSawStreakToday(true);
            setSawDailyBonus(true);
            router.push('/streak')
          }else if(!sawDailyBonus) {
            setSuccessType(SuccessAnimationType.BONUS);
            router.push('/success');
          }else{
            onClose({isCompleted:true});
          }

          // if (readingCompleted && prayerCompleted && !sawDailyBonus) {
          //   setSuccessType(SuccessAnimationType.BONUS);
          // } else {
          //   setSuccessType(SuccessAnimationType.REFLECTION);
          // }

        }}
        onPray={() => {}}
        prayButtonTitle=""
        hidePrayButton
        homeButtonTitle="Collect Bonus"
        rewardsTitle="REFLECTION REWARDS"
      />
    </Animated.View>
  ) : (
    <Animated.View
      className="flex-1 w-full"
      style={{ opacity: containerOpacity }}
      pointerEvents="box-none">
      <View className="flex-1 px-6">
        <Text className="text-[20px] text-brown/40 mb-4 mt-4 text-center leading-tight font-semibold">
          Time to reflect
        </Text>

        <Text className="text-[20px] font-feather text-brown/90 mb-6 text-center leading-tight">
          What practical step can deepen your daily delight in Scripture?
        </Text>

        <View className="w-full min-h-[230px] bg-[#FFF4D9] border-[3px] border-gold/70 p-5 mb-2" style={{ borderRadius: 20 }}>
          <TextInput
            ref={inputRef}
            className="w-full bg-transparent text-brown/95 text-[18px] font-nunito-medium min-h-[150px] text-left"
            placeholder={getPlaceholderText()}
            placeholderTextColor="#B89B4C"
            multiline
            textAlignVertical="top"
            scrollEnabled={true}
            style={{ flex: 1, padding: 0 }}
            value={reflectionContent}
            onChangeText={setReflectionContent}
            maxLength={300}
          />
        </View>

        <Text className="text-[14px] text-brown/40 mb-4 mt-1 text-center leading-tight font-semibold">
          {`${300 - charCount} characters left`}
        </Text>
      </View>
    </Animated.View>
  );
});

// Add display name
JournalComponent.displayName = 'JournalComponent';

export default JournalComponent;
