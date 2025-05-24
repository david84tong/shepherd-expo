import React, { useState, useEffect, ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ImageBackground, ActivityIndicator, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import PrimaryButton from '../components/PrimaryButton';
import useSubscriptionStore from './stores/subscriptionStore';
import analytics from '../utils/analytics';
import { isSignedIn } from './hooks/authHook';

interface AnimatedItemProps {
  index?: number;
  children: ReactNode;
  animateItemFromBottom?: boolean; // New prop to control individual item animation intensity
}

const AnimatedItem = ({ index = 0, children, animateItemFromBottom = false }: AnimatedItemProps) => {
  const opacity = useSharedValue(0);
  // Start further down if animating from bottom, otherwise a gentler slide
  const initialTranslateY = animateItemFromBottom ? 60 : 25;
  const translateY = useSharedValue(initialTranslateY);

  useEffect(() => {
    // Adjusted delays and durations for a smoother, slightly faster feel
    const delay = 50 + index * 75;
    opacity.value = withDelay(delay, withTiming(1, { duration: 550 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 550 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }]
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
};

const PricingScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [trialEnabled, setTrialEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [animationReady, setAnimationReady] = useState(false); // Ensures animations run after mount
  const [showCloseButton, setShowCloseButton] = useState(false); // New state for X mark visibility

  const animateScreenFromBottom = params.animateFromBottom === "true";
  const fromLoading = params.fromLoading === "true";

  // Track screen view
  useEffect(() => {
    analytics.logEvent("PricingScreen_Viewed", {
      fromLoading: fromLoading || false,
      animateFromBottom: animateScreenFromBottom || false
    });
  }, [fromLoading, animateScreenFromBottom]);

  // Show close button after 5 seconds
  useEffect(() => {
    const closeButtonTimer = setTimeout(() => {
      setShowCloseButton(true);
    }, 5000); // 5 seconds delay

    return () => clearTimeout(closeButtonTimer);
  }, []);

  // Screen container just fades in quickly
  const screenOpacity = useSharedValue(0);

  useEffect(() => {
    const screenReadyTimeout = setTimeout(() => {
      setAnimationReady(true);
      screenOpacity.value = withTiming(1, { duration: 250 }); // Quick fade-in for the container
    }, 50); // Short delay to ensure component is mounted

    return () => clearTimeout(screenReadyTimeout);
  }, []);

  const screenContainerStyle = useAnimatedStyle(() => {
    return {
      opacity: screenOpacity.value, // Only opacity for the main container
    };
  });

  const { presentPaywall } = useSubscriptionStore();

  const toggleSwitch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newValue = !trialEnabled;
    setTrialEnabled(newValue);
    analytics.logEvent("PricingScreen_TrialToggled", {
      enabled: newValue
    });
  };

  const handleSubscribe = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      analytics.logEvent("PricingScreen_SubscribeButton_Tapped", {
        trialEnabled: trialEnabled
      });
      await showPaywall();
    } catch (error) {
      console.log('Error during subscription process:', error);
      setIsLoading(false);
    }
  };

  const handleBack = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.logEvent("PricingScreen_BackButton_Tapped");

    if (isSignedIn()) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } else {
      router.replace('/onboarding/11');
    }
  };

  const showPaywall = async () => {
    try {
      setIsLoading(true);
      analytics.logEvent("PricingScreen_ShowPaywall_Started", {
        trialEnabled: trialEnabled
      });

      // Commented RevenueCat implementation

      const result = await presentPaywall();

      // if (result === PAYWALL_RESULT.PURCHASED) {
      //   analytics.logEvent("PricingScreen_Subscription_Purchased");
      //   router.replace('/(tabs)');
      // } else if (result === PAYWALL_RESULT.RESTORED) {
      //   analytics.logEvent("PricingScreen_Subscription_Restored");
      //   router.replace('/(tabs)');
      // } else {
      //   analytics.logEvent("PricingScreen_Paywall_Dismissed", {
      //     result: result
      //   });
      // }


      // Adapty implementation

    } catch (error) {
      console.log('Error presenting paywall:', error);
      analytics.logEvent("PricingScreen_Paywall_Error", {
        errorMessage: (error as Error)?.message || "Unknown error"
      });
    } finally {
      setIsLoading(false);
    }
  };
  // Conditional rendering of animated items to ensure animations trigger correctly
  const renderAnimatedContent = () => {
    if (!animationReady) return null;
    return (
      <>
        {/* Header */}
        <AnimatedItem index={0} animateItemFromBottom={animateScreenFromBottom}>
          <View className="flex-row items-center justify-between px-5 py-3 mb-3">
            {showCloseButton && (
              <Animated.View entering={FadeIn.duration(600)}>
                <TouchableOpacity onPress={handleBack} className="p-2">
                  <Feather name="x" size={28} color="#B89B4C" />
                </TouchableOpacity>
              </Animated.View>
            )}
            <View className="w-10" />{/* Spacer */}
          </View>
        </AnimatedItem>
        {/* Main content */}
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 120,
            paddingHorizontal: 20
          }}
        >
          <AnimatedItem index={1} animateItemFromBottom={animateScreenFromBottom}>
            <View className="items-center mb-4 flex justify-center mt-16">
              <LinearGradient
                colors={['#F7B500', '#FFF45B']}
                start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                style={{ paddingHorizontal: 20, paddingVertical: 8, borderRadius: 32, maxWidth: '85%' }}
              >
                <Text className="font-nunito-italic text-title text-white text-center" style={{ textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 }}>SUPER</Text>
              </LinearGradient>
              <Text className="font-feather text-title text-textPrimary text-center mt-2" style={{ textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 }}>SHEPHERD</Text>
            </View>
          </AnimatedItem>

          <AnimatedItem index={2} animateItemFromBottom={animateScreenFromBottom}>


            <View className="bg-white rounded-2xl shadow-card p-6 mb-8 items-center mt-4">
              <Text className="font-feather text-h2 text-textPrimary mt-2 mb-2 text-center">Draw closer to God</Text>
              <Text className="font-din text-heading text-description text-center">Super users are 4.2x more likely to finish the bible!</Text>
            </View>
          </AnimatedItem>
          <AnimatedItem index={3} animateItemFromBottom={animateScreenFromBottom}>
            <View className="bg-white rounded-2xl shadow-card mb-8 overflow-hidden">
              <View className="flex-row">
                <View className="flex-1" />
                <View className="items-center justify-center py-4" style={{ width: '25%' }}><Text className="font-din text-md text-textPrimary">FREE</Text></View>
                <View className="items-center justify-center py-4 bg-accentGold/10" style={{ width: '25%' }}>
                  <LinearGradient colors={['#F7B500', '#FFF45B']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ paddingHorizontal: 4, paddingVertical: 6, borderRadius: 32, width: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 }}>
                    <Text className="font-nunito-italic text-md text-white text-center" style={{ textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 }}>SUPER</Text>
                  </LinearGradient>
                </View>
              </View>
              <View>
                {[
                  { name: "Access to Bible", free: true, pro: true }, { name: "Unlimited Daily Bread", free: false, pro: true },
                  { name: "Unlimited Daily Prayers", free: false, pro: true }, { name: "Unlimited Daily Reflections", free: false, pro: true },
                  { name: "No Ads", free: false, pro: true }, { name: "Equip Skins", free: false, pro: true },
                  { name: "Super Lamb Skin! (Limited Time)", free: false, pro: true }
                ].map((feature, idx) => (
                  <AnimatedItem key={feature.name} index={4 + idx * 0.5} animateItemFromBottom={animateScreenFromBottom}>
                    <View className="flex-row border-t border-surfaceCream">
                      <View className="flex-1 py-4 pl-6 pr-2"><Text className="font-din text-body text-textPrimary">{feature.name}</Text></View>
                      <View className="items-center justify-center" style={{ width: '25%' }}>
                        {feature.free ? <Feather name="check-circle" size={22} color="#24CA17" /> : <Feather name="circle" size={22} color="#E9E2C7" />}
                      </View>
                      <View className="items-center justify-center bg-accentGold/10" style={{ width: '25%' }}><Feather name="check-circle" size={22} color="#24CA17" /></View>
                    </View>
                  </AnimatedItem>
                ))}
              </View>
            </View>
            <Animated.View
              className="items-center mb-4 flex justify-center"
              entering={FadeIn.duration(500).delay(200)}
            >
              <Image
                source={require('../assets/goldLamb.png')}
                className="w-64 h-64 mb-4 flex"
              />
            </Animated.View>
          </AnimatedItem>

          <AnimatedItem index={12} animateItemFromBottom={animateScreenFromBottom}>
            <View className="bg-white rounded-2xl shadow-card p-6 mb-8 items-center mt-4">
              <Text className="font-feather text-h2 text-textPrimary mt-2 mb-2 text-center">❤️ Support the mission</Text>
              <Text className="font-din text-heading text-description text-center">{`We're a small team of 2 of christians, completely self-funded. `}</Text>
              <Text className="font-feather text-heading text-textPrimary text-center mt-8">Help fund future features</Text>
              <Text className="font-din text-body text-description text-start mt-2">- Social bible study (add friends)</Text>
              <Text className="font-din text-body text-description text-center mt-2">- translating to other languages</Text>
              <Text className="font-din text-body text-description text-start mt-2">- chat with bible</Text>
              <Text className="font-din text-body text-description text-center mt-2">- prayer requests</Text>
              <Text className="font-din text-body text-description text-center mt-2">- family/kid study plans</Text>
              <Text className="font-din text-body text-description text-center mt-2">- more skins / backgrounds</Text>
            </View>
          </AnimatedItem>

          <AnimatedItem index={13} animateItemFromBottom={animateScreenFromBottom}>
            <View className="bg-white rounded-2xl shadow-card p-6 mb-8 items-center mt-4">
              <Feather name="star" size={48} color="#F7B500" />
              <Text className="font-feather text-heading text-textPrimary mt-4 mb-2 text-center">10% of all profits are donated!</Text>
              <Text className="font-din text-heading text-description text-center">Tithe to help fund mission trips, charities, and purchasing super accounts for those in need.</Text>
            </View>
          </AnimatedItem>
        </ScrollView>
        <AnimatedItem index={14} animateItemFromBottom={animateScreenFromBottom}>
          <View className="absolute bottom-0 left-0 right-0 bg-surfaceCream/90 pt-4 pb-2 px-5 z-20" style={{ paddingBottom: Math.max(insets.bottom, 16), borderTopWidth: 1, borderTopColor: 'rgba(255, 247, 230, 1)', shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5, borderRadius: 20 }}>
            {isLoading ? (
              <View className="py-3 flex-row justify-center items-center"><ActivityIndicator size="small" color="#F7B500" /><Text className="font-din text-lg text-textPrimary ml-3">Loading subscription options...</Text></View>
            ) : (
              <PrimaryButton title="Unlock Super Shepherd" onPress={handleSubscribe} />
            )}
            <Text className="font-din text-caption text-description/70 text-center mt-2 px-4 text-xs">By continuing, you agree to our Terms of Service</Text>
          </View>
        </AnimatedItem>
      </>
    );
  };

  return (
    <ImageBackground
      source={require('../assets/backgrounds/godBackground.png')}
      className="flex-1"
      resizeMode="cover"
    >
      <LinearGradient colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.35)', 'rgba(0,0,0,0)']} locations={[0, 0.5, 1]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 5 }} />

      <Animated.View className="flex-1 relative z-10" style={[screenContainerStyle, { paddingTop: insets.top }]}>
        {renderAnimatedContent()}

        {/* Full Screen Loading Overlay (shown during paywall transitions) */}
        {isLoading && (
          <Animated.View className="absolute inset-0 bg-black/30 items-center justify-center z-50" entering={FadeIn.duration(200)} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
            <View className="bg-white p-5 rounded-xl items-center">
              <ActivityIndicator size="large" color="#F7B500" />
              <Text className="font-din text-body text-textPrimary mt-3">Loading subscription options...</Text>
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </ImageBackground>
  );
};

export default PricingScreen;
