import React, { useState } from 'react';
import { View, Text, Image, ImageSourcePropType, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import analytics from '../utils/analytics';
import { useSoundStore } from '../app/stores/soundStore';
import { responsiveHeight, responsiveWidth, responsiveFontSize } from 'react-native-responsive-dimensions';
import { useUserStore } from '~/app/stores/userStore';
import { useHomeStore } from '~/app/stores/homeStore';
import i18n from '~/app/utils/i18n';
import { useRouter } from 'expo-router';
import useSubscriptionStore from '~/app/stores/subscriptionStore';

interface SecondaryButtonProps {
  icon: ImageSourcePropType;
  title: string;
  subtitle: string;
  points: number;
  onPress?: () => void;
  style?: string;
  disabled?: boolean;
  completed?: boolean;
}

const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  icon,
  title,
  subtitle,
  points,
  onPress,
  style,
  disabled = false,
  completed = false,
}) => {
  // Simple state to track pressed state
  const [isPressed, setIsPressed] = useState(false);
  const router = useRouter();
  const isPro = useUserStore((state) => state.proStatus === 'pro');
  const { readingCompleted, reflectionCompleted } = useHomeStore();
  const setFromScreen = useSubscriptionStore((state) => state.setFromScreen);

  // Determine styles based on completed status
  const bgColor = completed ? 'bg-lightGreen' : 'bg-surfaceCream';
  const borderColor = completed ? 'border-darkGreen' : 'border-border';
  const opacityClass = disabled ? 'opacity-50' : completed ? 'opacity-60' : '';

  // Platform-specific shadow styles
  const shadowStyles = !isPressed && !completed && !disabled ? {
    ...Platform.select({
      ios: {
        shadowColor: '#FFE4A8',
        shadowOffset: { width: 0, height: 5.716 },
        shadowOpacity: 1,
        shadowRadius: 0,
      },
      android: {
        elevation: 6,
      },
    }),
  } : {};

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    if (disabled) {
      useSoundStore.getState()?.playDisabledSound();
    } else {
      useSoundStore.getState()?.playButtonSound();
    }
    setIsPressed(true);
  };

  const handlePress = () => {
    if (disabled) return;
    analytics.logEvent(`${title}_Tapped`);

    if (title === i18n.t('quiet_time')) {
      if (!isPro) {
        setFromScreen('home-reflection');
        router.push('/onboarding/pricing/OldPricingScreen');
        return;
      }
    }

    if (onPress) onPress();
  };

  return (
    <View style={{ width: '100%' }}>
      <Pressable
        className={`
          flex-row items-center w-full rounded-3xl border border-[#eed39d] bg-surfaceCreamLight ${opacityClass}
         
        `}
        style={{ paddingVertical: responsiveHeight(2.5), paddingHorizontal: responsiveWidth(5), minHeight: responsiveHeight(11), elevation: 2 }}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={() => setIsPressed(false)}
        disabled={disabled}
      >
        <Image source={icon} style={{ width: responsiveWidth(13), height: responsiveWidth(13), marginRight: responsiveWidth(4), marginLeft: 0 }} resizeMode="contain" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            className="font-feather text-textPrimary"
            style={{ fontSize: responsiveFontSize(2.3), fontWeight: '700' }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
          <Text
            className="font-din text-textPrimary/55"
            style={{ fontSize: responsiveFontSize(1.8), flexWrap: 'wrap', flexShrink: 1 }}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {subtitle}
          </Text>
        </View>
      </Pressable>
    </View>
  );
};

export default SecondaryButton;
