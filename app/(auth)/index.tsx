import React, { useState, useRef, useLayoutEffect } from 'react';
import {
  View,
  Text,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  ImageBackground,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_COMPLETED_KEY } from '../types/onboarding';
import * as Haptics from 'expo-haptics';
import { useAssets } from 'expo-asset';
import Rive from 'rive-react-native';
import PrimaryButton from '../../components/PrimaryButton';
import { LinearGradient } from 'expo-linear-gradient';
import analytics from '~/utils/analytics';
import {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import CustomAnimatedView from '../components/CustomAnimatedView';

// We'll use the background directly in the source prop

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Load Rive assets
  const [riveAssets] = useAssets([require('../../assets/riveAnimations/homeLamb.riv')]);

  // Track if animations have been initialized
  const animationsInitialized = useRef(false);

  // Create animated values for components
  const screenOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(-20);

  const lambOpacity = useSharedValue(0);
  const lambScale = useSharedValue(0.9);

  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);

  const linkOpacity = useSharedValue(0);

  // Begin journey handler
  const handleBeginJourney = async () => {
    analytics.logEvent('WelcomeScreen_Tapped_BeginJourney');

    try {
      // Trigger haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      setLoading(true);

      // Create exit animation
      const exitAnimation = () => {
        return new Promise<void>((resolve) => {
          // Animate screen elements out
          screenOpacity.value = withTiming(0, { duration: 400 });
          lambScale.value = withTiming(0.8, { duration: 400 });
          buttonOpacity.value = withTiming(0, { duration: 300 });
          titleOpacity.value = withTiming(0, { duration: 300 });

          // Wait for animation to complete
          setTimeout(() => {
            resolve();
          }, 400);
        });
      };

      // Run exit animation then navigate
      await exitAnimation();

      // Remove the onboarding completed key
      await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);

      // Navigate to onboarding with a slight delay for smoother transition
      setTimeout(() => {
        router.replace('/onboarding/1');
      }, 50);
    } catch (error) {
      console.error('Error starting journey:', error);
      setLoading(false);
      Alert.alert('Error', 'Could not start journey. Please try again.');
    }
  };

  // Run animations
  useLayoutEffect(() => {
    analytics.logEvent('WelcomeScreen_Screenload');
    if (animationsInitialized.current) return;

    // Fade in the screen
    screenOpacity.value = withTiming(1, { duration: 400 });

    const triggerAnimations = () => {
      // Animate components with staggered timing

      // Title animation
      titleOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
      titleTranslateY.value = withDelay(
        200,
        withSpring(0, {
          damping: 14,
          stiffness: 80,
          mass: 0.7,
        })
      );

      // Lamb animation - subtle grow effect
      lambOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
      lambScale.value = withDelay(
        400,
        withSpring(1, {
          damping: 14,
          stiffness: 80,
          mass: 0.8,
        })
      );

      // Button slide up from bottom
      buttonOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
      buttonTranslateY.value = withDelay(
        600,
        withSpring(0, {
          damping: 14,
          stiffness: 90,
        })
      );

      // Link fade in last
      linkOpacity.value = withDelay(700, withTiming(1, { duration: 400 }));

      animationsInitialized.current = true;
    };

    // Start animations after a short delay
    const timer = setTimeout(triggerAnimations, 100);

    return () => clearTimeout(timer);
  }, []);

  // Create animated styles
  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    flex: 1,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const lambStyle = useAnimatedStyle(() => ({
    opacity: lambOpacity.value,
    transform: [{ scale: lambScale.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  const linkStyle = useAnimatedStyle(() => ({
    opacity: linkOpacity.value,
  }));

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
    <CustomAnimatedView style={screenStyle} className="flex-1">
      {/* Using direct require for background to avoid linter errors */}
      <ImageBackground
        source={require('../../assets/backgrounds/mainBackground.png')}
        className="flex-1"
        resizeMode="cover">
        {/* Enhanced gradient with stronger colors and explicit styling */}
        <LinearGradient
          colors={['rgba(0,0,0,0.65)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 5,
          }}
        />

        <SafeAreaView className="flex-1 justify-between px-6 pt-10 pb-10 relative z-10">
          {/* Title at the top */}
          <Text className="text-accentGold font-feather text-h1 text-center mb-2 -mt-12">
            Shepherd
          </Text>
          <CustomAnimatedView style={titleStyle} className="items-center -mt-12">
            {/* Shepherd title */}

            <View className="flex-row items-center justify-center mt-1 w-full">
              <Image
                source={require('../../assets/onboarding/leftReef.png')}
                className="w-32  h-full  -mr-4"
                resizeMode="contain"
              />
              {/* Bible Study text with icons */}
              <View className="flex-col items-center justify-center mt-1">
                <Text className="text-white font-nunito-bold text-title text-center">
                  Bible Study
                </Text>

                {/* Made Joyful with Bible icons */}
                <View className="flex-row items-center justify-center mt-1">
                  <Text className="text-white font-nunito-bold text-title">Made </Text>
                  <Text
                    className="text-accentGold font-feather text-title"
                    style={{ borderBottomColor: '#F7B500' }}>
                    Joyful
                  </Text>
                </View>
              </View>
              <Image
                source={require('../../assets/onboarding/rightReef.png')}
                className="w-32 h-full -ml-4"
                resizeMode="contain"
              />
            </View>
          </CustomAnimatedView>

          {/* Rive Animation in the middle */}
          <CustomAnimatedView
            style={lambStyle}
            className="h-[200px] w-full justify-center items-center -mt-24">
            <Rive
              resourceName={'home_lamb'}
              // url={riveAssets[0].uri}
              artboardName="lamb-reading"
              autoplay
              style={{ width: '120%', height: '120%' }}
            />
          </CustomAnimatedView>

          {/* Button at the bottom */}
          <View className="w-full">
            <CustomAnimatedView style={buttonStyle}>
              <PrimaryButton
                onPress={handleBeginJourney}
                disabled={loading}
                title="Begin My Journey"
              />
            </CustomAnimatedView>
            <CustomAnimatedView style={linkStyle}>
              <TouchableOpacity
                onPress={() => {
                  analytics.logEvent('WelcomeScreen_Tapped_Login');
                  router.push({
                    pathname: '/onboarding/11',
                    params: { isLogin: 'true' },
                  });
                }}
                className="mt-4"
                onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                <Text className="font-feather text-body text-center underline mt-4 text-white">
                  Login
                </Text>
              </TouchableOpacity>
            </CustomAnimatedView>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </CustomAnimatedView>
  );
}
