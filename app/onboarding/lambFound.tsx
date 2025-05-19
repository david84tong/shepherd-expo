import { useAssets } from 'expo-asset';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { View, Text, Animated, ImageBackground, ActivityIndicator } from 'react-native';
import Rive from 'rive-react-native';

import PrimaryButton from '../../components/PrimaryButton';
import { useOnboardingStore } from '../stores/onboardingStore';
import ProgressBar from './components/ProgressBar';

export default function OnboardingWelcomeScreen() {
  const router = useRouter();
  const { setResponse } = useOnboardingStore();

  // Load Rive assets
  const [riveAssets] = useAssets([require('../../assets/riveAnimations/homeLamb.riv')]);

  // Create animated values
  const titleAnimation = new Animated.Value(0);
  const riveAnimation = new Animated.Value(0);
  const buttonAnimation = new Animated.Value(0);

  useEffect(() => {
    // Stagger the animations
    Animated.stagger(100, [
      // Title animation
      Animated.timing(titleAnimation, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Rive animation container
      Animated.timing(riveAnimation, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Button animation
      Animated.timing(buttonAnimation, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleContinue = async () => {
    router.push('/onboarding/2' as const);
  };

  // Common animation styles
  const getAnimatedStyle = (animation: Animated.Value) => ({
    opacity: animation,
    transform: [
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
    ],
  });

  // Show loading indicator while assets load
  if (!riveAssets) {
    return (
      <View className="flex-1 items-center justify-center bg-surfaceCream">
        <ActivityIndicator size="large" color="#3C584A" />
        <Text className="font-feather text-textPrimary mt-4">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ImageBackground
        source={require('../../assets/backgrounds/oldBarn.png')}
        className="absolute inset-0 w-full h-full"
        resizeMode="cover"
      />
      <View className="flex-1 px-6">
        {/* Progress Bar */}
        <View className="mt-4">
          <ProgressBar />
        </View>

        {/* Question Text */}
        <Animated.View style={getAnimatedStyle(titleAnimation)} className="mt-12">
          <Text className="font-feather text-h1 text-center text-textPrimary mb-4">
            Welcome to Shepherd
          </Text>
        </Animated.View>

        {/* Centered Rive Animation */}
        <Animated.View
          style={getAnimatedStyle(riveAnimation)}
          className="flex-1 justify-center items-center">
          <View className="h-[200px] w-full justify-center items-center">
            <Rive
              url={riveAssets[0].uri!}
              artboardName="lamb-idle"
              autoplay
              style={{ width: '80%', height: '80%' }}
            />
          </View>
        </Animated.View>

        {/* Continue Button */}
        <Animated.View style={getAnimatedStyle(buttonAnimation)} className="pb-8">
          <PrimaryButton title="Begin Journey" onPress={handleContinue} isActive />
        </Animated.View>
      </View>
    </View>
  );
}
