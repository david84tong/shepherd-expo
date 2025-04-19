import React, { useEffect, useRef, useState } from 'react';
import {
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Platform, 
  Keyboard,
  Dimensions,
  Animated
} from 'react-native';
import PrimaryButton from './PrimaryButton';

interface JournalProps {
  visible: boolean;
  onClose: () => void;
}

// Get screen dimensions
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Component for the Daily Reflection/Journaling feature.
 * Includes an auto-focusing TextInput and handles keyboard appearance.
 */
const JournalComponent: React.FC<JournalProps> = ({ visible, onClose }) => {
  const inputRef = useRef<TextInput>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Animation values
  const cardAnimY = useRef(new Animated.Value(200)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const buttonAnimY = useRef(new Animated.Value(100)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  // Keyboard event listeners with height information
  useEffect(() => {
    const handleKeyboardShow = (event: any) => {
      const keyboardHeight = event.endCoordinates.height;
      setKeyboardHeight(keyboardHeight);
      setKeyboardVisible(true);
    };

    const handleKeyboardHide = () => {
      setKeyboardHeight(0);
      setKeyboardVisible(false);
    };

    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      handleKeyboardShow
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      handleKeyboardHide
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Entry and exit animations
  useEffect(() => {
    if (visible) {
      // First animate the header
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        delay: 200 // Start after lamb animation has progressed
      }).start();
      
      // Then animate the card
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        delay: 400
      }).start();
      
      Animated.timing(cardAnimY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
        delay: 400
      }).start();
      
      // Finally animate the button
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        delay: 700
      }).start();
      
      Animated.timing(buttonAnimY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
        delay: 700
      }).start();

      // Focus the input after ALL animations complete
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300); // Delay keyboard appearance until animations are done
      
      return () => clearTimeout(timer);
    } else {
      // Reset animations when hiding
      cardAnimY.setValue(200);
      cardOpacity.setValue(0);
      headerOpacity.setValue(0);
      buttonAnimY.setValue(100);
      buttonOpacity.setValue(0);
    }
  }, [visible, cardAnimY, cardOpacity, headerOpacity, buttonAnimY, buttonOpacity]);

  if (!visible) return null;

  const handleSave = () => {
    Keyboard.dismiss();
    onClose();
  };

  // Calculate positions based on keyboard state
  const cardStyle = {
    height: keyboardVisible ? SCREEN_HEIGHT - 300 - keyboardHeight : SCREEN_HEIGHT - 250,
  };

  const buttonPosition = {
    bottom: keyboardVisible ? keyboardHeight + 25 : 40
  };

  return (
    <View style={styles.overlay}>
      {/* Animated Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Reflection</Text>
      </Animated.View>

      {/* Animated Card with TextInput */}
      <Animated.View 
        style={[
          styles.card, 
          cardStyle,
          { 
            opacity: cardOpacity,
            transform: [{ translateY: cardAnimY }]
          }
        ]}
      >
        <Text style={styles.subtitle}>What's on your mind today?</Text>
        
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          placeholder="Start writing your reflection here..."
          placeholderTextColor="#A8C0E0"
          multiline
          textAlignVertical="top"
          scrollEnabled={true}
        />
      </Animated.View>

      {/* Animated Button */}
      <Animated.View 
        style={[
          styles.buttonContainer, 
          buttonPosition,
          {
            opacity: buttonOpacity,
            transform: [{ translateY: buttonAnimY }]
          }
        ]}
      >
        <PrimaryButton title="Save Entry" onPress={handleSave} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)', // Semi-transparent overlay
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Feather Bold',
    color: '#FFF',
    marginLeft: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 244, 217, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  backButtonText: {
    fontSize: 24,
    color: '#3C584A',
    fontFamily: 'Inter-Bold',
  },
  card: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    backgroundColor: '#E6F2FF',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    marginTop: 84
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Feather Bold',
    color: '#4A6C8C',
    marginBottom: 20,
    textAlign: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#3C584A',
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
    borderWidth: 1,
    borderColor: '#A8C0E0',
    textAlignVertical: 'top',
  },
  buttonContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
});

export default JournalComponent;
