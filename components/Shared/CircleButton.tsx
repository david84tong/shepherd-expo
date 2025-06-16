import React, { useState } from 'react';
import { Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';

interface CircleButtonProps {
  onPress: () => void;
  icon?: keyof typeof Feather.glyphMap;
  size?: number;
  disabled?: boolean;
  hapticsEnabled?: boolean;
  iconComponent?: React.ReactNode;
  isSmall?: boolean;
}

const CircleButton: React.FC<CircleButtonProps> = ({
  onPress,
  icon = 'settings',
  size = 50,
  disabled = false,
  hapticsEnabled = true,
  iconComponent,
  isSmall = false,
}) => {
  const [isPressed, setIsPressed] = useState(false);

  // Calculate actual size based on isSmall prop
  const actualSize = isSmall ? size * 0.7 : size;

  // Handle press with haptic feedback
  const handlePress = () => {
    if (disabled) return;
    
    if (hapticsEnabled) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
          console.log('Haptics not available');
        });
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
            shadowColor: '#CFA860',
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
    <Pressable
      onPress={handlePress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      style={[
        {
          width: actualSize,
          height: actualSize,
          borderRadius: actualSize / 2,
          backgroundColor: disabled ? '#E5E5E5' : '#FBCA71',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateY: isPressed ? 3 : 0 }],
          borderWidth: 1,
          borderColor: '#CFA860',
        },
        shadowStyles,
      ]}
    >
      {iconComponent ? (
        iconComponent
      ) : (
        <Feather 
          name={icon} 
          size={actualSize * 0.4} 
          color={disabled ? '#999999' : '#634012'}
        />
      )}
    </Pressable>
  );
};

export default CircleButton; 