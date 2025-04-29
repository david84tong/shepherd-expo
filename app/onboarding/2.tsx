import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Animated, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '../stores/onboardingStore';
import PrimaryButton from '../../components/PrimaryButton';
import Rive from 'rive-react-native';

export default function OnboardingLambNameScreen() {
  const router = useRouter();
  const { setResponse } = useOnboardingStore();
  const [lambName, setLambName] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // Create animated values
  const titleAnimation = new Animated.Value(0);
  const inputAnimation = new Animated.Value(0);

  useEffect(() => {
    // Stagger the animations
    Animated.stagger(100, [
      // Title animation
      Animated.timing(titleAnimation, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Input animation
      Animated.timing(inputAnimation, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Keyboard listeners
    const keyboardWillShow = Keyboard.addListener('keyboardWillShow', () => setKeyboardVisible(true));
    const keyboardWillHide = Keyboard.addListener('keyboardWillHide', () => setKeyboardVisible(false));

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const handleContinue = async () => {
    if (lambName.trim()) {
      await setResponse('lambName', lambName.trim());
      router.push('onboarding/3' as any);
    }
  };

  // Common animation styles
  const getAnimatedStyle = (animation: Animated.Value) => ({
    opacity: animation,
    transform: [
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
    ],
  });

  return (
    <View className="flex-1 bg-surfaceCream px-6 pt-12">
      {/* Question Text */}
      <Animated.View style={getAnimatedStyle(titleAnimation)}>
        <Text className="font-feather text-h1 text-center text-textPrimary mb-4">
          What should we call your lamb?
        </Text>
      </Animated.View>

      {/* Rive Animation */}
      <View className="h-[160px] w-full justify-center items-center my-8">
        <Rive
          resourceName="homeLamb"
          artboardName="lamb-idle"
          autoplay={true}
          style={{ width: '80%', height: '80%' }}
        />
      </View>

      {/* Name Input */}
      <Animated.View 
        style={getAnimatedStyle(inputAnimation)}
        className="w-full px-4"
      >
        <TextInput
          className="font-feather text-3xl text-center text-textPrimary bg-white p-6 rounded-2xl border-4 border-border"
          placeholder="Enter name"
          placeholderTextColor="#A0A0A0"
          maxLength={9}
          autoFocus={true}
          value={lambName}
          onChangeText={setLambName}
        />
        
        {/* Continue Button */}
        <View className="mt-6">
          <PrimaryButton
            title="Continue"
            onPress={handleContinue}
            disabled={!lambName.trim()}
            isActive={!!lambName.trim()}
          />
        </View>
      </Animated.View>
    </View>
  );
}
