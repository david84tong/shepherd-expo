import { useAssets } from 'expo-asset';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Keyboard,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useUserStore } from '../stores/userStore';
import analytics from '../../utils/analytics';
import PrimaryButton from '../../components/PrimaryButton';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import { toBool } from '../utils/toBool';
import { validateName, validateUsername } from '../../utils/validation';
import { checkUsernameAvailability } from '../../utils/firestore';
import i18n from '../utils/i18n';
import { RPH } from '../helper/helper';

export default function OnboardingUsernameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setResponse } = useOnboardingStore();
  const setUser = useUserStore((state) => state.setUser);
  const [inputUsername, setInputUsername] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(true);
  const inputRef = useRef<TextInput>(null);
  const usernameCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  // Debug initial state
  console.log('🚀 Initial isUsernameAvailable state:', true);

  // Get translated text
  const titleText = i18n.t('onboarding_username_title');
  const subtitleText = i18n.t('onboarding_username_subtitle');
  const placeholderText = i18n.t('onboarding_username_placeholder');
  const continueText = i18n.t('onboarding_continue');
  const loadingText = i18n.t('loading_just_a_moment');

  // Load Rive assets
  const [riveAssets] = useAssets([require('../../assets/riveAnimations/homeLamb.riv')]);

  // Track if animations have been initialized
  const animationsInitialized = useRef(false);
  const [isAssetsLoaded, setIsAssetsLoaded] = useState(false);

  // Create Reanimated shared values for each component
  const screenOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const lambOpacity = useSharedValue(0);
  const lambTranslateY = useSharedValue(20);
  const inputOpacity = useSharedValue(0);
  const inputTranslateY = useSharedValue(20);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);

  // Run animations only once during initial layout
  useLayoutEffect(() => {
    if (animationsInitialized.current || !isAssetsLoaded) return;

    const immediate = toBool(params?.immediate);
    screenOpacity.value = immediate ? 1 : 0;

    if (!immediate) {
      screenOpacity.value = withTiming(1, { duration: 250 });
    }

    // Reset animation values
    titleOpacity.value = 0;
    titleTranslateY.value = 20;
    lambOpacity.value = 0;
    lambTranslateY.value = 20;
    inputOpacity.value = 0;
    inputTranslateY.value = 20;
    buttonOpacity.value = 0;
    buttonTranslateY.value = 20;

    // Staggered animations for each component with platform-specific delays
    const baseDelay = Platform.OS === 'android' ? 100 : 50;

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

    // Use platform-specific delays between components
    animateComponent(titleOpacity, titleTranslateY, baseDelay);
    animateComponent(lambOpacity, lambTranslateY, baseDelay * 2);
    animateComponent(inputOpacity, inputTranslateY, baseDelay * 3);
    animateComponent(buttonOpacity, buttonTranslateY, baseDelay * 4);

    // Mark animations as initialized
    animationsInitialized.current = true;
  }, [isAssetsLoaded]);

  // Handle asset loading
  useEffect(() => {
    if (riveAssets) {
      // Add a small delay on Android to ensure proper initialization
      if (Platform.OS === 'android') {
        setTimeout(() => {
          setIsAssetsLoaded(true);
        }, 100);
      } else {
        setIsAssetsLoaded(true);
      }
    }
  }, [riveAssets]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (usernameCheckTimeout.current) {
        clearTimeout(usernameCheckTimeout.current);
      }
    };
  }, []);

  // Keyboard listeners
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
    backgroundColor: '#FDEBB8',
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

  // Debounced username availability check
  const checkUsernameAvailabilityDebounced = async (username: string) => {
    // Clear existing timeout
    if (usernameCheckTimeout.current) {
      clearTimeout(usernameCheckTimeout.current);
    }

    // Set a new timeout for debouncing
    usernameCheckTimeout.current = setTimeout(async () => {
      if (username.trim().length >= 3) { // Only check if username is at least 3 characters
        console.log('🔍 Checking username availability for:', username);
        setIsCheckingUsername(true);
        try {
          const isAvailable = await checkUsernameAvailability(username);
          console.log('✅ Username availability result:', isAvailable);
          setIsUsernameAvailable(isAvailable);
          
          // Update error state based on availability
          const validation = validateUsername(username, isAvailable);
          console.log('📝 Validation result:', validation);
          setError(validation.error);
        } catch (error) {
          console.error('❌ Error checking username availability:', error);
          // In case of error, assume username is taken to be safe
          setIsUsernameAvailable(false);
          const validation = validateUsername(username, false);
          setError(validation.error);
        } finally {
          setIsCheckingUsername(false);
        }
      } else {
        // Reset availability for short usernames
        console.log('📏 Username too short, resetting availability');
        setIsUsernameAvailable(true);
        const validation = validateName(username);
        setError(validation.error);
      }
    }, 500); // 500ms debounce delay
  };

  const handleInputChange = (text: string) => {
    console.log('📝 Input changed to:', text);
    setInputUsername(text);
    
    // Basic validation first
    const basicValidation = validateName(text);
    console.log('🔍 Basic validation:', basicValidation);
    setError(basicValidation.error);
    
    // If basic validation passes, check availability
    if (basicValidation.isValid && text.trim().length >= 3) {
      console.log('🚀 Starting availability check for:', text);
      checkUsernameAvailabilityDebounced(text);
    } else {
      console.log('⏹️ Skipping availability check - invalid or too short');
      // Clear any pending username checks
      if (usernameCheckTimeout.current) {
        clearTimeout(usernameCheckTimeout.current);
      }
      setIsCheckingUsername(false);
      setIsUsernameAvailable(true);
    }
  };

  const handleContinue = async () => {
    // Use the username validation that includes uniqueness check
    const validation = validateUsername(inputUsername, isUsernameAvailable);
    if (validation.isValid && !isCheckingUsername) {
      // Log button press
      const username = inputUsername.trim();
      analytics.logEvent('OnboardingUsernameScreen_Tapped_Continue', {
        username: username,
      });

      // Save the displayName to the user store (this will sync with Firebase)
      setUser({ username: username });
      setResponse('username', username);
      screenOpacity.value = withTiming(0, { duration: 300 });
      router.push({
        pathname: '/onboarding/3',
        params: {
          animated: true,
          animation: 'fade',
          immediate: false,
        },
      } as any);
    } else {
      setError(validation.error);
    }
  };

  // Show loading indicator while assets load
  if (!riveAssets || !isAssetsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-surfaceCream pt-4">
        <ActivityIndicator size="large" color="#3C584A" />
        <Text className="font-feather text-textPrimary mt-4">{loadingText}</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <Animated.View style={screenStyle} className="px-6  pt-6">
        {/* Question Text */}
        <Animated.View style={titleStyle}>
          <Text className="font-feather text-h1 text-center text-textPrimary mb-4 mt-8">
            {titleText}
          </Text>
          <Text className="font-din text-body text-center text-textSecondary mb-4">
            {subtitleText}
          </Text>
        </Animated.View>

        {/* Rive Animation */}
        {/* <Animated.View
          style={lambStyle}
          className="h-[160px] w-full justify-center items-center my-4">
          <Rive
            url={riveAssets[0].uri!}

            autoplay
            style={{ width: '80%', height: '80%' }}
          />
        </Animated.View> */}

        {/* Username Input */}
        <Animated.View style={inputStyle}>
          <TextInput
            ref={inputRef}
            className="font-feather text-3xl text-center text-textPrimary bg-white mt-12 rounded-2xl border-4 border-border"
            style={{
              paddingVertical: RPH(2),
              paddingHorizontal: RPH(3),
            }}
            placeholder={placeholderText}
            placeholderTextColor="#B89B4C"
            value={inputUsername}
            onChangeText={handleInputChange}
            maxLength={16}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {isCheckingUsername && (
            <View className="flex-row items-center justify-center mt-2">
              <ActivityIndicator size="small" color="#3C584A" />
              <Text className="font-din text-sm text-textSecondary ml-2">
                Checking availability...
              </Text>
            </View>
          )}
          {error && <Text className="font-din text-sm text-red-500 mt-2 text-center">{error}</Text>}
        </Animated.View>

        {/* Continue Button */}
        <Animated.View
          style={buttonStyle}
          className={`mt-8 ${isKeyboardVisible ? 'mb-4' : 'mb-8'}`}>
          <PrimaryButton
            title={continueText}
            onPress={handleContinue}
            disabled={!inputUsername.trim() || !!error || isCheckingUsername}
            isActive={!!inputUsername.trim() && !error && !isCheckingUsername}
          />
        </Animated.View>
      </Animated.View>
    </>
  );
}
