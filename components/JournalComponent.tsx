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
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHomeStore, SuccessAnimationType } from '../app/stores/homeStore';
import { usePathStore } from '../app/stores/pathStore';
import { useUserStore } from '../app/stores/userStore';
import { useDevotionalStore } from '../app/stores/devotionalStore';
import { BIBLE_BOOK_IDS } from '../app/models/Path';
import analytics from '~/utils/analytics';
import { getLevelData } from '~/utils/levelUtils';
import SuccessMessage from './SuccessMessage';
import { RPH } from '~/app/helper/helper';
import PrimaryButton from './PrimaryButton';
import CircleButton from './Shared/CircleButton';
import i18n from '../app/utils/i18n';

const setJournalViewVisible = useHomeStore.getState().setJournalViewVisible;

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
  onClose: ({isCompleted, isReflectPresses}:{isCompleted?:boolean, isReflectPresses?:boolean}) => void;
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

  // Get current devotional from devotional store
  const { currentDevotional, fetchTodaysDevotional } = useDevotionalStore();

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

  // Reanimated values for background glow
  const backgroundGlow = useSharedValue(0);
  const componentOpacity = useSharedValue(0);

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

  // Load Rive assets - keeping the same asset for consistency
  const [riveAssets] = useAssets([require('../assets/riveAnimations/new_shepherd.riv')]);

  // Ensure devotional is fetched when component mounts
  useEffect(() => {
    console.log('📝 JournalComponent mounted, checking devotional...');
    if (!currentDevotional) {
      console.log('📝 No current devotional, fetching...');
      fetchTodaysDevotional();
    } else {
      console.log('📝 Current devotional exists:', currentDevotional.id);
    }
  }, []);

  // Smooth component fade-in and background glow animation
  useEffect(() => {
    if (visible) {
      // Fade in component
      componentOpacity.value = withTiming(1, { duration: 400 });
      
      // Start gentle background glow animation after a delay
      setTimeout(() => {
        backgroundGlow.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) })
          ),
          -1, // Infinite repeat
          false // Don't reverse
        );
      }, 500);
    } else {
      componentOpacity.value = 0;
      backgroundGlow.value = 0;
    }
  }, [visible]);

  const insets = useSafeAreaInsets();
  const isSmallDevice = insets.top < 25 || SCREEN_HEIGHT < 700; // Detect small/non-notch devices like iPhone SE

  // Get reflection prompt from devotional or fallback
  const getReflectionPrompt = () => {

    
    // First try to use the devotional reflection prompt (handle both string and object structures)
    if (currentDevotional?.reflectionPrompt) {
      if (typeof currentDevotional.reflectionPrompt === 'string') {
        console.log('📝 Using string reflection prompt:', currentDevotional.reflectionPrompt);
        return currentDevotional.reflectionPrompt;
      } else if (typeof currentDevotional.reflectionPrompt === 'object' && (currentDevotional.reflectionPrompt as any).en) {
        const prompt = (currentDevotional.reflectionPrompt as any).en;
        console.log('📝 Using object.en reflection prompt:', prompt);
        return prompt;
      }
    }
    
    // Fallback to default prompt
    console.log('📝 Using fallback prompt');
    return i18n.t('reflection_prompt_fallback');
  };

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

      return i18n.t('journal_placeholder', { reference });
    }
    return i18n.t('journal_placeholder');
  };

  // Keyboard event listeners with height information
  useEffect(() => {

    useHomeStore.getState().setShowGlobalButtons(true);
    const handleKeyboardShow = (event: any) => {
      const keyboardHeight = event.endCoordinates.height;
      setKeyboardHeight(keyboardHeight);
      setKeyboardVisible(true);
      
      // When textinput is focused, update bottomSheet to 90% in index.tsx
      if (visible && inputRef.current?.isFocused()) {
        // Access bottomSheetRef from index.tsx and snap to 90%
        useHomeStore.getState().setKeyboardVisible(true);
        // Get the bottomSheetRef from homeStore and snap to higher position (90%)
        const bottomSheetRef = useHomeStore.getState().bottomSheetRef;
        if (bottomSheetRef?.current) {
          bottomSheetRef.current.snapToIndex(6); // Index 6 is 90% in snapPoints array
        }
      }
    };

    const handleKeyboardHide = () => {
      setKeyboardHeight(0);
      setKeyboardVisible(false);
      
      // Reset keyboard visibility in homeStore and snap back to original position
      useHomeStore.getState().setKeyboardVisible(false);
      // Get the bottomSheetRef from homeStore and snap back to default position (80%)
      const bottomSheetRef = useHomeStore.getState().bottomSheetRef;
      if (bottomSheetRef?.current) {
        bottomSheetRef.current.snapToIndex(4); // Index 4 is 80% in snapPoints array
      }
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
      console.log('📝 Current devotional:', currentDevotional?.id, currentDevotional?.bibleReference);
      console.log('📝 Devotional reflection prompt available:', !!currentDevotional?.reflectionPrompt);
      console.log('📝 Using reflection prompt:', getReflectionPrompt());

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

      // Don't auto-focus the input - let user tap to focus manually
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
      // Hide global buttons/tab bar during success state
      useHomeStore.getState().setShowGlobalButtons(false);
      
      // Reset bottom sheet to 60% when success screen is shown
      const bottomSheetRef = useHomeStore.getState().bottomSheetRef;
      if (bottomSheetRef?.current) {
        bottomSheetRef.current.snapToIndex(0); // Index 0 is 60% in snapPoints array
      }
      
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
      // Show global buttons when not in success state
      useHomeStore.getState().setShowGlobalButtons(true);
      
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

  // Animated background style – using surfaceCream (#FDEBB8) as the base color
  const animatedBackgroundStyle = useAnimatedStyle(() => {
    const progress = backgroundGlow.value;
    // Use #FDEBB8 as base color with subtle glow animation
    const r = interpolate(progress, [0, 1], [253, 255]); // 253 (FD) -> slightly lighter
    const g = interpolate(progress, [0, 1], [235, 241]); // 235 (EB) -> slightly lighter
    const b = interpolate(progress, [0, 1], [184, 190]); // 184 (B8) -> slightly lighter

    return {
      backgroundColor: `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`,
    };
  });

  // Component fade-in animation style
  const componentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: componentOpacity.value,
    };
  });

  // Expose methods through ref - must be called before any conditional returns
  useImperativeHandle(ref, () => ({
    handleSave: () => {
      useHomeStore.getState().setShowGlobalButtons(false);
      setJournalViewVisible(false);
      console.log('handleSave called');
      // Don't save if not enough characters
      if (reflectionContent.length < MIN_CHARS_REQUIRED) return;
      
      // Apply rewards (1 heart + 25 XP for reflection)
      const heartReward = 1;
      const xpReward = 25;
      const MAX_HEARTS = 100;
      
      const currentHearts = useUserStore.getState().getLambHearts();
      const setLambHearts = useUserStore.getState().setLambHearts;
      const addXp = useUserStore.getState().addXp;
      const setLambMood = useUserStore.getState().setLambMood;
      
      // Calculate actual heart reward (don't exceed MAX_HEARTS)
      const heartsToAdd = Math.min(heartReward, MAX_HEARTS - currentHearts);
      
      // Apply rewards
      if (heartsToAdd > 0) {
        setLambHearts(currentHearts + heartsToAdd);
        // Update mood based on new heart count
        const newHeartCount = currentHearts + heartsToAdd;
        if (newHeartCount >= 80) {
          setLambMood('lamb-idle');
        } else if (newHeartCount >= 50) {
          setLambMood('lamb-idle');
        } else if (newHeartCount >= 30) {
          setLambMood('lamb-sleepy');
        } else if (newHeartCount >= 20) {
          setLambMood('lamb-angry');
        }
      }
      
      // Always add XP
      addXp(xpReward);
      
      analytics.logEvent('JournalScreen_SaveReflection', {
        reflection_length: reflectionContent.length,
        reflection_content: reflectionContent,
        prompt: currentPath?.reflection,
        devotionalId: currentDevotional?.id || null,
        devotionalPrompt: getReflectionPrompt(),
        bibleReference: currentDevotional?.bibleReference || null,
        heartsAwarded: heartsToAdd,
        xpAwarded: xpReward,
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
      setJournalViewVisible(false);
      setPathInProgress(false);
      
      // Reset bottom sheet to original position
      const homeStore = useHomeStore.getState();
      const bottomSheetRef = homeStore.bottomSheetRef;
      if (bottomSheetRef?.current) {
        bottomSheetRef.current.snapToIndex(0); // Return to original closed position
      }
      
      analytics.logEvent('Journal_Tapped_Cancel', {
        prompt: currentPath?.reflection,
        devotionalId: currentDevotional?.id || null,
        devotionalPrompt: getReflectionPrompt(),
        bibleReference: currentDevotional?.bibleReference || null,
      });
      useHomeStore.getState().setTappedReflectAboutVerse(false);
      console.log('Reset tappedReflectAboutVerse flag to false (from back button)');
      onClose({});
      
      // Reset Rive animation to idle state with delay after navigation
      setTimeout(() => {
        const riveRef = homeStore.riveRef;
        if (riveRef?.current?.setInputState) {
          try {
            riveRef.current.setInputState('State Machine 1', 'Action-Number', 0); // 0 = Idle
            console.log('Reset Rive animation to idle state after cancel delay');
          } catch (error) {
            console.log('Could not reset Rive state after cancel:', error);
          }
        }
      }, 800); // Shorter delay for cancel since it's just going back to home
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
    <Reanimated.View
      className="flex-1 w-full bg-surfaceCream px-8"
      pointerEvents="box-none">
      <Animated.View style={{ opacity: containerOpacity, flex: 1 }}>
        <SuccessMessage
        title={i18n.t('reflection_complete')}
        description={i18n.t('reflection_complete_desc')}
        level={levelInfo.level}
        prevLevel={levelInfo.level}
        buttonsEnabled={buttonsEnabled}
        onGoHome={() => {
          setTimeout(() => {
            setFinishReading(false)
          }, 2000);

          setJournalViewVisible(false);

          // Ensure reflection completion state is maintained
          console.log('🔍 JOURNAL SUCCESS - Ensuring reflection completion state is maintained');
          setReflectionCompleted(true);

          const sawStreakToday = useHomeStore.getState().sawStreakToday;
          const isFirstReadingOfDay = !sawStreakToday;
          const isBonusAvailable = readingCompleted && prayerCompleted && isFirstReadingOfDay && !sawDailyBonus;
          
          // if (readingCompleted && prayerCompleted && isFirstReadingOfDay) {
          //   const setSawStreakToday = useHomeStore.getState().setSawStreakToday;
          //   const setSawDailyBonus = useHomeStore.getState().setSawDailyBonus;
          //   setSawStreakToday(true);
          //   setSawDailyBonus(true);
          //   router.push('/streak')
          // }else 
          if(isBonusAvailable) {
            setSuccessType(SuccessAnimationType.BONUS);
            router.push({
              pathname: '/success',
              params: {
                showStreakScreen: 'true'
              }
            });
            
            // Reset Rive animation to appropriate state after navigation with delay
            setTimeout(() => {
              const homeStore = useHomeStore.getState();
              const riveRef = homeStore.riveRef;
              if (riveRef?.current?.setInputState) {
                try {
                  // Get current lamb mood to set appropriate idle state
                  const currentMood = useUserStore.getState()?.getLambMood?.();
                  const moodToStateInput: Record<string, number> = {
                    'lamb-idle': 0,           // >= 50 hearts - Idle
                    'lamb-sleepy': 4,         // < 50 hearts - Sleepy  
                    'lamb-angry': 5,          // < 30 hearts - Angry
                    'lamb-chubby dying': 6,   // < 20 hearts - Dying Chubby
                    'lamb-skinny dying': 7,   // < 10 hearts - Dying Skinny
                    'smoking': 8,             // < 1 hearts - Dead
                    'lamb-full': 3,           // After eating - Full
                  };
                  const targetStateInput = moodToStateInput[currentMood] || 0;
                  riveRef.current.setInputState('State Machine 1', 'Action-Number', targetStateInput);
                  console.log(`Reset Rive animation to mood state: ${targetStateInput} (${currentMood}) after navigation delay`);
                } catch (error) {
                  console.log('Could not reset Rive state after navigation:', error);
                }
              }
            }, 1000); // 1 second delay after navigation
          }else{
            onClose({isCompleted:true});
            
            // Reset Rive animation to appropriate state after navigation with delay
            setTimeout(() => {
              const homeStore = useHomeStore.getState();
              const riveRef = homeStore.riveRef;
              if (riveRef?.current?.setInputState) {
                try {
                  // Get current lamb mood to set appropriate idle state
                  const currentMood = useUserStore.getState()?.getLambMood?.();
                  const moodToStateInput: Record<string, number> = {
                    'lamb-idle': 0,           // >= 50 hearts - Idle
                    'lamb-sleepy': 4,         // < 50 hearts - Sleepy  
                    'lamb-angry': 5,          // < 30 hearts - Angry
                    'lamb-chubby dying': 6,   // < 20 hearts - Dying Chubby
                    'lamb-skinny dying': 7,   // < 10 hearts - Dying Skinny
                    'smoking': 8,             // < 1 hearts - Dead
                    'lamb-full': 3,           // After eating - Full
                  };
                  const targetStateInput = moodToStateInput[currentMood] || 0;
                  riveRef.current.setInputState('State Machine 1', 'Action-Number', targetStateInput);
                  console.log(`Reset Rive animation to mood state: ${targetStateInput} (${currentMood}) after navigation delay`);
                } catch (error) {
                  console.log('Could not reset Rive state after navigation:', error);
                }
              }
            }, 1000); // 1 second delay after navigation
          }

          // if (readingCompleted && prayerCompleted && !sawDailyBonus) {
          //   setSuccessType(SuccessAnimationType.BONUS);
          // } else {
          //   setSuccessType(SuccessAnimationType.REFLECTION);
          // }

        }}
        onPray={() => {
          // Handle bonus collection if available
          const sawStreakToday = useHomeStore.getState().sawStreakToday;
          const isFirstReadingOfDay = !sawStreakToday;
          const isBonusAvailable = readingCompleted && prayerCompleted && isFirstReadingOfDay && !sawDailyBonus;
          
          if (isBonusAvailable) {
            setSuccessType(SuccessAnimationType.BONUS);
            router.push({
              pathname: '/success',
              params: {
                showStreakScreen: 'true'
              }
            });
            
            // Reset Rive animation to appropriate state after navigation with delay
            setTimeout(() => {
              const homeStore = useHomeStore.getState();
              const riveRef = homeStore.riveRef;
              if (riveRef?.current?.setInputState) {
                try {
                  const currentMood = useUserStore.getState()?.getLambMood?.();
                  const moodToStateInput: Record<string, number> = {
                    'lamb-idle': 0,
                    'lamb-sleepy': 4,
                    'lamb-angry': 5,
                    'lamb-chubby dying': 6,
                    'lamb-skinny dying': 7,
                    'smoking': 8,
                    'lamb-full': 3,
                  };
                  const targetStateInput = moodToStateInput[currentMood] || 0;
                  riveRef.current.setInputState('State Machine 1', 'Action-Number', targetStateInput);
                  console.log(`Reset Rive animation to mood state: ${targetStateInput} (${currentMood}) after navigation delay`);
                } catch (error) {
                  console.log('Could not reset Rive state after navigation:', error);
                }
              }
            }, 1000);
          } else {
            // Normal prayer flow - close journal and signal to open prayer view
            setJournalViewVisible(false);
            onClose({ isReflectPresses: true }); // Pass flag to trigger prayer navigation
          }
        }}
        rewardsTitle="REFLECTION REWARDS"
      />
      </Animated.View>
    </Reanimated.View>
  ) : (
    <Reanimated.View
      className="flex-1 w-full mt-2 bg-surfaceCream"
      pointerEvents="box-none">
      <Animated.View style={{ opacity: containerOpacity, flex: 1 }}>
      <View className="flex-1 px-6">
    
        <Text className="text-body font-feather text-brown/90 mb-2 text-center leading-tight mt-0 mb-4">
          {getReflectionPrompt()}
        </Text>

        <View className="w-full min-h-[230px] bg-surfaceCream border-[3px] border-gold/70 p-5 mb-2 shadow-card" style={{ borderRadius: 20 }}>
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

        {/* <Text className="text-[14px] text-brown/40 mt-1 text-center leading-tight font-semibold">
          {`${300 - charCount} characters left`}
        </Text> */}
        
        <View className="flex-row justify-between items-center mt-2 mb-4 px-2">
          <CircleButton 
            icon="x" 
            size={50} 
            onPress={() => {
              // Call the existing cancel handler implementation
              useHomeStore.getState().setShowGlobalButtons(false);
              setJournalViewVisible(false);
              setPathInProgress(false);
              
              // Reset bottom sheet to original position
              const homeStore = useHomeStore.getState();
              const bottomSheetRef = homeStore.bottomSheetRef;
              if (bottomSheetRef?.current) {
                bottomSheetRef.current.snapToIndex(0); // Return to original closed position
              }
              
              analytics.logEvent('Journal_Tapped_Cancel', {
                prompt: currentPath?.reflection,
                devotionalId: currentDevotional?.id || null,
                devotionalPrompt: getReflectionPrompt(),
                bibleReference: currentDevotional?.bibleReference || null,
              });
              useHomeStore.getState().setTappedReflectAboutVerse(false);
              console.log('Reset tappedReflectAboutVerse flag to false (from cancel button)');
              onClose({});
              
              // Reset Rive animation to idle state with delay after navigation
              setTimeout(() => {
                const riveRef = homeStore.riveRef;
                if (riveRef?.current?.setInputState) {
                  try {
                    riveRef.current.setInputState('State Machine 1', 'Action-Number', 0); // 0 = Idle
                    console.log('Reset Rive animation to idle state after cancel delay');
                  } catch (error) {
                    console.log('Could not reset Rive state after cancel:', error);
                  }
                }
              }, 800); // Shorter delay for cancel since it's just going back to home
            }}
          />
          <View style={{ width: '80%' }}>
            <PrimaryButton
              title={charCount >= MIN_CHARS_REQUIRED ? i18n.t('save_thoughts') : i18n.t('write_button')}
              disabled={!isButtonEnabled}
              onPress={() => {
                if (isButtonEnabled) {
                  // Directly call the internal method implementation instead of using the ref
                  useHomeStore.getState().setShowGlobalButtons(false);
                  setJournalViewVisible(false);
                  console.log('handleSave called');
                  // Don't save if not enough characters
                  if (reflectionContent.length < MIN_CHARS_REQUIRED) return;
                  
                  // Apply rewards (1 heart + 25 XP for reflection)
                  const heartReward = 1;
                  const xpReward = 25;
                  const MAX_HEARTS = 100;
                  
                  const currentHearts = useUserStore.getState().getLambHearts();
                  const setLambHearts = useUserStore.getState().setLambHearts;
                  const addXp = useUserStore.getState().addXp;
                  const setLambMood = useUserStore.getState().setLambMood;
                  
                  // Calculate actual heart reward (don't exceed MAX_HEARTS)
                  const heartsToAdd = Math.min(heartReward, MAX_HEARTS - currentHearts);
                  
                  // Apply rewards
                  if (heartsToAdd > 0) {
                    setLambHearts(currentHearts + heartsToAdd);
                    // Update mood based on new heart count
                    const newHeartCount = currentHearts + heartsToAdd;
                    if (newHeartCount >= 80) {
                      setLambMood('lamb-idle');
                    } else if (newHeartCount >= 50) {
                      setLambMood('lamb-idle');
                    } else if (newHeartCount >= 30) {
                      setLambMood('lamb-sleepy');
                    } else if (newHeartCount >= 20) {
                      setLambMood('lamb-angry');
                    }
                  }
                  
                  // Always add XP
                  addXp(xpReward);
                  
                  analytics.logEvent('JournalScreen_SaveReflection', {
                    reflection_length: reflectionContent.length,
                    reflection_content: reflectionContent,
                    prompt: currentPath?.reflection,
                    devotionalId: currentDevotional?.id || null,
                    devotionalPrompt: getReflectionPrompt(),
                    bibleReference: currentDevotional?.bibleReference || null,
                    heartsAwarded: heartsToAdd,
                    xpAwarded: xpReward,
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
                }
              }}
              buttonType="blue"
              icon={require('../assets/icons/starIcon.png')}
              reward={"+25"}
            />
          </View>
        </View>
      </View>
      </Animated.View>
    </Reanimated.View>
  );
});

// Add display name
JournalComponent.displayName = 'JournalComponent';

export default JournalComponent;
