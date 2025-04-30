import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingStore } from '../stores/onboardingStore';
import PrimaryButton from '../../components/PrimaryButton';
import { OnboardingResponses } from '../models/Onboarding';
import Animated, { 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';

export default function OnboardingReadingTimeScreen() {
  const router = useRouter();
  const { setResponse } = useOnboardingStore();
  const [selectedOption, setSelectedOption] = useState<string | undefined>(undefined);

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

  const handleSelection = async (duration: string) => {
    setSelectedOption(duration);
    await setResponse('readingDuration', duration);
    router.push('/onboarding/6');
  };

  const options = [
    {
      id: '1-5',
      title: '1-5 mins',
    },
    {
      id: '6-10',
      title: '6-10 mins',
    },
    {
      id: '11-15',
      title: '11-15 mins',
    },
    {
      id: '16-20',
      title: '16-20 mins',
    },
    {
      id: '20-30',
      title: '20-30 mins',
    },
    {
      id: '30-60',
      title: '30-60 mins',
    },
    {
      id: '60+',
      title: '60+ mins',
    },
  ] as const;

  return (
    <View className="flex-1 bg-surfaceCream px-6 pt-12">
      {/* Decorative Background Elements */}
 
      {/* Question Text */}
      <Animated.View style={titleStyle}>
        <Text className="font-feather text-h1 text-center text-textPrimary mb-4 mt-16">
          How many minutes per day can you read?
        </Text>
      </Animated.View>

      {/* Options Container */}
      <Animated.View style={optionsStyle} className="space-y-4 mt-8">
        {options.map((option) => (
          <PrimaryButton
            key={option.id}
            title={option.title}
            onPress={() => handleSelection(option.id)}
            isActive={true}
            primaryColor={selectedOption === option.id ? 'bg-surfaceCream' : 'bg-white'}
            textColor={selectedOption === option.id ? 'text-accentGold' : 'text-textPrimary'}
          />
        ))}
      </Animated.View>
    </View>
  );
}
