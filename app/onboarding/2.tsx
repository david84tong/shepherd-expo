import { useAssets } from 'expo-asset';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { View, Text, TextInput, Keyboard, ActivityIndicator } from 'react-native';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useUserStore } from '../stores/userStore';
import analytics from '../../utils/analytics';
import PrimaryButton from '../../components/PrimaryButton';
import Rive from 'rive-react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import { toBool } from '../utils/toBool';

export default function OnboardingLambNameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setResponse } = useOnboardingStore();
  const setLambName = useUserStore((state) => state.setLambName);
  const [inputLambName, setInputLambName] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Use the helper hook for screen tracking

  // Load Rive assets
  const [riveAssets] = useAssets([require('../../assets/riveAnimations/homeLamb.riv')]);

  // Track if animations have been initialized
  const animationsInitialized = useRef(false);

  // Create Reanimated shared values for each component
  const screenOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20); // Smaller initial offset

  const lambOpacity = useSharedValue(0);
  const lambTranslateY = useSharedValue(20); // Smaller initial offset

  const inputOpacity = useSharedValue(0);
  const inputTranslateY = useSharedValue(20); // Smaller initial offset

  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20); // Smaller initial offset

  // Auto-focus the input field when component mounts
  useEffect(() => {
    // Short timeout to ensure animations have started before focusing
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

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
      inputOpacity.value = 0;
      inputTranslateY.value = 20;
      buttonOpacity.value = 0;
      buttonTranslateY.value = 20;

      // Staggered animations for each component with shorter delays
      const animateComponent = (opacity: any, translateY: any, delay: number) => {
        opacity.value = withDelay(delay, withTiming(1, { duration: 300 })); // Faster timing
        translateY.value = withDelay(
          delay,
          withSpring(0, {
            damping: 16, // More damping for faster settling
            stiffness: 100, // Stiffer spring for faster animation
            mass: 0.8, // Lighter mass for quicker movement
          })
        );
      };

      // Use much shorter delays between components for faster overall animation
      animateComponent(titleOpacity, titleTranslateY, 50);
      animateComponent(lambOpacity, lambTranslateY, 100);
      animateComponent(inputOpacity, inputTranslateY, 150);
      animateComponent(buttonOpacity, buttonTranslateY, 200);

      // Mark animations as initialized
      animationsInitialized.current = true;
    }, 50); // Much shorter initial delay

    return () => clearTimeout(timer);
  }, []); // Empty dependency array so it only runs once

  // Keyboard listeners (separated from animation logic)
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener('keyboardWillShow', () =>
      setKeyboardVisible(true)
    );
    const keyboardWillHide = Keyboard.addListener('keyboardWillHide', () =>
      setKeyboardVisible(false)
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Create animated style for the screen container
  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    flex: 1,
    backgroundColor: '#FFF4D9', // Explicitly set the cream background color
  }));

  // Create animated styles for each component
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const lambStyle = useAnimatedStyle(() => ({
    opacity: lambOpacity.value,
    transform: [{ translateY: lambTranslateY.value }],
  }));

  const inputStyle = useAnimatedStyle(() => ({
    opacity: inputOpacity.value,
    transform: [{ translateY: inputTranslateY.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  const handleContinue = async () => {
    if (inputLambName.trim()) {
      // Log button press using helper function
      const name = inputLambName.trim();
      analytics.logEvent('OnboardingNameScreen_Tapped_Continue', {
        name: name,
      });

      // Save the lamb name to the user store
      setLambName(inputLambName.trim());
      setResponse('lambName', inputLambName.trim());
      screenOpacity.value = withTiming(0, { duration: 300 });
      router.push({
        pathname: '/onboarding/username',
        params: {
          animated: true,
          animation: 'fade',
          immediate: false,
        },
      } as any);
    }
  };

  // Show loading indicator while assets load
  if (!riveAssets) {
    return (
      <View className="flex-1 items-center justify-center bg-surfaceCream">
        <ActivityIndicator size="large" color="#3C584A" />
        <Text className="font-feather text-textPrimary mt-4">Loading...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={screenStyle} className="px-6 pt-12">
      {/* Question Text */}
      <Animated.View style={titleStyle}>
        <Text className="font-feather text-h1 text-center text-textPrimary mb-4 mt-0">
          What should we call your lamb?
        </Text>
      </Animated.View>

      {/* Rive Animation */}
      <Animated.View
        style={lambStyle}
        className="h-[160px] w-full justify-center items-center my-4">
        <Rive
          url={riveAssets[0].localUri!}
          artboardName="lamb-idle"
          autoplay
          style={{ width: '80%', height: '80%' }}
        />
      </Animated.View>

      {/* Name Input */}
      <Animated.View style={inputStyle}>
        <TextInput
          ref={inputRef}
          className="font-feather text-3xl text-center text-textPrimary bg-white p-6 rounded-2xl border-4 border-border"
          placeholder="Enter name"
          placeholderTextColor="#B89B4C"
          maxLength={9}
          value={inputLambName}
          onChangeText={setInputLambName}
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
        />
      </Animated.View>

      {/* Continue Button */}
      <Animated.View style={buttonStyle} className="mt-0">
        <PrimaryButton
          title="Continue"
          onPress={handleContinue}
          disabled={!inputLambName.trim()}
          isActive={!!inputLambName.trim()}
        />
      </Animated.View>
    </Animated.View>
  );
}
