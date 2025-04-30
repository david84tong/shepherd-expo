import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import { AntDesign } from '@expo/vector-icons';

export default function SaveProgressScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Handle sign in with Apple
  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      
      // Using a mock implementation as we would need to properly configure Firebase Auth for Apple
      // In a real implementation, you would use the correct Apple auth provider method
      // Example: await auth().signInWithProvider(auth.AppleAuthProvider);
      
      // For development/testing purposes:
      setTimeout(() => {
        Alert.alert(
          "Success!",
          "Your progress will now be saved to your account.",
          [{ text: "Continue", onPress: () => router.push('/') }]
        );
        setLoading(false);
      }, 1500);
      
      return; // Skip the error handling below during development
      
    } catch (error) {
      console.error("Apple sign in error:", error);
      Alert.alert(
        "Sign In Failed",
        "There was a problem signing in with Apple. You can try again later.",
        [{ text: "OK" }]
      );
      setLoading(false);
    }
  };

  // Handle skipping sign in
  const handleSkip = () => {
    Alert.alert(
      "Skip Sign In?",
      "Without an account, your progress won't be saved if you delete the app or change devices.",
      [
        { text: "Go Back", style: "cancel" },
        { text: "Skip Anyway", onPress: () => router.push('/') }
      ]
    );
  };

  return (
    <View className="flex-1 bg-surfaceCream px-6">
      {/* Header */}
      <View className="items-center mt-16 mb-8">
        <Text className="font-feather text-h1 text-center text-textPrimary mb-3">
          Save Your Progress
        </Text>
        <Text className="font-din text-body text-center text-description mb-6">
          Sign in to keep your reading streak and Bible progress synced across devices.
        </Text>
        
        {/* Icon */}
        <View className="bg-white p-4 rounded-full mb-8 shadow-md">
          <Image 
            source={require('../../assets/icon.png')} 
            className="w-24 h-24"
            resizeMode="contain"
          />
        </View>
      </View>
      
      {/* Benefits */}
      <View className="mb-8">
        <View className="flex-row items-center mb-4">
          <View className="bg-lightGreen w-8 h-8 rounded-full items-center justify-center mr-3">
            <AntDesign name="check" size={18} color="#24CA17" />
          </View>
          <Text className="font-din text-body text-textPrimary flex-1">Save your reading progress</Text>
        </View>
        
        <View className="flex-row items-center mb-4">
          <View className="bg-lightGreen w-8 h-8 rounded-full items-center justify-center mr-3">
            <AntDesign name="check" size={18} color="#24CA17" />
          </View>
          <Text className="font-din text-body text-textPrimary flex-1">Transfer between devices</Text>
        </View>
        
        <View className="flex-row items-center mb-4">
          <View className="bg-lightGreen w-8 h-8 rounded-full items-center justify-center mr-3">
            <AntDesign name="check" size={18} color="#24CA17" />
          </View>
          <Text className="font-din text-body text-textPrimary flex-1">Keep your reading streak safe</Text>
        </View>
      </View>
      
      {/* Sign in button */}
      <View className="items-center mb-4">
        <TouchableOpacity 
          className="flex-row items-center justify-center bg-black w-full py-4 px-6 rounded-[16px] mb-4"
          onPress={handleAppleSignIn}
          disabled={loading}
        >
          <AntDesign name="apple1" size={24} color="white" style={{ marginRight: 10 }} />
          <Text className="font-din text-white text-[18px] font-bold">
            {loading ? "Signing in..." : "Sign in with Apple"}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Skip button */}
      <TouchableOpacity 
        onPress={handleSkip}
        className="items-center"
      >
        <Text className="font-din text-description underline text-[16px]">
          Skip for now
        </Text>
      </TouchableOpacity>
      
      {/* Privacy note */}
      <Text className="font-din text-[12px] text-description text-center mt-6 px-8">
        We only use your Apple ID for authentication. Your email and personal details stay private.
      </Text>
    </View>
  );
}
