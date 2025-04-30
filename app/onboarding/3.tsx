import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingStore } from '../stores/onboardingStore';
import PrimaryButton from '../../components/PrimaryButton';
import Animated, { 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';

export default function OnboardingIntentScreen() {
  const router = useRouter();
  const { setResponse } = useOnboardingStore();
  const [pressedButton, setPressedButton] = useState<string | null>(null);
  const [selectedIntents, setSelectedIntents] = useState<string[]>([]);

  // Create Reanimated shared values for each component
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(40);
  
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(40);

  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(40);
  
  const continueOpacity = useSharedValue(0);
  const continueTranslateY = useSharedValue(40);

  useEffect(() => {
    // Reset animation values
    titleOpacity.value = 0;
    titleTranslateY.value = 40;
    subtitleOpacity.value = 0;
    subtitleTranslateY.value = 40;
    buttonsOpacity.value = 0;
    buttonsTranslateY.value = 40;
    continueOpacity.value = 0;
    continueTranslateY.value = 40;
    
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
    animateComponent(subtitleOpacity, subtitleTranslateY, 200);
    animateComponent(buttonsOpacity, buttonsTranslateY, 400);
    animateComponent(continueOpacity, continueTranslateY, 600);
  }, []);

  // Create animated styles for each component
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }]
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }]
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }]
  }));

  const continueStyle = useAnimatedStyle(() => ({
    opacity: continueOpacity.value,
    transform: [{ translateY: continueTranslateY.value }]
  }));

  const handleSelection = (intent: string) => {
    setSelectedIntents(prev => {
      const newSelection = prev.includes(intent)
        ? prev.filter(i => i !== intent)
        : [...prev, intent];
      return newSelection;
    });
  };

  const handleContinue = async () => {
    if (selectedIntents.length > 0) {
      await setResponse('intent', selectedIntents);
      router.push('/onboarding/4');
    }
  };

  const buttons = [
    {
      id: 'read-bible',
      icon: 'book-outline',
      color: '#F7B500',
      bgColor: 'bg-lightYellow',
      title: 'Read the Bible',
      description: 'Start your journey through scripture',
    },
    {
      id: 'talk-to-god',
      icon: 'chatbubble-outline',
      color: '#2196F3',
      bgColor: 'bg-lightBlue',
      title: 'Talk to God',
      description: 'Learn to pray with confidence',
    },
    {
      id: 'reflection-quiet-time',
      icon: 'leaf-outline',
      color: '#24CA17',
      bgColor: 'bg-lightGreen',
      title: 'Reflection & Quiet Time',
      description: 'Daily moments of peace with God',
    },
    {
      id: 'just-exploring',
      icon: 'compass-outline',
      color: '#FF8C1A',
      bgColor: 'bg-lightOrange',
      title: 'Just Exploring',
      description: 'Discover at your own pace',
    },
  ];

  return (
    <View className="flex-1 bg-surfaceCream px-6 pt-12">
      {/* Question Text */}
      <Animated.View style={titleStyle}>
        <Text className="font-feather text-h1 text-center text-textPrimary mb-8">
          What brings you here today?
        </Text>
      </Animated.View>

      <Animated.View style={subtitleStyle}>
        <Text className="font-din text-md text-description text-center mt-2">
          Select all that apply
        </Text>
      </Animated.View>

      {/* Buttons Container */}
      <Animated.View style={buttonsStyle} className="space-y-4 mt-8">
        {buttons.map((button) => (
          <Pressable
            key={button.id}
            onPress={() => handleSelection(button.id)}
            onPressIn={() => setPressedButton(button.id)}
            onPressOut={() => setPressedButton(null)}
            className={`
              h-[80px] bg-white rounded-card border-[3px] border-border px-4
              flex-row items-center shadow-buttonShadow mt-4
              ${pressedButton === button.id ? 'translate-y-[3px] shadow-none' : 'translate-y-0'}
              ${selectedIntents.includes(button.id) ? 'border-accentGold bg-surfaceCream' : ''}
            `}
          >
            <View className={`${button.bgColor} rounded-xl p-3`}>
              <Ionicons name={button.icon as any} size={24} color={button.color} />
            </View>
            <View className="ml-4 flex-1">
              <Text className="font-feather text-lg text-textPrimary">{button.title}</Text>
              <Text className="font-din text-md text-description mt-1">
                {button.description}
              </Text>
            </View>
            <View className={`
              w-6 h-6 rounded-full border-2 items-center justify-center
              ${selectedIntents.includes(button.id) 
                ? 'bg-accentGold border-accentGold' 
                : 'border-description'
              }
            `}>
              {selectedIntents.includes(button.id) && (
                <Ionicons name="checkmark" size={16} color="white" />
              )}
            </View>
          </Pressable>
        ))}
      </Animated.View>

      {/* Continue Button */}
      <Animated.View style={continueStyle} className="mt-6">
        <PrimaryButton
          title="Continue"
          onPress={handleContinue}
          disabled={selectedIntents.length === 0}
          isActive={selectedIntents.length > 0}
        />
      </Animated.View>
    </View>
  );
}
