import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingStore } from '../stores/onboardingStore';
import PrimaryButton from '../../components/PrimaryButton';
import Animated, { 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OnboardingIntentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setResponse } = useOnboardingStore();
  const [pressedButton, setPressedButton] = useState<string | null>(null);
  const [selectedIntents, setSelectedIntents] = useState<string[]>([]);
  const insets = useSafeAreaInsets();
  
  // Track if animations have been initialized
  const animationsInitialized = useRef(false);

  // Create Reanimated shared values for each component
  const screenOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20); // Smaller initial offset
  
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(20); // Smaller initial offset

  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(20); // Smaller initial offset
  
  const continueOpacity = useSharedValue(0);
  const continueTranslateY = useSharedValue(20); // Smaller initial offset

  // Run animations only once during initial layout
  useLayoutEffect(() => {
    if (animationsInitialized.current) return;
    
    // Set initial screen opacity based on whether we came from immediate transition
    const immediate = params?.immediate === 'true';
    screenOpacity.value = immediate ? 1 : 0;
    
    if (!immediate) {
      // Fade in the entire screen first, faster
      screenOpacity.value = withTiming(1, { duration: 250 });
    }
    
    // Reset animation values with minimal delay
    const timer = setTimeout(() => {
      titleOpacity.value = 0;
      titleTranslateY.value = 20;
      subtitleOpacity.value = 0;
      subtitleTranslateY.value = 20;
      buttonsOpacity.value = 0;
      buttonsTranslateY.value = 20;
      continueOpacity.value = 0;
      continueTranslateY.value = 20;
      
      // Staggered animations for each component with shorter delays
      const animateComponent = (opacity: any, translateY: any, delay: number) => {
        opacity.value = withDelay(delay, withTiming(1, { duration: 300 })); // Faster timing
        translateY.value = withDelay(delay, 
          withSpring(0, { 
            damping: 16, // More damping for faster settling
            stiffness: 100, // Stiffer spring for faster animation
            mass: 0.8, // Lighter mass for quicker movement
          })
        );
      };

      // Use much shorter delays between components for faster overall animation
      animateComponent(titleOpacity, titleTranslateY, 50);
      animateComponent(subtitleOpacity, subtitleTranslateY, 100);
      animateComponent(buttonsOpacity, buttonsTranslateY, 150);
      animateComponent(continueOpacity, continueTranslateY, 200);
      
      // Mark animations as initialized
      animationsInitialized.current = true;
    }, 50); // Much shorter initial delay

    return () => clearTimeout(timer);
  }, []); // Empty dependency array so it only runs once

  // Create animated style for the screen container
  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    flex: 1,
    backgroundColor: '#FFF4D9' // Explicitly set the cream background color
  }));
  
  // Create animated styles for each component
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }]
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }]
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }]
  }));

  const continueStyle = useAnimatedStyle(() => ({
    opacity: continueOpacity.value,
    transform: [{ translateY: continueTranslateY.value }],
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: Math.max(insets.bottom + 16, 24),
  }));

  const handleSelection = (intent: string) => {
    // Trigger light haptic feedback
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        console.log('Haptics not available');
      });
    } catch (error) {
      console.log('Haptics not available');
    }
    
    setSelectedIntents(prev => {
      const newSelection = prev.includes(intent)
        ? prev.filter(i => i !== intent)
        : [...prev, intent];
      return newSelection;
    });
  };

  const handleContinue = async () => {
    if (selectedIntents.length > 0) {
      // Animate out before navigating, but faster
      screenOpacity.value = withTiming(0, { duration: 300 }); // Faster fade out
      
      // Shorter delay before navigating
      await setResponse('intent', selectedIntents);
      router.push({
        pathname: '/onboarding/4',
        params: { 
          animated: true,
          animation: 'fade',
          immediate: true
        }
      } as any);
    }
  };

  const buttons = [
    {
      id: 'read-bible',
      icon: 'book-outline',
      color: '#F7B500',
      bgColor: 'bg-lightYellow',
      title: 'Read the Bible',
      description: 'Start your journey through scripture',
    },
    {
      id: 'talk-to-god',
      icon: 'chatbubble-outline',
      color: '#2196F3',
      bgColor: 'bg-lightBlue',
      title: 'Talk to God',
      description: 'Learn to pray with confidence',
    },
    {
      id: 'reflection-quiet-time',
      icon: 'leaf-outline',
      color: '#24CA17',
      bgColor: 'bg-lightGreen',
      title: 'Reflection & Quiet Time',
      description: 'Daily moments of peace with God',
    },
    {
      id: 'just-exploring',
      icon: 'compass-outline',
      color: '#FF8C1A',
      bgColor: 'bg-lightOrange',
      title: 'Just Exploring',
      description: 'Discover at your own pace',
    },
  ];

  return (
    <Animated.View style={screenStyle} className="px-6 pt-12 pb-24">
      {/* Question Text */}
      <Animated.View style={titleStyle}>
        <Text className="font-feather text-h1 text-center text-textPrimary mb-4 px-12">
          What brings you here today?
        </Text>
      </Animated.View>

      <Animated.View style={subtitleStyle}>
        <Text className="font-din text-lg text-description text-center mt-0">
          Select all that apply
        </Text>
      </Animated.View>

      {/* Buttons Container - with padding at bottom to make space for fixed button */}
      <Animated.View style={buttonsStyle} className="space-y-4 mt-8 mb-20">
        {buttons.map((button) => (
          <Pressable
            key={button.id}
            onPress={() => handleSelection(button.id)}
            onPressIn={() => setPressedButton(button.id)}
            onPressOut={() => setPressedButton(null)}
            className={`
              h-[80px] bg-white rounded-card border-[3px] border-border px-4
              flex-row items-center shadow-buttonShadow mt-4
              ${pressedButton === button.id ? 'translate-y-[3px] shadow-none' : 'translate-y-0'}
              ${selectedIntents.includes(button.id) ? 'border-accentGold bg-surfaceCream' : ''}
            `}
          >
            <View className={`${button.bgColor} rounded-xl p-3`}>
              <Ionicons name={button.icon as any} size={24} color={button.color} />
            </View>
            <View className="ml-4 flex-1">
              <Text className="font-feather text-lg text-textPrimary">{button.title}</Text>
              <Text className="font-din text-md text-description mt-1">
                {button.description}
              </Text>
            </View>
            <View className={`
              w-6 h-6 rounded-full border-2 items-center justify-center
              ${selectedIntents.includes(button.id) 
                ? 'bg-accentGold border-accentGold' 
                : 'border-description'
              }
            `}>
              {selectedIntents.includes(button.id) && (
                <Ionicons name="checkmark" size={16} color="white" />
              )}
            </View>
          </Pressable>
        ))}
      </Animated.View>
        
      {/* Continue Button - Fixed at bottom */}
      <Animated.View style={continueStyle}>
        <PrimaryButton
          title="Continue"
          onPress={handleContinue}
          disabled={selectedIntents.length === 0}
          isActive={selectedIntents.length > 0}
        />
      </Animated.View>
    </Animated.View>
  );
}
