import React, { useLayoutEffect, useEffect, useRef } from 'react';
import { View, Text, StatusBar, ScrollView } from 'react-native';
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
import { useOnboardingStore } from '../stores/onboardingStore';
import { IS_ANDROID } from '../utils/utils';
import { RPH } from '../helper/helper';
import { hapticLight } from '~/utils/haptics';

export default function OnboardingExplainerHeartsScreen({
  onContinue,
}: {
  onContinue?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Get lamb name from onboarding store
  const { responses } = useOnboardingStore();
  const lambName = responses.lambName || 'your lamb';

  // Load Rive assets
  const [riveAssets] = useAssets([require('../../assets/riveAnimations/new_shepherd.riv')]);

  // Create refs for each Rive instance
  const riveRefs = useRef<(RiveRef | null)[]>(Array(6).fill(null));

  // Animation shared values
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const cardOpacities = [
    useSharedValue(0),
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
    useSharedValue(40),
  ];

  // Log screen view when component mounts
  useEffect(() => {
    analytics.logEvent('OnboardingExplainerHeartsScreen_Viewed');
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

  // Configure Rive input states before animations start
  useEffect(() => {
    const timer = setTimeout(() => {
      lambStates.forEach((state, index) => {
        const ref = riveRefs.current[index];
        if (ref?.setInputState) {
          try {
            // Set Level-Number to 1 and Action-Number to appropriate state
            ref.setInputState('State Machine 1', 'Level-Number', 1);
            ref.setInputState('State Machine 1', 'Action-Number', state.actionNumber);
            console.log(`Set Level-Number to 1 and Action-Number to ${state.actionNumber} for ${state.hearts} hearts`);
          } catch (e) {
            console.log(`Error setting inputs for lamb ${index}:`, e);
          }
        }
      });
    }, 200); // Earlier timing to set before card animations

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
    analytics.logEvent('OnboardingExplainerHeartsScreen_Tapped_Continue');

    // Call the provided onContinue function if it exists
    if (onContinue) {
      onContinue();
    }

    // Navigate to notification permission screen
    router.push('/onboarding/explainer');
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
  const cardStyle5 = useAnimatedStyle(() => ({
    opacity: cardOpacities[5].value,
    transform: [{ translateY: cardTranslateYs[5].value }],
  }));

  const cardStyles = [cardStyle0, cardStyle1, cardStyle2, cardStyle3, cardStyle4, cardStyle5];

  // Lamb states based on heart levels - now using Action-Number for new_shepherd.riv
  const lambStates = [
    { hearts: 100, actionNumber: 3, glow: true }, // lamb-full
    { hearts: 60, actionNumber: 0, glow: false }, // lamb-idle
    { hearts: 45, actionNumber: 5, glow: false }, // lamb-angry
    { hearts: 35, actionNumber: 4, glow: false }, // lamb-sleepy
    { hearts: 10, actionNumber: 7, glow: false }, // lamb-skinny dying
    { hearts: 0, actionNumber: 8, glow: false }, // lamb-chubby dying (closest to dead)
  ];
  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View
        className="flex-1 bg-surfaceCream w-full items-center"
        style={{ paddingBottom: insets.bottom }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets?.bottom + RPH(12) }}>
          {/* Title */}
          <Animated.View style={titleStyle} className="mb-8 px-6">
            <Text style={{ paddingTop: insets?.top }} className="font-feather text-2xl text-textPrimary text-center mb-0">
              Everyday you don&apos;t read, {lambName}&apos;s health will suffer...
            </Text>
          </Animated.View>

          {/* Lamb grid */}
          <View className="flex-row flex-wrap justify-center items-center gap-4 mb-4">
            {lambStates.map((state, index) => (
              <Animated.View
                key={index}
                style={[
                  cardStyles[index],
                  {
                    // Add conditional glow effect
                    shadowColor: state.glow ? '#FDE047' : 'transparent',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: state.glow ? 0.6 : 0,
                    shadowRadius: 15,
                  },
                ]}
                className="w-[165px] h-[150px] bg-surfaceCream rounded-2xl border-2 border-lightRed items-center justify-center relative">
                {riveAssets && (
                  <View className="w-40 h-40">
                    {IS_ANDROID ? (
                      <Rive
                        ref={(ref) => (riveRefs.current[index] = ref)}
                        resourceName={'new_shepherd'}
                        artboardName="[Main] Shpeherd"
                        stateMachineName="State Machine 1"
                        autoplay
                        style={{ width: '100%', height: '100%' }}
                      />
                    ) : (
                      <Rive
                        ref={(ref) => (riveRefs.current[index] = ref)}
                        url={riveAssets[0].uri!}
                        artboardName="[Main] Shpeherd"
                        stateMachineName="State Machine 1"
                        autoplay
                        style={{ width: '100%', height: '100%' }}
                      />
                    )}
                  </View>
                )}
                <View className="absolute top-2.5 right-2.5 bg-lightRed px-4 py-1 rounded-full">
                  <Text className="font-feather text-darkRed">{state.hearts} ❤️</Text>
                </View>
              </Animated.View>
            ))}
          </View>

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
