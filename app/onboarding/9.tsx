import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
  withDelay,
  SharedValue,
} from 'react-native-reanimated';

import PrimaryButton from '../../components/PrimaryButton';
import { useNotificationStore } from '../stores/notificationStore';

export default function NotificationPermissionScreen() {
  const router = useRouter();
  const [showingAlert, setShowingAlert] = useState(false);
  const notificationStore = useNotificationStore();

  // Create Reanimated shared values for each component
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(40);

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(40);

  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(40);

  useEffect(() => {
    // Reset animation values
    titleOpacity.value = 0;
    titleTranslateY.value = 40;
    contentOpacity.value = 0;
    contentTranslateY.value = 40;
    buttonOpacity.value = 0;
    buttonTranslateY.value = 40;

    // Staggered animations for each component
    const animateComponent = (opacity: SharedValue<number>, translateY: SharedValue<number>, delay: number) => {
      opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
      translateY.value = withDelay(
        delay,
        withSpring(0, {
          damping: 20,
          stiffness: 90,
        })
      );
    };

    // Start animations with delays
    animateComponent(titleOpacity, titleTranslateY, 0);
    animateComponent(contentOpacity, contentTranslateY, 200);
    animateComponent(buttonOpacity, buttonTranslateY, 400);
  }, []);

  // Create animated styles for each component
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  // Function to handle the don't allow button
  const handleDontAllow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Disable notifications in our store
    notificationStore.setNotificationsEnabled(false);
    
    router.push('/onboarding/11');
  };

  // Function to handle the allow button
  const handleAllow = async () => {
    if (showingAlert) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowingAlert(true);

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      console.log('existingStatus', existingStatus);
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted') {
        // Enable notifications in our store
        notificationStore.setNotificationsEnabled(true);
        
        // Initialize notifications
        await notificationStore.initializeNotifications();
        
        console.log('Notification permissions granted and notifications scheduled');
      } else {
        // Disable notifications in our store
        notificationStore.setNotificationsEnabled(false);
        console.log('Notification permissions denied');
      }
      
      router.push('/onboarding/11');
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      notificationStore.setNotificationsEnabled(false);
    } finally {
      setShowingAlert(false);
    }
  };

  // Function to handle the remind me button
  const handleRemindMe = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Keep notifications disabled for now
    notificationStore.setNotificationsEnabled(false);
    
    router.push('/onboarding/11');
  };

  return (
    <View className="flex-1 bg-surfaceCream items-center px-5">
      <Animated.View style={titleStyle}>
        <Text className="font-feather text-h1 text-center text-textPrimary mb-12 mt-32 mx-12">
          Get Support from Shepherd
        </Text>
      </Animated.View>

      <Animated.View style={contentStyle} className="items-center">
        {/* iOS-style Notification Example */}
        <View className="bg-white rounded-xl w-[360px] shadow-sm mb-6 flex-row p-3 items-center mx-12">
          <Image
            source={require('../../assets/icon.png')}
            className="w-12 h-12 mr-3 rounded-[8px]"
          />
          <View className="flex-1">
            <View className="flex-row justify-between">
              <Text className="font-bold text-black">From Shepherd</Text>
              <Text className="text-gray-400 text-xs">now</Text>
            </View>
            <Text className="text-black text-sm">Your streak is gonna be broken!</Text>
          </View>
        </View>

        {/* Notification Dialog - positioned to match iOS style */}
        <View className="absolute top-[42%] left-0 right-0 flex items-center justify-center z-10 opacity-90 mt-28">
          <View className="bg-white rounded-[14px] w-[280px] overflow-hidden shadow-lg">
            <View className="p-4">
              <Text className="text-black text-[17px] font-feather text-center mb-2 mt-2">
                &ldquo;Shepherd&rdquo; Would Like to Send You Notifications
              </Text>
              <Text className="text-[#666666] text-[15px] font-din text-center px-6 mb-2">
                Notifications may include alerts, sounds, and icon badges. These can be configured
                in Settings.
              </Text>
            </View>

            <View className="flex-row border-t border-gray-200">
              <TouchableOpacity
                className="flex-1 py-[12px] border-r border-gray-200"
                onPress={handleDontAllow}>
                <Text className="text-[#007AFF] text-[17px] text-center font-din">Don&apos;t Allow</Text>
              </TouchableOpacity>

              <TouchableOpacity className="flex-1 py-[12px]" onPress={handleAllow}>
                <Text className="text-accentGold text-[17px] text-center font-bold">Allow</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Yellow arrow pointing up */}
          <View className="mt-4 ml-36">
            <Text className="text-accentGold text-[42px]">↑</Text>
          </View>
        </View>
      </Animated.View>

      {/* Bottom button */}
      <Animated.View
        style={[
          buttonStyle,
          { position: 'absolute', bottom: 48, width: '100%', paddingHorizontal: 20 },
        ]}>
        <PrimaryButton
          title="Remind Me!"
          onPress={handleRemindMe}
          primaryColor="bg-accentGold"
          textColor="text-white"
          style="mt-0"
        />
      </Animated.View>
    </View>
  );
}
