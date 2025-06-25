import React, { useEffect } from 'react';
import { View, Text, StatusBar, Image } from 'react-native';
import { useRouter } from 'expo-router';
import PrimaryButton from '~/components/PrimaryButton';
import analytics from '~/utils/analytics';
import useSubscriptionStore from '~/app/stores/subscriptionStore';
import { useUserStore } from '~/app/stores/userStore';
import i18n from '~/app/utils/i18n';

import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { hapticMedium } from '~/utils/haptics';

export default function FreeOfferScreen() {
  const router = useRouter();
  const { presentFreeTrialPaywall, setFromScreen } = useSubscriptionStore();
  const { getLamb } = useUserStore();

  // Get lamb name
  const lamb = getLamb();
  const lambName = lamb?.name || 'your lamb';

  // Create Reanimated shared values for each component
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(40);

  const lambOpacity = useSharedValue(0);
  const lambTranslateY = useSharedValue(40);

  const subtextOpacity = useSharedValue(0);
  const subtextTranslateY = useSharedValue(40);

  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(40);

  useEffect(() => {
    // Analytics for screen view
    analytics.logEvent('FreeOffer_ScreenLoad', {
      lambName: lambName,
      timestamp: new Date().toISOString()
    });

    // Set the from screen for analytics
    setFromScreen('free_offer');

    // Reset animation values
    headerOpacity.value = 0;
    headerTranslateY.value = 40;
    lambOpacity.value = 0;
    lambTranslateY.value = 40;
    subtextOpacity.value = 0;
    subtextTranslateY.value = 40;
    buttonOpacity.value = 0;
    buttonTranslateY.value = 40;

    // Staggered animations for each component
    const animateComponent = (opacity: any, translateY: any, delay: number) => {
      opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
      translateY.value = withDelay(
        delay,
        withSpring(0, {
          damping: 20,
          stiffness: 90,
        })
      );
    };

    // Start animations with delays
    animateComponent(headerOpacity, headerTranslateY, 0);
    animateComponent(lambOpacity, lambTranslateY, 200);
    animateComponent(subtextOpacity, subtextTranslateY, 400);
    animateComponent(buttonOpacity, buttonTranslateY, 600);
  }, []);

  // Create animated styles for each component
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const lambStyle = useAnimatedStyle(() => ({
    opacity: lambOpacity.value,
    transform: [{ translateY: lambTranslateY.value }],
  }));

  const subtextStyle = useAnimatedStyle(() => ({
    opacity: subtextOpacity.value,
    transform: [{ translateY: subtextTranslateY.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  const handleSeeOffer = async () => {
    hapticMedium();
    analytics.logEvent('FreeOffer_Button_SeeOffer', {
      lambName: lambName,
      timestamp: new Date().toISOString(),
      action: 'see_offer_pressed'
    });

    try {
      // Present the free trial paywall
      const result = await presentFreeTrialPaywall();

      // Track paywall result
      analytics.logEvent('FreeOffer_Paywall_Result', {
        result: result || 'unknown',
        lambName: lambName,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error presenting free trial paywall:', error);

      // Track error
      analytics.logEvent('FreeOffer_Paywall_Error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        lambName: lambName,
        timestamp: new Date().toISOString()
      });

      // Fallback to pricing screen if paywall fails
      router.push('/PricingScreen');
    }
  };

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View className="flex-1 bg-surfaceCream px-6 pt-16">

        <View className="flex-1 items-center justify-between py-12">

          {/* Header Section */}
          <Animated.View style={headerStyle} className="items-center mt-8">
            <Text className="font-din text-xl text-description text-center mb-2">
              {i18n.t('free_offer_biggest_deal_ever')}
            </Text>
            <Text className="font-feather text-2xl text-textPrimary text-center mb-1">
              <Text className="text-blue">{i18n.t('free_offer_one_time_discount')}</Text>

            </Text>
          </Animated.View>

          {/* Lamb with Gift Section */}
          <Animated.View style={lambStyle} className="items-center justify-center flex-1">
            <View className="w-80 h-80 items-center justify-center">
              <Image
                source={require('~/assets/lambPresent.png')}
                style={{ width: 240, height: 240 }}
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          {/* Subtext */}
          <Animated.View style={subtextStyle}>
            <Text className="font-din text-caption text-description text-center mt-8">
              {i18n.t('free_offer_biggest_discount', { lambName: lambName })}
            </Text>
          </Animated.View>

          {/* CTA Button */}
          <Animated.View style={buttonStyle} className="w-full">
            <PrimaryButton
              title={i18n.t('free_offer_see_one_time_offer')}
              onPress={handleSeeOffer}
              buttonType="blue"
              buttonHeight={56}
            />
          </Animated.View>

        </View>
      </View>
    </>
  );
}
