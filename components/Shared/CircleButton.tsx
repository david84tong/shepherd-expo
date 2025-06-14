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
}

const CircleButton: React.FC<CircleButtonProps> = ({
  onPress,
  icon = 'settings',
  size = 50,
  disabled = false,
  hapticsEnabled = true,
  iconComponent,
}) => {
  const [isPressed, setIsPressed] = useState(false);

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
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: disabled ? '#E5E5E5' : '#FBCA71',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateY: isPressed ? 3 : 0 }],
          borderWidth: 1,
          borderColor: '#CFA860',
          margin: 0
        },
        shadowStyles,
      ]}
    >
      {iconComponent ? (
        iconComponent
      ) : (
        <Feather 
          name={icon} 
          size={size * 0.4} 
          color={disabled ? '#999999' : '#634012'}
        />
      )}
    </Pressable>
  );
};

export default CircleButton; 