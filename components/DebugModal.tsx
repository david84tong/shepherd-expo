import { BottomSheetModal } from '@gorhom/bottom-sheet';
import firestore from '@react-native-firebase/firestore';
import { useRouter, usePathname } from 'expo-router';
import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, SafeAreaView, ScrollView, Alert } from 'react-native';
import Toast, { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

import SuccessAnimation from './SuccessAnimation'; // Import the full SuccessAnimation component
import SuccessAnimationContent from './SuccessAnimation'; // Assuming SuccessAnimation is in the same components dir
import { HalfModalType } from '../app/halfModal';
import { useHomeStore, SuccessAnimationType } from '../app/stores/homeStore';
import { useUserStore } from '../app/stores/userStore';
import { usePathStore } from '../app/stores/pathStore';

// Debug screen destinations
interface DebugScreen {
  name: string;
  route: string;
  params?: Record<string, string>;
}

// Onboarding screens for debugging
const ONBOARDING_SCREENS: DebugScreen[] = [
  { name: 'Onboarding 1 - Welcome', route: '/onboarding/1' },
  { name: 'Onboarding 2 - Lamb Name', route: '/onboarding/2' },
  { name: 'Onboarding 3 - Intent', route: '/onboarding/3' },
  { name: 'Onboarding 4 - Bible Familiarity', route: '/onboarding/4' },
  { name: 'Onboarding 5 - Reading Time', route: '/onboarding/5' },
  { name: 'Onboarding 6 - Custom Plan', route: '/onboarding/6' },
  { name: 'Onboarding 7 - Notifications', route: '/onboarding/7' },
  { name: 'Onboarding 8 - Path Selection', route: '/onboarding/8' },
  { name: 'Onboarding 9 - Notification Permission', route: '/onboarding/9' },
  { name: 'Onboarding 10 - Reminder Time', route: '/onboarding/10' },
  { name: 'Loading Screen', route: '/onboarding/LoadingScreen' },
];

// Feature screens for debugging
const FEATURE_SCREENS: DebugScreen[] = [{ name: 'Streak Screen', route: '/streak' }];

// Custom toast config with tailwind styling
const toastConfig: ToastConfig = {
  success: ({ text1, text2 }: ToastConfigParams<any>) => (
    <View className="bg-surfaceCream rounded-xl px-4 py-3 mx-4 mb-4 border-l-4 border-darkGreen shadow-md">
      <Text className="font-feather text-base text-textPrimary">{text1}</Text>
      {text2 && <Text className="font-din text-sm text-description mt-1">{text2}</Text>}
    </View>
  ),
  error: ({ text1, text2 }: ToastConfigParams<any>) => (
    <View className="bg-surfaceCream rounded-xl px-4 py-3 mx-4 mb-4 border-l-4 border-red shadow-md">
      <Text className="font-feather text-base text-textPrimary">{text1}</Text>
      {text2 && <Text className="font-din text-sm text-description mt-1">{text2}</Text>}
    </View>
  ),
  info: ({ text1, text2 }: ToastConfigParams<any>) => (
    <View className="bg-surfaceCream rounded-xl px-4 py-3 mx-4 mb-4 border-l-4 border-accentGold shadow-md">
      <Text className="font-feather text-base text-textPrimary">{text1}</Text>
      {text2 && <Text className="font-din text-sm text-description mt-1">{text2}</Text>}
    </View>
  ),
};

// DebugButton component
export function DebugButton() {
  // Export the component
  const router = useRouter();
  const pathname = usePathname();
  const [modalVisible, setModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  // Reference to the success bottom sheet modal
  const successSheetRef = useRef<BottomSheetModal>(null);

  // Snap points for success animation
  const successSnapPoints = useMemo(() => ['90%'], []);

  // Present the success animation directly (not using bottom sheet)
  const handleShowSuccessSheet = useCallback(() => {
    setModalVisible(false);
    // Set success type to READING for demo purposes
    useHomeStore.getState().setSuccessType(SuccessAnimationType.READING);
    setTimeout(() => {
      setSuccessModalVisible(true);
    }, 300);
  }, []);

  // Dismiss the success animation
  const handleDismissSuccessSheet = useCallback(() => {
    setSuccessModalVisible(false);
  }, []);

  // Handler for showing a test modal
  const handleShowPenaltyModal = useCallback(() => {
    // Show a penalty modal for testing
    const params = {
      type: HalfModalType.HEART_PENALTY,
      message: 'Test Penalty Modal',
      subMessage: 'This is a test penalty modal',
      penalty: 5,
      daysMissed: 3,
    };

    // Use global showHalfModal instead of router.push
    if (typeof global !== 'undefined' && (global as any).showHalfModal) {
      (global as any).showHalfModal(params);
    } else {
      console.error('showHalfModal not available on global object');
    }
  }, []);

  // Toast message handlers
  const showSuccessToast = useCallback(() => {
    Toast.show({
      type: 'success',
      text1: 'Daily bread completed!',
      text2: 'You\'ve earned 5 hearts for your lamb.',
      position: 'top',
      visibilityTime: 4000,
    });
  }, []);

  const showErrorToast = useCallback(() => {
    Toast.show({
      type: 'error',
      text1: 'Prayer couldn\'t be saved',
      text2: 'Please check your connection and try again.',
      position: 'top',
      visibilityTime: 4000,
    });
  }, []);

  const showInfoToast = useCallback(() => {
    Toast.show({
      type: 'info',
      text1: 'Streak reminder set',
      text2: 'We\'ll remind you to read Scripture daily.',
      position: 'top',
      visibilityTime: 4000,
    });
  }, []);

  // Handler to set all activity dates to N days ago
  const setAllActivityDates = useCallback((daysAgo: number) => {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
    const timestamp = firestore.Timestamp.fromDate(targetDate);

    // Set activity dates to N days ago
    useUserStore.getState().setLastActivityDate(timestamp);
    useUserStore.getState().setLastReadingDate(timestamp);
    useUserStore.getState().setLastPrayerDate(timestamp);
    useUserStore.getState().setLastReflectionDate(timestamp);

    // Set penalty dates to (N+1) days ago to ensure the condition "daysSince > daysSincePenalty" can be met
    const penaltyDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (daysAgo + 1));
    const penaltyTimestamp = firestore.Timestamp.fromDate(penaltyDate);
    useUserStore.getState().setLastReadingPenaltyDate(penaltyTimestamp);
    useUserStore.getState().setLastPrayerPenaltyDate(penaltyTimestamp);
    useUserStore.getState().setLastReflectionPenaltyDate(penaltyTimestamp);

    Alert.alert(
      'Set Dates',
      `Activity dates: ${daysAgo} day(s) ago\nPenalty dates: ${daysAgo + 1} day(s) ago`
    );
  }, []);

  // Function to directly test the penalty system
  const testPenaltyScenario = useCallback(() => {
    const now = new Date();

    // Set activity dates to 3 days ago to ensure "daysSince > 1" condition is met
    const activityDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3);
    const activityTimestamp = firestore.Timestamp.fromDate(activityDate);
    useUserStore.getState().setLastActivityDate(activityTimestamp);
    useUserStore.getState().setLastReadingDate(activityTimestamp);
    useUserStore.getState().setLastPrayerDate(activityTimestamp);
    useUserStore.getState().setLastReflectionDate(activityTimestamp);

    // Set penalty dates to 1 day ago to ensure "daysSince > daysSincePenalty" condition is met
    const penaltyDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const penaltyTimestamp = firestore.Timestamp.fromDate(penaltyDate);
    useUserStore.getState().setLastReadingPenaltyDate(penaltyTimestamp);
    useUserStore.getState().setLastPrayerPenaltyDate(penaltyTimestamp);
    useUserStore.getState().setLastReflectionPenaltyDate(penaltyTimestamp);

    Alert.alert(
      'Penalty Test',
      'Set up for penalty:\nActivity: 3 days ago\nPenalty: 1 day ago\nPenalties should trigger on next app open.'
    );
  }, []);

  // Handler to set only penalty dates to N days ago
  const setPenaltyDates = useCallback((daysAgo: number) => {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
    const timestamp = firestore.Timestamp.fromDate(targetDate);
    useUserStore.getState().setLastReadingPenaltyDate(timestamp);
    useUserStore.getState().setLastPrayerPenaltyDate(timestamp);
    useUserStore.getState().setLastReflectionPenaltyDate(timestamp);
    // Also set lastActivityDate
    useUserStore.getState().setLastActivityDate(timestamp);
    Alert.alert('Set Dates', `Penalty dates & Last Activity set to ${daysAgo} day(s) ago.`);
  }, []);

  // Handler to set lamb hearts to a specific value
  const setLambHearts = useCallback((hearts: number) => {
    useUserStore.getState().setLambHearts(hearts);
    Alert.alert('Set Hearts', `Lamb hearts set to ${hearts}`);
  }, []);

  // Sync activity dates with penalty dates
  const syncActivityAndPenaltyDates = useCallback(() => {
    const state = useUserStore.getState();
    const readingPenaltyDate = state.getLastReadingPenaltyDate();
    const prayerPenaltyDate = state.getLastPrayerPenaltyDate();
    const reflectionPenaltyDate = state.getLastReflectionPenaltyDate();

    if (readingPenaltyDate) state.setLastReadingDate(readingPenaltyDate);
    if (prayerPenaltyDate) state.setLastPrayerDate(prayerPenaltyDate);
    if (reflectionPenaltyDate) state.setLastReflectionDate(reflectionPenaltyDate);

    Alert.alert('Sync Dates', 'Activity dates synced with their respective penalty dates.');
  }, []);

  // Handler to reset HomeStore data and clear completedReadings
  const handleResetCompletionData = useCallback(() => {
    Alert.alert(
      'Reset Completion Data',
      'This will reset all completion states and clear reading history. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            // Reset homeStore data
            const homeStore = useHomeStore.getState();
            homeStore.resetCompletionStates();
            homeStore.setMode('DEFAULT');
            homeStore.setSuccessType(null);

            // Clear completedReadings from userStore
            const userStore = useUserStore.getState();
            userStore.setCompletedReadings([] as any);

            // Sync with Firestore to save changes
            userStore.syncWithFirestore();

            Alert.alert('Reset Complete', 'HomeStore data and completed readings have been reset.');
          },
        },
      ]
    );
  }, []);

  // Handler to delete all app data
  const handleDeleteAllData = useCallback(() => {
    Alert.alert(
      'Delete All Data',
      'WARNING: This will delete ALL user data and reset the app to a fresh state. This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear AsyncStorage first to ensure clean slate
              console.log('Clearing all AsyncStorage data...');
              await AsyncStorage.clear();
              
              // Reset home store
              const homeStore = useHomeStore.getState();
              homeStore.resetCompletionStates();
              homeStore.setMode('DEFAULT');
              homeStore.setSuccessType(null);

              // Reset user store completely
              const userStore = useUserStore.getState();
              userStore.resetUserStore(); // Use existing method instead of resetUserData
              userStore.setCompletedReadings([] as any);
              userStore.setCompletedPrayers([] as any);
              userStore.setCompletedReflections([] as any);
              userStore.setLambHearts(0);
              userStore.setStreakCount(0); // Use setStreakCount instead of resetStreak

              // Reset path store by setting values to defaults
              const pathStore = usePathStore.getState();
              pathStore.setSelectedPath(null as any);
              pathStore.setCurrentPath(null);
              pathStore.setPathInProgress(false);

              // Sync changes to Firestore
              userStore.syncWithFirestore();

              Toast.show({
                type: 'success',
                text1: 'All data deleted',
                text2: 'The app has been reset to a fresh state.',
                position: 'top',
                visibilityTime: 4000,
              });
            } catch (error) {
              console.error('Failed to delete all data:', error);
              Toast.show({
                type: 'error',
                text1: 'Failed to delete all data',
                text2: 'An error occurred while trying to reset the app.',
                position: 'top',
                visibilityTime: 4000,
              });
            }
          },
        },
      ]
    );
  }, []);

  // Available routes grouped by type
  const ROUTE_GROUPS = {
    'Tab Routes': [
      { name: 'Tabs Home', route: '/(tabs)' },
      { name: 'Home Tab', route: '/(tabs)/home' },
      { name: 'Map Tab', route: '/(tabs)/map' },
      { name: 'Bible Tab', route: '/(tabs)/bible' },
      { name: 'Stats Tab', route: '/(tabs)/stats' },
      { name: 'Profile Tab', route: '/(tabs)/profile' },
    ],
    'Modal Routes': [
      { name: 'Half Modal', route: '/halfModal' },
      { name: 'Streak', route: '/streak' },
    ],
    'Feature Routes': [
      { name: 'Settings', route: '/settings' },
      { name: 'Prayer', route: '/prayer' },
      { name: 'Reflection', route: '/reflection' },
      { name: 'Pricing', route: '/PricingScreen' },
      { name: 'Rating', route: '/onboarding/rating' },
    ],
  };

  // Handler for showing sitemap
  const handleShowSitemap = useCallback(() => {
    setModalVisible(false);
    setTimeout(() => {
      router.push('/sitemap' as any);
    }, 300);
  }, [router]);

  // Handler for showing Prayer Modal
  const handleShowPrayerModal = useCallback(() => {
    setModalVisible(false);

    // Use global showPrayerModal if available
    setTimeout(() => {
      if (typeof global !== 'undefined' && (global as any).showPrayerModal) {
        (global as any).showPrayerModal();
      } else {
        console.error('showPrayerModal not available on global object');
      }
    }, 300);
  }, []);

  const navigateTo = (item: DebugScreen) => {
    setModalVisible(false);
    router.push(item.route as any);
  };

  return (
    <>
      {/* Floating Debug Button */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="absolute bottom-6 left-6 bg-forestGreen80/80 rounded-3xl w-12 h-12 justify-center items-center z-50 shadow-md">
        <Text className="text-white text-2xl">🐛</Text>
      </TouchableOpacity>

      {/* Debug Navigation Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView className="flex-1 bg-black/50">
          <View className="m-5 mt-[60px] bg-surfaceCream rounded-[20px] flex-1 shadow-lg">
            <View className="flex-row items-center justify-between border-b border-b-buttonBorder p-4">
              <Text className="font-feather text-xl text-textPrimary">Debug Menu</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="w-8 h-8 rounded-full bg-forestGreen80 items-center justify-center">
                <Text className="text-white text-base font-bold">✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="p-4">
              {/* Toast Message Section */}
              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-3">
                  Toast Messages
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  <TouchableOpacity
                    className="bg-[#E8F3E0] px-3 py-2 rounded-lg border border-darkGreen mb-1"
                    onPress={showSuccessToast}>
                    <Text className="font-din text-sm text-textPrimary">Success Toast</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    className="bg-[#FFEDED] px-3 py-2 rounded-lg border border-red mb-1"
                    onPress={showErrorToast}>
                    <Text className="font-din text-sm text-textPrimary">Error Toast</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    className="bg-[#FFF4D9] px-3 py-2 rounded-lg border border-accentGold mb-1"
                    onPress={showInfoToast}>
                    <Text className="font-din text-sm text-textPrimary">Info Toast</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-3">
                  Animations & Modals
                </Text>

                {/* Success Animation Button */}
                <TouchableOpacity
                  className="bg-[#E8F3E0] p-4 rounded-xl my-1.5 border-l-4 border-l-[#A0D468]"
                  onPress={handleShowSuccessSheet}>
                  <Text className="font-feather text-base text-textPrimary">
                    Show Success Animation
                  </Text>
                  <Text className="font-din text-sm text-[#7C927E] mt-1">
                    Native Bottom Sheet Animation
                  </Text>
                </TouchableOpacity>

                {/* Heart Penalty Modal Button */}
                <TouchableOpacity
                  className="bg-[#FFEDED] p-4 rounded-xl my-1.5 border-l-4 border-l-[#FF6B6B]"
                  onPress={handleShowPenaltyModal}>
                  <Text className="font-feather text-base text-textPrimary">
                    Test Heart Penalty Modal
                  </Text>
                  <Text className="font-din text-sm text-[#A57070] mt-1">
                    Show penalty via /halfModal
                  </Text>
                </TouchableOpacity>

                {/* Prayer Modal Button */}
                <TouchableOpacity
                  className="bg-[#E0F7FF] p-4 rounded-xl my-1.5 border-l-4 border-l-[#4FB8FE]"
                  onPress={handleShowPrayerModal}>
                  <Text className="font-feather text-base text-textPrimary">Test Prayer Modal</Text>
                  <Text className="font-din text-sm text-[#6A8A94] mt-1">
                    Show prayer input modal
                  </Text>
                </TouchableOpacity>

                {/* Sitemap Button */}
                <TouchableOpacity
                  className="bg-[#E0F7E6] p-4 rounded-xl my-1.5 border-l-4 border-l-[#4FD675]"
                  onPress={handleShowSitemap}>
                  <Text className="font-feather text-base text-textPrimary">
                    Show Current Route
                  </Text>
                  <Text className="font-din text-sm text-[#5B8A6A] mt-1">
                    Display current app route
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Feature Screens Navigation */}
              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-3">Feature Screens</Text>
                <View className="flex-row flex-wrap gap-2">
                  {FEATURE_SCREENS.map((screen) => (
                    <TouchableOpacity
                      key={screen.route}
                      className="bg-[#F0E6FF] px-3 py-2 rounded-lg border border-[#9B7FFE] mb-1"
                      onPress={() => navigateTo(screen)}>
                      <Text className="font-din text-sm text-textPrimary">{screen.name}</Text>
                    </TouchableOpacity>
                  ))}
                  
                  {/* Kids Bible Reader Button */}
                  <TouchableOpacity
                    className="bg-[#FFF4D9] px-3 py-2 rounded-lg border border-[#F7B500] mb-1"
                    onPress={() => {
                      setModalVisible(false);
                      setTimeout(() => {
                        router.push({
                          pathname: '/newBibleReader',
                          params: { bookId: 43, chapter: 3, translation: 'ESV' }
                        } as any);
                      }, 300);
                    }}>
                    <Text className="font-din text-sm text-textPrimary">Kids Bible Reader</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-3">
                  Heart & Penalty System
                </Text>

                {/* Set Lamb Hearts Buttons */}
                <View className="mb-4">
                  <Text className="font-feather text-base text-textPrimary mb-2">
                    Set Lamb Hearts
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {[0, 10, 20, 30, 40, 50, 100].map((hearts) => (
                      <TouchableOpacity
                        key={hearts}
                        className="bg-[#FFE0E8] px-3 py-2 rounded-lg border border-[#FF80A0] mb-1"
                        onPress={() => setLambHearts(hearts)}>
                        <Text className="font-din text-sm text-textPrimary">{`${hearts} ❤️`}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Set Only Penalty Dates Buttons */}
                <View className="mb-4">
                  <Text className="font-feather text-base text-textPrimary mb-2">
                    Set Penalty Dates
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <TouchableOpacity
                        key={n}
                        className="bg-[#FFE8E0] px-3 py-2 rounded-lg border border-[#FFA0A0] mb-1"
                        onPress={() => setPenaltyDates(n)}>
                        <Text className="font-din text-sm text-textPrimary">{`-${n} day${n !== 1 ? 's' : ''}`}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Test Penalty Scenario Button */}
                <TouchableOpacity
                  className="bg-[#FF8080] p-4 rounded-xl my-2 border-l-4 border-l-[#FF0000]"
                  onPress={testPenaltyScenario}>
                  <Text className="font-feather text-base text-white">Test Penalty System</Text>
                  <Text className="font-din text-sm text-white/80 mt-1">
                    Sets up guaranteed penalty trigger
                  </Text>
                </TouchableOpacity>

                {/* Sync Activity/Penalty Dates Button */}
                <TouchableOpacity
                  className="bg-[#E0F2F7] p-4 rounded-xl my-2 border-l-4 border-l-[#4FC3F7]"
                  onPress={syncActivityAndPenaltyDates}>
                  <Text className="font-feather text-base text-textPrimary">
                    Sync Activity & Penalty Dates
                  </Text>
                  <Text className="font-din text-sm text-[#6A8A94] mt-1">
                    Set activity dates = penalty dates
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Local Storage */}
              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-3">Data Management</Text>

                {/* Reset Completion Data Button */}
                <TouchableOpacity
                  className="bg-[#FFEDED] p-4 rounded-xl my-1.5 border-l-4 border-l-[#FF6B6B]"
                  onPress={handleResetCompletionData}>
                  <Text className="font-feather text-base text-textPrimary">
                    Reset Completion Data
                  </Text>
                  <Text className="font-din text-sm text-[#A57070] mt-1">
                    Reset HomeStore and clear completed readings
                  </Text>
                </TouchableOpacity>

                {/* Delete All Data Button */}
                <TouchableOpacity
                  className="bg-[#FF6666] p-4 rounded-xl my-1.5 border-l-4 border-l-[#FF0000]"
                  onPress={handleDeleteAllData}>
                  <Text className="font-feather text-base text-white">
                    Delete All Data
                  </Text>
                  <Text className="font-din text-sm text-white/80 mt-1">
                    WARNING: Permanently delete all user data and reset app
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Onboarding Navigation */}
              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-3">
                  Onboarding Screens
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {ONBOARDING_SCREENS.map((screen) => (
                    <TouchableOpacity
                      key={screen.route}
                      className="bg-[#E0F7FF] px-3 py-2 rounded-lg border border-[#4FB8FE] mb-1"
                      onPress={() => navigateTo(screen)}>
                      <Text className="font-din text-sm text-textPrimary">
                        {screen.name.replace('Onboarding ', '')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Sitemap Section */}
              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-3">App Routes</Text>

                {Object.entries(ROUTE_GROUPS).map(([groupName, routes]) => (
                  <View key={groupName} className="mb-4">
                    <Text className="font-feather text-base text-textPrimary mb-2">
                      {groupName}
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {routes.map((route) => (
                        <TouchableOpacity
                          key={route.route}
                          className="bg-[#E0F7E6] px-3 py-2 rounded-lg border border-[#4FD675] mb-1"
                          onPress={() => {
                            setModalVisible(false);
                            setTimeout(() => {
                              router.push(route.route as any);
                            }, 300);
                          }}>
                          <Text className="font-din text-sm text-textPrimary">
                            {route.name}
                            {pathname === route.route ? ' (current)' : ''}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Success Animation Modal - Full Screen */}
      <Modal
        animationType="fade"
        transparent={false}
        visible={successModalVisible}
        onRequestClose={handleDismissSuccessSheet}>
        <SuccessAnimation
          message="Great job!"
          subMessage="You triggered the success animation from debug menu."
          onClose={handleDismissSuccessSheet}
        />
      </Modal>

      {/* Keep the bottom sheet for backwards compatibility */}
      <BottomSheetModal
        ref={successSheetRef}
        index={0}
        snapPoints={successSnapPoints}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: '#FFF4D9' }}
        handleIndicatorStyle={{ backgroundColor: '#DCB280' }}>
        <SuccessAnimationContent
          message="Great job!"
          subMessage="You triggered the success animation from debug menu."
          onClose={handleDismissSuccessSheet}
        />
      </BottomSheetModal>

      {/* Register custom toast config */}
      <Toast config={toastConfig} />
    </>
  );
}
