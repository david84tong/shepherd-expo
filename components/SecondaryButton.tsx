import React, { useState } from 'react';
import { TouchableOpacity, View, Text, Image, ImageSourcePropType, StyleSheet, Animated } from 'react-native';

interface SecondaryButtonProps {
  icon: ImageSourcePropType;
  title: string;
  subtitle: string;
  points: number;
  onPress?: () => void;
  style?: object;
}

const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  icon,
  title,
  subtitle,
  points,
  onPress,
  style,
}) => {
  // Simple state to track pressed state
  const [isPressed, setIsPressed] = useState(false);
  
  return (
    <View style={styles.buttonWrapper}>
      <TouchableOpacity
        style={[
          styles.button,
          isPressed && styles.buttonPressed,
          style
        ]}
        activeOpacity={1}
        onPress={onPress}
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
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonWrapper: {
    marginTop: 16,
    height: 70,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
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
  icon: {
    width: 32,
    height: 32,
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: 'Feather Bold',
    color: '#3C584A',
    fontSize: 18,
  },
  subtitle: {
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    color: 'rgba(60, 88, 74, 0.7)',
    fontSize: 14,
  },
  pointsContainer: {
    backgroundColor: '#FFE4A8',
    borderRadius: 20,
    paddingHorizontal: 12, 
    paddingVertical: 2,
  },
  points: {
    fontFamily: 'Feather Bold',
    color: '#3C584A',
    fontSize: 14,
  },
});

export default SecondaryButton; 