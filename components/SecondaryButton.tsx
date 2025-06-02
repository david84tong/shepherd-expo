import React, { useState } from 'react';
import { View, Text, Image, ImageSourcePropType, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import analytics from '../utils/analytics';
import { useSoundStore } from '../app/stores/soundStore';
import { responsiveHeight, responsiveWidth, responsiveFontSize } from 'react-native-responsive-dimensions';

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
    <View style={{ marginTop: responsiveHeight(2), height: responsiveHeight(10), width: '100%' }}>
      <Pressable
        className={`
          flex-row items-center w-full rounded-card border-[3px] ${borderColor} 
          ${bgColor} transform ${opacityClass}
          ${isPressed ? 'translate-y-[3px]' : 'translate-y-0'}
        `}
        style={[shadowStyles, { height: '100%', paddingHorizontal: responsiveWidth(4) }]}
        onPress={handlePress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
      >
        <Image source={icon} style={{ width: responsiveWidth(11), height: responsiveWidth(11), marginRight: responsiveWidth(2), marginLeft: -responsiveWidth(2) }} resizeMode="contain" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            className="font-feather text-textPrimary"
            style={{ fontSize: responsiveFontSize(2.3), fontWeight: '700' }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
          <Text
            className="font-din text-textPrimary/70"
            style={{ fontSize: responsiveFontSize(1.7), flexWrap: 'wrap', flexShrink: 1 }}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {subtitle}
          </Text>
        </View>
        <View style={{ borderRadius: 999, paddingHorizontal: responsiveWidth(2), paddingVertical: responsiveHeight(0.5), flexDirection: 'row', alignItems: 'center' }}>
          {completed ? (
            <View style={{ width: responsiveWidth(6), height: responsiveWidth(6), borderRadius: 999, backgroundColor: '#1B7F5C', alignItems: 'center', justifyContent: 'center' }}>
              <Text className="font-feather text-white" style={{ fontSize: responsiveFontSize(1.5) }}>✓</Text>
            </View>
          ) : (
            <>
              <Image
                source={require('../assets/icons/starIcon.png')}
                style={{ width: responsiveWidth(5), height: responsiveWidth(5) }}
                resizeMode="contain"
              />
              <Text className="font-feather text-textPrimary/70" style={{ fontSize: responsiveFontSize(1.5) }}>+{points}</Text>
            </>
          )}
        </View>
      </Pressable>
    </View>
  );
};

export default SecondaryButton;
