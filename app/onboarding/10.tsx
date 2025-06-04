import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Alert, Linking, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingStore } from '../stores/onboardingStore';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import analytics from '../../utils/analytics';
import { useNotificationStore, NotificationTimeOption } from '../stores/notificationStore';
import { useTranslation } from 'react-i18next';

export default function OnboardingReminderTimeScreen() {
  const router = useRouter();
  const { setNotificationPreference } = useOnboardingStore();
  const {
    scheduleDailyReminder,
    setPreferredNotificationTime,
    scheduleStreakReminders,
    setNotificationsEnabled,
    listScheduledNotifications
  } = useNotificationStore();
  const [selectedOption, setSelectedOption] = useState<string | undefined>(undefined);
  const [pressedButton, setPressedButton] = useState<string | null>(null);
  const { t } = useTranslation();

  // Create Reanimated shared values for each component
  const iconOpacity = useSharedValue(0);
  const iconTranslateY = useSharedValue(40);

  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(40);

  const subtextOpacity = useSharedValue(0);
  const subtextTranslateY = useSharedValue(40);

  const optionsOpacity = useSharedValue(0);
  const optionsTranslateY = useSharedValue(40);

  useEffect(() => {
    // Log screen view when component mounts
    analytics.logEvent("OnboardingReminderTimeScreen_Viewed");

    // Reset animation values
    iconOpacity.value = 0;
    iconTranslateY.value = 40;
    titleOpacity.value = 0;
    titleTranslateY.value = 40;
    subtextOpacity.value = 0;
    subtextTranslateY.value = 40;
    optionsOpacity.value = 0;
    optionsTranslateY.value = 40;

    // Staggered animations for each component
    const animateComponent = (opacity: any, translateY: any, delay: number) => {
      opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
      translateY.value = withDelay(delay,
        withSpring(0, {
          damping: 20,
          stiffness: 90,
        })
      );
    };

    // Start animations with delays
    animateComponent(iconOpacity, iconTranslateY, 0);
    animateComponent(titleOpacity, titleTranslateY, 200);
    animateComponent(subtextOpacity, subtextTranslateY, 300);
    animateComponent(optionsOpacity, optionsTranslateY, 400);
  }, []);

  // Create animated styles for each component
  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ translateY: iconTranslateY.value }]
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }]
  }));

  const subtextStyle = useAnimatedStyle(() => ({
    opacity: subtextOpacity.value,
    transform: [{ translateY: subtextTranslateY.value }]
  }));

  const optionsStyle = useAnimatedStyle(() => ({
    opacity: optionsOpacity.value,
    transform: [{ translateY: optionsTranslateY.value }]
  }));

  const handleSelection = async (time: string) => {
    // Trigger light haptic feedback
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        console.log('Haptics not available');
      });
    } catch (error) {
      console.log('Haptics not available');
    }

    // Track analytics event
    analytics.logEvent("OnboardingReminderTimeScreen_Tapped_Option", {
      value: time,
    });

    setSelectedOption(time);

    // Save to onboarding store using the typed method
    await setNotificationPreference({
      enabled: time !== 'none',
      time: time
    });

    const isNotificationsEnabled = time !== 'none';

    if (isNotificationsEnabled) {
      console.log('📱 Onboarding: User wants notifications, checking permissions');

      // Check for notification permissions
      const { status } = await Notifications.getPermissionsAsync();
      console.log(`📱 Current notification permission status: ${status}`);

      if (status !== 'granted') {
        // Request permission if not already granted
        console.log('📱 Onboarding: Requesting notification permissions');
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        console.log(`📱 New notification permission status: ${newStatus}`);

        if (newStatus !== 'granted') {
          // Alert user that notifications won't work without permission
          console.log('📱 Onboarding: Notification permission denied');
          Alert.alert(
            t('onboarding.reminderTime.permissionRequired'),
            t('onboarding.reminderTime.permissionMessage'),
            [
              {
                text: t('onboarding.reminderTime.openSettings'),
                onPress: () => {
                  analytics.logEvent("Onboarding_Opened_SystemSettings_Notifications");
                  Linking.openSettings();
                }
              },
              {
                text: t('onboarding.reminderTime.continueAnyway'),
                style: 'default',
                onPress: () => {
                  router.push('/onboarding/rating');
                }
              }
            ]
          );
          return;
        }
      }

      console.log('📱 Onboarding: Scheduling both daily reminder and streak notifications');

      // Enable notifications in the store
      setNotificationsEnabled(true);

      // Set the preferred notification time in the store
      setPreferredNotificationTime(time as NotificationTimeOption);

      // Schedule the daily reminder notification using the notificationStore
      try {
        await scheduleDailyReminder(time as NotificationTimeOption);
        console.log(`📱 Onboarding: Successfully scheduled daily reminder for ${time}`);
      } catch (error) {
        console.log('📱 Onboarding: Error scheduling daily reminder:', error);
      }

      // Also schedule streak warning notifications
      try {
        await scheduleStreakReminders();
        console.log('📱 Onboarding: Successfully scheduled streak notifications');
      } catch (error) {
        console.log('📱 Onboarding: Error scheduling streak notifications:', error);
      }

      // List all scheduled notifications for debugging
      await listScheduledNotifications();
    } else {
      console.log('📱 Onboarding: User opted out of notifications');
      // Disable notifications in the store
      setNotificationsEnabled(false);
    }

    // Navigate to the next screen
    router.push('/onboarding/rating');
  };

  const options = [
    {
      id: 'morning',
      icon: 'sunny-outline',
      color: '#F7B500', // Yellow for morning sun
      bgColor: 'bg-lightYellow',
      title: t('onboarding.reminderTime.options.morning.title'),
      description: t('onboarding.reminderTime.options.morning.description'),
    },
    {
      id: 'afternoon',
      icon: 'partly-sunny-outline',
      color: '#FF8C1A', // Orange for afternoon
      bgColor: 'bg-lightOrange',
      title: t('onboarding.reminderTime.options.afternoon.title'),
      description: t('onboarding.reminderTime.options.afternoon.description'),
    },
    {
      id: 'evening',
      icon: 'moon-outline',
      color: '#7B2BFF', // Purple for evening
      bgColor: 'bg-lightPurple',
      title: t('onboarding.reminderTime.options.evening.title'),
      description: t('onboarding.reminderTime.options.evening.description'),
    },
    {
      id: 'night',
      icon: 'star-outline',
      color: '#3040FF', // Blue for night sky
      bgColor: 'bg-lightIndigo',
      title: t('onboarding.reminderTime.options.night.title'),
      description: t('onboarding.reminderTime.options.night.description'),
    },
    {
      id: 'none',
      icon: 'notifications-off-outline',
      color: '#B89B4C', // Description color
      bgColor: 'bg-surfaceLight',
      title: t('onboarding.reminderTime.options.none.title'),
      description: t('onboarding.reminderTime.options.none.description'),
    },
  ] as const;

  return (
    <View className="flex-1 bg-surfaceCream px-6 pt-16">
      {/* Question Text */}
      <Animated.View style={titleStyle}>
        <Text className="font-feather text-h2 text-center text-textPrimary mb-4 ">
          {t('onboarding.reminderTime.title')}
        </Text>
      </Animated.View>

      {/* Subtext */}
      <Animated.View style={subtextStyle}>
        <Text className="font-din text-center text-description text-body mb-4">
          {t('onboarding.reminderTime.subtitle')}
        </Text>
      </Animated.View>

      {/* Options Container */}
      <ScrollView contentContainerStyle={{ paddingBottom: 90 }} showsVerticalScrollIndicator={false}>
        <Animated.View style={optionsStyle} className="space-y-4 mt-4">
          <View className="space-y-4">
            {options.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => handleSelection(option.id)}
                onPressIn={() => setPressedButton(option.id)}
                onPressOut={() => setPressedButton(null)}
                className={`
              my-2
              h-[80px] bg-white rounded-card border-[3px] border-border px-4
              flex-row items-center shadow-buttonShadow
              ${pressedButton === option.id ? 'translate-y-[3px] shadow-none' : 'translate-y-0'}
              ${selectedOption === option.id ? 'border-accentGold bg-surfaceCream' : ''}
            `}
              >
                <View className={`${option.bgColor} rounded-xl p-3`}>
                  <Ionicons name={option.icon as any} size={24} color={option.color} />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="font-feather text-lg text-textPrimary">{option.title}</Text>
                  <Text className="font-din text-md text-description mt-1">
                    {option.description}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

    </View>
  );
}