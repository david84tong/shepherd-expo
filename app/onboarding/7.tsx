import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';

import PrimaryButton from '../../components/PrimaryButton';
import { OnboardingResponses } from '../models/Onboarding';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useUserStore } from '../stores/userStore';
import analytics from '../../utils/analytics';
export default function OnboardingAgeRangeScreen() {
  const router = useRouter();
  const { setResponse } = useOnboardingStore();
  const { setUser } = useUserStore();
  const [selectedOption, setSelectedOption] = useState<OnboardingResponses['ageRange']>(undefined);

  // Create Reanimated shared values for each component
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(40);

  const optionsOpacity = useSharedValue(0);
  const optionsTranslateY = useSharedValue(40);

  useEffect(() => {
    // Reset animation values
    titleOpacity.value = 0;
    titleTranslateY.value = 40;
    optionsOpacity.value = 0;
    optionsTranslateY.value = 40;

    // Staggered animations for each component
    const animateComponent = (opacity: any, translateY: any, delay: number) => {
      opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
      translateY.value = withDelay(
        delay,
        withSpring(0, {
          damping: 20,
          stiffness: 90,
        })
      );
    };

    // Start animations with delays
    animateComponent(titleOpacity, titleTranslateY, 0);
    animateComponent(optionsOpacity, optionsTranslateY, 200);
  }, []);

  // Create animated styles for each component
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const optionsStyle = useAnimatedStyle(() => ({
    opacity: optionsOpacity.value,
    transform: [{ translateY: optionsTranslateY.value }],
  }));

  const handleSelection = async (ageRange: OnboardingResponses['ageRange']) => {
    // Trigger light haptic feedback
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        console.log('Haptics not available');
      });
    } catch (error) {
      console.log('Haptics not available');
    }

    analytics.logEvent("OnboardingAgeRangeScreen_Tapped_Option", {
      value: ageRange,
    });

    setSelectedOption(ageRange);
    await setResponse('ageRange', ageRange);

    // Save to user store
    setUser({ ageRange });

    // Navigate to next screen
    router.push('/onboarding/8' as any);
  };

  const options = [
    {
      id: 'parent',
      title: "I'm a parent/guardian",
    },
    {
      id: 'under-12',
      title: 'Under 12',
    },
    {
      id: '13-17',
      title: '13-17',
    },
    {
      id: '18-24',
      title: '18-24',
    },
    {
      id: '25-34',
      title: '25-34',
    },
    {
      id: '35-44',
      title: '35-44',
    },
    {
      id: '45-54',
      title: '45-54',
    },
    {
      id: '55-64+',
      title: '55-64',
    },   

  ] as const;

  return (
    <View className="flex-1 bg-surfaceCream px-6 pt-12">
      {/* Question Text */}
      <Animated.View style={titleStyle}>
        <Text className="font-feather text-h2 text-center text-textPrimary mb-4">
          What is your age range?
        </Text>
      </Animated.View>

      {/* Options Container */}
      <Animated.View style={optionsStyle} className="space-y-4 mt-0">
        <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          <View className="space-y-4">
            {options.map((option) => (
              <PrimaryButton
                key={option.id}
                title={option.title}
                onPress={() => handleSelection(option.id as OnboardingResponses['ageRange'])}
                isActive
                primaryColor={selectedOption === option.id ? 'bg-surfaceCream' : 'bg-white'}
                textColor={selectedOption === option.id ? 'text-accentGold' : 'text-textPrimary'}
              />
            ))}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}
