import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Animated, Image } from 'react-native';
import Rive, { RiveRef } from 'rive-react-native';
import { router } from 'expo-router';
import { useHomeStore, SuccessAnimationType } from '../app/stores/homeStore';
import { usePathStore } from '../app/stores/pathStore';
import { useUserStore } from '../app/stores/userStore';
import PrimaryButton from './PrimaryButton';
import firestore from '@react-native-firebase/firestore';
import { getLambMoodByHearts } from '../app/hooks/streakHook';

// Import icons
const gemIcon = require('../assets/icons/greenGemIcon.png');
const heartIcon = require('../assets/icons/heartIcon.png');
const starIcon = require('../assets/icons/starIcon.png');

// Get screen dimensions to ensure full screen sizing
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Define props interface
interface SuccessAnimationProps {
  message?: string;
  subMessage?: string;
  onClose?: () => void;
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
}) => {
  const riveRef = useRef<RiveRef>(null);
  const setHomeMode = useHomeStore((state) => state.setMode);
  const successType = useHomeStore((state) => state.successType);
  const setSuccessType = useHomeStore((state) => state.setSuccessType);
  const setPathInProgress = usePathStore((state) => state.setPathInProgress);
  
  // -------- Other hooks below (must appear before any conditional return) --------
  // Get completion states
  const readingCompleted = useHomeStore((state) => state.readingCompleted);
  const prayerCompleted = useHomeStore((state) => state.prayerCompleted);
  const reflectionCompleted = useHomeStore((state) => state.reflectionCompleted);
  
  // User store hooks
  const lambHearts = useUserStore(state => state.getLambHearts());
  const lambXp = useUserStore(state => state.getLambXp());
  const setLambHearts = useUserStore(state => state.setLambHearts);
  const setLambXp = useUserStore(state => state.setLambXp);
  const addXp = useUserStore(state => state.addXp);
  const setLastActivityDate = useUserStore(state => state.setLastActivityDate);
  const setLastReadingDate = useUserStore(state => state.setLastReadingDate);
  const setLastPrayerDate = useUserStore(state => state.setLastPrayerDate);
  const setLastReflectionDate = useUserStore(state => state.setLastReflectionDate);
  const getGens = useUserStore(state => state.getGens);
  const setGens = useUserStore(state => state.setGens);
  const setLambMood = useUserStore(state => state.setLambMood);
  
  // Determine which type to use for rendering – default to READING if null while store updates
  const effectiveType = successType ?? SuccessAnimationType.READING;
  
  // State to track if rewards have been applied
  const [rewardsApplied, setRewardsApplied] = useState(false);
  // Calculate actual heart reward (don't exceed MAX_HEARTS)
  const [actualHeartReward, setActualHeartReward] = useState(0);
  // Flag to check if at max hearts
  const [isAtMaxHearts, setIsAtMaxHearts] = useState(false);
  
  // Log when component mounts or successType changes
  useEffect(() => {
    console.log("SuccessAnimation: Current successType:", successType);
    // If no success type is set, default to READING
    if (!successType) {
      console.log("No success type found in store, defaulting to READING");
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
  
  // Add Rive animation effects
  const riveScaleAnim = useRef(new Animated.Value(0.9)).current;
  const riveRotateAnim = useRef(new Animated.Value(0.05)).current;
  
  // Determine messages, rewards, and Rive resource based on successType
  let message = propMessage || "Great job!";
  let subMessage = propSubMessage || "Task completed successfully.";
  let heartReward = 0;
  let xpReward = 0;
  let riveResource = "successLamb"; // Default animation
  let riveArtboard: string | undefined = undefined;
  let rewardTitle = "REWARDS EARNED";

  // Get values based on successType - make sure we are handling all possible types
  if (effectiveType === SuccessAnimationType.READING) {
    console.log("Setting up READING success screen");
    message = "Reading Complete!";
    subMessage = "You finished today's Bible reading & fed your lamb.";
    heartReward = 3;
    xpReward = 5; 
    riveArtboard = "lamb-eating";
    rewardTitle = "READING REWARDS";
  } else if (effectiveType === SuccessAnimationType.BONUS) {
    console.log("Setting up BONUS success screen");
    message = "Daily Trifecta Complete!";
    subMessage = "Amazing! You've completed all three spiritual disciplines today.";
    heartReward = 5;
    xpReward = 10;
    riveArtboard = "chest";
    rewardTitle = "BONUS REWARDS";
  } else if (effectiveType === SuccessAnimationType.REFLECTION) {
    console.log("Setting up REFLECTION success screen");
    message = "Reflection Complete!";
    subMessage = "You've recorded your thoughts and connected with the Word.";
    heartReward = 1;
    xpReward = 2;
    riveArtboard = "heart-hold";
    rewardTitle = "REFLECTION REWARDS";
  } else if (effectiveType === SuccessAnimationType.PRAYER) {
    console.log("Setting up PRAYER success screen");
    message = "Prayer Complete!";
    subMessage = "You spent quality time with the Shepherd in prayer.";
    heartReward = 2;
    xpReward = 3;
    rewardTitle = "PRAYER REWARDS";
    // We'll determine artboard below based on rewards
  } else {
    // This should not happen, but log an error if it does
    console.error("Invalid or missing success type:", effectiveType);
  }

  // After rewards are calculated, set artboard for PRAYER or other types
  if (effectiveType === SuccessAnimationType.PRAYER) {
    if (actualHeartReward > 0 && xpReward > 0) {
      riveArtboard = "success-heart-stars";
    } else if (xpReward > 0 && actualHeartReward === 0) {
      riveArtboard = "success-stars";
    } else if (actualHeartReward > 0 && xpReward === 0) {
      riveArtboard = "success-heart";
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
      
      // Always add XP
      addXp(xpReward);
      
      // If this is a BONUS reward, add 9 gems
      if (effectiveType === SuccessAnimationType.BONUS) {
        const currentGems = getGens();
        setGens(currentGems + 9);
        console.log(`Applied +9 Gems. Updated value - Gems: ${currentGems + 9}`);
      }
      
      // Create a new timestamp for the current time
      // @ts-ignore - Firestore type issue workaround
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
      
      console.log(`Applied ${heartsToAdd} hearts (of intended ${heartReward}) and ${xpReward} XP`);
      console.log(`Updated values - Hearts: ${lambHearts + heartsToAdd}, XP: ${lambXp + xpReward}`);
      console.log(`Updated activity timestamp for ${effectiveType}`);
    }

    
  }, [effectiveType, rewardsApplied, lambHearts, lambXp, heartReward, xpReward]);

  // Play animations when component mounts or successType changes
  useEffect(() => {
    // Prevent running animation logic if successType is null (e.g., during cleanup)
    if (!effectiveType) {
      console.log("SuccessAnimation: Animation effect skipped due to null successType.");
      return;
    }
    
    console.log("Running animation effect for successType:", effectiveType, "using resource:", riveResource);

    // Reset animations
    cardOpacity.setValue(0);
    cardAnim.setValue(30);
    riveScaleAnim.setValue(0.9);
    riveRotateAnim.setValue(0.05);
    
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
      })
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
        })
      ]).start();
    }, 800); // Delay to start after the main animation
    
    return () => clearTimeout(timer);
  }, [effectiveType]); // Keep effectiveType dependency

  // Default navigation behavior
  const handleGoHome = () => {
    // Set unmounting flag first
    isUnmounting.current = true;
    
    // Reset states (except successType until after navigation)
    console.log('handleGoHome - Resetting states');
    setPathInProgress(false);
    setHomeMode('DEFAULT');
    
    // Navigate without changing the successType - it will be reset in the cleanup effect
    router.replace('/(tabs)');
  };

  // Determine the action for the button press
  const handlePress = propOnClose || handleGoHome;
  const buttonText = propOnClose ? "Close" : "Return Home";
  
  // Handler for prayer button
  const handleGoToPrayer = () => {
    console.log('Navigating to Prayer from Success screen');
    
    // First update the state in the store
    setHomeMode('PRAYER');
    setPathInProgress(true); // Make sure path is in progress to show the component
    
    // Add delay to give assets time to load
    console.log('Adding delay before navigation to ensure assets load');
    setTimeout(() => {
      // Navigate back to the home tab - the useEffect in index.tsx will respond to mode change
      router.push('/(tabs)');
    }, 500); // 500ms delay
  };
  
  // Handler for reflection button
  const handleGoToReflection = () => {
    console.log('Navigating to Reflection from Success screen');
    
    // First update the state in the store
    // Make sure path is in progress to show the component
    setHomeMode('DEFAULT');
    setPathInProgress(false); 
    router.push('/(tabs)');

    // Add delay to give assets time to load
    console.log('Adding delay before navigation to ensure assets load');
    setTimeout(() => {
      // Navigate back to the home tab - the useEffect in index.tsx will respond to mode change  
      setHomeMode('REFLECTION');
      setPathInProgress(true); 
    }, 700); // 500ms delay
  };
  
  // Determine if we should show next action buttons (only after reading is completed)
  const showNextButtons = effectiveType === SuccessAnimationType.READING && !prayerCompleted && !reflectionCompleted;

  // Set lamb mood to 'lamb-full' if all actions are completed


  return (
    <View className="flex-1 items-center justify-center pt-12 pb-16 px-5 bg-surfaceCream">
      {/* Rive animation - centered */}
      <View className="w-full h-96 my-8 items-center justify-center ">
        <Animated.View
          style={{
            width: '140%',
            height: '160%',
            transform: [
              { scale: riveScaleAnim },
              { rotate: riveRotateAnim.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: ['-15deg', '0deg', '15deg']
              })}
            ]
          }}
        >
          <Rive
            ref={riveRef}
            resourceName={"successLamb"}
            autoplay={false}
            style={{ width: '100%', height: '100%' }}
            {...(riveArtboard ? { artboardName: riveArtboard } : {})}
          />
        </Animated.View>
      </View>
      
      {/* Success message - enlarged */}
      <Text className="font-feather text-[32px] text-textPrimary mb-4 text-center -mt-16">{message}</Text>
      <Text className="font-din text-xl text-secondaryText text-center mb-6 px-6">{subMessage}</Text>
      
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
          elevation: 3,
        }}
      >
        <Text className="text-caption font-din text-[#B89B4C] text-center uppercase mb-3 tracking-wider">{rewardTitle}</Text>
        
        {effectiveType === SuccessAnimationType.BONUS ? (
          // Special bonus reward display
          <View className="flex-row items-center justify-center mb-2">
            <Image source={gemIcon} className="w-6 h-6 mr-2" />
            <Text className="font-din text-textPrimary text-xl">+9 Gems</Text>
          </View>
        ) : (
          // Standard rewards display for other success types
          <>
            {/* Only show hearts reward if not at max hearts */}
            {!isAtMaxHearts && actualHeartReward > 0 && (
              <View className="flex-row items-center justify-center mb-2">
                <Image source={heartIcon} className="w-6 h-6 mr-2" />
                <Text className="font-din text-textPrimary text-xl">+{actualHeartReward} Hearts</Text>
              </View>
            )}
            <View className="flex-row items-center justify-center">
              <Image source={starIcon} className="w-6 h-6 mr-2" />
              <Text className="font-din text-textPrimary text-xl">+{xpReward} Soul Points</Text>
            </View>
          </>
        )}
      </Animated.View>
      
      {/* Next Action Buttons - based on completion state */}
      <View className="w-full mt-4 mb-2">
        <View className="flex-row justify-center space-x-12">
          {/* Show Pray button only if prayer is not completed */}
          {!prayerCompleted && (
            <PrimaryButton
              title="Pray"
              onPress={handleGoToPrayer}
              style={reflectionCompleted ? "w-full" : "flex-1"}
              buttonType="blue"
            />
          )}
          <View className="w-4"></View>
          {/* Show Reflect button only if reflection is not completed */}
          {!reflectionCompleted && (
            <PrimaryButton
              title="Reflect"
              onPress={handleGoToReflection}
              style={prayerCompleted ? "w-full" : "flex-1"}
            />
          )}
        </View>
      </View>
      
      {/* Return Home - style based on whether action buttons are shown */}
      {(!prayerCompleted || !reflectionCompleted) ? (
        // Text link style when action buttons are shown
        <TouchableOpacity
          onPress={handlePress}
          className="mt-4"
        >
          <Text className="font-feather text-description text-center underline">
            Go Home
          </Text>
        </TouchableOpacity>
      ) : (
        // Regular button when no action buttons are shown
        <PrimaryButton
          title={buttonText}
          onPress={handlePress}
          style="mt-4"
        />
      )}
    </View>
  );
};

export default SuccessAnimation;
