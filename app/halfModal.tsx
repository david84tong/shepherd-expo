import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUIStore } from './stores/uiStore';
import PrimaryButton from '../components/PrimaryButton';

// Define the types of modals this screen can display
export enum HalfModalType {
  HEART_PENALTY = 'HEART_PENALTY',
  WIDGET_REMINDER = 'WIDGET_REMINDER',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  GENERIC = 'GENERIC',
}

export default function HalfModalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const setIsModalDimActive = useUIStore((state) => state.setIsModalDimActive);

  // Helper function to safely get string param
  const getStringParam = (paramName: string): string | undefined => {
    const value = params[paramName];
    return typeof value === 'string' ? value : undefined;
  };

  // Determine content based on params
  const type = (getStringParam('type') as HalfModalType) || HalfModalType.GENERIC;
  let title = getStringParam('message') || "Attention";
  let description = getStringParam('subMessage') || "Something happened.";
  let icon = require('../assets/icons/heartIcon.png'); // Generic icon
  let penalty = parseInt(getStringParam('penalty') || '0', 10);
  let daysMissed = parseInt(getStringParam('daysMissed') || '0', 10);

  // Set content based on type (using require for icons)
  if (type === HalfModalType.HEART_PENALTY) {
    title = getStringParam('message') || "Hearts Lost!";
    description = getStringParam('subMessage') || `You lost ${penalty} hearts for ${daysMissed} days of inactivity.`;
    icon = require('../assets/icons/heartIcon.png');
  } else if (type === HalfModalType.WIDGET_REMINDER) {
    title = getStringParam('message') || "Reminder";
    description = getStringParam('subMessage') || "Just a friendly reminder!";
    icon = require('../assets/icons/heartIcon.png');
  } else if (type === HalfModalType.ANNOUNCEMENT) {
    title = getStringParam('message') || "Announcement";
    description = getStringParam('subMessage') || "We have news for you!";
    icon = require('../assets/icons/heartIcon.png');
  }

  // Effect for managing dim state
  useEffect(() => {
    console.log(`[HalfModal] Mounting (Type: ${type}), scheduling dim activation...`);
    const timer = setTimeout(() => {
      console.log("[HalfModal] Timer fired, setting dim active");
      setIsModalDimActive(true);
    }, 500);

    return () => {
      console.log("[HalfModal] Unmounting, clearing timer and setting dim inactive");
      clearTimeout(timer);
      setIsModalDimActive(false);
    };
  }, [setIsModalDimActive]); // Keep dimming logic independent of type changes

  return (
    // Container MUST be transparent to see the overlay behind it
    <View className="flex-1 justify-end bg-transparent">
      {/* Pressable overlay for background taps */}
      <Pressable 
        style={StyleSheet.absoluteFill} // Keep StyleSheet for absoluteFill
        onPress={() => router.back()} 
      />
      {/* Modal content sheet with NativeWind styles */}
      <View className="bg-surfaceCream p-5 pb-8 rounded-t-[20px] items-center w-full shadow-lg z-10">
        {/* Optional Handle Bar */}
        <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-4" />

        {/* Icon */}
        <Image source={icon} className="w-12 h-12 mb-3" resizeMode="contain" />
        
        {/* Title */}
        <Text className="font-feather text-textPrimary text-2xl mb-2 text-center">{title}</Text>

        {/* Description */}
        <Text className="font-din text-secondaryText text-base mb-5 text-center px-4">{description}</Text>
        
        {/* Type-specific content (e.g., penalty info) */}
        {type === HalfModalType.HEART_PENALTY && penalty > 0 && (
          <View className="bg-[#FFEDED] p-3 rounded-lg mb-4 border-l-4 border-l-[#FF6B6B] w-[90%] items-center">
            <Text className="font-din text-[#A57070] text-sm text-center">
              {penalty} hearts lost after {daysMissed} days away
            </Text>
          </View>
        )}
        
        {/* Close Button using PrimaryButton */}
        <PrimaryButton
          title="Got It"
          onPress={() => router.back()} // Use router.back to dismiss
          style="w-full mt-2" // Use w-full for width, mt-2 for spacing
          // Ensure PrimaryButton doesn't enforce a fixed height if 'h-auto' isn't working, check its internal styles
          buttonType="default" // Or adjust based on modal type if needed
        />
      </View>
    </View>
  );
} 