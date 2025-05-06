import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useRouter, Stack } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUserStore } from '../stores/userStore';

export default function OnboardingAuth() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);
  const setDisplayNameInStore = useUserStore((state) => state.setDisplayName);
  const setCreatedAt = useUserStore((state) => state.setCreatedAt);
  const setUpdatedAt = useUserStore((state) => state.setUpdatedAt);

  const handleContinue = async () => {
    if (!displayName.trim()) {
      Alert.alert('Please enter your name');
      return;
    }

    try {
      setLoading(true);
      // Save the display name to the store
      setDisplayNameInStore(displayName);

      // If email is provided, create an account
      if (email.trim()) {
        // Create anonymous account for now, we'll handle email/password later
        const userCredential = await auth().signInAnonymously();

        // Save user data to Firestore
        const userId = userCredential.user.uid;
        const userDoc = {
          uid: userId,
          email,
          displayName,
          createdAt: firestore.Timestamp.now(),
          updatedAt: firestore.Timestamp.now(),
        };

        await firestore().collection('users').doc(userId).set(userDoc, { merge: true });

        // Update local store
        setUser({
          id: userId,
          displayName,
          email,
        });
        setCreatedAt(firestore.Timestamp.now());
        setUpdatedAt(firestore.Timestamp.now());
      }

      // Navigate to the next page - using the format like other screens, looking like numeric IDs
      router.push('/onboarding/2' as any);
    } catch (error) {
      console.error('Error during auth:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ title: 'Welcome', headerShown: false }} />

      <View className="flex-1 p-6 justify-between">
        <View className="mt-12">
          <Text className="text-3xl font-feather-bold text-center mb-6">
            Let's get to know each other
          </Text>

          <View className="mt-8">
            <Text className="text-base mb-2 font-din text-slate-700">Your name</Text>
            <TextInput
              className="bg-gray-100 rounded-lg p-4 font-din text-base"
              placeholder="Enter your name"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          </View>

          <View className="mt-6">
            <Text className="text-base mb-2 font-din text-slate-700">Email (optional)</Text>
            <TextInput
              className="bg-gray-100 rounded-lg p-4 font-din text-base"
              placeholder="Your email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Text className="text-xs mt-2 font-din text-slate-500">
              We'll use this to save your progress
            </Text>
          </View>
        </View>

        <View className="mb-8">
          <TouchableOpacity
            className="bg-indigo-600 rounded-full p-4 items-center"
            onPress={handleContinue}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-din-bold text-base">Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
