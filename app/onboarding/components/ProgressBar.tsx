import { usePathname } from 'expo-router';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export default function ProgressBar() {
  const pathname = usePathname();
  const currentPage = parseInt(pathname?.split('/').pop() || '1', 10);
  const totalPages = 5; // Adjust based on your total number of pages

  // Animated progress value
  const progressValue = useSharedValue(0);

  // Update progress when currentPage changes
  useEffect(() => {
    const targetProgress = Math.min((currentPage / totalPages) * 100, 100);
    // Use faster animation with easing for smoother transition
    progressValue.value = withTiming(targetProgress, {
      duration: 250, // Faster animation
      easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Smoother easing curve
    });
  }, [currentPage, totalPages, progressValue]);

  // Create animated style for the progress bar
  const progressStyle = useAnimatedStyle(() => {
    return {
      width: `${progressValue.value}%`,
      height: '100%',
      backgroundColor: '#FCD34D', // accentGold color
    };
  });

  return (
    <View className="w-full h-1 bg-gray-200">
      <Animated.View style={progressStyle} />
    </View>
  );
}
