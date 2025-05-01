import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useUserStore } from '../stores/userStore';
import { Feather } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
  const router = useRouter();
  const {
    getLamb,
    getStreakCount,
    getCreatedAt,
  } = useUserStore();

  const lamb = getLamb();
  const streak = getStreakCount();
  const createdAtTimestamp = getCreatedAt();

  // Format join date - handle both Timestamp and undefined cases
  const joinDate = createdAtTimestamp 
    ? new Date(createdAtTimestamp.seconds * 1000).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Just started';

  // Show settings sheet
  const handleShowSettings = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (typeof global !== 'undefined' && (global as any).showSettings) {
      (global as any).showSettings();
    } else {
      console.error('showSettings not available on global object');
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF4D9' }}>
        <ScrollView className="flex-1 bg-surfaceCream">
          {/* Header */}
          <View className="flex-row justify-between items-center px-6 pt-14 pb-4">
            <Text className="font-feather text-h2 text-textPrimary">Profile</Text>
            <TouchableOpacity 
              onPress={handleShowSettings}
              className="w-10 h-10 rounded-full bg-forestGreen50 items-center justify-center"
            >
              <Feather name="settings" size={20} color="#3C584A" />
            </TouchableOpacity>
          </View>

          {/* Lamb Stats Card */}
          <View className="mx-6 mt-4 bg-white rounded-[20px] p-6 shadow-card">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="font-feather text-heading text-textPrimary">Your Lamb</Text>
              <View className="bg-lightGreen px-4 py-1 rounded-full">
                <Text className="font-din text-darkGreen">Lvl {lamb.level}</Text>
              </View>
            </View>

            {/* XP Bar */}
            <View className="mb-6">
              <View className="flex-row justify-between mb-2">
                <Text className="font-din text-description">Experience</Text>
                <Text className="font-din text-description">{lamb.xp} XP</Text>
              </View>
              <View className="h-2 bg-lightGreen rounded-full overflow-hidden">
                <View 
                  className="h-full bg-darkGreen rounded-full" 
                  style={{ width: `${Math.min((lamb.xp % 100) / 100 * 100, 100)}%` }} 
                />
              </View>
            </View>

            {/* Stats Grid */}
            <View className="flex-row justify-between">
              <View className="items-center bg-surfaceCream rounded-xl px-6 py-3">
                <Text className="font-feather text-h2 text-textPrimary">{streak}</Text>
                <Text className="font-din text-description">Day Streak</Text>
              </View>
              <View className="items-center bg-surfaceCream rounded-xl px-6 py-3">
                <Text className="font-feather text-h2 text-textPrimary">{lamb.hearts}</Text>
                <Text className="font-din text-description">Hearts</Text>
              </View>
            </View>
          </View>

          {/* Join Date Card */}
          <View className="mx-6 mt-4 bg-white rounded-[20px] p-6 shadow-card">
            <Text className="font-feather text-heading text-textPrimary mb-2">Journey Started</Text>
            <Text className="font-din text-description">{joinDate}</Text>
          </View>

          {/* Store Section */}
          <View className="mx-6 mt-4 mb-8 bg-white/50 rounded-[20px] p-6 shadow-card">
            <View className="flex-row justify-between items-center">
              <Text className="font-feather text-heading text-textPrimary">Store</Text>
              <View className="bg-lightGreen px-4 py-1 rounded-full">
                <Text className="font-din text-darkGreen">Coming Soon</Text>
              </View>
            </View>
            <Text className="font-din text-description mt-2">Customize your lamb and unlock special items!</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
} 