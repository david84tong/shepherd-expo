import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useUserStore } from '../stores/userStore';
import Animated, { 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import analytics, { AnalyticsEvent, EventCategory } from '../../utils/analytics';

// Function to schedule the notification
const scheduleNotification = async (timeOption: string) => {
  // Skip if user selected 'none'
  if (timeOption === 'none') {
    return;
  }
  
  try {
    // Get permission first
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }
    
    // Cancel any existing notifications
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // Parse time ranges into hours for notifications
    let hour = 8; // Default to 8 AM
    
    switch (timeOption) {
      case 'morning':
        hour = 8; // 8 AM
        break;
      case 'afternoon':
        hour = 14; // 2 PM
        break;
      case 'evening':
        hour = 19; // 7 PM
        break;
      case 'night':
        hour = 21; // 9 PM
        break;
      default:
        hour = 8; // Default to 8 AM
    }
    
    // Schedule daily notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time to talk with the Shepherd",
        body: "Take a moment to read scripture and connect with God.",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60 * 60 * 24, // 24 hours
        repeats: true,
      },
    });
    
    console.log(`Notification scheduled to repeat daily`);
  } catch (error) {
    console.error('Failed to schedule notification:', error);
  }
};

export default function OnboardingReminderTimeScreen() {
  const router = useRouter();
  const { setNotificationPreference } = useOnboardingStore();
  const { setNotificationTime } = useUserStore();
  const [selectedOption, setSelectedOption] = useState<string | undefined>(undefined);
  const [pressedButton, setPressedButton] = useState<string | null>(null);

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
    analytics.logScreenView('OnboardingReminderTimeScreen', { 
      step: 10,
      category: EventCategory.ONBOARDING
    });
    
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
    analytics.logEvent(AnalyticsEvent.BUTTON_PRESS, {
      action: 'notification_time_selected',
      value: time,
      screen: 'OnboardingReminderTimeScreen',
      category: EventCategory.ONBOARDING
    });
    
    setSelectedOption(time);
    
    // Save to onboarding store using the typed method
    await setNotificationPreference({
      enabled: time !== 'none',
      time: time
    });
    
    // Save to user store
    setNotificationTime(time);
    
    // Schedule the notification
    await scheduleNotification(time);
    
    // Navigate to the next screen
    router.push('/onboarding/11');
  };

  const options = [
    {
      id: 'morning',
      icon: 'sunny-outline',
      color: '#F7B500', // Yellow for morning sun
      bgColor: 'bg-lightYellow',
      title: 'Morning (7-9 AM)',
      description: 'Start your day with scripture',
    },
    {
      id: 'afternoon',
      icon: 'partly-sunny-outline',
      color: '#FF8C1A', // Orange for afternoon
      bgColor: 'bg-lightOrange',
      title: 'Afternoon (2-5 PM)',
      description: 'Mid-day reflection time',
    },
    {
      id: 'evening',
      icon: 'moon-outline',
      color: '#7B2BFF', // Purple for evening
      bgColor: 'bg-lightPurple',
      title: 'Evening (6-8 PM)',
      description: 'Wind down with God\'s word',
    },
    {
      id: 'night',
      icon: 'star-outline',
      color: '#3040FF', // Blue for night sky
      bgColor: 'bg-lightIndigo',
      title: 'Night (9-11 PM)',
      description: 'Peaceful moments before sleep',
    },
    {
      id: 'none',
      icon: 'notifications-off-outline',
      color: '#B89B4C', // Description color
      bgColor: 'bg-surfaceLight',
      title: 'No reminders, please',
      description: 'I\'ll remember on my own',
    },
  ] as const;

  return (
    <View className="flex-1 bg-surfaceCream px-6 pt-16">
      {/* Question Text */}
      <Animated.View style={titleStyle}>
        <Text className="font-feather text-h1 text-center text-textPrimary mb-4">
          When would you like to be reminded to read?
        </Text>
      </Animated.View>
      
      {/* Subtext */}
      <Animated.View style={subtextStyle}>
        <Text className="font-din text-center text-description text-body mb-8">
          This can be edited later in settings
        </Text>
      </Animated.View>

      {/* Options Container */}
      <Animated.View style={optionsStyle} className="space-y-4 mt-4">
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
      </Animated.View>
    </View>
  );
}