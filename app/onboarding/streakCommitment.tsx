import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useRef, useLayoutEffect } from 'react';
import { View, Text, Pressable, StatusBar, Image } from 'react-native';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useUserStore } from '../stores/userStore';
import analytics from '../../utils/analytics';
import PrimaryButton from '../../components/PrimaryButton';
import {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import { toBool } from '../utils/toBool';
import CustomAnimatedView from '../components/CustomAnimatedView';
import { hapticLight } from '~/utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appLog } from '../helper/helper';
import i18n from '../utils/i18n';
import { useSoundStore } from '../stores/soundStore';

const STREAK_OPTIONS = [
  { 
    days: 7, 
    label: i18n.t('onboarding_streak_commitment_7_day'), 
    status: i18n.t('onboarding_streak_commitment_faithful'),
  },
  { 
    days: 14, 
    label: i18n.t('onboarding_streak_commitment_14_day'), 
    status: i18n.t('onboarding_streak_commitment_devoted'),
  },
  { 
    days: 30, 
    label: i18n.t('onboarding_streak_commitment_30_day'), 
    status: i18n.t('onboarding_streak_commitment_blessed'),
  },
  { 
    days: 50, 
    label: i18n.t('onboarding_streak_commitment_50_day'), 
    status: i18n.t('onboarding_streak_commitment_sanctified'),
  },
];

export default function StreakCommitmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setResponse } = useOnboardingStore();
  const setStreakCommit = useUserStore((state) => state.setStreakCommit);
  const [selectedStreak, setSelectedStreak] = useState<number | null>(null);
  const { playButtonSound } = useSoundStore();

  // Track if animations have been initialized
  const animationsInitialized = useRef(false);

  // Create Reanimated shared values for each component
  const screenOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);

  const lambOpacity = useSharedValue(0);
  const lambTranslateY = useSharedValue(20);

  const verseOpacity = useSharedValue(0);
  const verseTranslateY = useSharedValue(20);

  const optionsOpacity = useSharedValue(0);
  const optionsTranslateY = useSharedValue(20);

  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);

  // Run animations only once during initial layout
  useLayoutEffect(() => {
    if (animationsInitialized.current) return;

    const immediate = toBool(params?.immediate);
    screenOpacity.value = immediate ? 1 : 0;

    if (!immediate) {
      screenOpacity.value = withTiming(1, { duration: 250 });
    }

    // Reset animation values with minimal delay
    const timer = setTimeout(() => {
      titleOpacity.value = 0;
      titleTranslateY.value = 20;
      lambOpacity.value = 0;
      lambTranslateY.value = 20;
      verseOpacity.value = 0;
      verseTranslateY.value = 20;
      optionsOpacity.value = 0;
      optionsTranslateY.value = 20;
      buttonOpacity.value = 0;
      buttonTranslateY.value = 20;

      // Staggered animations for each component with shorter delays
      const animateComponent = (opacity: any, translateY: any, delay: number) => {
        opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
        translateY.value = withDelay(
          delay,
          withSpring(0, {
            damping: 16,
            stiffness: 100,
            mass: 0.8,
          })
        );
      };

      // Use shorter delays between components
      animateComponent(titleOpacity, titleTranslateY, 50);
      animateComponent(lambOpacity, lambTranslateY, 100);
      animateComponent(verseOpacity, verseTranslateY, 150);
      animateComponent(optionsOpacity, optionsTranslateY, 200);
      animateComponent(buttonOpacity, buttonTranslateY, 250);

      // Mark animations as initialized
      animationsInitialized.current = true;
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  // Create animated style for the screen container
  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    flex: 1,
    backgroundColor: '#FDEBB8',
  }));

  const lambStyle = useAnimatedStyle(() => ({
    opacity: lambOpacity.value,
    transform: [{ translateY: lambTranslateY.value }],
  }));

  const verseStyle = useAnimatedStyle(() => ({
    opacity: verseOpacity.value,
    transform: [{ translateY: verseTranslateY.value }],
  }));

  const optionsStyle = useAnimatedStyle(() => ({
    opacity: optionsOpacity.value,
    transform: [{ translateY: optionsTranslateY.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  const handleStreakSelect = (days: number) => {
    hapticLight();
    setSelectedStreak(days);
    playButtonSound()
    analytics.logEvent('StreakCommitmentScreen_Selected', {
      days: days
    });
  };

  const handleContinue = async () => {
    if (selectedStreak) {
      hapticLight();
      
      // Save streak commitment
      await setResponse('streakCommit', selectedStreak);
      //  setStreakCommit(selectedStreak);
      
      analytics.logEvent('StreakCommitmentScreen_Continued', {
        selectedStreak
      });

      // Get A/B test value
      let abTestValue = 0;
      try {
        const storedAbTest = await AsyncStorage.getItem('abTest');
        if (storedAbTest !== null) {
          abTestValue = parseInt(storedAbTest, 10);
          appLog('[StreakCommitmentScreen] Retrieved A/B test value:', abTestValue);
        }
      } catch (error) {
        console.error('[StreakCommitmentScreen] Error retrieving A/B test value:', error);
      }

      // Animate out and navigate
      screenOpacity.value = withTiming(0, { duration: 300 });
      
      setTimeout(() => {
        router.push({
          pathname: abTestValue === 0 ? '/onboarding/PricingScreen' : '/onboarding/OldPricingScreen',
          params: {
            animated: true,
            animation: 'fade',
            immediate: false,
          },
        } as any);
      }, 300);
    }
  };

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <CustomAnimatedView style={screenStyle} className="px-6 pt-12">

       <View className="flex-1 justify-center items-center" >
         {/* Rive Animation */}
         <CustomAnimatedView
          style={lambStyle}
          className="h-[200px] w-full justify-center items-center mb-4 -mt-12">
            <Image
            source={require('../../assets/onboarding/streaklambtalk.png')}
            style={{ width: 250, height: 250 }}
            className="absolute  left-[12%] -top-[45%] right-0"
            resizeMode="contain"
          />
            
         <Image
            source={require('../../assets/onboarding/streakLamb.png')}
            style={{ width: 400, height: 400 }}
            resizeMode="contain"
          />
        </CustomAnimatedView>

       
        {/* Options */}
        <CustomAnimatedView style={optionsStyle} className="mt-8 space-y-4 w-full gap-3">
          {STREAK_OPTIONS.map((option) => (
            <Pressable
              key={option.days}
              onPress={() => handleStreakSelect(option.days)}
              onPressIn={() => hapticLight()}
              className={`p-4 rounded-3xl border-t-2 border-b-[6px] border-l-2 border-r-2 ${
                selectedStreak === option.days
                  ? 'bg-white border-accentGold/30'
                  : 'bg-black/10 border-accentGold/80'
              }`}
            >
              <View className="flex-col">
                <View className="flex-row justify-between items-center">
                  <Text
                    className={`font-feather text-xl ${
                      selectedStreak === option.days ? 'text-textPrimary' : 'text-textPrimary'
                    }`}
                  >
                    {option.label}
                  </Text>
                  <Text
                    className={`font-din text-lg ${
                      selectedStreak === option.days ? 'text-textPrimary' : 'text-textPrimary'
                    }`}
                  >
                    {option.status}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </CustomAnimatedView>
       </View>

        {/* Continue Button */}
        <CustomAnimatedView style={buttonStyle} className="absolute bottom-10 left-4 right-4">
          <PrimaryButton
            title={i18n.t('onboarding_streak_commitment_button')}
            onPress={handleContinue}
            disabled={!selectedStreak}
            isActive={!!selectedStreak}
          />
        </CustomAnimatedView>
      </CustomAnimatedView>
    </>
  );
} 