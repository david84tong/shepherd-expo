// Protestant
// Catholic
// Eastern / Oriental Orthodox
// Non-Denominational / Evangelical
// Jewish
// Agnostic
// Spiritual but not religious
// Other Religion
// Prefer not to say

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
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
import analytics from '../../utils/analytics';
import { useTranslation } from 'react-i18next';


export default function OnboardingReligiousAffiliationScreen() {
  const router = useRouter();
  const { setResponse } = useOnboardingStore();
  const { setDenomination } = useUserStore();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const { t } = useTranslation();

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
      translateY.value = withDelay(delay,
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
    transform: [{ translateY: titleTranslateY.value }]
  }));

  const optionsStyle = useAnimatedStyle(() => ({
    opacity: optionsOpacity.value,
    transform: [{ translateY: optionsTranslateY.value }]
  }));

  const handleSelection = async (affiliation: string) => {
    // Map affiliation to denomination
    const denominationMap = {
      'protestant': 'Protestant',
      'catholic': 'Catholic',
      'orthodox': 'Orthodox',
      'evangelical': 'Evangelical',
      'jewish': 'Jewish',
      'agnostic': 'Other',
      'spiritual': 'Other',
      'other': 'Other',
      'prefer-not-to-say': 'Other'
    } as const;

    // Set in user store
    setDenomination(denominationMap[affiliation as keyof typeof denominationMap]);

    // Trigger light haptic feedback
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        console.log('Haptics not available');
      });
    } catch (error) {
      console.log('Haptics not available');
    }
    analytics.logEvent("OnboardingReligiousAffiliationScreen_Tapped_Option", {
      value: affiliation,
    });
    setSelectedOption(affiliation);
    await setResponse('religiousAffiliation', affiliation as OnboardingResponses['religiousAffiliation']);
    router.push('/onboarding/7' as any);
  };

  const options = [
    {
      id: 'protestant',
      title: t('onboarding.religousAffiliation.options.protestant'),
    },
    {
      id: 'catholic',
      title: t('onboarding.religousAffiliation.options.catholic'),
    },
    {
      id: 'orthodox',
      title: t('onboarding.religousAffiliation.options.orthodox'),
    },
    {
      id: 'nonDenominational',
      title: t('onboarding.religousAffiliation.options.nonDenominational'),
    },
    {
      id: 'exploring',
      title: t('onboarding.religousAffiliation.options.exploring'),
    },
    {
      id: 'other',
      title: t('onboarding.religousAffiliation.options.other'),
    },
  ];

  return (
    <View className="flex-1 bg-surfaceCream px-6 pt-12">
      {/* Question Text */}
      <Animated.View style={titleStyle}>
        <Text className="font-feather text-h2 text-center text-textPrimary mb-4">
          {t('onboarding.religousAffiliation.title')}
        </Text>
        <Text className="font-din text-body text-center text-textSecondary mb-4">
          {t('onboarding.religousAffiliation.subtitle')}
        </Text>
      </Animated.View>

      {/* Options Container */}
      <Animated.View style={optionsStyle} className="space-y-4 mt-0">
        <ScrollView contentContainerStyle={{ paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
          <View className="space-y-4">
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
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}