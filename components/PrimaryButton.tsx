import React, { useState } from 'react';
import { TouchableOpacity, Text, View, Pressable } from 'react-native';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: string;
  isActive?: boolean;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  disabled = false,
  style,
  isActive = true,
}) => {
  // Simple state to track pressed state
  const [isPressed, setIsPressed] = useState(false);

  return (
    <View className={`mt-4 h-[70px] w-full ${style || ''}`}>
      <Pressable
        className={
          `flex-row items-center justify-center px-5 h-full w-full rounded-[20px] border-[3px] ` +
          `${disabled || !isActive ? 'bg-[#E5E5E5] border-[#D0D0D0]' : 'bg-accentGold border-buttonBorder'} ` +
          `transform ${(!isPressed && isActive) ? 'shadow-buttonShadow' : ''} ${isPressed ? 'translate-y-[3px]' : 'translate-y-0'}`
        }
        style={({ pressed }) => [{ elevation: pressed ? 3 : isActive ? 6 : 0 }]}
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
      >
        <Text className={`font-feather ${disabled || !isActive ? 'text-gray-400' : 'text-white'} text-heading text-center w-full`}>
          {title}
        </Text>
      </Pressable>
    </View>
  );
};

export default PrimaryButton;