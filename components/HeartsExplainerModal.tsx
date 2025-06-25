import React, { useLayoutEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAssets } from 'expo-asset';
import Rive from 'rive-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../app/stores/userStore';
import { IS_ANDROID } from '../app/utils/utils';
import { hapticLight } from '~/utils/haptics';

interface HeartsExplainerModalProps {
  visible: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HeartsExplainerModal({ visible, onClose }: HeartsExplainerModalProps) {
  const insets = useSafeAreaInsets();

  // Get lamb name from user store
  const lambName = useUserStore((state) => state?.getLambName?.()) || 'your lamb';

  // Load Rive assets
  const [riveAssets] = useAssets([
    require('../assets/riveAnimations/homeLamb.riv'),
  ]);

  // Animation shared values
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const cardOpacities = [useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  const cardTranslateYs = [useSharedValue(40), useSharedValue(40), useSharedValue(40), useSharedValue(40), useSharedValue(40), useSharedValue(40)];

  // Animate in when modal becomes visible
  useLayoutEffect(() => {
    if (visible) {
      // Reset values
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
    }
  }, [visible]);

  // Handle close with haptic feedback
  const handleClose = () => {
    hapticLight();
    onClose();
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

  // Lamb states based on heart levels
  const lambStates = [
    { hearts: 100, artboard: 'lamb-full', glow: true },
    { hearts: 60, artboard: 'lamb-idle', glow: false },
    { hearts: 45, artboard: 'lamb-angry', glow: false },
    { hearts: 35, artboard: 'lamb-sleepy', glow: false },
    { hearts: 10, artboard: 'lamb-skinny dying', glow: false },
    { hearts: 0, artboard: 'lamb-dead', glow: false },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-surfaceCream" style={{ paddingTop: 0 }}>
        {/* Header with X button */}
        <View className="flex-row justify-between items-center px-6 pt-12">
          <TouchableOpacity
            onPress={handleClose}
            className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center"
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color="#3C584A" />
          </TouchableOpacity>
          <Text className="font-feather text-xl text-textPrimary"></Text>
          <View className="w-8" />

        </View>

        {/* Content */}
        <View className="flex-1 px-6 items-center">
          {/* Title */}
          <Animated.View style={titleStyle} className="mb-8 px-6">
            <Text className="font-feather text-2xl text-textPrimary text-center mb-0 mt-8">
              Everyday you don&apos;t read, {lambName}&apos;s health will suffer...
            </Text>
            <Text className="font-din text-2xl text-description text-center mb-0 mt-2">
              Gain hearts by reading, praying, and reflecting.
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
                  }
                ]}
                className="w-[165px] h-[150px] bg-surfaceCream rounded-2xl border-2 border-lightRed items-center justify-center relative"
              >
                {riveAssets && (
                  <View className="w-36 h-36">
                    <Rive
                      {...(IS_ANDROID
                        ? { resourceName: 'home_lamb' }
                        : { url: riveAssets[0].uri! }
                      )}
                      artboardName={state.artboard}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </View>
                )}
                <View className="absolute top-2.5 right-2.5 bg-lightRed px-4 py-1 rounded-full">
                  <Text className="font-feather text-darkRed">{state.hearts} ❤️</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
} 