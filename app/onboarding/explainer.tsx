import React, { useLayoutEffect, useEffect, useRef } from 'react';
import { View, Text, Image, StatusBar, ScrollView } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useAssets } from 'expo-asset';
import Rive, { RiveRef } from 'rive-react-native';
import PrimaryButton from '../../components/PrimaryButton';
import analytics from '../../utils/analytics';
import skins from '../../assets/onboarding/skins.png';
import { IS_ANDROID } from '../utils/utils';
import { RPH } from '../helper/helper';
import { hapticLight } from '~/utils/haptics';

export default function OnboardingExplainerScreen({ onContinue }: { onContinue?: () => void }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Create refs for each Rive instance
  const riveRef1 = useRef<RiveRef>(null);
  const riveRef10 = useRef<RiveRef>(null);
  const riveRef20 = useRef<RiveRef>(null);
  const riveRef33 = useRef<RiveRef>(null);

  // Load Rive assets
  const [riveAssets] = useAssets([
    require('../../assets/riveAnimations/new_shepherd.riv'),
  ]);

  // Animation shared values
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const cardOpacities = [
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
  ];
  const cardTranslateYs = [
    useSharedValue(40),
    useSharedValue(40),
    useSharedValue(40),
    useSharedValue(40),
    useSharedValue(40),
  ];

  // Log screen view when component mounts
  useEffect(() => {
    analytics.logEvent('OnboardingExplainerScreen_Viewed');
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
      cardTranslateYs[i].value = withDelay(
        300 + i * 120,
        withSpring(0, { damping: 18, stiffness: 90 })
      );
    });
  }, []);

  // Configure Rive input states after components are ready
  useEffect(() => {
    const timer = setTimeout(() => {
      // LVL 1: Set Level-Number to 1
      if (riveRef1.current?.setInputState) {
        try {
          riveRef1.current.setInputState('State Machine 1', 'Level-Number', 1);
        } catch (e) {
          console.log('Error setting Level-Number for LVL 1:', e);
        }
      }

      // LVL 10: Normal skin (default)
      if (riveRef10.current?.setInputState) {
        try {
          riveRef10.current.setInputState('State Machine 1', 'Level-Number', 0);
        } catch (e) {
          console.log('Error setting Level-Number for LVL 10:', e);
        }
      }

      // LVL 20: Normal skin (default)
      if (riveRef20.current?.setInputState) {
        try {
          riveRef20.current.setInputState('State Machine 1', 'Level-Number', 0);
        } catch (e) {
          console.log('Error setting Level-Number for LVL 20:', e);
        }
      }

      // LVL 33: Wings ON (set Wings ON/OFF to 1)
      if (riveRef33.current?.setInputState) {
        try {
          riveRef33.current.setInputState('State Machine 1', 'Level-Number', 0);
          riveRef33.current.setInputState('State Machine 1', 'Wings ON/OFF', 1);
        } catch (e) {
          console.log('Error setting Wings ON/OFF for LVL 33:', e);
        }
      }
    }, 100); // Wait 1 second for Rive components to be ready

    return () => clearTimeout(timer);
  }, [riveAssets]);

  // Handle continue with analytics
  const handleContinue = () => {
    // Trigger light haptic feedback
    try {
      hapticLight();
    } catch (error) {
      console.log('Haptics not available');
    }

    // Log continue button press
    analytics.logEvent('OnboardingExplainerScreen_Tapped_Continue');

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

  // Lamb card data with glow information
  const lambs = [
    { level: 1, glow: false },
    { level: 10, glow: false },
    { level: 20, glow: true },
    { level: 33, glow: true },
  ];

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View
        className="flex-1 bg-surfaceCream pt-12 w-full items-center"
        style={{ paddingBottom: insets.bottom }}>
        <ScrollView contentContainerStyle={{ paddingBottom: RPH(12) }}>
          {/* Title */}
          <Animated.View style={titleStyle} className="mb-8 px-6">
            <Text className="font-feather text-2xl text-textPrimary text-center mb-0">
              But if you read, pray and reflect, your lamb grows...
            </Text>
          </Animated.View>

          {/* Lamb grid */}
          <View className="flex-row flex-wrap justify-center items-center gap-4 mb-4">
            {/* Row 1 */}
            <Animated.View
              style={[
                cardStyles[0],
                {
                  // No glow for level 1
                  shadowColor: 'transparent',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0,
                  shadowRadius: 0,
                },
              ]}
              className="w-[165px] h-[150px] bg-surfaceCream rounded-2xl border-2 border-accentGold items-center justify-center relative">
              {riveAssets && (
                <View className="w-[120px] h-[120px]">
                  {IS_ANDROID ? (
                    <Rive
                      ref={riveRef1}
                      resourceName={'new_shepherd'}
                      artboardName="[Main] Shpeherd"
                      stateMachineName="State Machine 1"
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <Rive
                      ref={riveRef1}
                      url={riveAssets[0].uri!}
                      artboardName="[Main] Shpeherd"
                      stateMachineName="State Machine 1"
                      style={{ width: '100%', height: '100%' }}
                    />
                  )}
                </View>
              )}
              <View className="absolute top-2.5 right-2.5 bg-lightYellow px-4 py-1 rounded-full">
                <Text className="font-feather text-accentGold">LVL 1</Text>
              </View>
            </Animated.View>
            <Animated.View
              style={[
                cardStyles[1],
                {
                  // No glow for level 10
                  shadowColor: 'transparent',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0,
                  shadowRadius: 0,
                },
              ]}
              className="w-[165px] h-[150px] bg-surfaceCream rounded-2xl border-2 border-accentGold items-center justify-center relative">
              {riveAssets && (
                <View className="w-[140px] h-[140px]">
                  {IS_ANDROID ? (
                    <Rive
                      ref={riveRef10}
                      resourceName={'new_shepherd'}
                      artboardName="[Main] Shpeherd"
                      stateMachineName="State Machine 1"
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <Rive
                      ref={riveRef10}
                      url={riveAssets[0].uri!}
                      artboardName="[Main] Shpeherd"
                      stateMachineName="State Machine 1"
                      style={{ width: '100%', height: '100%' }}
                    />
                  )}
                </View>
              )}
              <View className="absolute top-2.5 right-2.5 bg-lightYellow px-4 py-1 rounded-full">
                <Text className="font-feather text-accentGold">LVL 10</Text>
              </View>
            </Animated.View>
            {/* Row 2 */}
            <Animated.View
              style={[
                cardStyles[2],
                {
                  // Remove card-level shadow since we want glow behind the lamb
                },
              ]}
              className="w-[165px] h-[150px] bg-surfaceCream rounded-2xl border-2 border-accentGold items-center justify-center relative">
              {riveAssets && (
                <>
                  {/* Multiple background elements for blur effect */}

                  {/* BlurView that blurs all the elements above */}
                  <Image
                    source={require('../../assets/redShadow.png')}
                    className="absolute w-[200px] h-[200px]"
                  />

                  <View className="w-[140px] h-[140px]">
                    {IS_ANDROID ? (
                      <Rive
                        ref={riveRef20}
                        resourceName={'new_shepherd'}
                        artboardName="[Main] Shpeherd"
                        stateMachineName="State Machine 1"
                        style={{ width: '100%', height: '100%' }}
                      />
                    ) : (
                      <Rive
                        ref={riveRef20}
                        url={riveAssets[0].uri!}
                        artboardName="[Main] Shpeherd"
                        stateMachineName="State Machine 1"
                        style={{ width: '100%', height: '100%' }}
                      />
                    )}
                  </View>
                </>
              )}
              <View className="absolute top-2.5 right-2.5 bg-lightYellow px-4 py-1 rounded-full">
                <Text className="font-feather text-accentGold">LVL 20</Text>
              </View>
            </Animated.View>
            <Animated.View
              style={[cardStyles[3], {}]}
              className="w-[165px] h-[150px] bg-surfaceCream rounded-2xl border-2 border-accentGold items-center justify-center relative">
              <Image
                source={require('../../assets/yellowShadow.png')}
                className="absolute w-[200px] h-[200px]"
              />

              {riveAssets && (
                <View className="w-[140px] h-[140px]">
                  {IS_ANDROID ? (
                    <Rive
                      ref={riveRef33}
                      resourceName={'new_shepherd'}
                      artboardName="[Main] Shpeherd"
                      stateMachineName="State Machine 1"
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <Rive
                      ref={riveRef33}
                      url={riveAssets[0].uri!}
                      artboardName="[Main] Shpeherd"
                      stateMachineName="State Machine 1"
                      style={{ width: '100%', height: '100%' }}
                    />
                  )}
                </View>
              )}
              <View className="absolute top-2.5 right-2.5 bg-lightYellow px-4 py-1 rounded-full">
                <Text className="font-feather text-accentGold">LVL 33</Text>
              </View>
            </Animated.View>
          </View>

          {/* Skins section */}
          <Animated.View
            style={cardStyles[4]}
            className="w-[340px] self-center h-[140px] bg-surfaceCream rounded-2xl border-2 border-accentGold items-center justify-center relative mb-4">
            <Image source={skins} className="w-full h-[120px]" resizeMode="contain" />
            <View className="absolute top-2.5 right-2.5 bg-lightYellow px-4 py-1 rounded-full">
              <Text className="font-feather text-accentGold">Shop for skins at level 10</Text>
            </View>
          </Animated.View>

        </ScrollView>
        {/* Continue Button - fixed at bottom */}
        <View
          className="absolute left-6 right-6"
          style={{ bottom: Math.max(insets.bottom + 16, 24) }}>
          <PrimaryButton title="Continue" onPress={handleContinue} />
        </View>
      </View>
    </>
  );
}
