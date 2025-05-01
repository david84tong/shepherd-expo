import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { AntDesign } from '@expo/vector-icons';
import { useAuth } from '../hooks/authHook';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useUserStore } from '../stores/userStore';
import { ONBOARDING_COMPLETED_KEY } from '../models/Onboarding';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SaveProgressScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { signInWithApple, signInAnonymously } = useAuth();
  const { clearResponses, responses } = useOnboardingStore();
  const { createUser } = useUserStore();

  // Mark onboarding as completed and navigate to home
  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      await clearResponses(); // Clear onboarding responses after completion
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  // Create user object from onboarding responses
  const createUserFromResponses = async (uid: string, displayName: string) => {
    try {
      // Create user object from onboarding responses
      const userData = {
        displayName,
        spiritualGoal: responses.intent?.includes('read-bible') ? 'Understand'
          : responses.intent?.includes('talk-to-god') ? 'Overcome'
          : responses.intent?.includes('reflection-quiet-time') ? 'Explore'
          : 'Walk',
        experienceLevel: responses.bibleFamiliarity === 'never' ? 'new'
          : responses.bibleFamiliarity === 'a-little' ? 'new'
          : responses.bibleFamiliarity === 'a-lot' ? 'mature'
          : 'growing',
        frequencyGoal: 'daily',
        denomination: responses.religiousAffiliation,
        ageRange: responses.ageRange,
        lamb: {
          level: 1,
          xp: 0,
          mood: 'lamb-idle',
          hearts: 50,
          name: responses.lambName || '',
          skin: 'default'
        }
      };

      // Create user in Firestore
      const success = await createUser(uid, userData);
      if (!success) {
        throw new Error('Failed to create user document');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  // Handle sign in with Apple
  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      const user = await signInWithApple();
      if (user) {
        await createUserFromResponses(user.uid, user.displayName || 'Anonymous User');
        await completeOnboarding();
      }
    } catch (error) {
      console.error("Apple sign in error:", error);
      Alert.alert(
        "Sign In Failed",
        "There was a problem signing in with Apple. You can try again later.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle anonymous sign in
  const handleSkip = async () => {
    Alert.alert(
      "Skip Sign In?",
      "Without an account, your progress won't be saved if you delete the app or change devices.",
      [
        { text: "Go Back", style: "cancel" },
        { 
          text: "Skip Anyway", 
          onPress: async () => {
            try {
              setLoading(true);
              const user = await signInAnonymously();
              if (user) {
                await createUserFromResponses(user.uid, 'Anonymous User');
                await completeOnboarding();
              }
            } catch (error) {
              console.error("Anonymous sign in error:", error);
              Alert.alert(
                "Error",
                "There was a problem creating anonymous account. Please try again.",
                [{ text: "OK" }]
              );
            } finally {
              setLoading(false);
            }
          }
        }
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
        disabled={loading}
      >
        <Text className="font-din text-description underline text-[16px]">
          {loading ? "Please wait..." : "Skip for now"}
        </Text>
      </TouchableOpacity>
      
      {/* Privacy note */}
      <Text className="font-din text-[12px] text-description text-center mt-6 px-8">
        We only use your Apple ID for authentication. Your email and personal details stay private.
      </Text>
    </View>
  );
}