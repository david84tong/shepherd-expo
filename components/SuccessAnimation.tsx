import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Animated } from 'react-native';
import Rive, { RiveRef } from 'rive-react-native';
import { router } from 'expo-router';
import { useHomeStore } from '../app/stores/homeStore';
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


enum SuccessAnimationType {
    READING = 'reading',
    PRAYER = 'prayer',
    REFLECTION = 'reflection',
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
  const setPathInProgress = usePathStore((state) => state.setPathInProgress);
  
  // Animations for rewards card
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(30)).current;
  
  // Add Rive animation effects
  const riveScaleAnim = useRef(new Animated.Value(0.9)).current;
  const riveRotateAnim = useRef(new Animated.Value(0.05)).current;
  
  // Use provided props or default values
  const message = propMessage || "Great job!";
  const subMessage = propSubMessage || "You completed your reading for today.";

  // Play animation when component mounts
  useEffect(() => {
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
  }, []);

  // Default navigation behavior
  const handleGoHome = () => {
    // Reset states
    console.log('handleGoHome');
    setPathInProgress(false);
    setHomeMode('DEFAULT');
    
    // Navigate to home tab instead of going back
    router.replace('/(tabs)');
  };

  // Determine the action for the button press
  const handlePress = propOnClose || handleGoHome;
  const buttonText = propOnClose ? "Close" : "Return Home";

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
            resourceName="successHeartAndStars"
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
        <Text className="text-caption font-din text-[#B89B4C] text-center uppercase mb-3 tracking-wider">REWARDS EARNED</Text>
        <View className="flex-row items-center justify-center mb-2">
          <Text className="font-din text-textPrimary text-xl mr-2">❤️</Text>
          <Text className="font-din text-textPrimary text-xl">+3 Hearts</Text>
        </View>
        <View className="flex-row items-center justify-center">
          <Text className="font-din text-textPrimary text-xl mr-2">⭐</Text>
          <Text className="font-din text-textPrimary text-xl">+3 Soul Points</Text>
        </View>
      </Animated.View>
      
      {/* Use PrimaryButton instead of TouchableOpacity */}
      <PrimaryButton
        title={buttonText}
        onPress={handlePress}
        style="mt-10"
      />
    </View>
  );
};

export default SuccessAnimation;
