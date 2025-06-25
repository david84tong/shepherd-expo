import React, { useLayoutEffect, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Dimensions, Image } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAssets } from 'expo-asset';
import Rive from 'rive-react-native';
import { Ionicons } from '@expo/vector-icons';
import analytics from '../utils/analytics';
import skins from '../assets/onboarding/skins.png';
import { IS_ANDROID, IS_IOS } from '../app/utils/utils';
import { hapticLight } from '~/utils/haptics';

interface ExplainerModalProps {
  visible: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ExplainerModal({ visible, onClose }: ExplainerModalProps) {
  const insets = useSafeAreaInsets();

  // Load Rive assets
  const [riveAssets] = useAssets([
    require('../assets/riveAnimations/homeLamb.riv'),
    require('../assets/riveAnimations/lamb-wings-idle.riv'),
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

  // Log screen view when modal becomes visible
  useEffect(() => {
    if (visible) {
      analytics.logEvent('ExplainerModal_Viewed');
    }
  }, [visible]);

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
        cardTranslateYs[i].value = withDelay(
          300 + i * 120,
          withSpring(0, { damping: 18, stiffness: 90 })
        );
      });
    }
  }, [visible]);

  // Handle close with haptic feedback and analytics
  const handleClose = () => {
    hapticLight();
    analytics.logEvent('ExplainerModal_Tapped_Close');
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

  const cardStyles = [cardStyle0, cardStyle1, cardStyle2, cardStyle3, cardStyle4];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}>
      <View className="flex-1 bg-surfaceCream" style={{ paddingTop: 0 }}>
        {/* Header with X button */}
        <View className="flex-row justify-between items-center px-6 pt-12">
          <TouchableOpacity
            onPress={handleClose}
            className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center"
            activeOpacity={0.7}>
            <Ionicons name="close" size={20} color="#3C584A" />
          </TouchableOpacity>
          <Text className="font-feather text-xl text-textPrimary">Lamb Growth</Text>
          <View className="w-8" />
        </View>

        {/* Content */}
        <View className="flex-1 px-6 items-center">
          {/* Title */}
          <Animated.View style={titleStyle} className="mb-8 px-6">
            <Text className="font-feather text-2xl text-textPrimary text-center mb-0 mt-8">
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
                <View className="w-20 h-20">
                  <Rive
                    {...(IS_ANDROID ? { resourceName: 'home_lamb' } : { url: riveAssets[0].uri! })}
                    artboardName="lamb-idle"
                    style={{ width: '100%', height: '100%' }}
                  />
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
                <View className="w-[110px] h-[110px]">
                  <Rive
                    {...(IS_ANDROID ? { resourceName: 'home_lamb' } : { url: riveAssets[0].uri! })}
                    artboardName="lamb-idle"
                    style={{ width: '100%', height: '100%' }}
                  />
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
                  {/* Red shadow for level 20 */}
                  <Image
                    source={require('../assets/redShadow.png')}
                    className="absolute w-[200px] h-[200px]"
                  />

                  <View className="w-[120px] h-[120px]">
                    <Rive
                      {...(IS_ANDROID
                        ? { resourceName: 'home_lamb' }
                        : { url: riveAssets[0].uri! })}
                      artboardName="lamb-idle"
                      style={{ width: '100%', height: '100%' }}
                    />
                  </View>
                </>
              )}
              <View className="absolute top-2.5 right-2.5 bg-lightYellow px-4 py-1 rounded-full z-12">
                <Text className="font-feather text-accentGold">LVL 20</Text>
              </View>
            </Animated.View>
            <Animated.View
              style={[
                cardStyles[3],
                {
                  // Yellow glow for level 33
                },
              ]}
              className="w-[165px] h-[150px] bg-surfaceCream rounded-2xl border-2 border-accentGold items-center justify-center relative">
              <Image
                source={require('../assets/yellowShadow.png')}
                className="absolute w-[200px] h-[200px]"
              />

              {riveAssets && (
                <View className="w-[140px] h-[140px]">
                  <Rive
                    {...(IS_IOS
                      ? { url: riveAssets[1].uri! }
                      : { resourceName: 'lamb_wings_idle' })}
                    style={{ width: '100%', height: '100%' }}
                  />
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
            className="w-[340px] h-[140px] bg-surfaceCream rounded-2xl border-2 border-accentGold items-center justify-center relative mb-4">
            <Image source={skins} className="w-full h-[120px]" resizeMode="contain" />
            <View className="absolute top-2.5 right-2.5 bg-lightYellow px-4 py-1 rounded-full">
              <Text className="font-feather text-accentGold">Shop for skins at level 10</Text>
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}
