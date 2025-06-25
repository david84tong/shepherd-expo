import React, { useState } from 'react';
import { Text, View, Pressable, Platform, DimensionValue } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { hapticMedium } from '~/utils/haptics';

interface BluePrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  iconText?: string;
  hapticsEnabled?: boolean;
  style?: string;
  width?: DimensionValue;
}

const BluePrimaryButton: React.FC<BluePrimaryButtonProps> = ({
  title,
  onPress,
  disabled = false,
  icon,
  iconText,
  hapticsEnabled = true,
  style,
  width,
}) => {
  const [isPressed, setIsPressed] = useState(false);

  // Handle press with haptic feedback
  const handlePress = () => {
    if (disabled) return;

    if (hapticsEnabled) {
      try {
        hapticMedium();
      } catch (error) {
        console.log('Haptics not available');
      }
    }

    onPress();
  };

  // Platform-specific shadow styles
  const shadowStyles = !isPressed && !disabled
    ? {
      ...Platform.select({
        ios: {
          shadowColor: '#119AD1', // darkBlue shadow
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 1,
          shadowRadius: 0,
        },
        android: {
          elevation: 5,
        },
      }),
    }
    : {};

  return (
    <View className={style || ''} style={{ width: width || '100%', marginHorizontal: 12 }}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        style={[
          {
            backgroundColor: '#00B0F7', // blue from tailwind config
            borderWidth: 3,
            borderColor: '#119AD1', // darkBlue border from tailwind config
            paddingVertical: 16,
            paddingHorizontal: 24,
            borderRadius: 25,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ translateY: isPressed ? 3 : 0 }],
            opacity: disabled ? 0.5 : 1,
            // Only force full width when no custom width provided
            ...(width ? {} : { width: '100%' }),
            margin: 0,
          },
          shadowStyles,
        ]}
        disabled={disabled}
      >
        {/* Icon (if provided) */}
        {icon && (
          <Feather
            name={icon}
            size={20}
            color="white"
            style={{ marginRight: 8 }}
          />
        )}

        {/* Main title text */}
        <Text style={{
          color: 'white',
          fontSize: 16,
          fontFamily: 'Nunito-Black',
          fontWeight: '600',
        }}>
          {title}
        </Text>

        {/* Icon text (if provided) */}
        {iconText && (
          <Text style={{
            color: 'white',
            fontSize: 16,
            fontFamily: 'Nunito-Black',
            fontWeight: '600',
            marginLeft: 4,
          }}>
            {iconText}
          </Text>
        )}
      </Pressable>
    </View>
  );
};

export default BluePrimaryButton;
