// Import Reanimated first for initialization
import 'react-native-reanimated';
import '../global.css';
import { Stack, SplashScreen, useRouter, } from 'expo-router';
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
import { DebugButton } from '../components/DebugModal';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

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
      console.log('[checkStreakStatus] Result from checkStreakAndApplyPenalties:', JSON.stringify(result, null, 2));

      if (result && result.heartPenalty > 0) {
        console.log('[checkStreakStatus] Penalty detected, navigating to modal...');
        // Prepare params - ensure values are strings for navigation
        const params = {
          type: HalfModalType.HEART_PENALTY,
          message: result.streakBroken ? "Hearts Lost!" : "Hearts Lost!",
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

  // Effect for preloading resources
  useEffect(() => {
    if (loaded && !appReady) {
      preloadResources();
    }
  }, [loaded, appReady]); // Only depends on loaded and appReady

  // Effect for checking streak status *after* app is ready
  useEffect(() => {
    if (appReady) {
      checkStreakStatus();
    }
  }, [appReady, checkStreakStatus]); // Runs only when appReady changes to true
  
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
          
          {/* Render the imported DebugButton component */}
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
