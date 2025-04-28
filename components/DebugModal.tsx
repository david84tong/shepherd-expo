import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, SafeAreaView, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SuccessAnimationContent from './SuccessAnimation'; // Assuming SuccessAnimation is in the same components dir
import { HalfModalType } from '../app/halfModal'; // Adjust path as needed
import firestore from '@react-native-firebase/firestore';
import { useUserStore } from '../app/stores/userStore';

// Debug screen destinations
interface DebugScreen {
  name: string;
  route: string;
  params?: Record<string, string>;
}

const DEBUG_SCREENS: DebugScreen[] = [
  { name: 'Home', route: '/' },
  { name: 'Map', route: '/map' },
  { name: 'Bible Reader', route: '/bibleReader', params: { bookId: '1', chapters: '1' } },
  { name: 'Stats', route: '/stats' },
  { name: 'Profile', route: '/profile' },
  { name: 'Prayer', route: '/prayer' }
];

// Define props for DebugButton (currently none needed)
interface DebugButtonProps {}

// DebugButton component 
export function DebugButton({ }: DebugButtonProps) { // Export the component
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();
  
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

  // Handler for the heart penalty modal test button
  const handleTestPenaltyModal = useCallback(() => {
    console.log("[DebugButton] handleTestPenaltyModal called");
    setModalVisible(false); // Close debug menu first

    // Prepare params for heart penalty
    const params = {
      type: HalfModalType.HEART_PENALTY,
      message: "Debug: Hearts Lost!",
      subMessage: "You lost 5 hearts for 2 days of inactivity.",
      penalty: '5',  // Pass as string
      daysMissed: '2', // Pass as string
    };

    // Delay slightly before navigating
    setTimeout(() => {
      console.log("Navigating to /halfModal with penalty params:", params);
      router.push({ pathname: '/halfModal', params });
    }, 50);
  }, [router]);

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

  const navigateTo = (item: DebugScreen) => {
    setModalVisible(false);
    
    // Handle navigation based on route
    switch (item.route) {
      case '/':
      case '/map':
      case '/stats':
      case '/profile':
        router.push(item.route as any);
        break;
      case '/bibleReader':
      case '/prayer':
      case '/bible':
        // For routes with params
        if (item.params) {
          const queryString = Object.entries(item.params)
            .map(([key, value]) => `${key}=${value}`)
            .join('&');
          router.push(`${item.route}?${queryString}` as any);
        } else {
          router.push(item.route as any);
        }
        break;
      default:
        // For any other route
        console.log(`Navigation to ${item.route} not implemented`);
    }
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
              <Text className="font-feather text-xl text-textPrimary">Debug Navigation</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                className="w-8 h-8 rounded-full bg-forestGreen80 items-center justify-center"
              >
                <Text className="text-white text-base font-bold">✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="p-2">
              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-2">Special Debug Actions</Text>
                
                {/* Success Animation Button */}
                <TouchableOpacity
                  className="bg-[#E8F3E0] p-4 rounded-xl my-1.5 border-l-4 border-l-[#A0D468]"
                  onPress={handleShowSuccessSheet}
                >
                  <Text className="font-feather text-base text-textPrimary">Show Success Animation</Text>
                  <Text className="font-din text-sm text-[#7C927E] mt-1">Native Bottom Sheet Animation</Text>
                </TouchableOpacity>
                
                {/* Add Heart Penalty Modal Button Back */}
                <TouchableOpacity
                  className="bg-[#FFEDED] p-4 rounded-xl my-1.5 border-l-4 border-l-[#FF6B6B]"
                  onPress={handleTestPenaltyModal} 
                >
                  <Text className="font-feather text-base text-textPrimary">Test Heart Penalty Modal</Text>
                  <Text className="font-din text-sm text-[#A57070] mt-1">Show penalty via /halfModal</Text>
                </TouchableOpacity>
                
                {/* Reset Local Storage Button */}
                <TouchableOpacity
                  className="bg-[#FFEDED] p-4 rounded-xl my-1.5 border-l-4 border-l-[#FF6B6B]"
                  onPress={handleResetLocalStorage}
                >
                  <Text className="font-feather text-base text-textPrimary">Reset Local Storage</Text>
                  <Text className="font-din text-sm text-[#A57070] mt-1">Clear AsyncStorage including completion data</Text>
                </TouchableOpacity>

                {/* Set Lamb Hearts Buttons */}
                <View className="mt-4">
                  <Text className="font-feather text-base text-textPrimary mb-1">Set Lamb Hearts</Text>
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
                <View className="mt-4">
                  <Text className="font-feather text-base text-textPrimary mb-1">Set Penalty Dates Only</Text>
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
              
              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-2">App Navigation</Text>
                
                <FlatList
                  data={DEBUG_SCREENS}
                  keyExtractor={(item) => item.route}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      className="bg-white p-4 rounded-xl my-1.5 border-l-4 border-l-forestGreen80"
                      onPress={() => navigateTo(item)}
                    >
                      <Text className="font-feather text-base text-textPrimary">{item.name}</Text>
                      <Text className="font-din text-sm text-[#7C927E] mt-1">{item.route}</Text>
                    </TouchableOpacity>
                  )}
                  scrollEnabled={false}
                />
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
