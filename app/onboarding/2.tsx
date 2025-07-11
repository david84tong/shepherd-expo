import { useAssets } from 'expo-asset';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { View, Text, TextInput, Keyboard, ActivityIndicator, StatusBar } from 'react-native';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useUserStore } from '../stores/userStore';
import analytics from '../../utils/analytics';
import PrimaryButton from '../../components/PrimaryButton';
import Rive, { RiveRef } from 'rive-react-native';
import {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import { toBool } from '../utils/toBool';
import { validateName } from '../../utils/validation';
import CustomAnimatedView from '../components/CustomAnimatedView';
import { IS_ANDROID, IS_IOS } from '../utils/utils';
import i18n from '../utils/i18n';
import { appLog, RPH } from '../helper/helper';

export default function OnboardingLambNameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setResponse } = useOnboardingStore();
  const setLambName = useUserStore((state) => state.setLambName);
  const [inputLambName, setInputLambName] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [hasRiveError, setRiveError] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Load Rive assets
  const [riveAssets] = useAssets([require('../../assets/riveAnimations/new_shepherd.riv')]);
  
  // Create ref for Rive component
  const riveRef = useRef<RiveRef>(null);

  // Track if animations have been initialized
  const animationsInitialized = useRef(false);
  
  // Track if Rive has been initialized to prevent repeated Level-Number setting
  const riveInitialized = useRef(false);

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
    backgroundColor: '#FDEBB8', // Explicitly set the cream background color
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

  const handleInputChange = (text: string) => {
    setInputLambName(text);
    const validation = validateName(text);
    if (!validation?.isValid || error) {
      setError(validation.error);
    }
  };

  const handleContinue = async () => {
    const validation = validateName(inputLambName);
    if (validation.isValid) {
      // Log button press using helper function
      const name = inputLambName.trim();
      analytics.logEvent('OnboardingNameScreen_Tapped_Continue', {
        name: name,
      });

      // Save the lamb name to the user store
      setLambName(name);
      setResponse('lambName', name);
      screenOpacity.value = withTiming(0, { duration: 300 });
      router.push({
        pathname: '/onboarding/username',
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
  if (!riveAssets && IS_IOS) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF4D9] px-6">
        <ActivityIndicator size="large" color="#3C584A" />
        <Text className="font-feather text-textPrimary mt-4">{i18n.t('loading')}</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <CustomAnimatedView style={screenStyle} className="px-6 pt-12">
        {/* Question Text */}
        <CustomAnimatedView style={titleStyle}>
          <Text className="font-feather text-h1 text-center text-textPrimary mb-4 mt-0">
            {i18n.t('onboarding_lamb_name_question')}
          </Text>
        </CustomAnimatedView>

        {/* Rive Animation with Fallback */}
        <CustomAnimatedView
          style={lambStyle}
          className="h-[200px] w-full justify-center items-center mb-4 -mt-12">
          {riveAssets && (
            IS_ANDROID ? (
              <Rive
                ref={riveRef}
                resourceName="new_shepherd"
                artboardName="[Main] Shpeherd"
                stateMachineName="State Machine 1"
                autoplay
                style={{ width: '100%', height: '100%' }}
                onError={(error) => {
                  console.warn('Rive animation error:', error);
                }}
                onPlay={() => {
                  // Set Level-Number to 1 when Rive starts playing (only once)
                  if (!riveInitialized.current) {
                    riveInitialized.current = true;
                    setTimeout(() => {
                      if (riveRef.current?.setInputState) {
                        try {
                          riveRef.current.setInputState('State Machine 1', 'Level-Number', 1);
                          appLog('Set Rive Level-Number to 1 for onboarding');
                        } catch (e) {
                          appLog('Error setting Level-Number:', e);
                        }
                      }
                    }, 100);
                  }
                }}
              />
            ) : (
              riveAssets[0]?.uri && (
                <Rive
                  ref={riveRef}
                  url={riveAssets[0].uri}
                  artboardName="[Main] Shpeherd"
                  stateMachineName="State Machine 1"
                  autoplay
                  style={{ width: '100%', height: '100%' }}
                  onError={(error) => {
                    console.warn('Rive animation error:', error);
                  }}
                  onPlay={() => {
                    // Set Level-Number to 1 when Rive starts playing (only once)
                    if (!riveInitialized.current) {
                      riveInitialized.current = true;
                      setTimeout(() => {
                        if (riveRef.current?.setInputState) {
                          try {
                            riveRef.current.setInputState('State Machine 1', 'Level-Number', 1);
                            appLog('Set Rive Level-Number to 1 for onboarding');
                          } catch (e) {
                            appLog('Error setting Level-Number:', e);
                          }
                        }
                      }, 100);
                    }
                  }}
                />
              )
            )
          )}
        </CustomAnimatedView>

        {/* Name Input */}
        <CustomAnimatedView style={inputStyle}>
          <TextInput
            ref={inputRef}
            className="font-feather text-3xl text-center text-textPrimary bg-white  rounded-2xl border-4 border-border"
            style={{
              paddingVertical: RPH(2),
              paddingHorizontal: RPH(3),
            }}
            placeholder={i18n.t('onboarding_lamb_name_placeholder')}
            placeholderTextColor="#B89B4C"
            maxLength={16}
            value={inputLambName}
            onChangeText={handleInputChange}
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
          />
          {error && <Text className="font-din text-sm text-red-500 mt-2 text-center">{error}</Text>}
        </CustomAnimatedView>

        {/* Continue Button */}
        <CustomAnimatedView style={buttonStyle} className="mt-0">
          <PrimaryButton
            title={i18n.t('continue_button')}
            onPress={handleContinue}
            disabled={!inputLambName.trim() || !!error}
            isActive={!!inputLambName.trim() && !error}
          />
        </CustomAnimatedView>
      </CustomAnimatedView>
    </>
  );
}
