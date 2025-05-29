import { AntDesign, Feather } from '@expo/vector-icons';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import dayjs from 'dayjs';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Image, Linking, Alert, Modal, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import analytics from '../../utils/analytics';
import { FontAwesome6 } from '@expo/vector-icons';
import { useAuth } from '../hooks/authHook';
import { getLevelData } from '../../utils/levelUtils';

import { usePathStore } from '../stores/pathStore';
import { useUserStore } from '../stores/userStore';
import useSubscriptionStore from '../stores/subscriptionStore';
import PrimaryButton from '../../components/PrimaryButton';
import OnboardingPathScreen from '../onboarding/8';

// Import the icons using import statements
import breadIcon from '../../assets/icons/breadIcon.png';
import quillIcon from '../../assets/icons/journalIcon.png';
import dropIcon from '../../assets/icons/waterIcon.png';
import sheepIcon from '../../assets/icons/sheepIcon.png';

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

const DISCORD_CARD_DISMISSED_KEY = 'shepherd_discord_card_dismissed_v1';

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

  // Get subscription state and actions from the store
  const {
    isProMember,
    presentPaywall,
    getCustomerInfo,
    setFromScreen,
  } = useSubscriptionStore();

  const lamb = getLamb();
  const streak = getStreakCount();
  const createdAtTimestamp = getCreatedAt();
  const completedReadings = getCompletedReadings();
  const completedPrayers = getCompletedPrayers();
  const completedReflections = getCompletedReflections();
  const user = getUser();
  const userId = user?.id || null;

  const [showDiscordCard, setShowDiscordCard] = useState(true);
  const { signInWithApple, signInWithGoogle } = useAuth();
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  // Detect if user is anonymous (no email and displayName is 'Anonymous User')
  const isAnonymous = !user?.email

  // Fetch customer info when the component mounts or when app comes to foreground
  useEffect(() => {
    getCustomerInfo();
    // Optional: Add listener for app state changes to refresh customer info
    // when app comes to foreground
  }, [getCustomerInfo]);

  useEffect(() => {
    const checkDismissalStatus = async () => {
      try {
        const dismissed = await AsyncStorage.getItem(DISCORD_CARD_DISMISSED_KEY);
        if (dismissed === 'true') {
          setShowDiscordCard(false);
        }
      } catch (error) {
        console.error('Failed to load discord card dismissal status', error);
      }
    };
    checkDismissalStatus();
  }, []);

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
        userId: userId || 'Anonymous user',
      });
    } else {
      console.error('showSettings not available on global object');
    }
  }, [userId]);

  // Get selected path from pathStore
  const selectedPath = usePathStore((state) => state.selectedPath);

  const handleDismissDiscordCard = useCallback(async () => {
    try {
      await AsyncStorage.setItem(DISCORD_CARD_DISMISSED_KEY, 'true');
      setShowDiscordCard(false);
      analytics.logEvent('Profile_DiscordCard_Dismissed');
    } catch (error) {
      console.error('Failed to save discord card dismissal status', error);
    }
  }, []);

  const handleJoinDiscord = useCallback(async () => {
    analytics.logEvent('Profile_DiscordCard_Joined');
    await handleDismissDiscordCard();
    try {
      // Replace 'YOUR_DISCORD_INVITE_LINK' with your actual Discord server invite link
      await Linking.openURL('https://discord.gg/W9MZdVaKBs');
    } catch (err) {
      console.error("Failed to open Discord link", err);
      Alert.alert("Error", "Could not open the Discord link. Please ensure Discord is installed or try again later.");
    }
  }, [handleDismissDiscordCard]);

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

  // Handle subscription button press using the store action
  const handleSubscriptionPress = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await presentPaywall();
  }, [presentPaywall]);

  // Get app version and build number
  const appVersion = Application.nativeApplicationVersion || 'Unknown';
  const buildNumber = Application.nativeBuildVersion || 'Unknown';

  // Handle sign in based on platform
  const handleSignIn = async () => {
    setSignInError(null);
    setSignInLoading(true);
    try {
      if (Platform.OS === 'ios') {
        await signInWithApple(false); // Not login mode, upgrade anonymous
      } else {
        await signInWithGoogle(false); // Not login mode, upgrade anonymous
      }
      // On success, user store will update and card will disappear
    } catch (error: any) {
      let errorMessage = Platform.OS === 'ios'
        ? 'There was a problem signing in with Apple.'
        : 'There was a problem signing in with Google.';

      if (error.message?.includes('canceled') || error.message?.includes('cancelled')) {
        errorMessage = 'Sign in was canceled. Please try again.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message?.includes('configuration')) {
        errorMessage = 'Authentication configuration error. Please try another method.';
      } else if (error.message?.includes('incomplete')) {
        errorMessage = 'Sign in process was interrupted. Please try again.';
      } else if (error.message?.includes("operation couldn't be completed")) {
        errorMessage = 'Sign in process could not be completed. Please try again.';
      } else if (error.message?.includes('No account found')) {
        errorMessage = Platform.OS === 'ios'
          ? "We couldn't find an account with this Apple ID. Please create a new account instead."
          : "We couldn't find an account with this Google account. Please create a new account instead.";
      } else if (error.message?.includes('Failed to fetch your account data')) {
        errorMessage = "We couldn't retrieve your account data. Please try again.";
      }
      setSignInError(errorMessage);
    } finally {
      setSignInLoading(false);
    }
  };

  // Modal state for path selection
  const [showPathModal, setShowPathModal] = useState(false);
  // Check if onboarding is completed - defaulting to true if not found
  const onboardingCompleted = (user as any)?.onboarding_completed ?? true;

  // Handler for updating path selection
  const handlePathSelected = (pathObj: any) => {
    if (!pathObj) return;
    // Update pathStore
    if (typeof pathObj === 'object' && pathObj.id) {
      usePathStore.getState().setSelectedPath(pathObj);
      // Update userStore as well
      useUserStore.getState().setUser({ selectedPathId: pathObj.id });
    }
    setShowPathModal(false);
  };

  // Calculate level and XP progress data
  const levelData = useMemo(() => {
    if (!lamb || typeof lamb.xp !== 'number') {
      return {
        level: 1,
        xp: 0,
        xpCurrent: 0,
        xpForCurrentLevel: 0,
        xpForNextLevel: 90,
        xpProgress: 0,
        xpNeeded: 90,
        progress: 0
      };
    }

    const data = getLevelData(lamb.xp);
    return {
      ...data,
      xpCurrent: data.xp // Alias for backwards compatibility
    };
  }, [lamb?.xp]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar translucent backgroundColor="transparent" />
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

          {/* Sign In to Save Progress Card (only for anonymous users) */}
          {isAnonymous && (
            <View className="mx-6 mt-4 bg-white rounded-[20px] p-6 shadow-card">
              <Text className="font-feather text-xl text-accentGold mb-2 text-center">Sign in to save your progress</Text>
              <Text className="font-din text-body text-textPrimary mb-4 text-center">
                Create a free account to sync your streak, XP, and lamb across devices. You can always sign in later!
              </Text>

              <View className="items-center mb-4">
                <TouchableOpacity
                  className={`flex-row items-center justify-center ${Platform.OS === 'ios' ? 'bg-black' : 'bg-white border border-gray-300'} w-full py-4 px-6 rounded-[16px] mb-4 shadow-appleShadow`}
                  onPress={handleSignIn}
                  disabled={signInLoading}>
                  {signInLoading ? (
                    <ActivityIndicator color={Platform.OS === 'ios' ? "white" : "#4285F4"} size="small" style={{ marginRight: 10 }} />
                  ) : (
                    <AntDesign
                      name={Platform.OS === 'ios' ? "apple1" : "google"}
                      size={24}
                      color={Platform.OS === 'ios' ? "white" : "#4285F4"}
                      style={{ marginRight: 10 }}
                    />
                  )}
                  <Text className={`font-din ${Platform.OS === 'ios' ? 'text-white' : 'text-[#4285F4]'} text-[18px] font-bold`}>
                    {signInLoading ? 'Signing in...' : Platform.OS === 'ios' ? 'Sign in with Apple' : 'Sign in with Google'}
                  </Text>
                </TouchableOpacity>
              </View>
              {signInError && (
                <Text className="font-din text-red-500 text-center mt-2">{signInError}</Text>
              )}
            </View>
          )}

          {/* Discord Card */}
          {showDiscordCard && (
            <View className="mx-6 mt-4 bg-lightPurple rounded-[20px] p-6 shadow-card relative">
              <TouchableOpacity
                onPress={handleDismissDiscordCard}
                className="absolute top-3 right-3 p-1 z-10 bg-darkPurple/10 rounded-full">
                <Feather name="x" size={20} color="#3C584A" />
              </TouchableOpacity>

              <View className="flex-row items-center mb-4">
                <View className="bg-white p-3 rounded-full mr-4 shadow-md">
                  <FontAwesome6 name="discord" size={20} color="#5865F2" />
                </View>
                <View className="flex-1">
                  <Text className="font-feather text-xl text-darkPurple">Join our Shepherd Family!</Text>
                  <Text className="font-din text-body text-darkPurple opacity-80 mt-1 leading-tight">
                    Connect, share insights, and grow together on our Discord server.
                  </Text>
                </View>
              </View>

              <PrimaryButton
                title="Join the Herd"
                onPress={handleJoinDiscord}
                primaryColor="bg-darkPurple"
                textColor="text-white"
                shadowStyle="shadow-darkPurple" // Assuming you have this in tailwind.config.js
                style="mt-2"
              />
            </View>
          )}
          {/* Lamb Stats Card */}
          <View className="mx-6 mt-4 bg-white rounded-[20px] p-6 shadow-card">
            <View className="flex-row justify-between items-center mb-6">
              <View className="bg-lightYellow px-4 py-1 rounded-lg opacity-80">
                <Text className="font-feather text-heading text-primary">
                  {lamb.name ? lamb.name : 'Your Lamb'}
                </Text>
              </View>
              <Image
                source={sheepIcon}
                className="w-12 h-12 rounded-full"
              />
            </View>

            {/* Stats Grid */}
            <View className="flex-row justify-between space-x-8">
              <View className="flex-1 items-center bg-surfaceCream rounded-xl py-3 ">
                <Text className="font-feather text-h2 text-textPrimary">{levelData.level}</Text>
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
                <Text className="font-din text-description">Level {levelData.level}</Text>
                <Text className="font-din text-description">{levelData.xpCurrent}/{levelData.xpForNextLevel} XP</Text>
              </View>
              <View className="h-4 bg-lightYellow rounded-full overflow-hidden">
                <View
                  className="h-full bg-accentGold rounded-full"
                  style={{ width: `${levelData.progress}%` }}
                />
              </View>
            </View>
          </View>

          {/* Join Date Card */}
          <View className="mx-6 mt-4 bg-white rounded-[20px] p-6 shadow-card">
            <Text className="font-feather text-heading text-textPrimary mb-2">Journey Started</Text>
            <Text className="font-din text-description">{joinDate}</Text>
          </View>

          {/* Selected Path Card */}
          <View className="mx-6 mt-4 bg-white rounded-[20px] p-6 shadow-card">
            <Text className="font-feather text-heading text-textPrimary mb-2">Selected Path</Text>
            <TouchableOpacity onPress={() => setShowPathModal(true)} activeOpacity={0.7}>
              <Text className="font-din text-description underline text-accentGold">
                {selectedPath?.title || 'No path selected'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Path Selection Modal */}
          <Modal
            visible={showPathModal}
            animationType="slide"
            transparent={false}
            onRequestClose={() => setShowPathModal(false)}
          >
            <View style={{ flex: 1, backgroundColor: '#FFF4D9' }}>
              {/* Show X button if onboarding_completed */}
              {onboardingCompleted && (
                <TouchableOpacity
                  onPress={() => setShowPathModal(false)}
                  style={{ position: 'absolute', top: 48, right: 24, zIndex: 10, backgroundColor: '#fff', borderRadius: 20, padding: 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4 }}
                  hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                >
                  <Feather name="x" size={24} color="#3C584A" />
                </TouchableOpacity>
              )}
              <OnboardingPathScreen
                // Pass a callback to handle path selection
                onPathSelected={handlePathSelected}
                // Optionally pass selectedPathId for highlighting
                selectedPathId={selectedPath?.id}
                hideContinueButton={false}
              />
            </View>
          </Modal>

          {/* Subscription Management Section */}
          <View className="mx-6 mt-4 bg-white rounded-[20px] p-6 shadow-card">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="font-feather text-heading text-textPrimary">Manage Subscription</Text>
              {isProMember && (
                <View className="bg-lightYellow px-4 py-1 rounded-full">
                  <Text className="font-din text-accentGold">Pro</Text>
                </View>
              )}
            </View>
            <Text className="font-din text-description mb-4">
              {isProMember
                ? 'You have access to all premium features!'
                : 'Unlock premium features and enhance your spiritual journey'}
            </Text>
            {!isProMember && (
              <>
                <PrimaryButton
                  title="Upgrade to Pro"
                  onPress={() => {
                    setFromScreen('profile');
                    router.push('/PricingScreen' as any)
                  }}
                  style="mt-0 mb-3"
                />
              </>
            )}
          </View>

          {/* Store Section */}
          <View className="mx-6 mt-4 mb-8 bg-white/50 rounded-[20px] p-6 shadow-card">
            <View className="flex-row justify-between items-center">
              <Text className="font-feather text-heading text-textPrimary">Store</Text>
              <View className="bg-lightYellow px-4 py-1 rounded-full">
                <Text className="font-feather text-accentGold">Unlocks at Level 10</Text>
              </View>
            </View>
            <Text className="font-din text-description mt-2">
              Customize your lamb and unlock special items!
            </Text>
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
          {/* Version Info */}
          <View className="mx-6 mt-2 mb-10 items-center">
            <Text className="font-din text-description text-center text-textSecondary opacity-60">
              Version {appVersion} (Build {buildNumber})
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView >
  );
}
