import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Text, View, Pressable, Platform, ActivityIndicator } from 'react-native';
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
  buttonType?: 'default' | 'blue' | 'gold';
  buttonHeight?: number;
  loading?: boolean;
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
    <View className={`mt-4 w-full ${style || ''}`} style={{ height: buttonContainerHeight }}>
      <Pressable
        className={
          `flex-row items-center justify-center px-5 h-full w-full rounded-[20px] border-[3px] ` +
          `${disabled || !isActive ? 'bg-[#E5E5E5] border-[#D0D0D0]' : `${bgColor} ${borderColor}`} ` +
          `transform ${isPressed ? 'translate-y-[3px]' : 'translate-y-0'}`
        }
        style={shadowStyles}
        onPress={handlePress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}>
        {loading ? (
          <ActivityIndicator size="small" color="#FCD34D" />
        ) : (
          <Text
            className={`font-feather ${disabled || !isActive ? 'text-gray-400' : txtColor} text-heading text-center w-full`}>
            {title}
          </Text>
        )}
      </Pressable>
    </View>
  );
};

export default PrimaryButton;
