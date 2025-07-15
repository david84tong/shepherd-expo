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
      scale: 1.2,
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
      scale: 1.4,
    },
  },
  {
    days: 21,
    label: i18n.t('onboarding_streak_commitment_21_day'),
    status: i18n.t('onboarding_streak_commitment_blessed'),
    reward: {
      type: 'skin',
      description: 'Phoenix Lamb Skin',
      scale: 1.6,
    },
  },
];

// Animation Helpers
const createAnimationSequence = (
  rewardCardOpacity: Animated.Value,
  rewardCardScale: Animated.Value,
  gemTextOpacity: Animated.Value,
  chestScale: Animated.Value,
  scaleValue: number
) => {
  return Animated.sequence([
    Animated.timing(chestScale, {
      toValue: scaleValue,
      duration: 500,
      useNativeDriver: true,
    }),
    Animated.parallel([
      Animated.timing(rewardCardOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(rewardCardScale, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
    ]),
    Animated.timing(gemTextOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }),
  ]);
};

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

  // State
  const [selectedStreak, setSelectedStreak] = useState<number | null>(null);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const [showFireLambAnimation, setShowFireLambAnimation] = useState(false);

  // Refs
  const riveRef = useRef<RiveRef>(null);
  const riveRef10 = useRef<RiveRef>(null);
  const animationsInitialized = useRef(false);

  // Animation Values
  const rewardCardOpacity = useRef(new Animated.Value(0)).current;
  const rewardCardScale = useRef(new Animated.Value(0.8)).current;
  const gemTextOpacity = useRef(new Animated.Value(0)).current;
  const chestScale = useRef(new Animated.Value(1)).current;

  // Shared Values
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

  // Animated Styles
  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    flex: 1,
    backgroundColor: '#FDEBB8',
  }));

  const lambStyle = useAnimatedStyle(() => ({
    opacity: lambOpacity.value,
    transform: [{ translateY: lambTranslateY.value }],
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
      // Reset animation values
      [
        { opacity: titleOpacity, translateY: titleTranslateY },
        { opacity: lambOpacity, translateY: lambTranslateY },
        { opacity: verseOpacity, translateY: verseTranslateY },
        { opacity: optionsOpacity, translateY: optionsTranslateY },
        { opacity: buttonOpacity, translateY: buttonTranslateY },
      ].forEach(({ opacity, translateY }) => {
        opacity.value = 0;
        translateY.value = 20;
      });

      // Staggered animations
      const animateComponent = (opacity: any, translateY: any, delay: number) => {
        opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
        translateY.value = withDelay(
          delay,
          withSpring(0, { damping: 16, stiffness: 100, mass: 0.8 })
        );
      };

      // Animate components with shorter delays
      [
        { opacity: titleOpacity, translateY: titleTranslateY, delay: 50 },
        { opacity: lambOpacity, translateY: lambTranslateY, delay: 100 },
        { opacity: verseOpacity, translateY: verseTranslateY, delay: 150 },
        { opacity: optionsOpacity, translateY: optionsTranslateY, delay: 200 },
        { opacity: buttonOpacity, translateY: buttonTranslateY, delay: 250 },
      ].forEach(({ opacity, translateY, delay }) => {
        animateComponent(opacity, translateY, delay);
      });

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
        appLog('Rive loaded via timeout');

        // Set Rive inputs once loaded
        if (riveRef10.current) {
          riveRef10.current.setInputState(STATE_MACHINE, 'Skin-Number', 10);
          riveRef10.current.setInputState(STATE_MACHINE, 'Action-Number', 12);
          appLog('Rive inputs set - Skin: 10, Action: 12');
        }
      }, 100);
      
    }
  }, [riveAssets, riveRef10?.current,selectedStreak]);
  

  // Handlers
  const playChestAnimation = () => {
    // Reset animations
    rewardCardOpacity.setValue(0);
    rewardCardScale.setValue(0.8);
    gemTextOpacity.setValue(0);
    chestScale.setValue(1);

    // Trigger Rive animation
    if (riveRef.current) {
      riveRef.current.reset();
      riveRef.current.play();
    }

    const selectedOption = STREAK_OPTIONS.find((option) => option.days === selectedStreak);
    const scaleValue = selectedOption?.reward.scale || 1;

    createAnimationSequence(
      rewardCardOpacity,
      rewardCardScale,
      gemTextOpacity,
      chestScale,
      scaleValue
    ).start();
  };

  const handleStreakSelect = (days: number) => {
    hapticLight();
    setShowFireLambAnimation(false);
    
    if (days === 21) {
      setShowFireLambAnimation(true);
      setShowRewardAnimation(false);
    }
    
    setSelectedStreak(days);
    playButtonSound();
    setShowRewardAnimation(true);
    playChestOpeningSound?.();
    
    appLog('Setting covenant progress to:', {
      currentStreak: 0,
      targetDays: days,
      progress: 0,
      state: COVENANT_STATES.IN_PROGRESS,
    });

    setTimeout(() => {
      playChestAnimation();
    }, 100);

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
          pathname: abTestValue === 0 ? '/onboarding/PricingScreen' : '/onboarding/OldPricingScreen',
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
      <View className="w-[250px] h-[250px] items-center justify-center">
        {IS_ANDROID ? (
          <Rive
            ref={riveRef}
            resourceName={'success_lamb'}
            artboardName="chest"
            autoplay={true}
            style={{ width: '120%', height: '130%' }}
          />
        ) : (
          <Rive
            ref={riveRef}
            url={(riveAssets && riveAssets[0] && riveAssets[0].uri) || ''}
            artboardName="chest"
            autoplay={true}
            style={{ width: '120%', height: '130%' }}
          />
        )}
      </View>
    );
  };

  const renderRewardCard = () => {
    if (!showRewardAnimation || !selectedStreak || showFireLambAnimation) return null;

    return (
      <View className="items-center">
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
        className="bg-white/80 rounded-[28px] px-8 py-4 border-[2.5px] border-accentGold w-[85%] max-w-sm"
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
            Unlock Phoenix Lamb
          </Text>
        </Animated.View>
        <Text className="font-din text-[#B89B4C] text-center text-sm mt-1">
          A legendary skin for your faithful companion
        </Text>
      </Animated.View>
    </View>
    );
  };

  const renderDefaultLamb = () => {
    if (selectedStreak) return null;

    return (
      <CustomAnimatedView
        style={lambStyle}
        className="h-[200px] w-full justify-center items-center mb-4 mt-[80px]">
        <Image
          source={require('../../assets/onboarding/streaklambtalk.png')}
          style={{ width: 250, height: 250 }}
          className="absolute left-[12%] -top-[45%] right-0"
          resizeMode="contain"
        />
        <Image
          source={require('../../assets/onboarding/streakLamb.png')}
          style={{ width: 400, height: 400 }}
          resizeMode="contain"
        />
      </CustomAnimatedView>
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
            <View className="h-[300px] items-center justify-center mb-5">
              {renderDefaultLamb()}
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
