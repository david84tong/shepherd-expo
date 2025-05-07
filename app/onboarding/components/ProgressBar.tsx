import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export default function ProgressBar() {
  const pathname = usePathname();
  const currentPage = parseInt(pathname?.split('/').pop() || '1', 10);
  const totalPages = 11; // Updated to 11 screens

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
    <View className="w-full h-2 bg-gray-200 rounded-full">
      <Animated.View style={progressStyle} className="rounded-full" />
    </View>
  );
}
