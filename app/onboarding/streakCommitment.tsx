// Core React & React Native
import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { View, Text, Pressable, StatusBar, Image, Animated, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

// Third-party libraries
import AsyncStorage from '@react-native-async-storage/async-storage';
import Rive, { RiveRef } from 'rive-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAssets } from 'expo-asset';
import {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';

// Store & Utils
import { useOnboardingStore } from '../stores/onboardingStore';
import { useUserStore } from '../stores/userStore';
import { useSoundStore } from '../stores/soundStore';
import analytics from '../../utils/analytics';
import { toBool } from '../utils/toBool';
import { appLog, RPH } from '../helper/helper';
import i18n from '../utils/i18n';
import { IS_ANDROID } from '../utils/utils';
import { hapticLight } from '~/utils/haptics';
import { COVENANT_STATES } from '../hooks/streakHook';

// Components
import PrimaryButton from '../../components/PrimaryButton';
import CustomAnimatedView from '../components/CustomAnimatedView';

// Assets
import gemIcon from '../../assets/icons/greenGemIcon.png';

// Constants
const STATE_MACHINE = 'State Machine 1';

const STREAK_OPTIONS = [
  {
    days: 3,
    label: i18n.t('onboarding_streak_commitment_3_day'),
    status: i18n.t('onboarding_streak_commitment_faithful'),
    reward: {
      type: 'gem',
      amount: 100,
      description: '100 gems',
      scale: 1,
    },
  },
  {
    days: 7,
    label: i18n.t('onboarding_streak_commitment_7_day'),
    status: i18n.t('onboarding_streak_commitment_devoted'),
    reward: {
      type: 'gem',
      amount: 300,
      description: '300 gems',
      scale: 1.5,
    },
  },
  {
    days: 21,
    label: i18n.t('onboarding_streak_commitment_21_day'),
    status: i18n.t('onboarding_streak_commitment_blessed'),
    reward: {
      type: 'skin',
      description: 'Phoenix Lamb Skin',
      scale: 1.3,
    },
  },
];

export default function StreakCommitmentScreen() {
  // Hooks
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setResponse } = useOnboardingStore();
  const { playButtonSound, playChestOpeningSound } = useSoundStore();
  const [riveAssets] = useAssets([
    require('../../assets/riveAnimations/successLamb.riv'),
    require('../../assets/riveAnimations/new_shepherd.riv'),
  ]);
  const [riveLoaded, setRiveLoaded] = useState(false);

  // State - Default to 21 days
  const [selectedStreak, setSelectedStreak] = useState<number>(21);
  const [showRewardAnimation, setShowRewardAnimation] = useState(true);
  const [showFireLambAnimation, setShowFireLambAnimation] = useState(true);

  // Refs
  const riveRef = useRef<RiveRef>(null);
  const riveRef10 = useRef<RiveRef>(null);
  const animationsInitialized = useRef(false);

  // Animation Values
  const rewardCardOpacity = useRef(new Animated.Value(1)).current;
  const rewardCardScale = useRef(new Animated.Value(1)).current;
  const gemTextOpacity = useRef(new Animated.Value(1)).current;
  const chestScale = useRef(new Animated.Value(1)).current; // Default to 21-day scale

  // Shared Values
  const screenOpacity = useSharedValue(0);
  const optionsOpacity = useSharedValue(0);
  const optionsTranslateY = useSharedValue(20);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);

  // Animated Styles
  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    flex: 1,
    backgroundColor: '#FDEBB8',
  }));

  const optionsStyle = useAnimatedStyle(() => ({
    opacity: optionsOpacity.value,
    transform: [{ translateY: optionsTranslateY.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  useLayoutEffect(() => {
    if (animationsInitialized.current) return;

    const immediate = toBool(params?.immediate);
    screenOpacity.value = immediate ? 1 : 0;

    if (!immediate) {
      screenOpacity.value = withTiming(1, { duration: 250 });
    }

    const timer = setTimeout(() => {
      // Animate components with shorter delays
      optionsOpacity.value = withDelay(100, withTiming(1, { duration: 300 }));
      optionsTranslateY.value = withDelay(
        100,
        withSpring(0, { damping: 16, stiffness: 100, mass: 0.8 })
      );
      
      buttonOpacity.value = withDelay(150, withTiming(1, { duration: 300 }));
      buttonTranslateY.value = withDelay(
        150,
        withSpring(0, { damping: 16, stiffness: 100, mass: 0.8 })
      );

      animationsInitialized.current = true;
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    appLog('Rive assets loaded:', riveAssets);
    
    if (riveAssets && riveAssets[1]) {
      appLog('Rive asset URI:', riveAssets[1].uri);
      
      const timer = setTimeout(() => {
        setRiveLoaded(true);
        appLog('Rive loaded via timeout');

        // Set Rive inputs once loaded
        if (riveRef10.current) {
          riveRef10.current.setInputState(STATE_MACHINE, 'Skin-Number', 10);
          riveRef10.current.setInputState(STATE_MACHINE, 'Action-Number', 12);
          appLog('Rive inputs set - Skin: 10, Action: 12');
        }
      }, 100);
      return () => clearTimeout(timer);
    }

  }, [riveAssets, selectedStreak, riveRef10?.current]);

  // Handlers
  const playChestAnimation = (scaleValue: number) => {
    // Animate chest scale smoothly
    Animated.timing(chestScale, {
      toValue: scaleValue,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  const handleStreakSelect = (days: number) => {
    hapticLight();
    
    const wasFireLamb = selectedStreak === 21;
    const isFireLamb = days === 21;
    
    setSelectedStreak(days);
    
    // Update animations based on selection
    if (isFireLamb && !wasFireLamb) {
      setShowFireLambAnimation(true);
    } else if (!isFireLamb && wasFireLamb) {
      setShowFireLambAnimation(false);
    }
    
    playButtonSound();
    playChestOpeningSound?.();
    
    appLog('Setting covenant progress to:', {
      currentStreak: 0,
      targetDays: days,
      progress: 0,
      state: COVENANT_STATES.IN_PROGRESS,
    });

    // Get scale value for chest animation
    const selectedOption = STREAK_OPTIONS.find((option) => option.days === days);
    const scaleValue = selectedOption?.reward.scale || 1;
    
    // Animate chest to new scale
    playChestAnimation(scaleValue);

    analytics.logEvent('StreakCommitmentScreen_Selected', { days });
  };

  const handleContinue = async () => {
    if (!selectedStreak) return;

    hapticLight();
    await setResponse('covenantProgress', {
      currentStreak: 0,
      targetDays: selectedStreak,
      progress: 0,
      state: COVENANT_STATES.IN_PROGRESS,
    });

    analytics.logEvent('StreakCommitmentScreen_Continued', { selectedStreak });

    try {
      const storedAbTest = await AsyncStorage.getItem('abTest');
      const abTestValue = storedAbTest !== null ? parseInt(storedAbTest, 10) : 0;
      appLog('[StreakCommitmentScreen] Retrieved A/B test value:', abTestValue);

      screenOpacity.value = withTiming(0, { duration: 300 });

      setTimeout(() => {
        router.push({
          pathname: '/onboarding/LoadingScreen',
          params: { animated: true, animation: 'fade', immediate: false },
        } as any);
      }, 300);
    } catch (error) {
      console.error('[StreakCommitmentScreen] Error retrieving A/B test value:', error);
    }
  };

  // Render Methods
  const renderLambAnimation = () => {
    if (!showFireLambAnimation || !riveAssets) return null;

    return (
      <View className="w-[250px] h-[250px]">
        {IS_ANDROID ? (
          <Rive
            ref={riveRef10}
            resourceName={'new_shepherd'}
            artboardName="[Main] Shpeherd"
            stateMachineName="State Machine 1"
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <Rive
            ref={riveRef10}
            url={riveAssets[1].uri!}
            artboardName="[Main] Shpeherd"
            stateMachineName="State Machine 1"
            style={{ width: "100%", height: "100%" }}
          />
        )}
      </View>
    );
  };

  const renderRewardAnimation = () => {
    if (!showRewardAnimation || !riveAssets || showFireLambAnimation) return null;

    return (
      <Animated.View 
        className="w-[250px] h-[250px] items-center justify-center"
        style={{ transform: [{ scale: chestScale }] }}
      >
        {IS_ANDROID ? (
          <Rive
            ref={riveRef}
            resourceName={'success_lamb'}
            artboardName="chest"
            autoplay={true}
            style={{ width: '120%', height: '130%' , position: 'absolute', top: 0 }}
          />
        ) : (
          <Rive
            ref={riveRef}
            url={(riveAssets && riveAssets[0] && riveAssets[0].uri) || ''}
            artboardName="chest"
            autoplay={true}
            style={{ width: '120%', height: '130%' , position: 'absolute', top: 0 }}
          />
        )}
      </Animated.View>
    );
  };

  const renderRewardCard = () => {
    if (!showRewardAnimation || !selectedStreak || showFireLambAnimation) return null;

    return (
      <View className="items-center mt-4">
        <Animated.View
          className="bg-white/80 rounded-[28px] px-8 py-6 border-[2.5px] border-accentGold w-[85%] max-w-sm"
          style={{
            opacity: rewardCardOpacity,
            transform: [{ scale: rewardCardScale }],
          }}>
          <Text className="text-sm font-din text-[#B89B4C] text-center uppercase mb-3 tracking-wider">
            STREAK REWARD
          </Text>
          <Animated.View
            className="flex-row items-center justify-center"
            style={{ opacity: gemTextOpacity }}>
            <Image
              source={gemIcon}
              style={{ width: RPH(4), height: RPH(4) }}
              className="mr-3"
            />
            <Text className="font-din text-textPrimary text-3xl font-bold">
              +
              {STREAK_OPTIONS.find((option) => option.days === selectedStreak)?.reward
                .amount || 0}{' '}
              Gems
            </Text>
          </Animated.View>
        </Animated.View>
      </View>
    );
  };

  const renderRewardCardForPhoenix = () => {
    if (!showRewardAnimation || !selectedStreak || !showFireLambAnimation) return null;

    return (
      <View className="items-center">
        <Animated.View
          className="bg-white/80 rounded-[28px] px-8 py-6 border-[2.5px] border-accentGold w-[85%] max-w-sm"
          style={{
            opacity: rewardCardOpacity,
            transform: [{ scale: rewardCardScale }],
          }}>
          <Text className="text-sm font-din text-[#B89B4C] text-center uppercase mb-2 tracking-wider">
            Special Reward
          </Text>
          <Animated.View
            className="flex-row items-center justify-center"
            style={{ opacity: gemTextOpacity }}>
            <Text className="font-din text-textPrimary text-2xl font-bold text-center">
              Unlock the Phoenix Skin
            </Text>
          </Animated.View>
        </Animated.View>
      </View>
    );
  };

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <CustomAnimatedView style={screenStyle} className="px-6 pt-12">
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          className="flex-1"
        >
          <View className="flex-1 items-center">
            <View className="h-[350px] items-center justify-center mb-5">
              {renderLambAnimation()}
              {renderRewardAnimation()}
              {renderRewardCard()}
              {renderRewardCardForPhoenix()}
            </View>
            <CustomAnimatedView style={optionsStyle} className="mt-8 space-y-4 w-full gap-2">
              {STREAK_OPTIONS.map((option) => (
                <Pressable
                  key={option.days}
                  onPress={() => handleStreakSelect(option.days)}
                  onPressIn={() => hapticLight()}
                  className={`p-4 rounded-3xl border-t-2 border-b-[6px] border-l-2 border-r-2 ${
                    selectedStreak !== option.days
                      ? 'bg-white border-accentGold/30'
                      : 'bg-surfaceCream border-accentGold/80'
                  }`}>
                  <View className="flex-col">
                    <View className="flex-row justify-between items-center">
                      <Text
                        className={`font-feather text-xl ${
                          selectedStreak === option.days ? 'text-textPrimary' : 'text-textPrimary'
                        }`}>
                        {option.label}
                      </Text>
                      <Text
                        className={`font-din text-lg ${
                          selectedStreak === option.days ? 'text-textPrimary' : 'text-textPrimary'
                        }`}>
                        {option.status}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </CustomAnimatedView>
          </View>
        </ScrollView>

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
