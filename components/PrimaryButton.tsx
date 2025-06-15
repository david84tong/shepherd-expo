import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Text, View, Pressable, Platform, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import analytics from '../utils/analytics';
import { useSoundStore } from '../app/stores/soundStore';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: string;
  isActive?: boolean;
  primaryColor?: string;
  textColor?: string;
  shadowStyle?: string;
  buttonType?: 'default' | 'blue' | 'gold' | 'orange';
  buttonHeight?: number;
  loading?: boolean;
  icon?: any; // image source
  reward?: string | number;
  opacity?: number;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  disabled = false,
  style,
  isActive = true,
  primaryColor,
  textColor = 'white',
  shadowStyle,
  buttonType = 'default',
  buttonHeight,
  loading = false,
  icon,
  reward,
  opacity = 1,
}) => {
  // Simple state to track pressed state
  const [isPressed, setIsPressed] = useState(false);
  const insets = useSafeAreaInsets();

  // Calculate height dynamically
  const buttonContainerHeight = buttonHeight ? buttonHeight : insets.top > 20 ? 70 : 56;

  // Set colors based on button type
  let bgColor = 'bg-accentGold';
  let borderColor = 'border-buttonBorder';
  let shadowColor = '#FFE4A8';

  if (buttonType === 'blue') {
    bgColor = 'bg-[#4FB8FE]';
    borderColor = 'border-[#06B6FE]';
    shadowColor = '#98E1FE';
  } else if (buttonType === 'orange') {
    bgColor = 'bg-[#FF8803]';
    borderColor = 'border-[#FF8803]';
    shadowColor = '#B96D15';
  }

  // Override with primaryColor if provided
  if (primaryColor) {
    bgColor = primaryColor;
  }

  const txtColor =
    disabled || !isActive
      ? 'text-gray-400'
      : textColor.startsWith('text-')
        ? textColor
        : `text-${textColor}`;

  // Function to trigger haptic feedback
  const triggerHaptic = () => {
    if (!disabled && isActive) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
          // Silently fail if haptics don't work
          console.log('Haptics not available');
        });
      } catch (error) {
        // Safely ignore haptic errors
        console.log('Haptics not available');
      }
    }
  };

  // Handle press with haptic feedback and sound
  const handlePress = () => {
    triggerHaptic();
    if (disabled) {
      useSoundStore.getState()?.playDisabledSound();
    } else {
      useSoundStore.getState()?.playButtonSound();
    }
    if (disabled) return;
    analytics.logEvent(`${title}_Tapped`);
    onPress();
  };

  // Platform-specific shadow styles
  const shadowStyles =
    !isPressed && isActive && !disabled
      ? {
        ...Platform.select({
          ios: {
            shadowColor: shadowColor,
            shadowOffset: { width: 0, height: 5.716 },
            shadowOpacity: 1,
            shadowRadius: 0,
          },
          android: {
            elevation: 6,
          },
        }),
      }
      : {};

  return (
    <View className={`mt-4 w-full ${style || ''}`} style={{ height: buttonContainerHeight, opacity }}>
      <Pressable
        className={
          `flex-row items-center justify-center px-5 h-16 w-full rounded-full border-[3px] ` +
          `${disabled || !isActive
            ? (buttonType === 'blue'
              ? 'bg-[#B6E6F7] border-[#B6E6F7]'
              : buttonType === 'gold'
                ? 'bg-[#F5E3C3] border-[#F5E3C3]'
                : buttonType === 'orange'
                  ? 'bg-[#FFB366] border-[#FFB366]'
                  : 'bg-[#E5E5E5] border-[#D0D0D0]')
            : `${bgColor} ${borderColor}`
          } ` +
          `transform ${isPressed ? 'translate-y-[3px]' : 'translate-y-0'}`
        }
        style={shadowStyles}
        onPress={handlePress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}>
        {loading ? (
          <ActivityIndicator size="small" color="#FCD34D" />
        ) : (
          <>
            <Text
              className={`font-feather-bold text-heading text-center ${disabled || !isActive
                ? (buttonType === 'blue'
                  ? 'text-[#E0F6FF]'
                  : buttonType === 'gold'
                    ? 'text-[#C2A97A]'
                    : buttonType === 'orange'
                      ? 'text-[#FFB366]'
                      : 'text-gray-400')
                : txtColor
                }`}
              style={{ flexShrink: 1 }}
            >
              {title}
            </Text>
            {icon && (
              <Image source={icon} className={`w-6 h-6 ml-2 ${disabled || !isActive ? 'opacity-50' : ''}`} resizeMode="contain" />
            )}
            {reward && (
              <Text className={`font-feather-bold text-heading ml-1 ${disabled || !isActive
                ? (buttonType === 'blue'
                  ? 'text-[#E0F6FF]'
                  : buttonType === 'gold'
                    ? 'text-[#C2A97A]'
                    : buttonType === 'orange'
                      ? 'text-[#FFB366]'
                      : 'text-gray-400')
                : txtColor
                }`}>{reward}</Text>
            )}
          </>
        )}
      </Pressable>
    </View>
  );
};

export default PrimaryButton;
