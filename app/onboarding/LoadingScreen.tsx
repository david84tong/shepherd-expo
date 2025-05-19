import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_COMPLETED_KEY } from '../models/Onboarding';
import Rive, { Fit, Alignment } from 'rive-react-native';
import { useAssets } from 'expo-asset';
import analytics from '../../utils/analytics';

interface LoadingScreenProps {
  initialMessage?: string;
  onLoadingComplete?: () => void;
  redirectTo?: any; // Use any for now to allow any valid route path
}

const LOADING_MESSAGES = [
  'Saving your responses',
  'Encrypting your data',
  'Sprinkling some holy water',
  'Generating your custom plan',
];

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  initialMessage,
  onLoadingComplete,
  redirectTo,
}) => {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Get route parameters
  const initialMessageFromParams = params.initialMessage as string;
  const redirectAfterLoading = params.redirectAfterLoading as string;

  // Use params if available, otherwise use props
  const [progress, setProgress] = useState(0);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(
    initialMessageFromParams || initialMessage || LOADING_MESSAGES[0]
  );

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Load the Rive asset
  const [assets] = useAssets([require('../../assets/riveAnimations/homeLamb.riv')]);

  useEffect(() => {
    analytics.logEvent('OnboardingLoadingScreen_Viewed', {
      initialMessage: initialMessageFromParams || initialMessage,
      redirectTarget: redirectAfterLoading || redirectTo || 'PricingScreen',
    });
  }, [initialMessageFromParams, initialMessage, redirectAfterLoading, redirectTo]);

  // Handle text changes based on progress
  useEffect(() => {
    // Use custom message if provided, otherwise cycle through default messages
    if (!initialMessageFromParams) {
      // Calculate which message to show based on progress
      const messageIndex = Math.min(
        Math.floor((progress / 100) * LOADING_MESSAGES.length),
        LOADING_MESSAGES.length - 1
      );

      if (messageIndex !== currentMessageIndex) {
        // Fade out current text
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          // Change text while invisible
          setCurrentMessageIndex(messageIndex);
          setCurrentMessage(LOADING_MESSAGES[messageIndex]);

          // Fade in new text
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }).start();
        });
      }
    }
  }, [progress, currentMessageIndex, initialMessageFromParams]);

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

  // Function to finalize and navigate
  const finalizeAndNavigate = async () => {
    try {
      // Handle different navigation behaviors based on redirectAfterLoading
      if (redirectAfterLoading === 'back') {
        // Navigate back to PricingScreen with a param to indicate we're coming from loading
        analytics.logEvent('LoadingScreen_Redirect_Completed', {
          redirectTarget: 'PricingScreen',
          redirectType: 'back',
        });

        router.navigate({
          pathname: '/PricingScreen',
          params: { fromLoading: 'true', animateFromBottom: 'true' },
        });
      } else if (redirectTo || redirectAfterLoading) {
        // Navigate to specified redirect
        const targetPath = redirectAfterLoading || redirectTo;
        console.log('Loading complete, navigating to:', targetPath);

        analytics.logEvent('LoadingScreen_Redirect_Completed', {
          redirectTarget: targetPath,
          redirectType: 'custom',
        });

        router.replace(targetPath);
      } else {
        // Default behavior for onboarding

        // Call completion handler if provided
        if (onLoadingComplete) {
          onLoadingComplete();
        }

        // Navigate to pricing screen with animation param
        console.log('Onboarding complete, navigating to pricing screen');

        analytics.logEvent('LoadingScreen_Redirect_Completed', {
          redirectTarget: 'PricingScreen',
          redirectType: 'default',
          onboardingCompleted: true,
        });

        router.replace({
          pathname: '/PricingScreen',
          params: { animateFromBottom: 'true' },
        });
      }

      analytics.logEvent('OnboardingLoadingScreen_Completed', {
        progress: 100,
        finalMessage: currentMessage,
      });
    } catch (error) {
      console.error('Error finalizing loading screen:', error);

      analytics.logEvent('LoadingScreen_Redirect_Error', {
        errorMessage: (error as Error)?.message || 'Unknown error',
      });

      // Fallback navigation
      router.replace({
        pathname: '/PricingScreen',
        params: { animateFromBottom: 'true' },
      });
    }
  };

  // Handle progress simulation
  useEffect(() => {
    let lastProgress = 0;

    // Simulate loading progress - faster for subscription flow
    const incrementSpeed = redirectAfterLoading === 'back' ? 40 : 120; // Faster for subscription flow

    // Simulate loading progress
    const interval: NodeJS.Timeout = setInterval(() => {
      if (progress < 100) {
        // Generate next progress value with slight randomization for natural feel
        const increment = Math.max(1, Math.floor(Math.random() * 3));
        const nextProgress = Math.min(100, progress + increment);

        // Update progress
        setProgress(nextProgress);

        // Provide haptic feedback for each percentage point change
        if (Math.floor(nextProgress) > Math.floor(lastProgress)) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }

        // Small animation pulse on progress change
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();

        lastProgress = nextProgress;
      } else {
        // Loading complete
        clearInterval(interval);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

        // Wait a moment before calling completion handler and navigating
        setTimeout(() => {
          finalizeAndNavigate();
        }, 400);
      }
    }, incrementSpeed); // Adjust speed of progress

    return () => {
      clearInterval(interval);
    };
  }, [progress, onLoadingComplete, redirectTo, redirectAfterLoading, router]);

  // Show loading indicator while assets are loading
  if (!assets) {
    return (
      <View className="flex-1 items-center justify-center bg-surfaceCream">
        <ActivityIndicator size="large" color="#3C584A" />
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-surfaceCream px-8">
      {/* Pulsing Rive animation */}
      <View className="w-56 h-56 mb-24 flex items-center justify-center">
        <Rive
          url={assets[0].uri!}
          artboardName="lamb-writing"
          autoplay={true}
          fit={Fit.Contain}
          alignment={Alignment.Center}
          style={{ width: 240, height: 240 }}
        />
      </View>

      {/* Animated message text */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
        className="mb-8 min-h-[30px]">
        <Text className="font-feather text-textPrimary text-2xl text-center">
          {currentMessage}...
        </Text>
      </Animated.View>

      {/* Progress indicator */}
      <View className="w-96 items-center">
        <View className="w-full h-4 bg-surfaceLight rounded-full overflow-hidden mb-2">
          <Animated.View
            className="h-full bg-accentGold rounded-full"
            style={{
              width: `${progress}%`,
              transform: [{ scale: scaleAnim }],
            }}
          />
        </View>
        <Text className="font-feather text-description text-h1 mt-4">{progress}%</Text>
      </View>
    </View>
  );
};

export default LoadingScreen;
