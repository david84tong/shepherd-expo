import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import { adapty } from 'react-native-adapty';
import PrimaryButton from '../../components/PrimaryButton';
import { OnboardingResponses } from '../models/Onboarding';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useUserStore } from '../stores/userStore';
import analytics from '../../utils/analytics';
import { useTranslation } from 'react-i18next';

export default function OnboardingAgeRangeScreen() {
  const router = useRouter();
  const { setResponse } = useOnboardingStore();
  const { setUser } = useUserStore();
  const [selectedOption, setSelectedOption] = useState<OnboardingResponses['ageRange']>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
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

  const calculateAgeRange = (date: Date): OnboardingResponses['ageRange'] => {
    const today = new Date();
    const age = today.getFullYear() - date.getFullYear();

    if (age < 18) return 'under-18';
    if (age >= 18 && age <= 24) return '18-24';
    if (age >= 25 && age <= 34) return '25-34';
    if (age >= 35 && age <= 44) return '35-44';
    if (age >= 45 && age <= 54) return '45-54';
    if (age >= 55 && age <= 64) return '55-64';
    return '65-plus';
  };

  const handleSelection = async (
    ageRange: OnboardingResponses['ageRange'],
    isDatePicker = false
  ) => {
    // Trigger light haptic feedback
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        console.log('Haptics not available');
      });
    } catch (error) {
      console.log('Haptics not available');
    }

    analytics.logEvent('OnboardingAgeRangeScreen_Tapped_Option', {
      value: ageRange,
    });

    setSelectedOption(ageRange);
    await setResponse('ageRange', ageRange);

    // Save to user store
    setUser({ ageRange });
    await adapty.updateProfile({
      codableCustomAttributes: {
        age_range: ageRange,
      },
    });

    // Navigate to next screen
    router.push('/onboarding/8' as any);
  };

  const options = [
    {
      id: 'parent',
      title: t('onboarding.age.parentGuardian'),
    },
    {
      id: 'under-12',
      title: '12 or under',
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
      title: '55-64+',
    },
  ] as const;

  return (
    <View className="flex-1 bg-surfaceCream px-6 pt-12">
      {/* Question Text */}
      <Animated.View style={titleStyle}>
        <Text className="font-feather text-h2 text-center text-textPrimary mb-4">
          {t('onboarding.age.title')}
        </Text>
        <Text className="font-din text-body text-center text-textSecondary mb-4">
          {t('onboarding.age.subtitle')}
        </Text>
      </Animated.View>

      {/* Options Container */}
      {/* {Platform.OS === 'android' ? (
        <Animated.View style={optionsStyle} className="space-y-4 mt-0">
          <PrimaryButton
            title="Select Your Birth Date"
            onPress={() =>
              setShowDatePicker(true)}
            isActive
            primaryColor={selectedOption ? 'bg-surfaceCream' : 'bg-white'}
            textColor={selectedOption ? 'text-accentGold' : 'text-textPrimary'}
          />

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (event.type === "set" && date) {
                  setSelectedDate(date);
                  const ageRange = calculateAgeRange(date);
                  handleSelection(ageRange);
                }
              }}
              minimumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 100))}
              maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 6))}
            />
          )}
        </Animated.View>
      ) : ( */}
      <Animated.View style={optionsStyle} className="space-y-4 mt-0">
        <ScrollView
          contentContainerStyle={{ paddingBottom: 130 }}
          showsVerticalScrollIndicator={false}>
          <View className="space-y-4">
            {options.map((option) => {
              console.log('option ==>', option?.id);

              return (
                <PrimaryButton
                  key={option.id}
                  title={option.title}
                  onPress={() => handleSelection(option.id as OnboardingResponses['ageRange'])}
                  isActive
                  primaryColor={selectedOption === option.id ? 'bg-surfaceCream' : 'bg-white'}
                  textColor={selectedOption === option.id ? 'text-accentGold' : 'text-textPrimary'}
                />
              );
            })}
          </View>
        </ScrollView>
      </Animated.View>
      {/* )} */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (event.type === 'set' && date) {
              setSelectedDate(date);
              const ageRange = calculateAgeRange(date);
              handleSelection(ageRange, true);
            }
          }}
          maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 1))}
          minimumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 12))}
        />
      )}
    </View>
  );
}
