import { Feather } from '@expo/vector-icons';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import dayjs from 'dayjs';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Image } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { usePathStore } from '../stores/pathStore';
import { useUserStore } from '../stores/userStore';
import PrimaryButton from '../../components/PrimaryButton';

// Import the icons similar to those in index.tsx
const breadIcon = require('../../assets/icons/breadIcon.png');
const quillIcon = require('../../assets/icons/journalIcon.png');
const dropIcon = require('../../assets/icons/waterIcon.png');

// Define activity type for the timeline
type ActivityType = {
  type: 'reading' | 'prayer' | 'reflection';
  date: FirebaseFirestoreTypes.Timestamp;
  data: any;
  icon: any;
  title: string;
  content?: string;
};

// Add toDateSafe helper function (like in stats.tsx)
function toDateSafe(ts: any): Date {
  if (!ts) return new Date();
  if (ts instanceof Date) return ts;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts.seconds !== undefined) return new Date(ts.seconds * 1000);
  if (ts._seconds !== undefined) return new Date(ts._seconds * 1000);
  return new Date(ts);
}

export default function ProfileScreen() {
  const router = useRouter();
  const {
    getLamb,
    getStreakCount,
    getCreatedAt,
    getCompletedReadings,
    getCompletedPrayers,
    getCompletedReflections,
    getUser,
  } = useUserStore();

  const lamb = getLamb();
  const streak = getStreakCount();
  const createdAtTimestamp = getCreatedAt();
  const completedReadings = getCompletedReadings();
  const completedPrayers = getCompletedPrayers();
  const completedReflections = getCompletedReflections();
  const user = getUser();
  const userId = user?.id || 'Anonymous user';

  // Format join date - handle both Timestamp and undefined cases
  const joinDate = useMemo(() => {
    // Handle the case when createdAt doesn't exist
    if (!createdAtTimestamp) return 'Just started';

    try {
      const date = toDateSafe(createdAtTimestamp);
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (error) {
      console.error('Error formatting createdAt date:', error, createdAtTimestamp);
      return 'Error displaying date';
    }
  }, [createdAtTimestamp]);

  // Show settings sheet
  const handleShowSettings = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (typeof global !== 'undefined' && (global as any).showSettings) {
      (global as any).showSettings({
        userId,
      });
    } else {
      console.error('showSettings not available on global object');
    }
  }, [userId]);

  // Get selected path from pathStore
  const selectedPath = usePathStore((state) => state.selectedPath);

  // Combine all activities and sort by date (newest first)
  const allActivities = useMemo<ActivityType[]>(() => {
    const readings =
      completedReadings?.map((reading) => ({
        type: 'reading' as const,
        date: reading.date,
        data: reading,
        icon: breadIcon,
        title: `Read ${reading.book} ${reading.chapters?.join(', ') || ''}`,
      })) || [];

    const prayers = completedPrayers?.map(prayer => {
      let prayerTitle = `${prayer.type || 'Daily'} Prayer`;
      if (prayer.topic && prayer.topic.toLowerCase() !== 'general') {
        prayerTitle = `Prayed for ${prayer.topic}`;
      }
      return {
        type: 'prayer' as const,
        date: prayer.date,
        data: prayer, // raw prayer object for potential future use
        icon: dropIcon,
        title: prayerTitle,
        // content: prayer.content, // Only if prayer.content exists on the Prayer type
      };
    }) || [];

    const reflections =
      completedReflections?.map((reflection) => ({
        type: 'reflection' as const,
        date: reflection.date,
        data: reflection,
        icon: quillIcon,
        title: 'Quiet Time',
        content: reflection.content,
      })) || [];

    const combined = [...readings, ...prayers, ...reflections];
    return combined.sort((a, b) => {
      const dateA = toDateSafe(a.date);
      const dateB = toDateSafe(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  }, [completedReadings, completedPrayers, completedReflections]);

  // Function to format activity date for headers
  const formatActivityDate = (timestamp: FirebaseFirestoreTypes.Timestamp | any): string => {
    try {
      const date = toDateSafe(timestamp);
      const today = new Date();

      // Check if the date is today
      if (dayjs(date).isSame(dayjs(today), 'day')) {
        return 'Today';
      }

      // Check if the date is yesterday
      if (dayjs(date).isSame(dayjs(today).subtract(1, 'day'), 'day')) {
        return 'Yesterday';
      }

      // Otherwise, format the date
      return dayjs(date).format('MMM D, YYYY');
    } catch (error) {
      console.error('Error formatting activity date:', error, timestamp);
      return 'Unknown date';
    }
  };

  // Function to format relative time (30m ago, 2d ago, etc.)
  const formatRelativeTime = (timestamp: FirebaseFirestoreTypes.Timestamp | any): string => {
    try {
      const date = toDateSafe(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();

      // Less than a minute
      if (diffMs < 60000) {
        return 'just now';
      }

      // Minutes
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) {
        return `${diffMins}m ago`;
      }

      // Hours
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) {
        return `${diffHours}h ago`;
      }

      // Days
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) {
        return `${diffDays}d ago`;
      }

      // Months
      const diffMonths = Math.floor(diffDays / 30);
      if (diffMonths < 12) {
        return `${diffMonths}mo ago`;
      }

      // Years
      const diffYears = Math.floor(diffMonths / 12);
      return `${diffYears}y ago`;
    } catch (error) {
      console.error('Error formatting relative time:', error, timestamp);
      return '';
    }
  };

  // Handle subscription button press
  const handleSubscriptionPress = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywall();

      // Handle the paywall result
      switch (paywallResult) {
        case PAYWALL_RESULT.PURCHASED:
          console.log('Purchase completed successfully');
          break;
        case PAYWALL_RESULT.RESTORED:
          console.log('Purchase restored successfully');
          break;
        case PAYWALL_RESULT.CANCELLED:
          console.log('Purchase cancelled by user');
          break;
        case PAYWALL_RESULT.ERROR:
          console.log('Error occurred during purchase');
          break;
      }
    } catch (error) {
      console.error('Error presenting paywall:', error);
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF4D9' }}>
        <ScrollView className="flex-1 bg-surfaceCream" contentContainerStyle={{ paddingBottom: 50 }}>
          {/* Header */}
          <View className="flex-row justify-between items-center px-6 pt-8 pb-4">
            <Text className="font-feather text-h2 text-textPrimary">Profile</Text>
            <TouchableOpacity
              onPress={handleShowSettings}
              className="w-10 h-10 rounded-full bg-lightYellow items-center justify-center">
              <Feather name="settings" size={20} color="#B89B4C" />
            </TouchableOpacity>
          </View>

          {/* Lamb Stats Card */}
          <View className="mx-6 mt-4 bg-white rounded-[20px] p-6 shadow-card">
            <View className="flex-row justify-between items-center mb-6">
              <View className="bg-lightYellow px-4 py-1 rounded-lg opacity-80">
                <Text className="font-feather text-heading text-primary">
                  {lamb.name ? lamb.name : 'Your Lamb'}
                </Text>
              </View>
              <Image
                source={require('../../assets/icons/sheepIcon.png')}
                className="w-12 h-12 rounded-full"
              />
            </View>

            {/* Stats Grid */}
            <View className="flex-row justify-between space-x-8">
              <View className="flex-1 items-center bg-surfaceCream rounded-xl py-3 ">
                <Text className="font-feather text-h2 text-textPrimary">{lamb.level}</Text>
                <Text className="font-din text-description">Level</Text>
              </View>
              <View className="flex-1 items-center bg-surfaceCream rounded-xl py-3 mx-4">
                <Text className="font-feather text-h2 text-textPrimary">{streak}</Text>
                <Text className="font-din text-description">Day Streak</Text>
              </View>

              <View className="flex-1 items-center bg-surfaceCream rounded-xl py-3">
                <Text className="font-feather text-h2 text-textPrimary">{lamb.hearts}</Text>
                <Text className="font-din text-description">Hearts</Text>
              </View>
            </View>
            {/* XP Bar */}
            <View className="mt-6 mx-2">
              <View className="flex-row justify-between mb-2">
                <Text className="font-din text-description">Experience</Text>
                <Text className="font-din text-description">{lamb.xp} XP</Text>
              </View>
              <View className="h-4 bg-lightYellow rounded-full overflow-hidden">
                <View
                  className="h-full bg-accentGold rounded-full"
                  style={{ width: `${Math.min(((lamb.xp % 100) / 100) * 100, 100)}%` }}
                />
              </View>
            </View>
          </View>

          {/* Join Date Card */}
          <View className="mx-6 mt-4 bg-white rounded-[20px] p-6 shadow-card">
            <Text className="font-feather text-heading text-textPrimary mb-2">Journey Started</Text>
            <Text className="font-din text-description">{joinDate}</Text>
          </View>

          {/* Activity History Timeline Card */}
          <View className="mx-6 mt-4 bg-white rounded-[20px] p-6 shadow-card">
            <Text className="font-feather text-heading text-textPrimary mb-4">Your Journey</Text>

            {allActivities.length === 0 ? (
              <Text className="font-din text-description text-center py-6">
                No activities yet. Begin your journey today!
              </Text>
            ) : (
              <View className="mt-2">
                {allActivities.map((activity, index) => {
                  // Get date as string
                  const dateString = formatActivityDate(activity.date);

                  // Check if we need to show a date header (first item or different day from previous)
                  const showDateHeader =
                    index === 0 ||
                    formatActivityDate(activity.date) !==
                      formatActivityDate(allActivities[index - 1].date);

                  return (
                    <View key={`${activity.type}-${index}`}>
                      {/* Date header if needed */}
                      {showDateHeader && (
                        <View className="py-2 mb-2">
                          <Text className="font-feather text-body text-accentGold">
                            {dateString}
                          </Text>
                        </View>
                      )}

                      {/* Activity item */}
                      <View className="flex-row mb-4 relative">
                        {/* Timeline line */}
                        {index < allActivities.length - 1 && (
                          <View
                            className="absolute bg-border"
                            style={{ width: 2, left: 14, top: 28, bottom: -16 }}
                          />
                        )}

                        {/* Icon */}
                        <View className="bg-surfaceCream w-8 h-8 rounded-full justify-center items-center mr-4 z-10">
                          <Image source={activity.icon} className="w-5 h-5" />
                        </View>

                        {/* Content */}
                        <View className="flex-1 flex-row justify-between bg-surfaceCream px-4 py-3 rounded-md items-center">
                          <View className="flex-1 mr-2">
                            <Text className="font-feather text-body text-textPrimary flex-wrap">
                              {activity.title}
                            </Text>
                            {/* Display prayer topic or reflection content if available */}
                            {(activity.type === 'prayer' && activity.data.topic && activity.title !== `Prayed for ${activity.data.topic}`) && (
                              <Text className="font-din text-sm text-description mt-1">
                                Topic: {activity.data.topic}
                              </Text>
                            )}
                            {(activity.type === 'reflection' && activity.content) && (
                              <Text className="font-din text-sm text-description mt-1" numberOfLines={1} ellipsizeMode="tail">
                                {activity.content}
                              </Text>
                            )}
                          </View>
                          <Text className="font-din text-description text-sm ml-2">
                            {formatRelativeTime(activity.date)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Selected Path Card */}
          <View className="mx-6 mt-4 bg-white rounded-[20px] p-6 shadow-card">
            <Text className="font-feather text-heading text-textPrimary mb-2">Selected Path</Text>
            <Text className="font-din text-description">
              {selectedPath?.title || 'No path selected'}
            </Text>
          </View>

          {/* Subscription Management Section */}
          <View className="mx-6 mt-4 bg-white rounded-[20px] p-6 shadow-card">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="font-feather text-heading text-textPrimary">Manage Subscription</Text>
              {user?.proStatus === 'pro' && (
                <View className="bg-lightYellow px-4 py-1 rounded-full">
                  <Text className="font-din text-accentGold">Pro</Text>
                </View>
              )}
            </View>
            <Text className="font-din text-description mb-4">
              {user?.proStatus === 'pro'
                ? 'You have access to all premium features!'
                : 'Unlock premium features and enhance your spiritual journey.'}
            </Text>
            {user?.proStatus !== 'pro' && (
              <PrimaryButton
                title="Upgrade to Pro"
                onPress={handleSubscriptionPress}
                style="mt-0"
              />
            )}
          </View>

          {/* Store Section */}
          <View className="mx-6 mt-4 mb-8 bg-white/50 rounded-[20px] p-6 shadow-card">
            <View className="flex-row justify-between items-center">
              <Text className="font-feather text-heading text-textPrimary">Store</Text>
              <View className="bg-lightYellow px-4 py-1 rounded-full">
                <Text className="font-din text-accentGold">Coming Soon</Text>
              </View>
            </View>
            <Text className="font-din text-description mt-2">
              Customize your lamb and unlock special items!
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
