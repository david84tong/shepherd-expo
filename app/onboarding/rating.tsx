import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  Image,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import Lottie from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import PrimaryButton from '../../components/PrimaryButton';
import analytics from '../../utils/analytics';
import { useRouter } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { RPH, RPW } from '../helper/helper';

const Rating = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Animation refs
  const animationsInitialized = useRef(false);
  const [isAssetsLoaded, setIsAssetsLoaded] = useState(false);

  // Create Reanimated shared values for each component
  const screenOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const starsOpacity = useSharedValue(0);
  const starsTranslateY = useSharedValue(20);
  const imageOpacity = useSharedValue(0);
  const imageTranslateY = useSharedValue(20);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);

  // Log screen view when component mounts
  React.useEffect(() => {
    analytics.logEvent('RatingScreen_Viewed');
  }, []);

  // Run animations only once during initial layout
  useLayoutEffect(() => {
    if (animationsInitialized.current || !isAssetsLoaded) return;

    // Fade in the entire screen first
    screenOpacity.value = withTiming(1, { duration: 250 });

    // Reset animation values
    titleOpacity.value = 0;
    titleTranslateY.value = 20;
    starsOpacity.value = 0;
    starsTranslateY.value = 20;
    imageOpacity.value = 0;
    imageTranslateY.value = 20;
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

    // Apply staggered animations with platform-specific timing
    animateComponent(titleOpacity, titleTranslateY, baseDelay);
    animateComponent(starsOpacity, starsTranslateY, baseDelay * 2);
    animateComponent(imageOpacity, imageTranslateY, baseDelay * 3);
    animateComponent(buttonOpacity, buttonTranslateY, baseDelay * 4);

    // Log when animations are complete
    setTimeout(() => {
      analytics.logEvent('RatingScreen_Screenload');
    }, baseDelay * 5);

    animationsInitialized.current = true;
  }, [isAssetsLoaded]);

  // Handle asset loading
  useEffect(() => {
    // Add a small delay on Android to ensure proper initialization
    if (Platform.OS === 'android') {
      setTimeout(() => {
        setIsAssetsLoaded(true);
      }, 100);
    } else {
      setIsAssetsLoaded(true);
    }
  }, []);

  // Create animated styles
  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    flex: 1,
    backgroundColor: '#FDEBB8',
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const starsStyle = useAnimatedStyle(() => ({
    opacity: starsOpacity.value,
    transform: [{ translateY: starsTranslateY.value }],
  }));

  const imageStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [{ translateY: imageTranslateY.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: Math.max(insets.bottom + 16, 24),
  }));

  const handleRateApp = async () => {
    analytics.logEvent('RatingScreen_Tapped_Rate');

    // Try to trigger the native rating prompt
    try {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (isAvailable) {
        analytics.logEvent('RatingScreen_ReviewAvailable');
        await StoreReview.requestReview();
        analytics.logEvent('RatingScreen_ReviewRequested');
      } else {
        // Fallback if review not available
        analytics.logEvent('RatingScreen_ReviewUnavailable');
        console.log('Store review not available');
      }
    } catch (error) {
      analytics.logEvent('RatingScreen_ReviewError');
      console.log('Error requesting review:', error);
    }
  };

  const handleIRatedPress = () => {
    analytics.logEvent('RatingScreen_Tapped_IRated');
    router.push({
      pathname: '/onboarding/LoadingScreen',
      params: {
        isOnboarding: 'true',
      },
    });
  };

  // Show loading indicator while assets load
  if (!isAssetsLoaded) {
    return (
      <>
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
        <View className="flex-1 items-center justify-center bg-surfaceCream pt-4">
          <ActivityIndicator size="large" color="#3C584A" />
          <Text className="font-feather text-textPrimary mt-4">Loading...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <Animated.View style={screenStyle}>
        <SafeAreaView className="flex-1">
          <View className="flex-1 px-6 pt-6 items-center">
            {/* Title at the top */}
            <Animated.View style={titleStyle}>
              <Text style={{marginTop:RPH(3),marginBottom:RPH(1)}} className="font-feather text-3xl text-center text-textPrimary ">
                Support our small team!
              </Text>
              <Text className="font-feather text-xl text-center text-description ">
                Help spread the word
              </Text>
            </Animated.View>

            {/* Centered stars animation */}
            <Animated.View style={starsStyle} className="justify-center items-center mb-6">
              <Lottie
                source={require('../../assets/riveAnimations/stars.json')}
                autoPlay
                loop={false}
                style={{ width: RPW(100), height: RPH(11) }}
              />
            </Animated.View>

            {/* shepherd Ratings image */}
            <Animated.View style={imageStyle} className="items-center mb-12">
              <Image
                source={require('../../assets/onboarding/shepReviews.png')}
                style={{ width: 500, height: RPH(45), resizeMode: 'contain' }}
                defaultSource={require('../../assets/icon.png')}
                className={`rounded ${Platform.OS === 'ios' ? 'shadow-md' : undefined}`}
              />
            </Animated.View>

            {/* Bottom button */}
            <Animated.View style={buttonStyle} className="items-center mt-12">
              <PrimaryButton title="Leave a rating" onPress={handleRateApp} buttonType="gold" />

              <TouchableOpacity onPress={handleIRatedPress} className="mt-6 items-center">
                <Text className="font-din text-description underline text-[16px]">
                  👍 Ok, I rated
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </SafeAreaView>
      </Animated.View>
    </>
  );
};

export default Rating;
