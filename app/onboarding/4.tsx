import React, { useState, useEffect } from 'react';
import { View, Text, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
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
import i18n from '../utils/i18n';

export default function OnboardingBibleFamiliarityScreen() {
  const router = useRouter();
  const { setResponse } = useOnboardingStore();
  const { setExperienceLevel } = useUserStore();
  const [selectedOption, setSelectedOption] =
    useState<OnboardingResponses['bibleFamiliarity']>(undefined);

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
      translateY.value = withDelay(
        delay,
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
    transform: [{ translateY: iconTranslateY.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const optionsStyle = useAnimatedStyle(() => ({
    opacity: optionsOpacity.value,
    transform: [{ translateY: optionsTranslateY.value }],
  }));

  const handleSelection = async (familiarity: OnboardingResponses['bibleFamiliarity']) => {
    // Map familiarity to experience level
    const experienceMap = {
      never: 'Beginner',
      'a-little': 'Beginner',
      'on-off': 'Intermediate',
      consistently: 'Advanced',
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

    analytics.logEvent('OnboardingFamilarityScreen_Tapped_Continue', {
      familiarity: familiarity,
    });

    setSelectedOption(familiarity);
    await setResponse('bibleFamiliarity', familiarity);
    router.push('/onboarding/5');
  };

  const options = [
    {
      id: 'never',
      title: i18n.t('onboarding_bible_familiarity_never'),
      description: i18n.t('onboarding_bible_familiarity_never_desc'),
    },
    {
      id: 'a-little',
      title: i18n.t('onboarding_bible_familiarity_somewhat'),
      description: i18n.t('onboarding_bible_familiarity_somewhat_desc'),
    },
    {
      id: 'on-off',
      title: i18n.t('onboarding_bible_familiarity_fairly'),
      description: i18n.t('onboarding_bible_familiarity_fairly_desc'),
    },
    {
      id: 'consistently',
      title: i18n.t('onboarding_bible_familiarity_very'),
      description: i18n.t('onboarding_bible_familiarity_very_desc'),
    },
    {
      id: 'extremely',
      title: i18n.t('onboarding_bible_familiarity_extremely'),
      description: i18n.t('onboarding_bible_familiarity_extremely_desc'),
    },
  ] as const;

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View className="flex-1 bg-surfaceCream px-6 pt-12">
        {/* Decorative Background Elements */}

        {/* Question Text */}
        <Animated.View style={titleStyle}>
          <Text className="font-feather text-h2 text-center text-textPrimary mb-0">
            {i18n.t('onboarding_bible_familiarity_question')}
          </Text>
        </Animated.View>

        {/* Options Container */}
        <Animated.View style={optionsStyle} className="space-y-4 mt-4">
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
    </>
  );
}
