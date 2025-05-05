import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, SafeAreaView, ScrollView, Alert } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SuccessAnimationContent from './SuccessAnimation'; // Assuming SuccessAnimation is in the same components dir
import { HalfModalType } from '../app/halfModal';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useUserStore } from '../app/stores/userStore';
import { useHomeStore } from '../app/stores/homeStore';

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
];

// Feature screens for debugging
const FEATURE_SCREENS: DebugScreen[] = [
  { name: 'Streak Screen', route: '/streak' },
];

// Define props for DebugButton (currently none needed)
interface DebugButtonProps {}

// DebugButton component 
export function DebugButton({ }: DebugButtonProps) { // Export the component
  const router = useRouter();
  const pathname = usePathname();
  const [modalVisible, setModalVisible] = useState(false);
  
  // Reference to the success bottom sheet modal
  const successSheetRef = useRef<BottomSheetModal>(null);
  
  // Snap points for success animation
  const successSnapPoints = useMemo(() => ['90%'], []); 

  // Present the success animation sheet
  const handleShowSuccessSheet = useCallback(() => {
    setModalVisible(false);
    setTimeout(() => {
      successSheetRef.current?.present();
    }, 300);
  }, []);

  // Dismiss the success animation sheet
  const handleDismissSuccessSheet = useCallback(() => {
    successSheetRef.current?.dismiss();
  }, []);

  // Reset local storage handler
  const handleResetLocalStorage = useCallback(() => {
    Alert.alert(
      "Reset Storage",
      "This will clear ALL app data including your progress. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset", 
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              console.log("✅ Local storage cleared successfully");
              Alert.alert("Success", "Local storage has been cleared. Restart the app for changes to take effect.");
            } catch (error) {
              console.error("❌ Error clearing local storage:", error);
              Alert.alert("Error", "Failed to clear local storage.");
            }
          }
        }
      ]
    );
  }, []);

  // Handler for showing a test modal
  const handleShowPenaltyModal = useCallback(() => {
    // Show a penalty modal for testing
    const params = {
      type: HalfModalType.HEART_PENALTY,
      message: "Test Penalty Modal",
      subMessage: "This is a test penalty modal",
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
    
    Alert.alert('Set Dates', `Activity dates: ${daysAgo} day(s) ago\nPenalty dates: ${daysAgo + 1} day(s) ago`);
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
    
    Alert.alert('Penalty Test', 'Set up for penalty:\nActivity: 3 days ago\nPenalty: 1 day ago\nPenalties should trigger on next app open.');
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

  // Add signOut handler
  const handleSignOut = useCallback(async () => {
    try {
      await auth().signOut();
      // Reset user store after sign out
      useUserStore.getState().resetUserStore();
      console.log('✅ User signed out successfully');
      Alert.alert('Success', 'Signed out successfully');
      setModalVisible(false);
    } catch (error) {
      console.error('❌ Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  }, []);

  // Handler to reset HomeStore data and clear completedReadings
  const handleResetCompletionData = useCallback(() => {
    Alert.alert(
      "Reset Completion Data",
      "This will reset all completion states and clear reading history. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset", 
          style: "destructive",
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
          }
        }
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
    ]
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
        className="absolute bottom-6 left-6 bg-forestGreen80/80 rounded-3xl w-12 h-12 justify-center items-center z-50 shadow-md"
      >
        <Text className="text-white text-2xl">🐛</Text>
      </TouchableOpacity>

      {/* Debug Navigation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-black/50">
          <View className="m-5 mt-[60px] bg-surfaceCream rounded-[20px] flex-1 shadow-lg">
            <View className="flex-row items-center justify-between border-b border-b-buttonBorder p-4">
              <Text className="font-feather text-xl text-textPrimary">Debug Menu</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                className="w-8 h-8 rounded-full bg-forestGreen80 items-center justify-center"
              >
                <Text className="text-white text-base font-bold">✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="p-4">
              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-3">Animations & Modals</Text>
                
                {/* Success Animation Button */}
                <TouchableOpacity
                  className="bg-[#E8F3E0] p-4 rounded-xl my-1.5 border-l-4 border-l-[#A0D468]"
                  onPress={handleShowSuccessSheet}
                >
                  <Text className="font-feather text-base text-textPrimary">Show Success Animation</Text>
                  <Text className="font-din text-sm text-[#7C927E] mt-1">Native Bottom Sheet Animation</Text>
                </TouchableOpacity>
                
                {/* Heart Penalty Modal Button */}
                <TouchableOpacity
                  className="bg-[#FFEDED] p-4 rounded-xl my-1.5 border-l-4 border-l-[#FF6B6B]"
                  onPress={handleShowPenaltyModal} 
                >
                  <Text className="font-feather text-base text-textPrimary">Test Heart Penalty Modal</Text>
                  <Text className="font-din text-sm text-[#A57070] mt-1">Show penalty via /halfModal</Text>
                </TouchableOpacity>

                {/* Prayer Modal Button */}
                <TouchableOpacity
                  className="bg-[#E0F7FF] p-4 rounded-xl my-1.5 border-l-4 border-l-[#4FB8FE]"
                  onPress={handleShowPrayerModal} 
                >
                  <Text className="font-feather text-base text-textPrimary">Test Prayer Modal</Text>
                  <Text className="font-din text-sm text-[#6A8A94] mt-1">Show prayer input modal</Text>
                </TouchableOpacity>

                {/* Sitemap Button */}
                <TouchableOpacity
                  className="bg-[#E0F7E6] p-4 rounded-xl my-1.5 border-l-4 border-l-[#4FD675]"
                  onPress={handleShowSitemap}
                >
                  <Text className="font-feather text-base text-textPrimary">Show Current Route</Text>
                  <Text className="font-din text-sm text-[#5B8A6A] mt-1">Display current app route</Text>
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
                      onPress={() => navigateTo(screen)}
                    >
                      <Text className="font-din text-sm text-textPrimary">{screen.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-3">Heart & Penalty System</Text>
                
                {/* Set Lamb Hearts Buttons */}
                <View className="mb-4">
                  <Text className="font-feather text-base text-textPrimary mb-2">Set Lamb Hearts</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {[0, 10, 20, 30, 40, 50, 100].map((hearts) => (
                      <TouchableOpacity
                        key={hearts}
                        className="bg-[#FFE0E8] px-3 py-2 rounded-lg border border-[#FF80A0] mb-1"
                        onPress={() => setLambHearts(hearts)}
                      >
                        <Text className="font-din text-sm text-textPrimary">{`${hearts} ❤️`}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Set Only Penalty Dates Buttons */}
                <View className="mb-4">
                  <Text className="font-feather text-base text-textPrimary mb-2">Set Penalty Dates</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {[0,1,2,3,4,5].map((n) => (
                      <TouchableOpacity
                        key={n}
                        className="bg-[#FFE8E0] px-3 py-2 rounded-lg border border-[#FFA0A0] mb-1"
                        onPress={() => setPenaltyDates(n)}
                      >
                        <Text className="font-din text-sm text-textPrimary">{`-${n} day${n !== 1 ? 's' : ''}`}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                {/* Test Penalty Scenario Button */}
                <TouchableOpacity
                  className="bg-[#FF8080] p-4 rounded-xl my-2 border-l-4 border-l-[#FF0000]"
                  onPress={testPenaltyScenario}
                >
                  <Text className="font-feather text-base text-white">Test Penalty System</Text>
                  <Text className="font-din text-sm text-white/80 mt-1">Sets up guaranteed penalty trigger</Text>
                </TouchableOpacity>

                {/* Sync Activity/Penalty Dates Button */}
                <TouchableOpacity
                  className="bg-[#E0F2F7] p-4 rounded-xl my-2 border-l-4 border-l-[#4FC3F7]"
                  onPress={syncActivityAndPenaltyDates}
                >
                  <Text className="font-feather text-base text-textPrimary">Sync Activity & Penalty Dates</Text>
                  <Text className="font-din text-sm text-[#6A8A94] mt-1">Set activity dates = penalty dates</Text>
                </TouchableOpacity>
              </View>
              
              {/* Local Storage */}
              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-3">Data Management</Text>
                
                {/* Sign Out Button */}
                <TouchableOpacity
                  className="bg-[#FFEDED] p-4 rounded-xl my-1.5 border-l-4 border-l-[#FF6B6B]"
                  onPress={handleSignOut}
                >
                  <Text className="font-feather text-base text-textPrimary">Sign Out</Text>
                  <Text className="font-din text-sm text-[#A57070] mt-1">Sign out current user and reset store</Text>
                </TouchableOpacity>

                {/* Reset Local Storage Button */}
                <TouchableOpacity
                  className="bg-[#FFEDED] p-4 rounded-xl my-1.5 border-l-4 border-l-[#FF6B6B]"
                  onPress={handleResetLocalStorage}
                >
                  <Text className="font-feather text-base text-textPrimary">Reset Local Storage</Text>
                  <Text className="font-din text-sm text-[#A57070] mt-1">Clear AsyncStorage including completion data</Text>
                </TouchableOpacity>

                {/* Reset Completion Data Button */}
                <TouchableOpacity
                  className="bg-[#FFEDED] p-4 rounded-xl my-1.5 border-l-4 border-l-[#FF6B6B]"
                  onPress={handleResetCompletionData}
                >
                  <Text className="font-feather text-base text-textPrimary">Reset Completion Data</Text>
                  <Text className="font-din text-sm text-[#A57070] mt-1">Reset HomeStore and clear completed readings</Text>
                </TouchableOpacity>
              </View>
              
              {/* Onboarding Navigation */}
              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-3">Onboarding Screens</Text>
                <View className="flex-row flex-wrap gap-2">
                  {ONBOARDING_SCREENS.map((screen) => (
                    <TouchableOpacity
                      key={screen.route}
                      className="bg-[#E0F7FF] px-3 py-2 rounded-lg border border-[#4FB8FE] mb-1"
                      onPress={() => navigateTo(screen)}
                    >
                      <Text className="font-din text-sm text-textPrimary">{screen.name.replace('Onboarding ', '')}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Sitemap Section */}
              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-3">App Routes</Text>
                
                {Object.entries(ROUTE_GROUPS).map(([groupName, routes]) => (
                  <View key={groupName} className="mb-4">
                    <Text className="font-feather text-base text-textPrimary mb-2">{groupName}</Text>
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
                          }}
                        >
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
      
      {/* Success Animation Bottom Sheet - Note: This relies on BottomSheetModalProvider being higher up */}
      <BottomSheetModal
        ref={successSheetRef}
        index={0}
        snapPoints={successSnapPoints}
        enablePanDownToClose={true}
        backgroundStyle={{ backgroundColor: '#FFF4D9' }}
        handleIndicatorStyle={{ backgroundColor: '#DCB280' }}
      >
        <SuccessAnimationContent
          message="Great job!"
          subMessage="You triggered the success animation from debug menu."
          onClose={handleDismissSuccessSheet}
        />
      </BottomSheetModal>
    </>
  );
}
