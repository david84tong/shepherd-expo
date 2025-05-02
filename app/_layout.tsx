import '../global.css';
import { Stack, SplashScreen, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, SafeAreaView, ScrollView, Alert, StyleSheet, Image } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Asset } from 'expo-asset';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SuccessAnimationContent from '../components/SuccessAnimation';
import AppLoading from '../components/AppLoading';
import { useUIStore } from './stores/uiStore';
import { useUserStore } from './stores/userStore';
import { HalfModalType } from './halfModal';
import { DebugButton } from '../components/DebugModal';
import { ONBOARDING_COMPLETED_KEY } from './types/onboarding';
import { isSignedIn } from './hooks/authHook';
import BottomSheet, { BottomSheetView, BottomSheetModalProvider, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import PrimaryButton from '../components/PrimaryButton';
import auth from '@react-native-firebase/auth';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [fontsLoaded, fontError] = useFonts({
    'Feather Bold': require('../assets/fonts/Feather Bold.ttf'),
    'DIN Next Rounded LT W01 Regular': require('../assets/fonts/DIN Next Rounded LT W01 Regular.ttf'),
    'Nunito-Bold': require('../assets/fonts/Nunito-Bold.ttf'),
    'Nunito-Black': require('../assets/fonts/Nunito-Black.ttf'),
    'Nunito-Medium': require('../assets/fonts/Nunito-Medium.ttf'),
    'Nunito-Regular': require('../assets/fonts/Nunito-Regular.ttf'),
  });
  
  // Add state for loading progress and onboarding check
  const [appReady, setAppReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isOnboardingChecked, setIsOnboardingChecked] = useState(false);
  
  // Get modal dim state from store
  const isModalDimActive = useUIStore((state) => state.isModalDimActive);
  const setIsModalDimActive = useUIStore((state) => state.setIsModalDimActive);

  // Bottom sheet for halfModal
  const halfModalRef = useRef<BottomSheet>(null);
  const halfModalSnapPoints = useMemo(() => ['60%'], []);
  const backdropOpacity = useSharedValue(0);
  const [halfModalParams, setHalfModalParams] = useState<{
    type?: HalfModalType;
    message?: string;
    subMessage?: string;
    penalty?: number;
    daysMissed?: number;
  }>({});
  
  // Bottom sheet for settings
  const settingsSheetRef = useRef<BottomSheet>(null);
  const settingsSnapPoints = useMemo(() => ['40%', '90%'], []);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  // Check if user has completed onboarding
  const checkOnboarding = useCallback(async () => {
    try {
      // If user is signed in, they should always see (tabs)
      if (isSignedIn()) {
        if (!(segments as string[]).includes('(tabs)')) {
          console.log('User is signed in, redirecting to tabs...');
          router.replace('/(tabs)');
        }
        setIsOnboardingChecked(true);
        return;
      }

      const onboardingCompleted = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      
      // If onboarding is not completed and we're not already in onboarding
      if (onboardingCompleted !== 'true' && !(segments as string[]).includes('onboarding')) {
        console.log('Onboarding not completed, redirecting...');
        router.replace('/onboarding/1');
      }
      
      setIsOnboardingChecked(true);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setIsOnboardingChecked(true); // Set to true even on error to prevent loops
    }
  }, [router, segments]);

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
    if (fontsLoaded || fontError) {
      // Hide splash screen once fonts are loaded or if there's an error
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Function to check streak status - Modified to use showHalfModal directly
  const checkStreakStatus = useCallback(async () => {
    try {
      const { checkStreakAndApplyPenalties } = require('../app/hooks/streakHook');
      const result = await checkStreakAndApplyPenalties();
      console.log('[checkStreakStatus] Result from checkStreakAndApplyPenalties:', JSON.stringify(result, null, 2));

      if (result && result.heartPenalty > 0) {
        console.log('[checkStreakStatus] Penalty detected, showing modal...');
        // Prepare params
        const params = {
          type: HalfModalType.HEART_PENALTY,
          message: result.streakBroken ? "Hearts Lost!" : "Hearts Lost!",
          subMessage: result.streakBroken
              ? `Your streak has been reset. You lost ${result.heartPenalty} hearts after ${result.daysMissed} days of inactivity.`
              : `You lost ${result.heartPenalty} hearts after ${result.daysMissed} days of inactivity.`,
          penalty: result.heartPenalty,
          daysMissed: result.daysMissed,
        };

        // Delay showing the modal slightly
        setTimeout(() => {
          console.log("Showing half modal with params:", params);
          showHalfModal(params);
        }, 1500);
      }
    } catch (error) {
      console.error('Error checking streak status:', error);
    }
  }, []);

  // Show half modal with parameters
  const showHalfModal = (params: {
    type?: HalfModalType;
    message?: string;
    subMessage?: string;
    penalty?: number;
    daysMissed?: number;
  }) => {
    setHalfModalParams(params);
    
    setTimeout(() => {
      halfModalRef.current?.expand();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 100);
  };

  // Handle halfModal sheet changes
  const handleHalfModalChange = (index: number) => {
    if (index >= 0) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  };

  // Handle dismiss of half modal
  const handleHalfModalDismiss = () => {
    halfModalRef.current?.close();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };
  
  // Show settings modal
  const showSettings = () => {
    setIsSettingsVisible(true);
    
    setTimeout(() => {
      settingsSheetRef.current?.expand();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 100);
  };
  
  // Hide settings modal
  const hideSettings = () => {
    settingsSheetRef.current?.close();
    setTimeout(() => {
      setIsSettingsVisible(false);
    }, 200);
  };
  
  // Handle settings sheet changes
  const handleSettingsChange = (index: number) => {
    if (index === -1) {
      // Sheet is closed
      setTimeout(() => {
        setIsSettingsVisible(false);
      }, 200);
    }
  };
  
  // Handle sign out
  const handleSignOut = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await auth().signOut();
      useUserStore.getState().resetUserStore();
      settingsSheetRef.current?.close();
      setIsSettingsVisible(false);
      setIsModalDimActive(false);
      router.replace('/onboarding/1');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Expose the showHalfModal function to the global object for use in other parts of the app
  useEffect(() => {
    if (typeof global !== 'undefined') {
      (global as any).showHalfModal = showHalfModal;
      (global as any).showSettings = showSettings;
    }
  }, []);
  
  // Effect for preloading resources
  useEffect(() => {
    if (fontsLoaded && !appReady) {
      preloadResources();
    }
  }, [fontsLoaded, appReady]);

  // Effect for checking onboarding and streak status after app is ready
useEffect(() => {
    if (appReady && !isOnboardingChecked) {
      checkOnboarding().then(() => {
        // Only check streak if onboarding is completed
        if ((segments as string[]).includes('(tabs)')) {
          checkStreakStatus();
        }
      });
    }
  }, [appReady, isOnboardingChecked, checkOnboarding, checkStreakStatus, segments]);
  
  // Custom backdrop renderer for both bottom sheets
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );
  
  if (!fontsLoaded && !fontError) {
    return null;
  }
  
  console.log(`[RootLayout] Rendering. Modal Dim Active: ${isModalDimActive}`);

  return (
    <>
      {/* Main App Content - Ensure GestureHandlerRootView covers the entire app */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <Stack>
            <Stack.Screen 
              name="(tabs)" 
              options={{ 
                headerShown: false, 
                animation: 'slide_from_right', 
              }} 
            />
            <Stack.Screen 
              name="onboarding"
              options={{
                headerShown: false,
                animation: 'fade',
                animationDuration: 200,
                gestureEnabled: false,
                contentStyle: { backgroundColor: '#FFF4D9' }
              }}
            />
            <Stack.Screen 
              name="bibleReader" 
              options={{
                animation: "slide_from_right",
                animationDuration: 350,
                headerShown: false 
              }}
            />
            <Stack.Screen 
              name="bible" 
              options={{
                animation: "slide_from_right",
                animationDuration: 350,
                headerShown: false 
              }}
            />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            <Stack.Screen name="success" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
          </Stack>
          
          {/* Global Half Modal */}
          <BottomSheet
            ref={halfModalRef}
            index={-1}
            snapPoints={halfModalSnapPoints}
            enablePanDownToClose={true}
            onChange={handleHalfModalChange}
            backgroundStyle={styles.sheetBackground}
            handleIndicatorStyle={styles.handleIndicator}
            backdropComponent={renderBackdrop}
          >
            <BottomSheetView style={styles.contentContainer}>
              {halfModalParams.type === HalfModalType.HEART_PENALTY && (
                <>
                  <Image 
                    source={require('../assets/lambStatic/cryingLamb.png')} 
                    style={styles.icon} 
                    resizeMode="contain" 
                  />
                  <Text style={styles.title}>{halfModalParams.message || "Hearts Lost!"}</Text>
                  {halfModalParams.penalty && halfModalParams.daysMissed && (
                    <View>
                      <Text style={styles.penaltyText}>
                        ❤️ {useUserStore.getState().getLambName()} lost {halfModalParams.penalty} hearts 
                        after {halfModalParams.daysMissed} days away. 
                      </Text>
                    </View>
                  )}
                </>
              )}
              
              {halfModalParams.type !== HalfModalType.HEART_PENALTY && (
                <>
                  <Image 
                    source={require('../assets/icons/heartIcon.png')} 
                    style={styles.icon} 
                    resizeMode="contain" 
                  />
                  <Text style={styles.title}>{halfModalParams.message || "Attention"}</Text>
                  <Text style={styles.penaltyText}>{halfModalParams.subMessage || "Something happened."}</Text>
                </>
              )}
              
              {/* Close Button */}
              <PrimaryButton
                title="Let's bounce back"
                onPress={handleHalfModalDismiss}
                style="w-full mt-6"
                buttonType="default"
              />
            </BottomSheetView>
          </BottomSheet>
          
          {/* Global Settings Sheet */}
          <BottomSheet
            ref={settingsSheetRef}
            index={-1}
            snapPoints={settingsSnapPoints}
            enablePanDownToClose={true}
            onChange={handleSettingsChange}
            backgroundStyle={styles.sheetBackground}
            handleIndicatorStyle={styles.handleIndicator}
            backdropComponent={renderBackdrop}
          >
            <BottomSheetView style={styles.settingsContentContainer}>
              {/* Header */}
              <View style={styles.settingsHeader}>
                <Text style={styles.settingsTitle}>Settings</Text>
                <TouchableOpacity onPress={hideSettings} style={{ padding: 5 }}>
                  <Text style={styles.doneButton}>Done</Text>
                </TouchableOpacity>
              </View>

              {/* Sheet Content */}
              <View style={styles.settingsContent}>
                {/* Placeholder for future settings */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={styles.settingsText}>More settings coming soon...</Text>
                </View>

                {/* Sign Out Button */}
                <TouchableOpacity
                  onPress={handleSignOut}
                  style={styles.signOutButton}
                >
                  <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </BottomSheetView>
          </BottomSheet>
          
          {/* Render the imported DebugButton component */}
          <DebugButton />
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </>
  );
}

// Add styles for the components
const styles = StyleSheet.create({

  sheetBackground: {
    backgroundColor: '#FFF4D9', // surfaceCream 
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: '#DCB280',
    width: 40,
    height: 4,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    paddingBottom: 30,
  },
  settingsContentContainer: {
    flex: 1,
  },
  icon: {
    width: 240,
    height: 240,
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Nunito-Black',
    fontSize: 32,
    color: '#3C584A', // textPrimary
    marginBottom: 16,
    textAlign: 'center',
  },
  penaltyText: {
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 18,
    color: '#666', // secondaryText
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  // Settings sheet styles
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4A8',
  },
  settingsTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Black',
    color: '#3C584A',
  },
  doneButton: {
    fontSize: 16,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    color: '#F7B500',
    fontWeight: '600',
  },
  settingsContent: {
    flex: 1,
    padding: 20,
  },
  settingsText: {
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    color: 'rgba(60, 88, 74, 0.7)',
    fontSize: 16,
  },
  signOutButton: {
    backgroundColor: 'rgba(223, 69, 51, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#DF4533',
    marginBottom: 20,
  },
  signOutText: {
    fontFamily: 'Nunito-Black',
    fontSize: 16,
    color: '#DF4533',
  },
});
