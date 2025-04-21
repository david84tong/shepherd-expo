import React, { useEffect, useRef, useState } from 'react';
import {
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  Platform, 
  Keyboard,
  Dimensions,
  Animated
} from 'react-native';
import PrimaryButton from './PrimaryButton';
import { usePathStore } from '../store/pathStore';
import Rive, { RiveRef } from 'rive-react-native';
import { Ionicons } from '@expo/vector-icons';

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
  const setPathInProgress = usePathStore((state) => state.setPathInProgress);
  
  // Animation values
  const cardAnimY = useRef(new Animated.Value(200)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const buttonAnimY = useRef(new Animated.Value(100)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const bottomContentAnimY = useRef(new Animated.Value(100)).current;
  const bottomContentOpacity = useRef(new Animated.Value(0)).current;

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
      // Set path in progress when component becomes visible
      setPathInProgress(true);
      
      // First animate the container
      Animated.timing(containerOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
      
      // Then animate the card
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        delay: 200
      }).start();
      
      Animated.timing(cardAnimY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
        delay: 200
      }).start();
      
      // Finally animate the button
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        delay: 500
      }).start();
      
      Animated.timing(buttonAnimY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
        delay: 500
      }).start();

      // Animate bottom content (Rive + Button)
      Animated.timing(bottomContentOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        delay: 500
      }).start();
      
      Animated.timing(bottomContentAnimY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
        delay: 500
      }).start();

      // Focus the input after animations complete
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 600);
      
      return () => clearTimeout(timer);
    } else {
      // Reset animations when hiding
      containerOpacity.setValue(0);
      cardAnimY.setValue(200);
      cardOpacity.setValue(0);
      buttonAnimY.setValue(100);
      buttonOpacity.setValue(0);
      bottomContentAnimY.setValue(100);
      bottomContentOpacity.setValue(0);
    }
  }, [visible, cardAnimY, cardOpacity, containerOpacity, buttonAnimY, buttonOpacity, bottomContentAnimY, bottomContentOpacity, setPathInProgress]);

  if (!visible) return null;

  const handleSave = () => {
    Keyboard.dismiss();
    setPathInProgress(false);
    onClose();
  };

  return (
    <Animated.View
      className="absolute flex w-full"
      style={{ opacity: containerOpacity }}
      pointerEvents="box-none"
    >
      {/* Back Button */} 
      <View className="pt-[60px] px-5  z-10 absolute ">
        <TouchableOpacity 
          onPress={() => {
            setPathInProgress(false);
            onClose();
          }}
          className="w-[44px] h-[44px] rounded-full bg-[rgba(255,244,217,0.95)] items-center justify-center"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 3,
            elevation: 3
          }}
        >
          <Ionicons name="chevron-back" size={22} color="#2D3720" />
        </TouchableOpacity>
      </View>

      {/* Animated Card with TextInput */}
 
      <Animated.View 
        className="w-[90%] bg-surfaceCream rounded-[28px] py-8 px-6 items-center z-10 mx-auto my-auto mt-[120px] border-4 border-border"
        style={[
          { 
            opacity: cardOpacity,
            transform: [{ translateY: cardAnimY }],
            maxHeight: keyboardVisible ? SCREEN_HEIGHT - keyboardHeight - 200 : SCREEN_HEIGHT - 280, 
            minHeight: 250
          }
        ]}
      >
        <Text className="text-h1 font-feather text-accentGold mb-6 text-center leading-tight">Daily Reflection</Text>
        
        <TextInput
          ref={inputRef}
          className="w-full bg-surfaceCream/50 rounded-[18px] p-4 border border-border text-body font-din text-textPrimary"
          placeholder="What\'s on your mind today?"
          placeholderTextColor="#B89B4C"
          multiline
          textAlignVertical="top"
          scrollEnabled={true}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* Animated Bottom Content (Rive + Button) */}
      <Animated.View 
        className="absolute left-0 right-0 flex-row items-center px-5 z-10"
        style={[
          {
            opacity: bottomContentOpacity,
            transform: [{ translateY: bottomContentAnimY }],
            bottom: keyboardVisible ? keyboardHeight + -440 : -100
          }
        ]}
      >
        {/* Rive Animation */}
        <View className="w-[100px] h-[100px] -ml-5 -mb-2">
          <Rive
            resourceName="lambWriting"
            autoplay={true}
            style={{ width: '130%', height: '130%' }}
          />
        </View>
        
        {/* Save Button */}
        <View className="flex-1 items-end w-[300px]">
          <PrimaryButton title="Save Entry" onPress={handleSave} />
        </View>
      </Animated.View>
    </Animated.View>
  );
};

export default JournalComponent;
