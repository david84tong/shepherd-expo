import { Image } from 'expo-image';
import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, Animated, Easing } from 'react-native';

interface AppLoadingProps {
  progress?: number;
}

const AppLoading: React.FC<AppLoadingProps> = ({ progress = 0 }) => {
  // Create an animated value for the pulse effect
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Setup pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [pulseAnim]);

  return (
    <View className="flex-1 items-center justify-center bg-surfaceCream">
      {/* Pulsing logo */}
      <Animated.View
        style={{
          transform: [{ scale: pulseAnim }],
        }}
        className="w-28 h-28 mb-8">
        <Image
          source={require('../assets/icon.png')}
          style={{ width: 112, height: 112 }}
          contentFit="contain"
          transition={300}
        />
      </Animated.View>

      {/* Loading text */}
      <Text className="font-feather text-textPrimary text-xl mb-6">Loading Shepherd...</Text>

      {/* Loading indicator */}
      <ActivityIndicator size="large" color="#3C584A" />

      {/* Loading progress */}
      {progress > 0 && (
        <View className="mt-4 w-48 h-2 bg-surfaceLight rounded-full overflow-hidden">
          <View
            className="h-full bg-accentGold rounded-full"
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
        </View>
      )}
    </View>
  );
};

export default AppLoading;
