import React, { useState } from 'react';
import { View, Text, Image, ImageSourcePropType, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import analytics from '../utils/analytics';
import { useSoundStore } from '../app/stores/soundStore';

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

  // Determine styles based on completed status
  const bgColor = completed ? 'bg-lightGreen' : 'bg-surfaceCream';
  const borderColor = completed ? 'border-darkGreen' : 'border-border';
  const opacityClass = disabled ? 'opacity-50' : completed ? 'opacity-70' : '';

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
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });

    if (disabled) {
      useSoundStore.getState()?.playDisabledSound()
      return
    }
    useSoundStore.getState()?.playButtonSound()

    analytics.logEvent(`${title}_Tapped`);
    if (onPress) onPress();
  };

  return (
    <View className={`mt-6 h-[80px] w-full ${style || ''}`}>
      <Pressable
        className={`
          flex-row items-center h-full w-full rounded-card border-[3px] ${borderColor} px-4
          ${bgColor} transform ${opacityClass}
          ${isPressed ? 'translate-y-[3px]' : 'translate-y-0'}
        `}
        style={shadowStyles}
        onPress={handlePress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
      >
        <Image source={icon} className="w-[48px] h-[48px] mr-2 -ml-2" resizeMode="contain" />
        <View className="flex-1">
          <Text className="font-feather text-textPrimary text-heading">{title}</Text>
          <Text className="font-din text-textPrimary/70 text-body">{subtitle}</Text>
        </View>
        <View className="rounded-full px-2 py-0.5 flex-row items-center">
          {completed ? (
            <View className="w-6 h-6 rounded-full bg-darkGreen items-center justify-center">
              <Text className="font-feather text-white text-caption">✓</Text>
            </View>
          ) : (
            <>
              <Image
                source={require('../assets/icons/starIcon.png')}
                className="w-5 h-5"
                resizeMode="contain"
              />
              <Text className="font-feather text-textPrimary/70 text-caption">+{points}</Text>
            </>
          )}
        </View>
      </Pressable>
    </View>
  );
};

export default SecondaryButton;
