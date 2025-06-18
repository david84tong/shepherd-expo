import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Text, View, Pressable, Platform, ActivityIndicator, Image, DimensionValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import analytics from '../utils/analytics';
import { useSoundStore } from '../app/stores/soundStore';
import { Feather } from '@expo/vector-icons';

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
  featherIcon?: keyof typeof Feather.glyphMap;
  iconText?: string;
  reward?: string | number;
  opacity?: number;
  width?: DimensionValue;
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
  featherIcon,
  iconText,
  reward,
  opacity = 1,
  width,
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
    bgColor = 'bg-[#00B0F7]';
    borderColor = 'border-[#119AD1]';
    shadowColor = '#119AD1';
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

  // Play sound instantly on press in
  const handlePressIn = () => {
    if (disabled) {
      useSoundStore.getState()?.playDisabledSound();
    } else {
      useSoundStore.getState()?.playButtonSound();
    }
    triggerHaptic();
    setIsPressed(true);
  };

  // Handle press for analytics and onPress
  const handlePress = () => {
    if (disabled) return;
    analytics.logEvent(`${title}_Tapped`);
    onPress();
  };

  // Platform-specific shadow styles
  const shadowStyles =
    !isPressed && isActive 
      ? {
        ...Platform.select({
          ios: {
            shadowColor: shadowColor,
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: disabled ? 0.3 : 1,
            shadowRadius: 0,
          },
          android: {
            elevation: 5,
          },
        }),
      }
      : {};

  return (
    <View className={`${style || ''}`} style={{ 
      height: buttonHeight || buttonContainerHeight, 
      opacity,
      width: width || '100%',
      marginTop: style?.includes('mt-') ? 0 : 16,
      marginHorizontal: buttonType === 'blue' ? 0 : 0
    }}>
      <Pressable
        className={
          `flex-row items-center justify-center px-5 rounded-full border-[3px] ` +
          `${disabled || !isActive
            ? (buttonType === 'blue'
              ? 'bg-[#B6E6F7] border-[#B6E6F7]'
              : buttonType === 'gold'
                ? 'bg-[#F5E3C3] border-[#F5E3C3]'
                : buttonType === 'orange'
                  ? 'bg-[#FFB366] border-[#FFB366]'
                  : 'bg-[#E5E5E5] border-[#D0D0D0]')
            : `${bgColor} ${borderColor}`
          }`
        }
        style={[
          shadowStyles,
          {
            height: buttonHeight || 64,
            width: '100%',
            transform: [{ translateY: isPressed ? 3 : 0 }],
            borderRadius: 25,
            paddingVertical: buttonHeight && buttonHeight <= 40 ? 4 : 16,
            paddingHorizontal: buttonHeight && buttonHeight <= 40 ? 16 : 24,
          }
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={() => setIsPressed(false)}>
        {loading ? (
          <ActivityIndicator size="small" color="#FCD34D" />
        ) : (
          <>
            {featherIcon && (
              <Feather 
                name={featherIcon} 
                size={buttonHeight && buttonHeight <= 40 ? 16 : 20} 
                color={disabled || !isActive ? "#E0F6FF" : "white"} 
                style={{ marginRight: buttonHeight && buttonHeight <= 40 ? 6 : 8 }}
              />
            )}
            <Text
              className={`font-feather ${buttonHeight && buttonHeight <= 40 ? 'text-smallCaption' : 'text-h4'} text-center ${disabled || !isActive
                ? (buttonType === 'blue'
                  ? 'text-[#E0F6FF]'
                  : buttonType === 'gold'
                    ? 'text-[#C2A97A]'
                    : buttonType === 'orange'
                      ? 'text-[#FFB366]'
                      : 'text-gray-400')
                : txtColor
                }`}
              style={{ 
                flexShrink: 1,
         
              }}
            >
              {title}
            </Text>
            {icon && (
              <Image source={icon} className={`${buttonHeight && buttonHeight <= 40 ? 'w-4 h-4' : 'w-6 h-6'} -mt-[2px] ml-2 ${disabled || !isActive ? 'opacity-50' : ''}`} resizeMode="contain" />
            )}
            {iconText && (
              <Text style={{
                color: disabled || !isActive ? "#E0F6FF" : "white",
                fontSize: 20,
                fontWeight: '600',
                marginLeft: 4,
                marginTop: 2,
              }}>
                {iconText}
              </Text>
            )}
            {reward && (
              <Text className={`font-feather ${buttonHeight && buttonHeight <= 40 ? 'text-smallCaption' : 'text-h4'} ml-1 ${disabled || !isActive
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
