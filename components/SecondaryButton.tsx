import React, { useState } from 'react';
import { TouchableOpacity, View, Text, Image, ImageSourcePropType, StyleSheet, Animated } from 'react-native';

interface SecondaryButtonProps {
  icon: ImageSourcePropType;
  title: string;
  subtitle: string;
  points: number;
  onPress?: () => void;
  style?: object;
  disabled?: boolean;
}

const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  icon,
  title,
  subtitle,
  points,
  onPress,
  style,
  disabled = false,
}) => {
  // Simple state to track pressed state
  const [isPressed, setIsPressed] = useState(false);
  
  return (
    <View style={styles.buttonWrapper}>
      <TouchableOpacity
        style={[
          styles.button,
          isPressed && styles.buttonPressed,
          disabled && styles.buttonDisabled,
          style
        ]}
        activeOpacity={1}
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
      >
        <Image source={icon} style={styles.icon} resizeMode="contain" />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={styles.pointsContainer}>
          <Text style={styles.points}>+{points}</Text>
          <Image source={require('../assets/icons/starIcon.png')} style={styles.starIcon} resizeMode="contain" />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonWrapper: {
    marginTop: 16,
    height: 80,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: '100%',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFE4A8',
    backgroundColor: '#F9F3E5',
    shadowColor: '#FFE4A8',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6, // For Android
    transform: [{ translateY: 0 }],
  },
  buttonPressed: {
    transform: [{ translateY: 3 }],
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#F0F0F0',
    borderColor: '#E0E0E0',
    shadowOpacity: 0.5,
    elevation: 2,
  },
  icon: {
    width: 56,
    height: 56,
    marginRight: 8,
    marginLeft: -8
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: 'Feather Bold',
    color: '#3C584A',
    fontSize: 18,
  },
  starIcon: {
    width: 20,
    height: 20,
    marginLeft: 0,
    padding: 0
  },
  subtitle: {
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    color: 'rgba(60, 88, 74, 0.7)',
    fontSize: 14,
  },
  pointsContainer: {
    backgroundColor: '#FFE4A8',
    borderRadius: 20,
    paddingHorizontal: 8, 
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  points: {
    fontFamily: 'Feather Bold',
    color: '#7A8B7D',
    fontSize: 12,
  },
});

export default SecondaryButton; 