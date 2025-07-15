import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { appLog } from '~/app/helper/helper';

// Define the screens in order (excluding special screens like auth and LoadingScreen)
const ORDERED_SCREENS = [
  '1',
  '2',
  'username',
  '3',
  '4',
  '5',
  '6',
  '7',
  'explainerHearts',
  'explainer',
  '9',
  '10',
  'rating',
  'streakCommitment',
  '11',
];

export default function ProgressBar() {
  const pathname = usePathname();
  const currentScreen = pathname?.split('/').pop() || '1';

  // Get the current screen index (0-based)
  const currentIndex = ORDERED_SCREENS.indexOf(currentScreen);

  // Calculate total steps (excluding special screens)
  const totalSteps = ORDERED_SCREENS.length;

  // Animated progress value
  const progressValue = useSharedValue(0);

  // Update progress when currentScreen changes
  useEffect(() => {
    // If screen is not in order list, maintain current progress
    if (currentIndex === -1) return;

    const targetProgress = Math.min(((currentIndex + 1) / totalSteps) * 100, 100);

    // Debug logging for progress calculation
    appLog(`[ProgressBar] Screen: ${currentScreen}, Index: ${currentIndex}, Total: ${totalSteps}, Progress: ${targetProgress}%`);

    // Use faster animation with easing for smoother transition
    progressValue.value = withTiming(targetProgress, {
      duration: 250, // Faster animation
      easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Smoother easing curve
    });
  }, [currentIndex, totalSteps, progressValue, currentScreen]);

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