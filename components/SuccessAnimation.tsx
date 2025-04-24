import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Animated } from 'react-native';
import Rive, { RiveRef } from 'rive-react-native';
import { router } from 'expo-router';
import { useHomeStore, SuccessAnimationType } from '../app/stores/homeStore';
import { usePathStore } from '../app/stores/pathStore';
import PrimaryButton from './PrimaryButton';

// Get screen dimensions to ensure full screen sizing
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Define props interface
interface SuccessAnimationProps {
  message?: string;
  subMessage?: string;
  onClose?: () => void;
}

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
  
  // Get completion states
  const readingCompleted = useHomeStore((state) => state.readingCompleted);
  const prayerCompleted = useHomeStore((state) => state.prayerCompleted);
  const reflectionCompleted = useHomeStore((state) => state.reflectionCompleted);
  
  // Log when component mounts or successType changes
  useEffect(() => {
    console.log("SuccessAnimation: Current successType:", successType);
    // If no success type is set, default to READING
    if (!successType) {
      console.log("No success type found in store, defaulting to READING");
      setSuccessType(SuccessAnimationType.READING);
    }
  }, [successType, setSuccessType]);
  
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
  let riveResource = "successHeartAndStars"; // Default animation
  let rewardTitle = "REWARDS EARNED";

  // Get values based on successType - make sure we are handling all possible types
  if (successType === SuccessAnimationType.READING) {
    console.log("Setting up READING success screen");
    message = "Reading Complete!";
    subMessage = "You finished today's Bible reading. The Shepherd is pleased.";
    heartReward = 3;
    xpReward = 5; 
    riveResource = "successHeartAndStars";
    rewardTitle = "READING REWARDS";
  } else if (successType === SuccessAnimationType.PRAYER) {
    console.log("Setting up PRAYER success screen");
    message = "Prayer Complete!";
    subMessage = "You spent quality time with the Shepherd in prayer.";
    heartReward = 2;
    xpReward = 3;
    riveResource = "successHeartAndStars";
    rewardTitle = "PRAYER REWARDS";
  } else if (successType === SuccessAnimationType.REFLECTION) {
    console.log("Setting up REFLECTION success screen");
    message = "Reflection Complete!";
    subMessage = "You've recorded your thoughts and connected with the Word.";
    heartReward = 1;
    xpReward = 2;
    riveResource = "successHeartAndStars"; 
    rewardTitle = "REFLECTION REWARDS";
  } else {
    // This should not happen, but log an error if it does
    console.error("Invalid or missing success type:", successType);
  }

  // Play animations when component mounts or successType changes
  useEffect(() => {
    console.log("Running animation effect for successType:", successType, "using resource:", riveResource);

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
  }, [successType]); // Add successType to dependencies so the effect reruns when it changes

  // Default navigation behavior
  const handleGoHome = () => {
    // Reset states
    console.log('handleGoHome - Resetting states');
    setPathInProgress(false);
    setHomeMode('DEFAULT');
    setSuccessType(null);
    
    // Add delay to give assets time to load
    console.log('Adding delay before navigation to ensure assets load');
    setTimeout(() => {
      // Navigate to home tab instead of going back
      router.replace('/(tabs)');
    }, 500); // 500ms delay
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
    setHomeMode('REFLECTION');
    setPathInProgress(true); // Make sure path is in progress to show the component
    
    // Add delay to give assets time to load
    console.log('Adding delay before navigation to ensure assets load');
    setTimeout(() => {
      // Navigate back to the home tab - the useEffect in index.tsx will respond to mode change  
      router.push('/(tabs)');
    }, 500); // 500ms delay
  };
  
  // Determine if we should show next action buttons (only after reading is completed)
  const showNextButtons = successType === SuccessAnimationType.READING && !prayerCompleted && !reflectionCompleted;

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
            resourceName={riveResource}
            autoplay={false}
            style={{ width: '100%', height: '100%' }}
          />
        </Animated.View>
      </View>
      
      {/* Success message - enlarged */}
      <Text className="font-feather text-[32px] text-textPrimary mb-4 text-center">{message}</Text>
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
        <View className="flex-row items-center justify-center mb-2">
          <Text className="font-din text-textPrimary text-xl mr-2">❤️</Text>
          <Text className="font-din text-textPrimary text-xl">+{heartReward} Hearts</Text>
        </View>
        <View className="flex-row items-center justify-center">
          <Text className="font-din text-textPrimary text-xl mr-2">⭐</Text>
          <Text className="font-din text-textPrimary text-xl">+{xpReward} Soul Points</Text>
        </View>
      </Animated.View>
      
      {/* Next Action Buttons - only shown after reading completion */}
      {showNextButtons && (
        <View className="w-full mt-4 mb-2">
          <Text className="font-feather text-lg text-textPrimary mb-3 text-center">Continue Your Journey</Text>
          <View className="flex-row justify-center space-x-4">
            <PrimaryButton
              title="Pray"
              onPress={handleGoToPrayer}
              style="flex-1"
            />
            <PrimaryButton
              title="Reflect"
              onPress={handleGoToReflection}
              style="flex-1"
            />
          </View>
        </View>
      )}
      
      {/* Use PrimaryButton instead of TouchableOpacity */}
      <PrimaryButton
        title={buttonText}
        onPress={handlePress}
        style="mt-4"
      />
    </View>
  );
};

export default SuccessAnimation;
