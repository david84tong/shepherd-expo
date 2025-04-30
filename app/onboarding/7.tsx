import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import PrimaryButton from '../../components/PrimaryButton';

export default function NotificationPermissionScreen() {
  const router = useRouter();
  const [showingAlert, setShowingAlert] = useState(false);

  // Function to handle moving to next screen
  const moveToNextScreen = () => {
    router.push('/onboarding/8');
  };

  // Function to handle the don't allow button
  const handleDontAllow = () => {
    Alert.alert(
      "Notifications Declined",
      "You can always enable notifications later in your device settings.",
      [{ text: "Continue", onPress: moveToNextScreen }]
    );
  };

  // Function to handle the allow button - simulates permission request
  const handleAllow = () => {
    if (showingAlert) return;
    
    setShowingAlert(true);
    // Simulate iOS permission request with our own alert
    Alert.alert(
      "\"Shepherd\" Would Like to Send You Notifications",
      "Notifications may include alerts, sounds, and icon badges. These can be configured in Settings.",
      [
        { 
          text: "Don't Allow", 
          onPress: () => {
            setShowingAlert(false);
            Alert.alert(
              "Notification Access Denied",
              "You can enable notifications later in your device settings if you change your mind.",
              [{ text: "Continue", onPress: moveToNextScreen }]
            );
          },
          style: 'cancel'
        },
        { 
          text: "Allow", 
          onPress: () => {
            setShowingAlert(false);
            Alert.alert(
              "Notification Access Granted",
              "You'll now receive helpful reminders to keep up with your practice.",
              [{ text: "Continue", onPress: moveToNextScreen }]
            );
          } 
        }
      ]
    );
  };

  // Function to handle the remind me button
  const handleRemindMe = () => {
    moveToNextScreen();
  };

  return (
    <View className="flex-1 bg-surfaceCream items-center px-5">
      <View>
        <Text className="font-feather text-h1 text-center text-textPrimary mb-12 mt-32 mx-12">
            Get Support from Shepherd
        </Text>
      </View>

      {/* iOS-style Notification Example */}
      <View className="bg-white rounded-xl w-[400px] shadow-sm mb-6 flex-row p-3 items-center">
        <Image 
          source={require('../../assets/icon.png')} 
          className="w-12 h-12  mr-3 rounded-[8px]"
        />
        <View className="flex-1">
          <View className="flex-row justify-between">
            <Text className="font-bold text-black">From Shepherd</Text>
            <Text className="text-gray-400 text-xs">now</Text>
          </View>
          <Text className="text-black text-sm">Reminder that God is with you.</Text>
        </View>
      </View>

      {/* Notification Dialog - positioned to match iOS style */}
      <View className="absolute top-[42%] left-0 right-0 flex items-center justify-center z-10 opacity-90">
        <View className="bg-white rounded-[14px] w-[280px] overflow-hidden shadow-lg">
          <View className="p-4">
            <Text className="text-black text-[17px] font-feather text-center mb-2 mt-2">
              "Shepherd" Would Like to Send You Notifications
            </Text>
            <Text className="text-[#666666] text-[15px] font-din text-center px-6 mb-2">
              Notifications may include alerts, sounds, and icon badges. These can be configured in Settings.
            </Text>
          </View>

          <View className="flex-row border-t border-gray-200">
            <TouchableOpacity 
              className="flex-1 py-[12px] border-r border-gray-200"
              onPress={handleDontAllow}
            >
              <Text className="text-[#007AFF] text-[17px] text-center font-din">Don't Allow</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-1 py-[12px]"
              onPress={handleAllow}
            >
              <Text className="text-accentGold text-[17px] text-center font-bold">Allow</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Yellow arrow pointing up */}
        <View className="mt-4 ml-36">
          <Text className="text-accentGold text-[42px]">↑</Text>
        </View>
      </View>

      {/* Bottom button */}
      <View className="absolute bottom-10 w-full px-5">
        <PrimaryButton
          title="REMIND ME TO PRACTICE"
          onPress={handleRemindMe}
          primaryColor="bg-accentGold"
          textColor="text-white"
          style="mt-0"
        />
      </View>
    </View>
  );
}
