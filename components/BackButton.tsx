import React, { useState } from 'react';
import { TouchableOpacity, View, StyleSheet, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface BackButtonProps {
  onPress: () => void;
  disabled?: boolean;
  containerClassName?: string;
}

const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  disabled = false,
  containerClassName = '',
}) => {
  // Track pressed state
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = () => {
    // Trigger light haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <View className={`${Platform.OS === 'ios' ? 'pt-[60px]' : 'pt-[40px]'} px-5 w-full absolute top-0 left-0 z-20 ${containerClassName}`}>
      <Pressable 
        onPress={handlePress} 
        disabled={disabled}
        className={`
          w-[42px] h-[42px] rounded-full bg-[rgba(255,244,217,0.95)] 
          items-center justify-center border-2 border-border
          ${!isPressed ? 'shadow-backButton' : ''}
          transform ${isPressed ? 'translate-y-[3px]' : 'translate-y-0'}
        `}
        style={({ pressed }) => [{ elevation: pressed ? 2 : 5 }]}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
      >
        <Ionicons 
          name="chevron-back" 
          size={22} 
          color="#2D3720" 
          style={{ opacity: disabled ? 0.5 : 1 }}
        />
      </Pressable>
    </View>
  );
};

export default BackButton;
