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
import {
  useHomeStore,
  SuccessAnimationType,
  isBonusAvailable as isBonusAvailableSelector,
} from '../app/stores/homeStore';
import { usePathStore } from '../app/stores/pathStore';
import { useUserStore } from '../app/stores/userStore';
import { useDevotionalStore } from '../app/stores/devotionalStore';
import { BIBLE_BOOK_IDS } from '../app/models/Path';
import analytics from '~/utils/analytics';
import { getLevelData } from '~/utils/levelUtils';
import SuccessMessage from './SuccessMessage';
import { appLog, RPH } from '~/app/helper/helper';
import PrimaryButton from './PrimaryButton';
import CircleButton from './Shared/CircleButton';
import i18n from '../app/utils/i18n';
import { useSoundStore } from '~/app/stores/soundStore';

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
  onClose: ({ isCompleted, isReflectPresses }: { isCompleted?: boolean, isReflectPresses?: boolean }) => void;
  setFinishReading: (finishReading: boolean) => void;
  setJournalButtonEnabled: (enabled: boolean) => void;
  setShowJournalContent?: (show: boolean) => void;
}

// Get screen dimensions
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Minimum characters required to enable the save button
const MIN_CHARS_REQUIRED = 10;

/**
 * Component for the Daily Reflection/Journaling feature.
 * Includes an auto-focusing TextInput and handles keyboard appearance.
 */
const JournalComponent = forwardRef<JournalComponentRef, JournalProps>(({ visible, onClose, setFinishReading, setJournalButtonEnabled, setShowJournalContent }, ref) => {
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
    if (isButtonEnabled) {
      setJournalButtonEnabled(true);
    }
  }, [isButtonEnabled]);

  // Get store functions
  const setSuccessType = useHomeStore((state) => state.setSuccessType);
  const setReflectionCompleted = useHomeStore((state) => state.setReflectionCompleted);
  const reflectionCompleted = useHomeStore((state) => state.reflectionCompleted);
  const readingCompleted = useHomeStore((state) => state.readingCompleted);
  const prayerCompleted = useHomeStore((state) => state.prayerCompleted);
  const sawDailyBonus = useHomeStore((state) => state.sawDailyBonus);
  const addCompletedReflection = useUserStore((state) => state.addCompletedReflection);
  const setLastReflectionDate = useUserStore((state) => state.setLastReflectionDate);

  const shouldShowBonus = useHomeStore(isBonusAvailableSelector);

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
    appLog('📝 JournalComponent mounted, checking devotional...');
    if (!currentDevotional) {
      appLog('📝 No current devotional, fetching...');
      fetchTodaysDevotional();
    } else {
      appLog('📝 Current devotional exists:', currentDevotional.id);
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
    // If reflection is already completed, show a different prompt
    if (reflectionCompleted) {
      return "Tell God what's on your mind";
    }

    // First try to use the devotional reflection prompt (handle both string and object structures)
    if (currentDevotional?.reflectionPrompt) {
      if (typeof currentDevotional.reflectionPrompt === 'string') {
      
        appLog('📝 Using string reflection prompt:', currentDevotional.reflectionPrompt);
        return currentDevotional.reflectionPrompt;
      } else if (typeof currentDevotional.reflectionPrompt === 'object' && (currentDevotional.reflectionPrompt as any).en) {
        const prompt = (currentDevotional.reflectionPrompt as any).en;
        appLog('📝 Using object.en reflection prompt:', prompt);
        return prompt;
      }
    }

    // Fallback to default prompt
    appLog('📝 Using fallback prompt');
    return i18n.t('reflection_prompt_fallback');
  };

  // Get appropriate placeholder text based on whether this is verse reflection
  const getPlaceholderText = () => {
    if (tappedReflectAboutVerse && currentPath) {
      appLog('currentPath =', currentPath.bookId);
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

      // When textinput is focused, update bottomSheet to 88% in index.tsx
      if (visible && inputRef.current?.isFocused()) {
        // Access bottomSheetRef from homeStore and snap to 88% position
        const homeStore = useHomeStore.getState();
        const bottomSheetRef = homeStore.bottomSheetRef;
        if (bottomSheetRef?.current) {
          bottomSheetRef.current.snapToIndex(6); // Index 6 is 88% in snapPoints array
        }
      }
    };

    const handleKeyboardHide = () => {
      setKeyboardHeight(0);
      setKeyboardVisible(false);

      // Reset keyboard visibility in homeStore and snap back to default position
      useHomeStore.getState().setKeyboardVisible(false);
      // Only snap back to 80% if we are NOT in success state
      if (!success) {
        const bottomSheetRef = useHomeStore.getState().bottomSheetRef;
        if (bottomSheetRef?.current) {
          bottomSheetRef.current.snapToIndex(4); // Index 4 is 80% in snapPoints array
        }
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
      appLog('Setting initial reflection content from currentPath');
      // We set this as a suggestion/starter but don't count it toward the minimum character count
      const initialContent = currentPath.reflection;
      setReflectionContent('');
    }
  }, [visible, tappedReflectAboutVerse, currentPath, reflectionContent]);

  // Entry and exit animations
  useEffect(() => {
    appLog('JournalComponent: visible =', visible);

    if (visible) {
      appLog('JournalComponent: Showing journal component');
      appLog('tappedReflectAboutVerse =', tappedReflectAboutVerse);
      appLog('📝 Current devotional:', currentDevotional?.id, currentDevotional?.bibleReference);
      appLog('📝 Devotional reflection prompt available:', !!currentDevotional?.reflectionPrompt);
      appLog('📝 Using reflection prompt:', getReflectionPrompt());

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

      // Auto-focus the input when coming from "Reflect on this verse"
      if (tappedReflectAboutVerse) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 800); // Delay to allow animations to settle
      }
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
      appLog('🔍 JOURNAL SUCCESS - Setting success state, journalViewVisible should remain true');
      // Hide global buttons/tab bar during success state
      useHomeStore.getState().setShowGlobalButtons(false);

      // Keep journalViewVisible true during success state to hide tab bar
      // Don't set journalViewVisible to false here - it will be set to false when success message is dismissed
      const currentJournalViewVisible = useHomeStore.getState().journalViewVisible;
      appLog('🔍 JOURNAL SUCCESS - Current journalViewVisible state:', currentJournalViewVisible);

      // Ensure journalViewVisible is true during success state
      if (!currentJournalViewVisible) {
        appLog('🔍 JOURNAL SUCCESS - Setting journalViewVisible to true to hide tab bar');
        useHomeStore.getState().setJournalViewVisible(true);
      }

      // Don't reset showJournalContent here - keep the component visible during success state
      // It will be reset when actually navigating away
      appLog('🔍 JOURNAL SUCCESS - Keeping showJournalContent true during success state');

      // Use a small delay to allow snapPoints to recalculate before snapping
      setTimeout(() => {
        const bottomSheetRef = useHomeStore.getState().bottomSheetRef;
        if (bottomSheetRef?.current) {
          bottomSheetRef.current.snapToIndex(0); // Index 0 is 60% in snapPoints array
          appLog('🔍 JOURNAL SUCCESS - Bottom sheet snapped to 60%');
        }
      }, 100);

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
      appLog('handleSave called');
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
      appLog('Reset tappedReflectAboutVerse flag to false');

      // Create current timestamp
      const now = firestore.Timestamp.now();

      // Save reflection to userStore
      appLog('Saving reflection data to userStore');
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

        appLog('Reflection saved successfully');
      } catch (error) {
        appLog('Error saving reflection data:', error);
      }
      appLog('🔍 JOURNAL SUCCESS - Setting success state to true');
      setSuccess(true);
    },
    handleCancel: () => {
      useHomeStore.getState().setShowGlobalButtons(false);
      useHomeStore.getState().setJournalViewVisible(false);
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
      appLog('Reset tappedReflectAboutVerse flag to false (from back button)');

      // Don't change reflection completion state - preserve existing state
      onClose({});

      // Reset Rive animation to idle state with delay after navigation
      setTimeout(() => {
        const riveRef = homeStore.riveRef;
        if (riveRef?.current?.setInputState) {
          try {
            riveRef.current.setInputState('State Machine 1', 'Action-Number', 0); // 0 = Idle
            appLog('Reset Rive animation to idle state after cancel delay');
          } catch (error) {
            appLog('Could not reset Rive state after cancel:', error);
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
          screenType="reflection"
          title={i18n.t('reflection_complete')}
          description={i18n.t('reflection_complete_desc')}
          level={levelInfo.level}
          prevLevel={levelInfo.level}
          buttonsEnabled={buttonsEnabled}
          showCollectBonus={shouldShowBonus}
          onLoad={() => {
            useSoundStore.getState().playJournalingSuccessSound();
          }}
          onGoHome={() => {
            appLog('🔍 JOURNAL SUCCESS - onGoHome called, delaying navigation for animation');

            // Delay the actual navigation/close to allow success animation to play
            setTimeout(() => {
              appLog('🔍 JOURNAL SUCCESS - Now executing navigation after delay');
              setTimeout(() => {
                setFinishReading(false)
              }, 2000);

              // Set journalViewVisible to false to show tab bar again
              useHomeStore.getState().setJournalViewVisible(false);
              appLog('🔍 JOURNAL SUCCESS - journalViewVisible set to false in onGoHome');

              // Reset showJournalContent when actually navigating
              if (setShowJournalContent) {
                setShowJournalContent(false);
                appLog('🔍 JOURNAL SUCCESS - Set showJournalContent to false when navigating');
              }

              // Ensure reflection completion state is maintained
              appLog('🔍 JOURNAL SUCCESS - Ensuring reflection completion state is maintained');
              setReflectionCompleted(true);

              const sawStreakToday = useHomeStore.getState().sawStreakToday;
              const isFirstReadingOfDay = !sawStreakToday;
              // Check if bonus is available after reflection completion
              const freshState = useHomeStore.getState();
              const isBonusAvailable = freshState.readingCompleted && freshState.prayerCompleted && freshState.reflectionCompleted && isFirstReadingOfDay && !freshState.sawDailyBonus;

              const freshHomeState = useHomeStore.getState();
              appLog('🔍 JOURNAL SUCCESS - Bonus check (onGoHome):', {
                readingCompleted: freshHomeState.readingCompleted,
                prayerCompleted: freshHomeState.prayerCompleted,
                reflectionCompleted: reflectionCompleted,
                isFirstReadingOfDay,
                sawDailyBonus,
                isBonusAvailable
              });

              if (isBonusAvailable) {
                setSuccessType(SuccessAnimationType.BONUS);
                router.push({
                  pathname: '/success'
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
                      appLog(`Reset Rive animation to mood state: ${targetStateInput} (${currentMood}) after navigation delay`);
                    } catch (error) {
                      appLog('Could not reset Rive state after navigation:', error);
                    }
                  }
                }, 1000); // 1 second delay after navigation
              } else {
                onClose({ isCompleted: true });

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
                      appLog(`Reset Rive animation to mood state: ${targetStateInput} (${currentMood}) after navigation delay`);
                    } catch (error) {
                      appLog('Could not reset Rive state after navigation:', error);
                    }
                  }
                }, 1000); // 1 second delay after navigation
              }
            }, 2500); // Wait 2.5 seconds for success animation to play
          }}
          onPray={() => {
            appLog('🔍 JOURNAL SUCCESS - onPray called');

            // Handle bonus collection if available
            const sawStreakToday = useHomeStore.getState().sawStreakToday;
            const isFirstReadingOfDay = !sawStreakToday;
            // Check current state from homeStore to get the most up-to-date values
            const currentHomeState = useHomeStore.getState();
            // Check if bonus is available after reflection completion
            const isBonusAvailable = currentHomeState.readingCompleted && currentHomeState.prayerCompleted && currentHomeState.reflectionCompleted && isFirstReadingOfDay && !currentHomeState.sawDailyBonus;

            const freshHomeState = useHomeStore.getState();
            appLog('🔍 JOURNAL SUCCESS - Bonus check (onPray):', {
              readingCompleted: freshHomeState.readingCompleted,
              prayerCompleted: freshHomeState.prayerCompleted,
              reflectionCompleted: reflectionCompleted,
              isFirstReadingOfDay,
              sawDailyBonus,
              isBonusAvailable
            });

            if (isBonusAvailable) {
              // For bonus collection, navigate immediately without delay
              appLog('🔍 JOURNAL SUCCESS - Bonus available, navigating immediately');
              setSuccessType(SuccessAnimationType.BONUS);
              // Set journalViewVisible to false to show tab bar again
              useHomeStore.getState().setJournalViewVisible(false);
              appLog('🔍 JOURNAL SUCCESS - journalViewVisible set to false in onPray (bonus)');

              // Reset showJournalContent when navigating
              if (setShowJournalContent) {
                setShowJournalContent(false);
                appLog('🔍 JOURNAL SUCCESS - Set showJournalContent to false when navigating to bonus');
              }

              router.push({
                pathname: '/success'
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
                    appLog(`Reset Rive animation to mood state: ${targetStateInput} (${currentMood}) after navigation delay`);
                  } catch (error) {
                    appLog('Could not reset Rive state after navigation:', error);
                  }
                }
              }, 1000);
            } else {
              // Normal prayer flow - delay to allow success animation to play
              appLog('🔍 JOURNAL SUCCESS - Normal prayer flow, delaying navigation for animation');
              setTimeout(() => {
                appLog('🔍 JOURNAL SUCCESS - Now executing navigation after delay');
                // Normal prayer flow - close journal and signal to open prayer view
                useHomeStore.getState().setJournalViewVisible(false);
                appLog('🔍 JOURNAL SUCCESS - journalViewVisible set to false in onPray (no bonus)');

                // Reset showJournalContent when actually navigating
                if (setShowJournalContent) {
                  setShowJournalContent(false);
                  appLog('🔍 JOURNAL SUCCESS - Set showJournalContent to false when navigating to prayer');
                }

                onClose({ isReflectPresses: true }); // Pass flag to trigger prayer navigation
              }, 2500); // Wait 2.5 seconds for success animation to play
            }
          }}
          rewardsTitle="REFLECTION REWARDS"
        />
      </Animated.View>
    </Reanimated.View>
  ) : (
    <Reanimated.View
      className="flex-1 w-full mt-2 bg-surfaceCream"
      pointerEvents="box-none"
      onTouchStart={() => {
        // Dismiss keyboard when tapping anywhere on the screen
        if (keyboardVisible) {
          Keyboard.dismiss();
        }
      }}>
      <Animated.View style={{ opacity: containerOpacity, flex: 1 }}>
        <View className="flex-1 px-6">

          <Text className="text-body font-feather text-brown/90 mb-2 text-center leading-tight mt-0 mb-4">
            {getReflectionPrompt()}
          </Text>

          <View
            style={{ minHeight: RPH(25), maxHeight: RPH(40), borderRadius: 20 }}
            className="w-full  bg-surfaceCream border-[3px] border-gold/70 p-5 mb-2 shadow-card"
            onTouchStart={(e) => {
              // Prevent keyboard dismissal when tapping on the input container
              e.stopPropagation();
            }}
          >
            <TextInput
              ref={inputRef}
              className="w-full bg-transparent text-brown/95 text-[18px] font-nunito-medium  text-left"
              placeholder={getPlaceholderText()}
              placeholderTextColor="#B89B4C"
              multiline
              textAlignVertical="top"
              scrollEnabled={true}
              style={{
                flex: 1,
                padding: 0,
                minHeight: RPH(20),
                maxHeight: RPH(35),
                overflow: 'hidden'
              }}
              value={reflectionContent}
              onChangeText={setReflectionContent}
              onFocus={() => {
                // Set Rive to writing state when input is focused
                const homeStore = useHomeStore.getState();
                const riveRef = homeStore.riveRef;
                if (riveRef?.current?.setInputState) {
                  try {
                    riveRef.current.setInputState('State Machine 1', 'Action-Number', 10); // 10 = Writing
                    appLog('Set Rive animation to writing state (10) on input focus');
                  } catch (error) {
                    appLog('Could not set Rive to writing state on focus:', error);
                  }
                }

                // Ensure keyboard is shown and bottom sheet snaps to 88%
                const bottomSheetRef = homeStore.bottomSheetRef;
                if (bottomSheetRef?.current) {
                  bottomSheetRef.current.snapToIndex(6); // Index 6 is 88% in snapPoints array
                }
              }}
              onBlur={() => {
                // Reset Rive to idle state when input loses focus (optional)
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
                    appLog(`Set Rive animation back to mood state: ${targetStateInput} (${currentMood}) on input blur`);
                  } catch (error) {
                    appLog('Could not reset Rive state on blur:', error);
                  }
                }
              }}
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
                useHomeStore.getState().setJournalViewVisible(false);
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
                appLog('Reset tappedReflectAboutVerse flag to false (from cancel button)');

                // Don't change reflection completion state - preserve existing state
                onClose({});

                // Reset Rive animation to idle state with delay after navigation
                setTimeout(() => {
                  const riveRef = homeStore.riveRef;
                  if (riveRef?.current?.setInputState) {
                    try {
                      riveRef.current.setInputState('State Machine 1', 'Action-Number', 0); // 0 = Idle
                      appLog('Reset Rive animation to idle state after cancel delay');
                    } catch (error) {
                      appLog('Could not reset Rive state after cancel:', error);
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
                    appLog('handleSave called');
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
                    appLog('Reset tappedReflectAboutVerse flag to false');

                    // Create current timestamp
                    const now = firestore.Timestamp.now();

                    // Save reflection to userStore
                    appLog('Saving reflection data to userStore');
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

                      appLog('Reflection saved successfully');
                    } catch (error) {
                      appLog('Error saving reflection data:', error);
                    }
                    appLog('🔍 JOURNAL SUCCESS - Setting success state to true');
                    setSuccess(true);

                    // Snap bottom sheet to lowest point after saving
                    const homeStore = useHomeStore.getState();
                    const bottomSheetRef = homeStore.bottomSheetRef;
                    if (bottomSheetRef?.current) {
                      bottomSheetRef.current.snapToIndex(0); // Snap to lowest point (60%)
                      appLog('🔍 JOURNAL - Snapped bottom sheet to lowest point after save');
                    }

                    // Set Rive to celebration animation
                    const riveRef = homeStore.riveRef;
                    if (riveRef?.current?.setInputState) {
                      try {
                        riveRef.current.setInputState('State Machine 1', 'Action-Number', 12); // 12 = Achievement
                      } catch (error) {
                        appLog('Could not set Rive to achievement state:', error);
                      }
                    }
                  }
                }}
                buttonType="blue"
                icon={require('../assets/icons/starIcon.png')}
                reward={"+50"}
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
