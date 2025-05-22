import React, { useLayoutEffect, useEffect } from 'react';
import { View, Text, Image } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import PrimaryButton from '../../components/PrimaryButton';
import analytics from '../../utils/analytics';

// Lamb images (replace with your actual asset imports)
import lamb1 from '../../assets/onboarding/babyLamb.png';
import lamb10 from '../../assets/onboarding/babyLamb.png';
import lamb20 from '../../assets/onboarding/lamb20.png';
import lamb33 from '../../assets/onboarding/lambWithWings.png';
import skins from '../../assets/onboarding/skins.png';

export default function OnboardingExplainerScreen({ onContinue }: { onContinue?: () => void }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Animation shared values
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const cardOpacities = [useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  const cardTranslateYs = [useSharedValue(40), useSharedValue(40), useSharedValue(40), useSharedValue(40), useSharedValue(40)];

  // Log screen view when component mounts
  useEffect(() => {
    analytics.logEvent("OnboardingExplainerScreen_Viewed");
  }, []);

  // Animate in on mount
  useLayoutEffect(() => {
    titleOpacity.value = 0;
    titleTranslateY.value = 20;
    cardOpacities.forEach((v, i) => (v.value = 0));
    cardTranslateYs.forEach((v, i) => (v.value = 40));
    // Animate title
    titleOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
    titleTranslateY.value = withDelay(100, withSpring(0, { damping: 18, stiffness: 90 }));
    // Animate cards staggered
    cardOpacities.forEach((v, i) => {
      v.value = withDelay(300 + i * 120, withTiming(1, { duration: 400 }));
      cardTranslateYs[i].value = withDelay(300 + i * 120, withSpring(0, { damping: 18, stiffness: 90 }));
    });
  }, []);

  // Handle continue with analytics
  const handleContinue = () => {
    // Trigger light haptic feedback
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        console.log('Haptics not available');
      });
    } catch (error) {
      console.log('Haptics not available');
    }

    // Log continue button press
    analytics.logEvent("OnboardingExplainerScreen_Tapped_Continue");
    
    // Call the provided onContinue function if it exists
    if (onContinue) {
      onContinue();
    }
    
    // Navigate to notification permission screen
    router.push('/onboarding/9');
  };

  // Animated styles
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));
  const cardStyle0 = useAnimatedStyle(() => ({
    opacity: cardOpacities[0].value,
    transform: [{ translateY: cardTranslateYs[0].value }],
  }));
  const cardStyle1 = useAnimatedStyle(() => ({
    opacity: cardOpacities[1].value,
    transform: [{ translateY: cardTranslateYs[1].value }],
  }));
  const cardStyle2 = useAnimatedStyle(() => ({
    opacity: cardOpacities[2].value,
    transform: [{ translateY: cardTranslateYs[2].value }],
  }));
  const cardStyle3 = useAnimatedStyle(() => ({
    opacity: cardOpacities[3].value,
    transform: [{ translateY: cardTranslateYs[3].value }],
  }));
  const cardStyle4 = useAnimatedStyle(() => ({
    opacity: cardOpacities[4].value,
    transform: [{ translateY: cardTranslateYs[4].value }],
  }));
  const cardStyles = [cardStyle0, cardStyle1, cardStyle2, cardStyle3, cardStyle4];

  // Lamb card data
  const lambs = [
    { img: lamb1, label: 'LVL 1', glow: false, top: false },
    { img: lamb10, label: 'LVL 10', glow: false, top: false },
    { img: lamb20, label: 'LVL 20', glow: true, top: true },
    { img: lamb33, label: 'LVL 33', glow: true, top: false },
  ];

  return (
    <View className="flex-1 bg-surfaceCream pt-12 w-full items-center" style={{paddingBottom: insets.bottom }}>
      {/* Title */}
      <Animated.View style={titleStyle} className="mb-8 px-6">
        <Text className="font-feather text-2xl text-textPrimary text-center mb-0">
          As you read, pray and reflect, your lamb grows...
        </Text>
      </Animated.View>

      {/* Lamb grid */}
      <View className="flex-row flex-wrap justify-center items-center gap-4 mb-4">
        {/* Row 1 */}
        <Animated.View style={cardStyles[0]} className="w-[165px] h-[150px] bg-surfaceCream rounded-2xl border-2 border-accentGold items-center justify-center relative">
          <Image source={lamb1} className="w-20 h-20" resizeMode="contain" />
          <View className="absolute top-2.5 right-2.5 bg-lightYellow px-4 py-1 rounded-full">
            <Text className="font-feather text-accentGold">LVL 1</Text>
          </View>
        </Animated.View>
        <Animated.View style={cardStyles[1]} className="w-[165px] h-[150px] bg-surfaceCream rounded-2xl border-2 border-accentGold items-center justify-center relative">
          <Image source={lamb10} className="w-[100px] h-[100px]" resizeMode="contain" />
          <View className="absolute top-2.5 right-2.5 bg-lightYellow px-4 py-1 rounded-full">
            <Text className="font-feather text-accentGold">LVL 10</Text>
          </View>
        </Animated.View>
        {/* Row 2 */}
        <Animated.View style={cardStyles[2]} className="w-[165px] h-[150px] bg-surfaceCream rounded-2xl border-2 border-accentGold items-center justify-center relative">
          <Image source={lamb20} className="w-[120px] h-[120px]" resizeMode="contain" />
          <View className="absolute top-2.5 right-2.5 bg-lightYellow px-4 py-1 rounded-full">
            <Text className="font-feather text-accentGold">LVL 20</Text>
          </View>
        </Animated.View>
        <Animated.View style={cardStyles[3]} className="w-[165px] h-[150px] bg-surfaceCream rounded-2xl border-2 border-accentGold items-center justify-center relative">
          <Image source={lamb33} className="w-[120px] h-[120px]" resizeMode="contain" />
          <View className="absolute top-2.5 right-2.5 bg-lightYellow px-4 py-1 rounded-full">
            <Text className="font-feather text-accentGold">LVL 33</Text>
          </View>
        </Animated.View>
      </View>
      
      {/* Skins section */}
      <Animated.View style={cardStyles[4]} className="w-[340px] h-[140px] bg-surfaceCream rounded-2xl border-2 border-accentGold items-center justify-center relative mb-4">
        <Image source={skins} className="w-full h-[120px]" resizeMode="contain" />
        <View className="absolute top-2.5 right-2.5 bg-lightYellow px-4 py-1 rounded-full">
          <Text className="font-feather text-accentGold">Shop for skins at level 10</Text>
        </View>
      </Animated.View>
      
      {/* Continue Button - fixed at bottom */}
      <View className="absolute left-6 right-6" style={{ bottom: Math.max(insets.bottom + 16, 24) }}>
        <PrimaryButton title="Continue" onPress={handleContinue} />
      </View>
    </View>
  );
}
