// Import Reanimated first for initialization
import 'react-native-reanimated';
import '../global.css';
import { Stack, SplashScreen, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, SafeAreaView, ScrollView, Alert, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Asset } from 'expo-asset';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SuccessAnimationContent from '../components/SuccessAnimation';
import AppLoading from '../components/AppLoading';
import { useUIStore } from './stores/uiStore';
import { HalfModalType } from './halfModal';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

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

// Define props for DebugButton
interface DebugButtonProps {
  // showPenaltyModal: (penalty: number, days: number, streakBroken: boolean) => void;
}

// DebugButton component accepts props
function DebugButton({ }: DebugButtonProps) {
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
      
      {/* Success Animation Bottom Sheet */}
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

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const router = useRouter();
  const [loaded, error] = useFonts({
    'Feather Bold': require('../assets/fonts/Feather Bold.ttf'),
    'DIN Next Rounded LT W01 Regular': require('../assets/fonts/DIN Next Rounded LT W01 Regular.ttf'),
  });
  
  // Add state for loading progress
  const [appReady, setAppReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  
  // Get modal dim state from store
  const isModalDimActive = useUIStore((state) => state.isModalDimActive);

  // Preload resources with simulated progress
  const preloadResources = () => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.1;
      setLoadProgress(Math.min(progress, 0.95)); // Cap at 95% until fully loaded
      
      if (progress >= 1) {
        clearInterval(interval);
        // Finish loading when progress is complete
        setTimeout(() => {
          setLoadProgress(1);
          setAppReady(true);
          SplashScreen.hideAsync();
        }, 500);
      }
    }, 200);
  };

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Function to check streak status - Modified to navigate to halfModal
  const checkStreakStatus = useCallback(async () => {
    try {
      const { checkStreakAndApplyPenalties } = require('../app/hooks/streakHook');
      const result = await checkStreakAndApplyPenalties();
      
      if (result && result.heartPenalty > 0) {
        console.log(`Penalty detected: ${result.heartPenalty} hearts, ${result.daysMissed} days missed, streak broken: ${result.streakBroken}`);
        
        // Prepare params - ensure values are strings for navigation
        const params = {
          type: HalfModalType.HEART_PENALTY,
          message: result.streakBroken ? "Streak Broken!" : "Hearts Lost!",
          subMessage: result.streakBroken
              ? `Your streak has been reset. You lost ${result.heartPenalty} hearts after ${result.daysMissed} days of inactivity.`
              : `You lost ${result.heartPenalty} hearts after ${result.daysMissed} days of inactivity.`,
          penalty: String(result.heartPenalty),
          daysMissed: String(result.daysMissed),
        };

        // Delay showing the modal slightly
        setTimeout(() => {
          console.log("Navigating to /halfModal with params:", params);
          router.push({ pathname: '/halfModal', params });
        }, 1500);
      }
    } catch (error) {
      console.error('Error checking streak status:', error);
    }
  }, [router]);

  // Updated useEffect to use the useCallback version of checkStreakStatus
  useEffect(() => {
    if (loaded && !appReady) { // Ensure fonts are loaded before checking streak
      checkStreakStatus();
      preloadResources();
    }
  }, [loaded, appReady, checkStreakStatus]); // Add checkStreakStatus to dependencies
  
  if (!appReady) {
    return <AppLoading progress={loadProgress} />;
  }
  
  console.log(`[RootLayout] Rendering. Modal Dim Active: ${isModalDimActive}`);

  return (
    <>
      {/* Main App Content */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <Stack>
            <Stack.Screen 
              name="(tabs)" 
              options={{ 
                headerShown: false, 
                // Explicitly set the desired animation for entering the tabs group
                animation: 'slide_from_right', 
              }} 
            />
            <Stack.Screen 
              name="bibleReader" 
              options={{
                // Override animation to ensure slide transition
                animation: "slide_from_right",
                // Custom animation duration for smoother feel
                animationDuration: 350, // ms
                // Hide header for full-screen experience
                headerShown: false 
              }}
            />
            <Stack.Screen 
              name="bible" 
              options={{
                // Override animation to ensure slide transition
                animation: "slide_from_right",
                // Custom animation duration for smoother feel
                animationDuration: 350, // ms
                // Hide header for full-screen experience
                headerShown: false 
              }}
            />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            <Stack.Screen name="success" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
            <Stack.Screen 
              name="halfModal" 
              options={{ 
                presentation: 'transparentModal',
                headerShown: false 
              }}
            />
          </Stack>
          
          {/* Pass only necessary props to DebugButton */}
          <DebugButton />
        </BottomSheetModalProvider>

        {/* Conditionally render the dimming overlay */}
        {isModalDimActive && (
          <View style={styles.dimOverlay} pointerEvents="none" />
        )}

      </GestureHandlerRootView>
    </>
  );
}

// Add styles for the overlay
const styles = StyleSheet.create({
  dimOverlay: {
    ...StyleSheet.absoluteFillObject, // Cover everything
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10, // Ensure it's above main content but below the modal screen presented by router
  },
});
