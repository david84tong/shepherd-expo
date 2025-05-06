import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Text, View, Pressable } from 'react-native';

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
}) => {
  // Simple state to track pressed state
  const [isPressed, setIsPressed] = useState(false);

  // Set colors based on button type
  let bgColor = 'bg-accentGold';
  let borderColor = 'border-buttonBorder';
  let buttonShadow = shadowStyle || 'shadow-buttonShadow';

  if (buttonType === 'blue') {
    bgColor = 'bg-[#4FB8FE]';
    borderColor = 'border-[#06B6FE]';
    buttonShadow = 'shadow-blueButtonShadow';
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

  // Handle press with haptic feedback
  const handlePress = () => {
    triggerHaptic();
    onPress();
  };

  return (
    <View className={`mt-4 h-[70px] w-full ${style || ''}`}>
      <Pressable
        className={
          `flex-row items-center justify-center px-5 h-full w-full rounded-[20px] border-[3px] ` +
          `${disabled || !isActive ? 'bg-[#E5E5E5] border-[#D0D0D0]' : `${bgColor} ${borderColor}`} ` +
          `transform ${!isPressed && isActive && !disabled ? buttonShadow : ''} ${isPressed ? 'translate-y-[3px]' : 'translate-y-0'}`
        }
        style={({ pressed }) => [{ elevation: pressed ? 3 : isActive && !disabled ? 6 : 0 }]}
        onPress={handlePress}
        disabled={disabled}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}>
        <Text
          className={`font-feather ${disabled || !isActive ? 'text-gray-400' : txtColor} text-heading text-center w-full`}>
          {title}
        </Text>
      </Pressable>
    </View>
  );
};

export default PrimaryButton;
