import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useUserStore } from '../stores/userStore';
import PrimaryButton from '../../components/PrimaryButton';
import analytics from '../../utils/analytics';
import { Feather } from '@expo/vector-icons';

import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export default function OnboardingReadingTimeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const fromSettings = params.fromSettings === 'true';
  
  const { setResponse } = useOnboardingStore();
  const { frequencyGoal, setFrequencyGoal } = useUserStore();
  const [selectedOption, setSelectedOption] = useState<string | undefined>(frequencyGoal);

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

  // Handle navigation back when coming from settings
  const handleBackFromSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.back();
  };

  const handleSelection = async (duration: string) => {
    // Map duration to minutes
    const durationMap = {
      '1-5': 5,
      '6-10': 10,
      '11-15': 15,
      '16-20': 20,
      '20-30': 30,
      '30-60': 60,
      '60+': 90
    } as const;

    // Set in user store
    setFrequencyGoal(duration);

    analytics.logEvent("OnboardingDurationScreen_Tapped_Option", {
      value: duration,
      fromSettings: fromSettings
    });
    
    // Trigger light haptic feedback
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        console.log('Haptics not available');
      });
    } catch (error) {
      console.log('Haptics not available');
    }

    setSelectedOption(duration);
    
    // Also update in Firestore directly
    const user = auth().currentUser;
    if (user) {
      try {
        await firestore()
          .collection('users')
          .doc(user.uid)
          .update({ 
            frequencyGoal: duration,
            updatedAt: firestore.FieldValue.serverTimestamp()
          });
        console.log('Updated frequency goal in Firestore');
      } catch (error) {
        console.error('Error updating frequency goal in Firestore:', error);
      }
    }
    
    // If coming from settings, just go back
    if (fromSettings) {
      // Show a success feedback before going back
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTimeout(() => {
        router.back();
      }, 300);
    } else {
      // Normal onboarding flow
      await setResponse('streakCommitment', duration as any);
      router.push('/onboarding/6');
    }
  };

  const options = [
    {
      id: '1-5',
      title: '1-5 mins (1 chapter)',
    },
    {
      id: '6-10',
      title: '6-10 mins (3-4 chapters)',
    },
    {
      id: '15-25',
      title: '11-15 mins (6-8 chapters)',
    },
  ] as const;

  return (
    <View className="flex-1 bg-surfaceCream px-6 pt-12">
      {/* Close button (only when coming from settings) */}
      {fromSettings && (
        <TouchableOpacity 
          onPress={handleBackFromSettings}
          className="absolute top-12 right-6 z-10 p-2"
          hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
        >
          <Feather name="x" size={24} color="#3C584A" />
        </TouchableOpacity>
      )}

      {/* Question Text */}
      <Animated.View style={titleStyle}>
        <Text className="font-feather text-h2 text-center text-textPrimary mb-0">
          How many minutes per day can you spend with God?
        </Text>
      </Animated.View>

      {/* Options Container */}
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Animated.View style={optionsStyle} className="space-y-4 mt-4">
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
      </ScrollView>
    </View>
  );
}
