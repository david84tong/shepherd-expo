import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, Pressable, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';

import PrimaryButton from '../../components/PrimaryButton';
import { PATH_OPTIONS } from '../models/Path';
import { useOnboardingStore } from '../stores/onboardingStore';
import { usePathStore } from '../stores/pathStore';
import { useUserStore } from '../stores/userStore';
import analytics from '../../utils/analytics';
import i18n from '../utils/i18n';
import { hapticLight } from '~/utils/haptics';

interface OnboardingPathScreenProps {
  onPathSelected?: (pathObj: any) => void;
  selectedPathId?: string;
  hideContinueButton?: boolean;
}

export default function OnboardingPathScreen({ onPathSelected, selectedPathId: externalSelectedPathId, hideContinueButton }: OnboardingPathScreenProps) {
  const router = useRouter();
  const { setResponse, setPathSelection } = useOnboardingStore();
  const { setUser } = useUserStore();
  const { setSelectedPath } = usePathStore();
  const [selectedPathId, setSelectedPathId] = useState(externalSelectedPathId || 'knowing-jesus');
  const [pressedId, setPressedId] = useState<string | undefined>(undefined);

  // Create Reanimated shared values for each component
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(40);
  const optionsOpacity = useSharedValue(0);
  const optionsTranslateY = useSharedValue(40);

  const insets = useSafeAreaInsets();

  // Calculate image height dynamically based on insets
  const imageHeight = insets.top > 20 ? 140 : 112; // Use numeric values instead of tailwind classes

  useEffect(() => {
    // Log screen view when component mounts
    analytics.logEvent("OnboardingPathScreen_Viewed");

    // Reset animation values
    titleOpacity.value = 0;
    titleTranslateY.value = 40;
    optionsOpacity.value = 0;
    optionsTranslateY.value = 40;

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
    animateComponent(titleOpacity, titleTranslateY, 0);
    animateComponent(optionsOpacity, optionsTranslateY, 200);
  }, []);

  // Create animated styles for each component
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const optionsStyle = useAnimatedStyle(() => ({
    opacity: optionsOpacity.value,
    transform: [{ translateY: optionsTranslateY.value }],
  }));

  const handleSelection = async (pathId: string) => {
    // Trigger light haptic feedback
    try {
      await hapticLight();
    } catch (error) {
      console.log('Haptics not available');
    }

    analytics.logEvent("OnboardingPathScreen_Tapped_Option", {
      value: pathId,
    });

    setSelectedPathId(pathId);

    // Find the selected path object
    const selectedPathObj = PATH_OPTIONS.find((p) => p.id === pathId);

    if (selectedPathObj) {
      // Save to onboarding store using enhanced method
      await setPathSelection({
        id: selectedPathObj.id,
        title: selectedPathObj.title,
        subtitle: selectedPathObj.subtitle,
        order: selectedPathObj.order
      });

      // For backward compatibility
      await setResponse('selectedPath', pathId);

      // Save to path store
      setSelectedPath(selectedPathObj);
      // If provided, call the callback for parent
      if (onPathSelected) {
        onPathSelected(selectedPathObj);
      }
    }
  };

  const handleContinue = useCallback(() => {
    if (selectedPathId) {
      // Track continue button press in analytics
      analytics.logEvent("OnboardingPathScreen_Tapped_Continue", {
        value: selectedPathId,
      });
      setUser({ selectedPathId: selectedPathId });
      console.log(selectedPathId, "selectedPathId")
      router.push('/onboarding/explainerHearts' as any);
    }
  }, [selectedPathId, setUser, router]);

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View className="flex-1 bg-surfaceCream px-6 pt-24">
        {/* Title Section */}
        <Animated.View style={titleStyle}>
          <Text className="font-feather text-h1 text-center text-textPrimary mb-2">
            {i18n.t('onboarding_path_question')}
          </Text>
          <Text className="font-din text-body text-center text-description mb-8">
            {i18n.t('onboarding_path_subtitle')}
          </Text>
        </Animated.View>

        {/* Path Options Grid */}
        <Animated.View style={optionsStyle} className="flex-1">
          <View className="flex-row flex-wrap justify-between gap-y-4 w-[100%] pb-24 overflow-hidden shadow-buttonShadow">
            {PATH_OPTIONS.map((path) => (
              <View
                key={path.id}
                className={`bg-surfaceCream w-[46%] rounded-xl border-border border-4 overflow-hidden ${selectedPathId === path.id ? 'border-4 border-accentGold' : 'opacity-70'
                  }`}>
                <Pressable
                  onPress={() => handleSelection(path.id)}
                  onPressIn={() => {
                    setPressedId(path.id);
                    hapticLight();
                  }}
                  onPressOut={() => setPressedId(undefined)}
                  className={`transform ${pressedId === path.id ? 'translate-y-[3px]' : 'translate-y-0'}`}
                  style={({ pressed }) => [
                    { elevation: pressed ? 0 : 6 },
                  ]}>
                  {/* Path Image */}
                  <Image
                    source={path.image}
                    style={{ width: '100%', height: imageHeight }}
                    className="shadow-md"
                    resizeMode="cover"
                  />

                  {/* Path Text Content */}
                  <View className="p-3">
                    <Text className="font-feather text-h3 text-textPrimary mb-1 text-center">
                      {path.title}
                    </Text>
                    <Text className="font-din text-md text-description text-center">
                      {path.subtitle}
                    </Text>
                  </View>
                </Pressable>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Continue Button */}
        {!hideContinueButton && (
          <PrimaryButton
            title={i18n.t('continue_button')}
            onPress={handleContinue}
            disabled={!selectedPathId}
            style="mt-6 mb-12"
          />
        )}
      </View>
    </>
  );
}

