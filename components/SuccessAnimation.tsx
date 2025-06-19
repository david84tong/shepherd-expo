import firestore from '@react-native-firebase/firestore';
import dayjs from 'dayjs';
import { useAssets } from 'expo-asset';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import analytics from '../utils/analytics';
import {
  View,
  Text,
  Dimensions,
  Animated,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Rive, { RiveRef } from 'rive-react-native';
import i18n from '~/app/utils/i18n';

import PrimaryButton from './PrimaryButton';
import { StreakScreen } from './StreakScreen';
import { getLambMoodByHearts } from '../app/hooks/streakHook';
import { useHomeStore, SuccessAnimationType } from '../app/stores/homeStore';
import { usePathStore } from '../app/stores/pathStore';
import { useUserStore } from '../app/stores/userStore';
import { calculateLevelFromXp } from '../utils/levelUtils';

// Import icons
import gemIcon from '../assets/icons/greenGemIcon.png';
import heartIcon from '../assets/icons/heartIcon.png';
import starIcon from '../assets/icons/starIcon.png';
import { IS_ANDROID } from '~/app/utils/utils';
import { syncWithFirestore } from '~/app/helper/firebaseHelper';

// Get screen dimensions to ensure full screen sizing
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Define props interface
interface SuccessAnimationProps {
  message?: string;
  subMessage?: string;
  onClose?: () => void;
  isPrayPresses?: boolean;
  showStreakScreen?: boolean;
  hideStreakInSuccess?: boolean;
}

// Max hearts constant
const MAX_HEARTS = 100;

/**
 * Success animation screen shown after completing a reading or via debug.
 */
export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  message: propMessage,
  subMessage: propSubMessage,
  onClose: propOnClose,
  isPrayPresses,
  showStreakScreen:showStreakScreenParam,
  hideStreakInSuccess
}) => {
  const riveRef = useRef<RiveRef>(null);
  const setHomeMode = useHomeStore((state) => state.setMode);
  const successType = useHomeStore((state) => state.successType);
  const setSuccessType = useHomeStore((state) => state.setSuccessType);
  const setSawDailyBonus = useHomeStore((state) => state.setSawDailyBonus);
  const setPathInProgress = usePathStore((state) => state.setPathInProgress);

  // Load Rive assets
  const [riveAssets] = useAssets([require('../assets/riveAnimations/successLamb.riv')]);
  const [homeLambAssets] = useAssets([require('../assets/riveAnimations/homeLamb.riv')]);

  // -------- Other hooks below (must appear before any conditional return) --------
  // Get completion states
  const readingCompleted = useHomeStore((state) => state.readingCompleted);
  const prayerCompleted = useHomeStore((state) => state.prayerCompleted);
  const reflectionCompleted = useHomeStore((state) => state.reflectionCompleted);
  const sawDailyBonus = useHomeStore((state) => state.sawDailyBonus);
  const sawStreakToday = useHomeStore((state) => state.sawStreakToday);
  const setSawStreakToday = useHomeStore((state) => state.setSawStreakToday);

  // User store hooks
  const lambHearts = useUserStore((state) => state.getLambHearts?.());
  const lambXp = useUserStore((state) => state.getLambXp());
  const setLambHearts = useUserStore((state) => state.setLambHearts);
  const setLambXp = useUserStore((state) => state.setLambXp);
  const addXp = useUserStore((state) => state.addXp);
  const setLastActivityDate = useUserStore((state) => state.setLastActivityDate);
  const setLastReadingDate = useUserStore((state) => state.setLastReadingDate);
  const lastReadingDate = useUserStore((state) => state.getLastReadingDate());
  const setLastPrayerDate = useUserStore((state) => state.setLastPrayerDate);
  const setLastReflectionDate = useUserStore((state) => state.setLastReflectionDate);
  const getGens = useUserStore((state) => state.getGens);
  const setGens = useUserStore((state) => state.setGens);
  const setLambMood = useUserStore((state) => state.setLambMood);

  // Home store hooks for daily XP tracking
  const addDailyXp = useHomeStore((state) => state.addDailyXp);
  const getDailyXpRemaining = useHomeStore((state) => state.getDailyXpRemaining);

  // Determine which type to use for rendering
  const effectiveType = successType ?? SuccessAnimationType.READING;

  // Set sawDailyBonus to true immediately when bonus screen shows to prevent repeats
  useEffect(() => {
    if (effectiveType === SuccessAnimationType.BONUS && !sawDailyBonus) {
      console.log('BONUS screen showing for first time - immediately setting sawDailyBonus flag');
      setSawDailyBonus(true);
    }
  }, [effectiveType, sawDailyBonus, setSawDailyBonus]);

  // State to track if rewards have been applied
  const [rewardsApplied, setRewardsApplied] = useState(false);
  // Calculate actual heart reward (don't exceed MAX_HEARTS)
  const [actualHeartReward, setActualHeartReward] = useState(0);
  // Calculate actual XP reward (don't exceed daily limit)
  const [actualXpReward, setActualXpReward] = useState(0);
  // Flag to check if at max hearts
  const [isAtMaxHearts, setIsAtMaxHearts] = useState(false);
  // State to track if user leveled up
  const [leveledUp, setLeveledUp] = useState(false);
  // Track the new level if leveled up
  const [newLevel, setNewLevel] = useState(0);

  // Log when component mounts or successType changes
  useEffect(() => {
    console.log('SuccessAnimation: Current successType:', successType);
    // If no success type is set, default to READING
    if (!successType) {
      console.log('No success type found in store, defaulting to READING');
      setSuccessType(SuccessAnimationType.READING);
    }
  }, [successType, setSuccessType]);

  // Track if component is unmounting
  const isUnmounting = useRef(false);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      isUnmounting.current = true;
      // Safe to reset success type when component is truly unmounted
      setSuccessType(null);
    };
  }, [setSuccessType]);

  // Animations for rewards card
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(30)).current;

  // Add animations for buttons
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslateY = useRef(new Animated.Value(20)).current;

  // Add animation for home button/link
  const homeButtonOpacity = useRef(new Animated.Value(0)).current;
  const homeButtonTranslateY = useRef(new Animated.Value(15)).current;

  // Add Rive animation effects
  const riveScaleAnim = useRef(new Animated.Value(0.9)).current;
  const riveRotateAnim = useRef(new Animated.Value(0.05)).current;

  // Determine messages, rewards, and Rive resource based on successType
  let message = propMessage || i18n.t('success_reading_complete');
  let subMessage = propSubMessage || i18n.t('success_reading_complete_desc');
  let heartReward = 0;
  let xpReward = 0;
  const riveResource = 'successLamb'; // Default animation
  let riveArtboard: string | undefined = undefined;
  let rewardTitle = i18n.t('reading_rewards');

  // State to track if we should show the streak screen
  const [showStreakScreen, setShowStreakScreen] = useState(false);
  // Fade animation for transition to streak screen
  const fadeToStreakAnim = useRef(new Animated.Value(1)).current;
  // Loading state to prevent blank screen
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Check if this is the first reading of the day
  const isFirstReadingOfDay = useMemo(() => {
    console.log('=== DEBUG: isFirstReadingOfDay calculation ===');
    console.log('effectiveType:', effectiveType);

    // Only proceed if we have the right success type
    if (!effectiveType || effectiveType !== SuccessAnimationType.READING) {
      console.log('DEBUG: Not a reading success type - returning false');
      return false;
    }

    // Get today's date at the start of the day
    const today = dayjs().startOf('day');
    console.log('DEBUG: today:', today.format('YYYY-MM-DD HH:mm:ss'));

    // Get the completed readings directly
    const completedReadings = useUserStore.getState().getCompletedReadings();
    console.log('DEBUG: Total completed readings:', completedReadings.length);

    // If this is the first reading ever, it's definitely the first of the day
    if (completedReadings.length <= 1) {
      console.log('DEBUG: This is the first or second reading ever - returning true');
      return true;
    }

    try {
      // Map readings to date strings in YYYY-MM-DD format
      const readingDateStrings = completedReadings
        .filter((reading) => reading.date) // Only include readings with dates
        .map((reading) => {
          if (reading.date && typeof reading.date.toDate === 'function') {
            // Firestore timestamp
            const date = reading.date.toDate();
            return dayjs(date).format('YYYY-MM-DD');
          } else if (reading.date instanceof Date) {
            // Regular Date
            return dayjs(reading.date).format('YYYY-MM-DD');
          } else {
            // Try to handle as string or number
            return dayjs(reading.date as any).format('YYYY-MM-DD');
          }
        })
        .filter((dateStr) => /^\d{4}-\d{2}-\d{2}$/.test(dateStr)); // Filter out invalid dates

      // Today's date as string for easy comparison
      const todayStr = today.format('YYYY-MM-DD');

      // Count readings done today
      const todaysReadingsCount = readingDateStrings.filter((date) => date === todayStr).length;
      console.log('DEBUG: Readings done today:', todaysReadingsCount);

      // Check for any readings before today
      const hasEarlierReadings = readingDateStrings.some((date) => date < todayStr);
      console.log('DEBUG: Has earlier readings:', hasEarlierReadings);

      // This is the first reading of day if:
      // 1. It's the only reading today (or first), AND
      // 2. Either there are earlier readings OR this is truly the first reading ever
      const isFirstOfDay = todaysReadingsCount <= 1;

      console.log('DEBUG: Is first reading of day:', isFirstOfDay);
      console.log('=== END DEBUG ===');

      return isFirstOfDay;
    } catch (error) {
      console.error('Error processing reading dates:', error);
      return false;
    }
  }, [effectiveType]);

  // Get values based on successType - make sure we are handling all possible types
  if (effectiveType === SuccessAnimationType.SECTION_COMPLETE) {
    console.log('Setting up SECTION_COMPLETE success screen');
    message = 'Section Complete!';
    subMessage = "You finished today's Bible reading & fed your lamb.";
    heartReward = 3;
    xpReward = 100;
    riveArtboard = undefined;
    rewardTitle = 'READING REWARDS';
  } else if (effectiveType === SuccessAnimationType.READING) {
    console.log('Setting up READING success screen');
    message = 'Reading Complete!';
    subMessage = "You finished today's Bible reading & fed your lamb.";
    heartReward = 3;
    xpReward = 50;
    riveArtboard = 'lamb-eating';
    rewardTitle = 'READING REWARDS';
  } else if (effectiveType === SuccessAnimationType.BONUS) {
    console.log('Setting up BONUS success screen');
    message = 'Daily Trifecta Complete!';
    subMessage = "Amazing! You've completed all three spiritual disciplines today.";
    heartReward = 5;
    xpReward = 0;
    riveArtboard = 'chest';
    rewardTitle = 'BONUS REWARDS';
  } else if (effectiveType === SuccessAnimationType.REFLECTION) {
    console.log('Setting up REFLECTION success screen');
    message = 'Reflection Complete!';
    subMessage = "You've recorded your thoughts and connected with the Word.";
    heartReward = 1;
    xpReward = 50;
    riveArtboard = 'heart-hold';
    rewardTitle = 'REFLECTION REWARDS';
  } else if (effectiveType === SuccessAnimationType.PRAYER) {
    console.log('Setting up PRAYER success screen');
    message = 'Prayer Complete!';
    subMessage = 'You spent quality time with the Shepherd in prayer.';
    heartReward = 2;
    xpReward = 50;
    rewardTitle = 'PRAYER REWARDS';
    riveArtboard = 'success-heart'; // Show heart animation by default
  } else {
    // This should not happen, but log an error if it does
    console.error('Invalid or missing success type:', effectiveType);
  }

  // After rewards are calculated, set artboard for PRAYER or other types
  if (effectiveType === SuccessAnimationType.PRAYER) {
    if (actualHeartReward > 0 && xpReward > 0) {
      riveArtboard = 'success-hearts';
    } else if (xpReward > 0 && actualHeartReward === 0) {
      riveArtboard = 'success-stars';
    } else if (actualHeartReward > 0 && xpReward === 0) {
      riveArtboard = 'success-hearts';
    } else {
      riveArtboard = undefined;
    }
  }

  // Apply rewards to user state when component mounts
  useEffect(() => {
    if (!rewardsApplied && effectiveType) {
      console.log(`Applying rewards: ${heartReward} hearts, ${xpReward} XP`);
      console.log(`Current hearts: ${lambHearts}, Current XP: ${lambXp}`);

      // Check if at max hearts and calculate actual heart reward
      const isMax = lambHearts >= MAX_HEARTS;
      setIsAtMaxHearts(isMax);

      // Calculate how many hearts to actually add without exceeding MAX_HEARTS
      const heartsToAdd = isMax ? 0 : Math.min(heartReward, MAX_HEARTS - lambHearts);
      setActualHeartReward(heartsToAdd);

      // Calculate how much XP to actually add (respecting daily limit)
      const xpToAdd = addDailyXp(xpReward);
      setActualXpReward(xpToAdd);

      // Update user state with new values
      if (heartsToAdd > 0) {
        setLambHearts(lambHearts + heartsToAdd);
        setLambMood(getLambMoodByHearts(lambHearts + heartsToAdd));
      }

      if (lambHearts + heartsToAdd >= 50) {
        console.log('Checking if lamb has full hp');
        if (readingCompleted && prayerCompleted && reflectionCompleted) {
          console.log('Setting lamb-full mood');
          setLambMood('lamb-full');
        }
      }

      // Check current level before adding XP using the level utility function
      const currentLevel = calculateLevelFromXp(lambXp);

      // Only add XP if we got some after daily limit check
      if (xpToAdd > 0) {
        addXp(xpToAdd);
      }

      // Calculate new level after XP is added
      const newXpTotal = lambXp + xpToAdd;
      const newLevelValue = calculateLevelFromXp(newXpTotal);

      // Check if level increased
      if (newLevelValue > currentLevel) {
        console.log(`Level up! ${currentLevel} -> ${newLevelValue}`);
        setLeveledUp(true);
        setNewLevel(newLevelValue);

        // Make sure level is correctly set in the user store
        setLambXp(newXpTotal); // Ensure XP is updated
        useUserStore.getState().setLambLevel(newLevelValue); // Explicitly set the new level
      }

      // Track rewards for analytics
      const rewardsData: any = {
        successType: effectiveType,
        heartsAwarded: heartsToAdd,
        intentionalHeartReward: heartReward,
        xpAwarded: xpToAdd,
        intentionalXpReward: xpReward,
        dailyXpRemaining: getDailyXpRemaining(),
        isAtMaxHearts: isMax,
        newLambHearts: lambHearts + heartsToAdd,
        newLambXp: lambXp + xpToAdd,
        leveledUp: leveledUp,
        newLevel: leveledUp ? newLevel : undefined,
      };

      // Log level up event if applicable
      if (leveledUp) {
        analytics.logEvent('LambLevelUp', {
          fromLevel: newLevel - 1,
          toLevel: newLevel,
          xpTotal: lambXp + xpReward,
          activityType: effectiveType,
        });
      }

      // If this is a BONUS reward, add 9 gems
      // Only add gems if this is truly the first time seeing the bonus (sawDailyBonus was false)
      if (effectiveType === SuccessAnimationType.BONUS && !sawDailyBonus) {
        const currentGems = getGens();
        setGens(currentGems + 100);
        console.log(`Applied +9 Gems. Updated value - Gems: ${currentGems + 100}`);

        // Add gems data to analytics
        rewardsData.gemsAwarded = 100;
        rewardsData.newGemCount = currentGems + 100;

        // Set the flag to indicate user has seen daily bonus
        setSawDailyBonus(true);
        console.log('Setting sawDailyBonus to true');
      } else if (effectiveType === SuccessAnimationType.BONUS) {
        // Log if we're not adding gems because bonus was already seen
        console.log('Not adding gems - user has already seen bonus animation today');
        rewardsData.gemsAwarded = 0;
      }

      // Log the rewards data to analytics
      analytics.logEvent('SuccessAnimation_RewardsApplied', rewardsData);

      // Create a new timestamp for the current time
      const now = firestore.Timestamp.now();

      // Always update lastActivityDate regardless of activity type
      setLastActivityDate(now);

      // Update specific activity timestamp based on success type
      if (effectiveType === SuccessAnimationType.READING) {
        setLastReadingDate(now);
      } else if (effectiveType === SuccessAnimationType.PRAYER) {
        setLastPrayerDate(now);
      } else if (effectiveType === SuccessAnimationType.REFLECTION) {
        setLastReflectionDate(now);
      }

      // Mark rewards as applied
      setRewardsApplied(true);

      // Sync user state to Firestore after rewards are applied
      syncWithFirestore?.();

      console.log(`Applied ${heartsToAdd} hearts (of intended ${heartReward}) and ${xpReward} XP`);
      console.log(`Updated values - Hearts: ${lambHearts + heartsToAdd}, XP: ${lambXp + xpReward}`);
      console.log(`Updated activity timestamp for ${effectiveType}`);
    }
  }, [
    effectiveType,
    rewardsApplied,
    lambHearts,
    lambXp,
    heartReward,
    xpReward,
    sawDailyBonus,
    setSawDailyBonus,
  ]);

  // Play animations when component mounts or successType changes
  useEffect(() => {
    // Prevent running animation logic if successType is null (e.g., during cleanup)
    if (!effectiveType) {
      console.log('SuccessAnimation: Animation effect skipped due to null successType.');
      return;
    }

    console.log(
      'Running animation effect for successType:',
      effectiveType,
      'using resource:',
      riveResource
    );

    // Reset animations
    cardOpacity.setValue(0);
    cardAnim.setValue(30);
    riveScaleAnim.setValue(0.9);
    riveRotateAnim.setValue(0.05);
    buttonsOpacity.setValue(0);
    buttonsTranslateY.setValue(20);
    homeButtonOpacity.setValue(0);
    homeButtonTranslateY.setValue(15);

    const timer = setTimeout(() => {
      if (riveRef.current) {
        riveRef.current.play();
      }
    }, 200);

    // Animate the Rive view
    Animated.parallel([
      Animated.timing(riveScaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(riveRotateAnim, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate the rewards card
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(cardAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, 800); // Delay to start after the main animation

    // Animate the action buttons (pray/reflect)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(buttonsOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(buttonsTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1200); // Delay to start after rewards card animation

    // Animate the home button/link
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(homeButtonOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(homeButtonTranslateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1400); // Delay to start after action buttons animation

    return () => clearTimeout(timer);
  }, [effectiveType]); // Keep effectiveType dependency

  // Log analytics when component mounts or successType changes
  useEffect(() => {
    if (!successType) return;

    let eventName = '';
    let params = {};

    // Log different events based on success type
    switch (successType) {
      case SuccessAnimationType.READING:
        eventName = 'SuccessAnimation_Shown_Reading';
        params = {
          xpReward: actualXpReward,
          heartReward: actualHeartReward,
          dailyXpRemaining: getDailyXpRemaining(),
        };
        break;

      case SuccessAnimationType.PRAYER:
        eventName = 'SuccessAnimation_Shown_Prayer';
        params = {
          xpReward: actualXpReward,
          heartReward: actualHeartReward,
          dailyXpRemaining: getDailyXpRemaining(),
        };
        break;

      case SuccessAnimationType.REFLECTION:
        eventName = 'SuccessAnimation_Shown_Reflection';
        params = {
          xpReward: actualXpReward,
          heartReward: actualHeartReward,
          dailyXpRemaining: getDailyXpRemaining(),
        };
        break;

      case SuccessAnimationType.BONUS:
        eventName = 'SuccessAnimation_Shown_Bonus';
        params = {
          xpReward: actualXpReward,
          heartReward: actualHeartReward,
          gemsAwarded: sawDailyBonus ? 0 : 9,
          dailyXpRemaining: getDailyXpRemaining(),
        };
        break;
    }

    // Log the event
    if (eventName) {
      analytics.logEvent(eventName, params);
      console.log(`Analytics: Logged ${eventName}`, params);
    }
  }, [successType, xpReward, actualHeartReward, sawDailyBonus]);
  useEffect(() => {
    return () => {
      if (riveRef.current?.reset) {
        riveRef.current.reset();
      }
    };
  }, []);

  // Default navigation behavior
  const handleGoHome = () => {
    // Add medium haptic feedback for navigation
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Log the event
    analytics.logEvent('SuccessAnimation_Tapped_GoHome', {
      fromType: successType,
    });

    // If this is the first reading of the day, effectiveType is READING, and we haven't shown the streak screen today

    // Set unmounting flag first
    isUnmounting.current = true;

    // Reset states (except successType until after navigation)
    console.log('handleGoHome - Resetting states');
    setPathInProgress(false);
    setHomeMode('DEFAULT');

    // Navigate without changing the successType - it will be reset in the cleanup effect
    if(showStreakScreenParam){
      router.push({
        pathname: '/streak',
      });
    }else
   { router.replace({
      pathname: '/(tabs)',
      params: {
        isPrayPresses: isPrayPresses ? 'true' : 'false'
      },
    });}
  };

  const triggerStreakScreen = () => {
    // If streak screen was already shown today, skip showing it again
    if (sawStreakToday) {
      console.log('Streak screen already shown today - skipping');
      // Just continue with normal navigation
      handleGoHome();
      return;
    }

    console.log('First reading of the day - showing streak screen');
    // Log analytics for streak screen
    analytics.logEvent('SuccessAnimation_Showing_StreakScreen', {
      fromType: effectiveType,
      isFirstReadingOfDay: isFirstReadingOfDay,
    });

    // Mark that we've shown the streak screen today
    setSawStreakToday(true);

    // Start transition with fade out animation
    setIsTransitioning(true);

    // Fade out current content
    Animated.timing(fadeToStreakAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // After fade out completes, show streak screen
      setShowStreakScreen(true);
    });
    return;
  };

  // Determine the action for the button press
  const handlePress = propOnClose || handleGoHome;
  const buttonText = propOnClose ? i18n.t('close') : i18n.t('continue_button');

  // Removed prayer and reflection handlers - only continue button needed

  // Remove next action buttons - only show continue button
  const showNextButtons = false;

  // If we're showing the streak screen, return it
  if (showStreakScreen) {
    return <StreakScreen />;
  }

  // Show loading indicator if assets aren't loaded yet
  if (!riveAssets || !homeLambAssets) {
    return (
      <View className="flex-1 items-center justify-center bg-surfaceCream">
        <ActivityIndicator size="large" color="#3C584A" />
        <Text className="font-feather text-textPrimary mt-4">Loading animation...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surfaceCream" style={{ backgroundColor: '#FFF4DC' }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        className="bg-surfaceCream">
        <Animated.View
          className="flex-1 items-center justify-center pt-4 px-5 bg-surfaceCream"
          style={{ opacity: fadeToStreakAnim }}>
          {isTransitioning && (
            <View className="absolute inset-0 items-center justify-center bg-surfaceCream">
              <ActivityIndicator size="large" color="#F2B705" />
            </View>
          )}

          {/* Rive animation - centered */}
          <View className="w-full h-[275px] my-4 items-center justify-center ">
            <Animated.View
              style={{
                width: effectiveType === SuccessAnimationType.BONUS ? '144%' : '120%',
                height: effectiveType === SuccessAnimationType.BONUS ? '144%' : '120%',
                marginTop: 10,
                transform: [
                  { scale: riveScaleAnim },
                  {
                    rotate: riveRotateAnim.interpolate({
                      inputRange: [-1, 0, 1],
                      outputRange: ['-15deg', '0deg', '15deg'],
                    }),
                  },
                ],
              }}>
              {effectiveType === SuccessAnimationType.SECTION_COMPLETE ? (
                <>
                  {IS_ANDROID ? (
                    <Rive
                      ref={riveRef}
                      autoplay={true}
                      resourceName={'home_lamb'}
                      artboardName="lamb-milestone"
                      style={{
                        width: '100%',
                        height: '100%',
                        maxWidth: 300,
                        maxHeight: 300,
                        alignSelf: 'center',
                      }}
                    />
                  ) : (
                    <Rive
                      ref={riveRef}
                      url={(homeLambAssets && homeLambAssets[0] && homeLambAssets[0].uri) || ''}
                      autoplay={true}
                      artboardName="lamb-milestone"
                      style={{
                        width: '100%',
                        height: '100%',
                        maxWidth: 300,
                        maxHeight: 300,
                        alignSelf: 'center',
                      }}
                    />
                  )}
                </>
              ) : (
                <>
                  {IS_ANDROID ? (
                    <Rive
                      ref={riveRef}
                      resourceName={'success_lamb'}
                      autoplay={true}
                      style={{ width: '100%', height: '100%' }}
                      {...(riveArtboard ? { artboardName: riveArtboard } : {})}
                    />
                  ) : (
                    <Rive
                      ref={riveRef}
                      url={(riveAssets && riveAssets[0] && riveAssets[0].uri) || ''}
                      autoplay={true}
                      style={{ width: '100%', height: '100%' }}
                      {...(riveArtboard ? { artboardName: riveArtboard } : {})}
                    />
                  )}
                </>
              )}
            </Animated.View>
          </View>

          {/* Success message - enlarged */}
          <Text className="font-feather text-[32px] text-textPrimary mb-4 text-center -mt-16">
            {message}
          </Text>
          <Text className="font-din text-xl text-secondaryText text-center mb-6 px-6">
            {subMessage}
          </Text>

          {/* Rewards Card */}
          <Animated.View
            className="w-full bg-surfaceCream/50 rounded-[18px] p-4 my-4 border-2 border-border"
            style={{
              opacity: cardOpacity,
              transform: [{ translateY: cardAnim }],
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
            }}>
            <Text className="text-caption font-din text-[#B89B4C] text-center uppercase mb-3 tracking-wider">
              {rewardTitle}
            </Text>

            {effectiveType === SuccessAnimationType.BONUS ? (
              // Special bonus reward display
              <View className="flex-row items-center justify-center mb-2">
                <Image source={gemIcon} className="w-6 h-6 mr-2" />
                <Text className="font-din text-textPrimary text-xl">{i18n.t('gems_awarded', { count: 9 })}</Text>
              </View>
            ) : (
              // Standard rewards display for other success types
              <>
                {/* Only show hearts reward if not at max hearts */}
                {!isAtMaxHearts && actualHeartReward > 0 && (
                  <View className="flex-row items-center justify-center mb-2">
                    <Image source={heartIcon} className="w-4 h-6 mr-2" />
                    <Text className="font-din text-textPrimary text-xl">
                      {i18n.t('hearts_awarded', { count: actualHeartReward })}
                    </Text>
                  </View>
                )}
                <View className="flex-row items-center justify-center">
                  <Image source={starIcon} className="w-6 h-6 mr-2" />
                  <Text className="font-din text-textPrimary text-xl">{i18n.t('soul_points_awarded', { count: actualXpReward })}</Text>
                </View>

                {/* Show daily XP limit message if XP was reduced or at cap */}
                {actualXpReward < xpReward && (
                  <View className="mt-2 py-2 bg-lightYellow rounded-xl">
                    <Text className="font-din text-description text-center text-sm">
                      {getDailyXpRemaining() === 0 
                        ? i18n.t('daily_xp_cap_reached') 
                        : i18n.t('daily_xp_limit_message', { remaining: getDailyXpRemaining() })
                      }
                    </Text>
                  </View>
                )}
                
                {/* Show message when at daily XP cap even if no XP was intended */}
                {actualXpReward === 0 && xpReward > 0 && getDailyXpRemaining() === 0 && (
                  <View className="mt-2 py-2 bg-lightYellow rounded-xl">
                    <Text className="font-din text-description text-center text-sm">
                      {i18n.t('daily_xp_cap_reached')}
                    </Text>
                  </View>
                )}

                {/* Show level up message if user leveled up */}
                {leveledUp && (
                  <View className="mt-4 py-2 bg-lightYellow rounded-xl">
                    <Text className="font-feather text-xl text-primary text-center">{i18n.t('level_up')}</Text>
                    <Text className="font-din text-description text-center mt-1">
                      {i18n.t('level_up_message')} {newLevel}
                    </Text>
                  </View>
                )}
              </>
            )}
          </Animated.View>
        </Animated.View>
      </ScrollView>

      {/* Continue Button - Fixed at bottom */}
      <Animated.View
        className="absolute bottom-0 left-0 right-0 bg-surfaceCream px-5 pb-8 pt-4"
        style={{
          opacity: homeButtonOpacity,
          transform: [{ translateY: homeButtonTranslateY }],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.0,
          shadowRadius: 4,
          elevation: 5,
        }}>
        <PrimaryButton buttonType="blue" title={buttonText} onPress={handlePress} />
      </Animated.View>
    </View>
  );
};

export default SuccessAnimation;
