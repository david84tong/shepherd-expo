import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, SafeAreaView, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SuccessAnimationContent from './SuccessAnimation'; // Assuming SuccessAnimation is in the same components dir
import { HalfModalType } from '../app/halfModal'; // Adjust path as needed

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
