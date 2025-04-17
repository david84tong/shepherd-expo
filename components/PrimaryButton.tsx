import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
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
          disabled && styles.buttonDisabled
        ]}
        activeOpacity={1}
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
      >
        <Text style={styles.title}>{title}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonWrapper: {
    marginTop: 16,
    height: 70, // Slightly shorter than SecondaryButton
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center text
    paddingHorizontal: 20,
    height: '100%',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFE4A8',
    backgroundColor: '#FFC800', // Yellow background
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
    backgroundColor: '#E5E5E5',
    borderColor: '#D0D0D0',
  },
  title: {
    fontFamily: 'Feather Bold',
    color: '#4B4B4B', // Dark gray for good contrast on yellow
    fontSize: 18,
  },
});

export default PrimaryButton; 