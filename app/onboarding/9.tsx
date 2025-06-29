import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, Linking, StatusBar } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
  withDelay,
  SharedValue,
} from 'react-native-reanimated';

import { useNotificationStore } from '../stores/notificationStore';
import { useOnboardingStore } from '../stores/onboardingStore';
import analytics, { AnalyticsEvent, EventCategory } from '../../utils/analytics';
import i18n from '../utils/i18n';
import { RPH } from '../helper/helper';
import { hapticLight } from '~/utils/haptics';

export default function NotificationPermissionScreen() {
  const router = useRouter();
  const [showingAlert, setShowingAlert] = useState(false);
  const notificationStore = useNotificationStore();
  const { setNotificationPreference } = useOnboardingStore();

  // Create Reanimated shared values for each component
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(40);

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(40);

  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(40);

  useEffect(() => {
    // Log screen view when component mounts
    analytics.logEvent("OnboardingNotificationPermissionScreen_Viewed");

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
  const handleDontAllow = async () => {
    hapticLight();

    // Track analytics event
    analytics.logEvent("OnboardingNotificationPermissionScreen_Tapped_Deny");


    // Disable notifications in our store
    notificationStore.setNotificationsEnabled(false);

    // Save to onboarding store
    await setNotificationPreference({
      enabled: false
    });

    router.push('/onboarding/10');
  };

  // Function to handle the allow button
  const handleAllow = async () => {
    analytics.logEvent("OnboardingNotificationPermissionScreen_Tapped_Allow");
    if (showingAlert) return;
    hapticLight();
    setShowingAlert(true);

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      console.log('📱 Existing notification status:', existingStatus);

      if (existingStatus !== 'granted') {
        console.log('📱 Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('📱 New notification status after request:', status);
      }

      if (finalStatus === 'granted') {
        analytics.logEvent("OnboardingNotificationPermissionScreen_Granted");

        console.log('📱 Notification permissions GRANTED in onboarding');

        // Enable notifications in our store
        notificationStore.setNotificationsEnabled(true);

        // Save to onboarding store - user enabled notifications
        await setNotificationPreference({
          enabled: true,
          time: '19:00' // Default to 7PM
        });

        // Schedule streak warning notifications first
        console.log('📱 Onboarding: Scheduling streak warning notifications');
        await notificationStore.scheduleStreakReminders();

        // Schedule daily reminder using the evening timeframe
        console.log('📱 Onboarding: Scheduling daily reminder for evening');
        await notificationStore.scheduleDailyReminder('evening');

        // List all scheduled notifications to confirm
        console.log('📱 Listing all scheduled notifications:');
        await notificationStore.listScheduledNotifications();

        console.log('📱 All notifications successfully scheduled during onboarding');

        router.push('/onboarding/10');
        return;
      } else {
        analytics.logEvent("OnboardingNotificationPermissionScreen_Denied");

        console.log('📱 Notification permissions DENIED in onboarding');

        // Disable notifications in our store
        notificationStore.setNotificationsEnabled(false);

        // Save to onboarding store
        await setNotificationPreference({
          enabled: false
        });

        // Show alert offering to open system settings
        Alert.alert(
          i18n.t('onboarding_notification_enable_title'),
          i18n.t('onboarding_notification_enable_desc'),
          [
            {
              text: i18n.t('onboarding_notification_open_settings'),
              onPress: () => {
                analytics.logEvent("Onboarding_Opened_SystemSettings_Notifications");
                Linking.openSettings();
              }
            },
            {
              text: i18n.t('onboarding_notification_continue_anyway'),
              style: 'cancel'
            }
          ]
        );
      }

      router.push('/onboarding/10');
    } catch (error) {
      console.log('📱 Error requesting notification permissions:', error);

      // Disable notifications in case of error
      notificationStore.setNotificationsEnabled(false);

      // Save to onboarding store
      await setNotificationPreference({
        enabled: false
      });

      router.push('/onboarding/10');
    } finally {
      setShowingAlert(false);
    }
  };

  // Function to handle the remind me button
  const handleRemindMe = async () => {
    hapticLight();

    // Track analytics event
    analytics.logEvent(AnalyticsEvent.USER_PREFERENCE_CHANGE, {
      preference: 'notifications',
      value: 'remind_later',
      screen: 'NotificationPermissionScreen',
      category: EventCategory.ONBOARDING
    });

    // Keep notifications disabled for now
    notificationStore.setNotificationsEnabled(false);

    // Save to onboarding store - mark as remind later
    await setNotificationPreference({
      enabled: false,
      time: 'remind_later'
    });

    router.push('/onboarding/10');
  };

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View className="flex-1 bg-surfaceCream items-center px-5">
        <Animated.View style={[titleStyle, { marginTop: RPH(10) }]}>
          <Text className="font-feather text-h1 text-center text-textPrimary mb-12 mx-12">
            {i18n.t('onboarding_notification_question')}
          </Text>
        </Animated.View>

        <Animated.View style={contentStyle} className="items-center">
          {/* iOS-style Notification Example */}
          <View style={{ width: '90%' }} className="bg-white rounded-xl shadow-sm mb-6 flex-row p-3 items-center mx-12">
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
                <Text className="font-feather text-center text-[17px] font-feather mb-2 mt-2">
                  {i18n.t('onboarding_notification_dialog_title')}
                </Text>
                <Text className="text-[#666666] text-[15px] font-din text-center px-6 mb-2">
                  {i18n.t('onboarding_notification_dialog_desc')}
                </Text>
              </View>

              <View className="flex-row border-t border-gray-200">
                <TouchableOpacity
                  className="flex-1 py-[12px] border-r border-gray-200"
                  onPress={handleDontAllow}>
                  <Text className="text-[#007AFF] text-[17px] text-center font-din">{i18n.t('onboarding_notification_dont_allow')}</Text>
                </TouchableOpacity>

                <TouchableOpacity className="flex-1 py-[12px]" onPress={handleAllow}>
                  <Text className="text-accentGold text-[17px] text-center font-bold">{i18n.t('onboarding_notification_allow')}</Text>
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
        {/* <Animated.View
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
      </Animated.View> */}
      </View>
    </>

  );
}
