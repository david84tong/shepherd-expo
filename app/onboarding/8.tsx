import React from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import PrimaryButton from '../../components/PrimaryButton';

export default function NextOnboardingScreen() {
  const router = useRouter();

  const handleNext = () => {
    // Navigate to home or next screen
    router.push('/');
  };

  return (
    <View className="flex-1 bg-surfaceCream justify-center items-center px-5">
      <Text className="text-textPrimary font-feather text-h2 mb-8">
        Next Onboarding Step
      </Text>
      
      <View className="w-full px-5">
        <PrimaryButton
          title="CONTINUE"
          onPress={handleNext}
          primaryColor="bg-accentGold"
          textColor="text-textPrimary"
        />
      </View>
    </View>
  );
}
