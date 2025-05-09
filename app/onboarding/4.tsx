import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useUserStore } from '../stores/userStore';
import PrimaryButton from '../../components/PrimaryButton';
import { OnboardingResponses } from '../models/Onboarding';
import Animated, { 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import analytics from '~/utils/analytics';

export default function OnboardingBibleFamiliarityScreen() {
  const router = useRouter();
  const { setResponse } = useOnboardingStore();
  const { setExperienceLevel } = useUserStore();
  const [selectedOption, setSelectedOption] = useState<OnboardingResponses['bibleFamiliarity']>(undefined);

  // Create Reanimated shared values for each component
  const iconOpacity = useSharedValue(0);
  const iconTranslateY = useSharedValue(40);
  
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(40);
  
  const optionsOpacity = useSharedValue(0);
  const optionsTranslateY = useSharedValue(40);

  useEffect(() => {
    // Reset animation values
    iconOpacity.value = 0;
    iconTranslateY.value = 40;
    titleOpacity.value = 0;
    titleTranslateY.value = 40;
    optionsOpacity.value = 0;
    optionsTranslateY.value = 40;
    
    // Staggered animations for each component
    const animateComponent = (opacity: any, translateY: any, delay: number) => {
      opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
      translateY.value = withDelay(delay, 
        withSpring(0, { 
          damping: 20,
          stiffness: 90,
        })
      );
    };

    // Start animations with delays
    animateComponent(iconOpacity, iconTranslateY, 0);
    animateComponent(titleOpacity, titleTranslateY, 200);
    animateComponent(optionsOpacity, optionsTranslateY, 400);
  }, []);

  // Create animated styles for each component
  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ translateY: iconTranslateY.value }]
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }]
  }));

  const optionsStyle = useAnimatedStyle(() => ({
    opacity: optionsOpacity.value,
    transform: [{ translateY: optionsTranslateY.value }]
  }));

  const handleSelection = async (familiarity: OnboardingResponses['bibleFamiliarity']) => {
    // Map familiarity to experience level
    const experienceMap = {
      'never': 'Beginner',
      'a-little': 'Beginner',
      'on-off': 'Intermediate',
      'consistently': 'Advanced'
    } as const;
    
    // Set in user store
    setExperienceLevel(familiarity || 'Beginner');
    
    // Trigger light haptic feedback
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        console.log('Haptics not available');
      });
    } catch (error) {
      console.log('Haptics not available');
    }
    
    analytics.logEvent("OnboardingFamilarityScreen_Tapped_Continue", {
      familiarity: familiarity,
    });

    setSelectedOption(familiarity);
    await setResponse('bibleFamiliarity', familiarity);
    router.push('/onboarding/5');
  };

  const options = [
    {
      id: 'never',
      title: 'Not at all',
      description: 'Starting fresh on this journey',
    },
    {
      id: 'a-little',
      title: 'Somewhat',
      description: 'Starting fresh on this journey',
    },
    {
      id: 'on-off',
      title: 'Fairly',
      description: `I've read some of the books` ,
    },
    {
      id: 'consistently',
      title: 'Very',
      description: `I've read most of it`,
    },
    {
      id: 'extremely',
      title: 'Extremely',
      description: `I've read it all or nearly all`,
    },
  ] as const;

  return (
    <View className="flex-1 bg-surfaceCream px-6 pt-12">
      {/* Decorative Background Elements */}
  
      {/* Question Text */}
      <Animated.View style={titleStyle}>
        <Text className="font-feather text-h1 text-center text-textPrimary mb-4">
          How familiar are you with the Bible?
        </Text>
      </Animated.View>

      {/* Options Container */}
      <Animated.View style={optionsStyle} className="space-y-4 mt-8">
        {options.map((option) => (
          <PrimaryButton
            key={option.id}
            title={option.title}
            onPress={() => handleSelection(option.id as OnboardingResponses['bibleFamiliarity'])}
            isActive={true}
            primaryColor={selectedOption === option.id ? 'bg-surfaceCream' : 'bg-white'}
            textColor={selectedOption === option.id ? 'text-accentGold' : 'text-textPrimary'}
          />
        ))}
      </Animated.View>
    </View>
  );
}
