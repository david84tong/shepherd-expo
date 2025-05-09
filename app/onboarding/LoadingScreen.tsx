import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
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
  "Saving your responses",
  "Encrypting your data",
  "Sprinkling some holy water",
  "Generating your custom plan"
];

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  initialMessage = LOADING_MESSAGES[0],
  onLoadingComplete,
  redirectTo = '/(tabs)' // Default to home tabs if not specified
}) => {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(initialMessage);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Load the Rive asset
  const [assets] = useAssets([require('../../assets/riveAnimations/homeLamb.riv')]);

  useEffect(() => {
    analytics.logEvent("OnboardingLoadingScreen_Viewed");
  }, []);
  
  // Handle text changes based on progress
  useEffect(() => {
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
  }, [progress, currentMessageIndex]);

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
  
  // Function to finalize onboarding and navigate to home
  const finalizeAndNavigate = async () => {
    try {
      // Double-check onboarding is marked as completed
      const isCompleted = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      
      if (isCompleted !== 'true') {
        await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      }
      
      // Call completion handler if provided
      if (onLoadingComplete) {
        onLoadingComplete();
      }
      
      // Navigate to home or specified redirect
      console.log('Onboarding complete, navigating to:', redirectTo);
      router.replace(redirectTo);
      analytics.logEvent("OnboardingLoadingScreen_Completed");
    } catch (error) {
      console.error('Error finalizing onboarding:', error);
      // Navigate anyway as fallback
      router.replace('/(tabs)');
    }
  };
  
  // Handle progress simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let lastProgress = 0;
    
    // Simulate loading progress
    interval = setInterval(() => {
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
    }, 120); // Adjust speed of progress
    
    return () => {
      clearInterval(interval);
    };
  }, [progress, onLoadingComplete, redirectTo, router]);
  
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
      <View
        
        className="w-56 h-56 mb-24 ml-8"
      >
        <Rive
          url={assets[0].localUri!}
          artboardName="lamb-writing"
          autoplay={true}
          fit={Fit.Contain}
          alignment={Alignment.Center}
          style={{ width: 160, height: 160 }}
        />
      </View>
      
      {/* Animated message text */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
        className="mb-8 min-h-[30px]"
      >
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
              transform: [{ scale: scaleAnim }] 
            }} 
          />
        </View>
        <Text className="font-feather text-description text-h1 mt-4">
          {progress}%
        </Text>
      </View>
    </View>
  );
};

export default LoadingScreen;
