import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  Platform, 
  Keyboard,
  Dimensions,
  Animated,
  ActivityIndicator
} from 'react-native';
import PrimaryButton from './PrimaryButton';
import { usePathStore } from '../app/stores/pathStore';
import { useHomeStore, SuccessAnimationType } from '../app/stores/homeStore';
import { useUserStore } from '../app/stores/userStore';
import Rive, { RiveRef } from 'rive-react-native';
import BackButton from './BackButton';
import { router } from 'expo-router';
import firestore from '@react-native-firebase/firestore';
import { useAssets } from 'expo-asset';

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
  const [reflectionContent, setReflectionContent] = useState('');
  
  // Get store functions
  const setSuccessType = useHomeStore((state) => state.setSuccessType);
  const setReflectionCompleted = useHomeStore((state) => state.setReflectionCompleted);
  const readingCompleted = useHomeStore((state) => state.readingCompleted);
  const prayerCompleted = useHomeStore((state) => state.prayerCompleted);
  const sawDailyBonus = useHomeStore((state) => state.sawDailyBonus);
  
  // Get userStore functions for saving reflection
  const addCompletedReflection = useUserStore(state => state.addCompletedReflection);
  const setLastReflectionDate = useUserStore(state => state.setLastReflectionDate);
  
  // Animation values
  const cardAnimY = useRef(new Animated.Value(200)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const buttonAnimY = useRef(new Animated.Value(100)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const bottomContentAnimY = useRef(new Animated.Value(100)).current;
  const bottomContentOpacity = useRef(new Animated.Value(0)).current;

  // Load Rive assets
  const [riveAssets] = useAssets([
    require('../assets/riveAnimations/homeLamb.riv')
  ]);

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
    console.log('JournalComponent: visible =', visible);
    
    if (visible) {
      console.log('JournalComponent: Showing journal component');
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
      setReflectionContent(''); // Clear content when closing
    }
  }, [visible, cardAnimY, cardOpacity, containerOpacity, buttonAnimY, buttonOpacity, bottomContentAnimY, bottomContentOpacity, setPathInProgress]);

  // Pre-compute memoized values outside and before any conditional returns
  const cardStyle = useMemo(() => { 
    return {
      opacity: cardOpacity,
      transform: [{ translateY: cardAnimY }],
      maxHeight: keyboardVisible ? SCREEN_HEIGHT - keyboardHeight - 200 : SCREEN_HEIGHT - 280, 
      minHeight: 250
    };
  }, [cardOpacity, cardAnimY, keyboardVisible, keyboardHeight]);

  const bottomContentStyle = useMemo(() => {
    return {
      opacity: bottomContentOpacity,
      transform: [{ translateY: bottomContentAnimY }],
      bottom: keyboardVisible ? keyboardHeight + -440 : -100
    };
  }, [bottomContentOpacity, bottomContentAnimY, keyboardVisible, keyboardHeight]);

  if (!visible) return null;

  // Show loading indicator if assets aren't loaded yet
  if (!riveAssets) {
    return (
      <View className="absolute flex w-full h-full justify-center items-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}>
        <ActivityIndicator size="large" color="#3C584A" />
      </View>
    );
  }

  const handleSave = () => {
    Keyboard.dismiss();
    setPathInProgress(false);
    setReflectionCompleted(true); // Set reflection as completed
    
    // Create current timestamp
    const now = firestore.Timestamp.now();
    
    // Save reflection to userStore
    console.log('Saving reflection data to userStore');
    try {
      // Save the reflection content
      addCompletedReflection({
        date: now,
        content: reflectionContent.trim() || "Reflected on my spiritual journey today."
      });
      
      // Update last reflection date
      setLastReflectionDate(now);
      
      console.log('Reflection saved successfully');
    } catch (error) {
      console.error('Error saving reflection data:', error);
    }
    
    if (readingCompleted && prayerCompleted && !sawDailyBonus) {
      setSuccessType(SuccessAnimationType.BONUS);
    } else {
      setSuccessType(SuccessAnimationType.REFLECTION);
    }
    
    // Navigate to success screen
    router.push("/success");
  };

  return (
    <Animated.View
      className="absolute flex w-full"
      style={{ opacity: containerOpacity }}
      pointerEvents="box-none"
    >
      {/* Back Button */}
      <BackButton 
        onPress={() => {
          setPathInProgress(false);
          onClose();
        }} 
      />

      {/* Animated Card with TextInput */}
      <Animated.View 
        className="w-[90%] bg-surfaceCream rounded-[28px] py-8 px-6 items-center z-10 mx-auto my-auto mt-[120px] border-4 border-border"
        style={cardStyle}
      >
        <Text className="text-h1 font-feather text-textPrimary mb-6 text-center leading-tight">Daily Reflection</Text>
        
        <TextInput
          ref={inputRef}
          className="w-full bg-surfaceCream/50 rounded-[18px] p-4 border border-border text-body font-din text-textPrimary"
          placeholder="What's on your mind today?"
          placeholderTextColor="#B89B4C"
          multiline
          textAlignVertical="top"
          scrollEnabled={true}
          style={{ flex: 1 }}
          value={reflectionContent}
          onChangeText={setReflectionContent}
        />
      </Animated.View>

      {/* Animated Bottom Content (Rive + Button) */}
      <Animated.View 
        className="absolute left-0 right-0 flex-row items-center px-5 z-10"
        style={bottomContentStyle}
      >
        {/* Rive Animation */}
        <View className="w-[100px] h-[100px] -ml-5 -mb-2">
          <Rive
            url={riveAssets[0].localUri!}
            artboardName="lamb-writing"
            autoplay={true}
            style={{ width: '130%', height: '130%' }}
          />
        </View>
        
        {/* Save Button */}
        <View className="flex-1 items-end w-[280px] ml-8 mt-4">
          <PrimaryButton title="Hold This Thought" onPress={handleSave} />
        </View>
      </Animated.View>
    </Animated.View>
  );
};

export default JournalComponent;
