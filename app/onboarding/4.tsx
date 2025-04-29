import React, { useState, useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingStore } from '../stores/onboardingStore';
import PrimaryButton from '../../components/PrimaryButton';

export default function OnboardingBibleFamiliarityScreen() {
  const router = useRouter();
  const { setResponse } = useOnboardingStore();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Create animated values
  const titleAnimation = new Animated.Value(0);
  const buttonAnimations = [
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ];

  useEffect(() => {
    // Stagger the animations
    Animated.stagger(100, [
      // Title animation
      Animated.timing(titleAnimation, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Button animations
      ...buttonAnimations.map(anim =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        })
      ),
    ]).start();
  }, []);

  const handleSelection = async (familiarity: string) => {
    setSelectedOption(familiarity);
  };

  const handleContinue = async () => {
    if (selectedOption) {
      await setResponse('bibleFamiliarity', selectedOption);
      router.push('onboarding/6' as any);
    }
  };

  // Common animation styles
  const getAnimatedStyle = (animation: Animated.Value) => ({
    opacity: animation,
    transform: [
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
    ],
  });

  const options = [
    {
      id: 'never',
      icon: 'book-outline',
      color: '#24CA17',
      bgColor: 'bg-lightGreen',
      title: 'Never',
      description: 'Starting fresh on this journey',
    },
    {
      id: 'a-little',
      icon: 'bookmark-outline',
      color: '#F7B500',
      bgColor: 'bg-lightYellow',
      title: 'A Little',
      description: 'Read some passages before',
    },
    {
      id: 'a-lot',
      icon: 'library-outline',
      color: '#2196F3',
      bgColor: 'bg-lightBlue',
      title: 'A Lot',
      description: 'Regular Bible reader',
    },
  ];

  return (
    <View className="flex-1 bg-surfaceCream px-6 pt-12">
      {/* Decorative Background Elements */}
      <View className="absolute right-0 top-20 opacity-5">
        <Ionicons name="book" size={200} color="#000000" />
      </View>

      {/* Question Text */}
      <Animated.View style={getAnimatedStyle(titleAnimation)}>
        <Text className="font-feather text-h1 text-center text-textPrimary mb-4">
          How much of the Bible have you read before?
        </Text>
      </Animated.View>

      {/* Options Container */}
      <View className="space-y-4 mt-8">
        {options.map((option, index) => (
          <Animated.View key={option.id} style={getAnimatedStyle(buttonAnimations[index])}>
            <View className="flex-row items-center px-4 bg-white rounded-card border-[3px] border-border">
              <View className={`${option.bgColor} rounded-xl p-3 mr-4`}>
                <Ionicons name={option.icon as any} size={32} color={option.color} />
              </View>
              <View className="flex-1">
                <Text className="font-feather text-lg">{option.title}</Text>
                <Text className="font-din text-sm text-description mt-1">
                  {option.description}
                </Text>
              </View>
              <PrimaryButton
                title={option.title}
                onPress={() => handleSelection(option.id)}
                isActive={true}
                style={`${selectedOption === option.id ? 'border-accentGold bg-surfaceCream' : ''}`}
                primaryColor={selectedOption === option.id ? 'bg-surfaceCream' : `bg-white`}
                textColor={selectedOption === option.id ? 'text-accentGold' : 'text-textPrimary'}
              />
            </View>
          </Animated.View>
        ))}
      </View>

      {/* Continue Button */}
      <Animated.View 
        style={[getAnimatedStyle(buttonAnimations[0])]}
        className="absolute bottom-0 left-0 right-0 px-6 pb-8"
      >
        <PrimaryButton
          title="Continue"
          onPress={handleContinue}
          disabled={!selectedOption}
          isActive={!!selectedOption}
        />
      </Animated.View>
    </View>
  );
}
