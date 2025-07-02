import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import PrimaryButton from '~/components/PrimaryButton';
import analytics from '~/utils/analytics';
import { useAssets } from 'expo-asset';
import Rive, { RiveRef } from 'rive-react-native';
import { IS_ANDROID } from '~/app/utils/utils';
import useSubscriptionStore from '~/app/stores/subscriptionStore';
import { adapty } from 'react-native-adapty';
import i18n from '~/app/utils/i18n';

import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { RPH } from '~/app/helper/helper';
import { hapticLight, hapticMedium } from '~/utils/haptics';

export default function SelfFundedMissionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { presentPaywall, setFromScreen } = useSubscriptionStore();

  // Load Rive assets
  const [riveAssets] = useAssets([require('~/assets/riveAnimations/new_shepherd.riv')]);

  // Rive refs for controlling animations
  const armorRiveRef = useRef<RiveRef>(null);
  const whaleRiveRef = useRef<RiveRef>(null);

  // Create Reanimated shared values for animations
  const screenOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(30);
  const charactersOpacity = useSharedValue(0);
  const charactersScale = useSharedValue(0.8);

  useEffect(() => {
    console.log('SelfFundedMissionScreen');
    // Analytics for screen view
    analytics.logEvent('SelfFundedMission_ScreenLoad', {
      timestamp: new Date().toISOString(),
      source: params.source || 'unknown'
    });

    // Set the from screen for analytics
    setFromScreen('self_funded_mission');

    // Start animations
    screenOpacity.value = withTiming(1, { duration: 400 });
    contentTranslateY.value = withTiming(0, { duration: 600 });

    // Animate characters with delay
    setTimeout(() => {
      charactersOpacity.value = withTiming(1, { duration: 600 });
      charactersScale.value = withSpring(1, {
        damping: 15,
        stiffness: 100,
      });
    }, 300);
  }, [setFromScreen]);

  // Create animated styles
  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const charactersStyle = useAnimatedStyle(() => ({
    opacity: charactersOpacity.value,
    transform: [{ scale: charactersScale.value }],
  }));

  const handleFundFeatures = async () => {
    hapticMedium();
    analytics.logEvent('SelfFundedMission_Button_FundFeatures', {
      timestamp: new Date().toISOString(),
      action: 'fund_features_pressed'
    });

    try {
      // Get the weekly product and make direct purchase
      const paywall = await adapty.getPaywall('noFreeTrial');
      console.log('Fetched paywall ID:', paywall.placementId);

      const products = await adapty.getPaywallProducts(paywall);
      console.log('Available products:', products.map(p => ({
        vendorProductId: p.vendorProductId,
        localizedTitle: p.localizedTitle,
        price: p.price
      })));

      // Find the weekly product
      const weeklyProduct = products.find(product => {
        // Check for weekly in the product ID
        const isWeekly = product.vendorProductId.toLowerCase().includes('weekly') ||
          product.vendorProductId === 'second.round.shepherd.Weekly' ||
          product.vendorProductId === 'second.round.shepherd';

        console.log(`Checking product ${product.vendorProductId}: isWeekly=${isWeekly}`);
        return isWeekly;
      });

      console.log('Looking for weekly product, found:', weeklyProduct?.vendorProductId);

      if (weeklyProduct) {
        analytics.logEvent('SelfFundedMission_Purchase_Started', {
          productId: weeklyProduct.vendorProductId,
          timestamp: new Date().toISOString()
        });

        // Make direct purchase
        const result = await adapty.makePurchase(weeklyProduct);

        if (result) {
          analytics.logEvent('SelfFundedMission_Purchase_Success', {
            productId: weeklyProduct.vendorProductId,
            timestamp: new Date().toISOString()
          });

          // Update user to pro status
          useSubscriptionStore.getState().getCustomerInfo();

          // Navigate to tabs or complete onboarding
          router.replace('/(tabs)');
        }
      } else {
        console.error('Weekly product not found in products:', products.map(p => p.vendorProductId));
        // Fallback to pricing screen
        router.push('/PricingScreen');
      }
    } catch (error) {
      console.error('Error making direct purchase:', error);
      analytics.logEvent('SelfFundedMission_Purchase_Error', {
        error: (error as Error)?.message || 'Unknown error',
        timestamp: new Date().toISOString()
      });
      // Fallback to pricing screen if purchase fails
      router.push('/PricingScreen');
    }
  };

  const handleNotToday = () => {
    hapticLight();
    analytics.logEvent('SelfFundedMission_Button_NotToday', {
      timestamp: new Date().toISOString(),
      action: 'not_today_pressed'
    });
    // Redirect to pricing screen
    router.push('/PricingScreen');
  };

  // Track if skins have been set to prevent spam
  const [skinsSet, setSkinsSet] = useState(false);

  // Function to set Rive skin
  const setRiveSkin = (riveRef: React.RefObject<RiveRef>, skinNumber: number) => {
    if (riveRef.current && riveRef.current.setInputState) {
      try {
        riveRef.current.setInputState('State Machine 1', 'Skin-Number', skinNumber);
        console.log(`Set skin to ${skinNumber} (one time)`);
      } catch (error) {
        console.log('Error setting skin:', error);
      }
    }
  };

  // Set skins after assets load with a delay
  useEffect(() => {
    if (riveAssets && riveAssets.length > 0 && !skinsSet) {
      const timer = setTimeout(() => {
        setRiveSkin(armorRiveRef, 9); // Armor of God skin
        setRiveSkin(whaleRiveRef, 8); // Whale skin
        setSkinsSet(true);
      }, 100); // Wait 1.5 seconds for Rive to fully load

      return () => clearTimeout(timer);
    }
  }, [riveAssets, skinsSet]);

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <ScrollView>
        <Animated.View
          style={screenStyle}
          className="flex-1 bg-gradient-to-b from-purple-100 to-yellow-100 px-6 pt-16">



          <View >

            <Animated.View style={contentStyle} className="items-center">
              {/* Header - Small caps style */}
              <Text className="font-din text-smallCaption uppercase tracking-widest text-description text-center mb-3 mt-8">
                {i18n.t('self_funded_mission_support_mission')}
              </Text>

              {/* Main headline - Larger and more impactful */}
              <Text className="font-feather text-2xl text-textPrimary text-center mb-4 leading-tight px-4 mt-4">
                {i18n.t('self_funded_mission_team_headline')}

              </Text>

              {/* Subheadline - Supporting text */}
              <Text className="font-din text-heading text-textPrimary text-center mb-8 leading-relaxed px-8 -mt-4">
                {i18n.t('self_funded_mission_goal_subtitle')}
              </Text>


              {/* Characters section */}
              <Animated.View style={charactersStyle} className="items-center mb-8">
                <View className="flex-row items-center justify-center space-x-8 mb-4">
                  {/* First character - Armor of God skin */}
                  <View className="items-center">
                    <View className="w-40 h-40 items-center justify-center border-lightBrown/30">
                      {IS_ANDROID ? (
                        <Rive
                          ref={armorRiveRef}
                          resourceName="new_shepherd"
                          artboardName="[Main] Shpeherd"
                          stateMachineName="State Machine 1"
                          autoplay
                          style={{ width: 200, height: 200 }}
                        />
                      ) : (
                        riveAssets && (
                          <Rive
                            ref={armorRiveRef}
                            url={riveAssets[0].uri!}
                            artboardName="[Main] Shpeherd"
                            stateMachineName="State Machine 1"
                            autoplay
                            style={{ width: 200, height: 200 }}
                          />
                        )
                      )}
                    </View>
                  </View>

                  {/* Second character - Whale skin */}
                  <View className="items-center">
                    <View className="w-40 h-40 items-center justify-center border-lightBlue/50">
                      {IS_ANDROID ? (
                        <Rive
                          ref={whaleRiveRef}
                          resourceName="new_shepherd"
                          artboardName="[Main] Shpeherd"
                          stateMachineName="State Machine 1"
                          autoplay
                          style={{ width: 200, height: 200 }}
                        />
                      ) : (
                        riveAssets && (
                          <Rive
                            ref={whaleRiveRef}
                            url={riveAssets[0].uri!}
                            artboardName="[Main] Shpeherd"
                            stateMachineName="State Machine 1"
                            autoplay
                            style={{ width: 200, height: 200 }}
                          />
                        )
                      )}
                    </View>
                  </View>
                </View>

                {/* Names */}
                <Text className="font-din text-xl text-textPrimary/50 text-center mt-2">
                  {i18n.t('self_funded_mission_team_names')}
                </Text>
              </Animated.View>

              {/* Donation highlight section */}
              <View className="bg-lightYellow/30 rounded-2xl px-6 py-4 mx-4 mb-12 border border-accentGold/20">
                <Text className="font-din text-body text-textPrimary text-center leading-relaxed">
                  <Text className="text-darkYellow font-feather">{i18n.t('self_funded_mission_donation_highlight')}</Text>
                </Text>
              </View>

              {/* Social proof */}
              <Text className="font-din text-caption text-description text-center mt-8">
                {i18n.t('self_funded_mission_social_proof')}
              </Text>

              {/* Fund button */}
              <View className="w-full mb-4">
                <PrimaryButton
                  title={i18n.t('self_funded_mission_fund_button')}
                  onPress={handleFundFeatures}
                  buttonType="blue"
                  buttonHeight={RPH(7)}
                />
              </View>

              {/* Not today link */}
              <TouchableOpacity onPress={handleNotToday} className="py-4">
                <Text className="font-din text-body text-description text-center underline">
                  {i18n.t('self_funded_mission_not_today')}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>
      </ScrollView>
    </>
  );
}
