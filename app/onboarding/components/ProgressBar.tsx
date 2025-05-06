import React, { useEffect } from 'react';
import { View } from 'react-native';
import { usePathname } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export default function ProgressBar() {
  const pathname = usePathname();
  const screenName = pathname?.split('/').pop() || '1';
  
  // Total number of screens in the main onboarding flow
  const totalScreens = 10;
  
  // Map screen names to progress positions (1-based index)
  const getScreenPosition = (screen: string): number => {
    // Handle numeric screens
    if (!isNaN(parseInt(screen, 10))) {
      const numericScreen = parseInt(screen, 10);
      return numericScreen;
    }
    
    // Handle special screens
    switch (screen) {
      case 'auth':
        return 10; // Last screen in the main flow
      case 'lambFound':
        return 9;
      case 'pathAffinity':
        return 8;
      default:
        return 1; // Default to first screen if unknown
    }
  };
  
  // Get current position
  const currentPosition = getScreenPosition(screenName);
  
  // Animated progress value
  const progressValue = useSharedValue(0);
  
  // Update progress when screen changes
  useEffect(() => {
    const targetProgress = Math.min((currentPosition / totalScreens) * 100, 100);
    // Use faster animation with easing for smoother transition
    progressValue.value = withTiming(targetProgress, {
      duration: 250, // Faster animation
      easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Smoother easing curve
    });
  }, [currentPosition, progressValue]);
  
  // Create animated style for the progress bar
  const progressStyle = useAnimatedStyle(() => {
    return {
      width: `${progressValue.value}%`,
      height: '100%',
      backgroundColor: '#FCD34D', // accentGold color
    };
  });

  return (
    <View className="w-full h-2 bg-gray-200 rounded-full">
      <Animated.View style={progressStyle} className="rounded-full" />
    </View>
  );
}
