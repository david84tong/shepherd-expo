import React from 'react';
import { View, Text, Image, SafeAreaView } from 'react-native';
import PrimaryButton from './PrimaryButton';

type DayStatus = {
  label: string;
  completed: boolean;
  isToday?: boolean;
};

export const StreakScreen = () => {
  // Example streak data
  const streakCount = 109;
  
  // Weekly progress data with S M T W T F S
  const days: DayStatus[] = [
    { label: 'S', completed: true },
    { label: 'M', completed: true },
    { label: 'T', completed: true },
    { label: 'W', completed: true, isToday: true },
    { label: 'T', completed: true },
    { label: 'F', completed: true },
    { label: 'S', completed: true },
  ];

  return (
    <SafeAreaView className="flex-1 bg-darkBlue justify-between">
      {/* Header with flame icon */}
      <View className="items-end p-6">
        <View className="flex-row items-center">
          <Image 
            source={require('../assets/icons/flameIcon.png')} 
            className="w-6 h-8"
          />
          <Text className="text-accentGold text-xl font-feather ml-1">
            {streakCount}
          </Text>
        </View>
      </View>

      {/* Main content with flame icon and streak info */}
      <View className="items-center flex-1 justify-center pb-16">
        {/* Large flame icon */}
        <Image 
          source={require('../assets/icons/flameIcon.png')} 
          className="w-24 h-32 mb-8"
        />

        {/* Weekly progress tracker */}
        <View className="flex-row justify-between w-full px-10 mb-8">
          {days.map((day, index) => (
            <View key={index} className="items-center">
              <Text className="text-gray-400 font-din mb-2">
                {day.label}
              </Text>
              <View 
                className={`w-8 h-8 rounded-full items-center justify-center
                ${day.isToday ? 'bg-[#4FB8FE]' : 'bg-accentGold'}`}
              >
                <Text className="text-white font-feather-bold">✓</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Streak count and message */}
        <Text className="text-white text-3xl font-feather-bold mb-2">
          {streakCount} day streak!
        </Text>
        <Text className="text-gray-300 text-lg font-din">
          You're making great progress!
        </Text>
      </View>

      {/* Continue button */}
      <View className="px-6 pb-10">
        <PrimaryButton
          title="CONTINUE"
          onPress={() => {}}
          buttonType="blue"
        />
      </View>
    </SafeAreaView>
  );
};
