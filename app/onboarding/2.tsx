import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '../stores/onboardingStore';
import PrimaryButton from '../../components/PrimaryButton';
import Rive from 'rive-react-native';
import Animated, { 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  useSharedValue,
  withDelay,
  withSequence,
} from 'react-native-reanimated';

export default function OnboardingLambNameScreen() {
  const router = useRouter();
  const { setResponse } = useOnboardingStore();
  const [lambName, setLambName] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // Create Reanimated shared values for each component
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(40);
  
  const lambOpacity = useSharedValue(0);
  const lambTranslateY = useSharedValue(40);
  
  const inputOpacity = useSharedValue(0);
  const inputTranslateY = useSharedValue(40);
  
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(40);

  useEffect(() => {
    // Reset animation values
    titleOpacity.value = 0;
    titleTranslateY.value = 40;
    lambOpacity.value = 0;
    lambTranslateY.value = 40;
    inputOpacity.value = 0;
    inputTranslateY.value = 40;
    buttonOpacity.value = 0;
    buttonTranslateY.value = 40;
    
    // Staggered animations for each component
    const animateComponent = (opacity: any, translateY: any, delay: number) => {
      opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
      translateY.value = withDelay(delay, 
        withSpring(0, { 
          damping: 20,
          stiffness: 90,
        })
      );
    };

    // Start animations with delays
    animateComponent(titleOpacity, titleTranslateY, 0);
    animateComponent(lambOpacity, lambTranslateY, 200);
    animateComponent(inputOpacity, inputTranslateY, 400);
    animateComponent(buttonOpacity, buttonTranslateY, 600);

    // Keyboard listeners
    const keyboardWillShow = Keyboard.addListener('keyboardWillShow', () => setKeyboardVisible(true));
    const keyboardWillHide = Keyboard.addListener('keyboardWillHide', () => setKeyboardVisible(false));

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Create animated styles for each component
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }]
  }));

  const lambStyle = useAnimatedStyle(() => ({
    opacity: lambOpacity.value,
    transform: [{ translateY: lambTranslateY.value }]
  }));

  const inputStyle = useAnimatedStyle(() => ({
    opacity: inputOpacity.value,
    transform: [{ translateY: inputTranslateY.value }]
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }]
  }));

  const handleContinue = async () => {
    if (lambName.trim()) {
      await setResponse('lambName', lambName.trim());
      router.push('/onboarding/3');
    }
  };

  return (
    <View className="flex-1 bg-surfaceCream px-6 pt-12">
      {/* Question Text */}
      <Animated.View style={titleStyle}>
        <Text className="font-feather text-h1 text-center text-textPrimary mb-4 mt-0">
          What should we call your lamb?
        </Text>
      </Animated.View>

      {/* Rive Animation */}
      <Animated.View style={lambStyle} className="h-[160px] w-full justify-center items-center my-8">
        <Rive
          resourceName="homeLamb"
          artboardName="lamb-idle"
          autoplay={true}
          style={{ width: '80%', height: '80%' }}
        />
      </Animated.View>

      {/* Name Input */}
      <Animated.View style={inputStyle}>
        <TextInput
          className="font-feather text-3xl text-center text-textPrimary bg-white p-6 rounded-2xl border-4 border-border"
          placeholder="Enter name"
          placeholderTextColor="#A0A0A0"
          maxLength={9}
          autoFocus={true}
          value={lambName}
          onChangeText={setLambName}
        />
      </Animated.View>
      
      {/* Continue Button */}
      <Animated.View style={buttonStyle} className="mt-6">
        <PrimaryButton
          title="Continue"
          onPress={handleContinue}
          disabled={!lambName.trim()}
          isActive={!!lambName.trim()}
        />
      </Animated.View>
    </View>
  );
}
