import '../global.css';
import { Stack, SplashScreen, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import { useEffect, useState, useRef, useMemo } from 'react';
import { View, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppLoading from '../components/AppLoading';
import { useUIStore } from './stores/uiStore';
import { HalfModalType } from './halfModal';
import { DebugButton } from '../components/DebugModal';
import { ONBOARDING_COMPLETED_KEY } from './types/onboarding';
import { isSignedIn } from './hooks/authHook';
import BottomSheet, { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useAppInitialization } from './hooks/initHook';

// Import the sheet components
import HalfModalSheet, { HalfModalSheetRef } from '../components/HalfModalSheet';
import SettingsSheet, { SettingsSheetRef } from '../components/SettingsSheet';
import GlobalPrayerSheet from '../components/GlobalPrayerSheet';
import GlobalBookChapterSelectorSheet from '../components/GlobalBookChapterSelectorSheet';
import OldReflectionSheet from '../components/OldReflectionSheet';
import { Reflection } from './models/User';

// Error logging setup
if (__DEV__) {
  // Only in development
  LogBox.ignoreLogs(['Warning: ...']); // Ignore specific warnings if needed
} else {
  // Production error logging
  const originalConsoleError = console.error;
  console.error = (...args) => {
    originalConsoleError(...args);
    if (args[0] && typeof args[0] === 'string') {
      console.error(`An error occurred: ${args[0].substring(0, 100)}...`);
    }
  };
  
  // Set up global error handler
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (isFatal) {
      console.error(
        `A critical error occurred in the app: ${error.message}\n\nPlease restart the app.`
      );
    }
  });
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Define the actual screens we have implemented
// REMOVED - This belongs in app/onboarding/_layout.tsx
// const IMPLEMENTED_SCREENS = [
//   '1',
//   '2',
//   '3',
//   '4',
//   '5',
//   '6',
//   '7',
//   '8',
//   '10',
//   '11',
//   'auth',
//   'lambFound',
//   'pathAffinity',
//   'LoadingScreen'
// ];

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
  
  // Loading states
  const [appReady, setAppReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isOnboardingChecked, setIsOnboardingChecked] = useState(false);
  
  // Global modal state
  const isModalDimActive = useUIStore((state) => state.isModalDimActive);
  const isPrayerSheetVisible = useUIStore((state) => state.isPrayerSheetVisible);
  const showPrayerSheet = useUIStore((state) => state.showPrayerSheet);
  const showBookChapterSelector = useUIStore((state) => state.showBookChapterSelector);
  const showOldReflectionSheet = useUIStore(state => state.showOldReflectionSheet);

  // Sheet refs
  const halfModalRef = useRef<HalfModalSheetRef>(null);
  const settingsSheetRef = useRef<SettingsSheetRef>(null);
  
  // Snap points for sheets
  const halfModalSnapPoints = useMemo(() => ['60%'], []);
  const settingsSnapPoints = useMemo(() => ['40%', '90%'], []);
  
  // HalfModal params
  const [halfModalParams, setHalfModalParams] = useState<{
    type?: HalfModalType;
    message?: string;
    subMessage?: string;
    penalty?: number;
    daysMissed?: number;
  }>({});

  // App initialization
  const { isInitialized, isLoading } = useAppInitialization();

  // Check onboarding status
  const checkOnboarding = async () => {
    try {
      if (isSignedIn()) {
        if (!(segments as string[]).includes('(tabs)')) {
          console.log('User is signed in, redirecting to tabs...');
          router.replace('/(tabs)');
        }
        setIsOnboardingChecked(true);
        return;
      }

      const onboardingCompleted = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      
      if (onboardingCompleted !== 'true') {
        if (!(segments as string[]).includes('onboarding')) {
          console.log('User not signed in or onboarding not completed, redirecting to welcome screen...');
          router.replace('/onboarding/1');
        }
      } else if (!(segments as string[]).includes('(tabs)')) {
        console.log('Onboarding completed, redirecting to tabs...');
        router.replace('/(tabs)');
      }
      
      setIsOnboardingChecked(true);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setIsOnboardingChecked(true);
      
      if (!(segments as string[]).includes('onboarding')) {
        router.replace('/onboarding/1');
      }
    }
  };

  // Preload resources
  const preloadResources = () => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.1;
      setLoadProgress(Math.min(progress, 0.95));
      
      if (progress >= 1) {
        clearInterval(interval);
        setTimeout(() => {
          setLoadProgress(1);
          setAppReady(true);
        }, 500);
      }
    }, 200);
  };

  // Check streak status on app startup
  const checkStreakStatus = async () => {
    try {
      const { checkStreakAndApplyPenalties } = require('../app/hooks/streakHook');
      const result = await checkStreakAndApplyPenalties();
      
      if (result && result.heartPenalty > 0) {
        // Prepare params for heart penalty modal
        const params = {
          type: HalfModalType.HEART_PENALTY,
          message: result.streakBroken ? "Hearts Lost!" : "Hearts Lost!",
          subMessage: result.streakBroken
              ? `Your streak has been reset. You lost ${result.heartPenalty} hearts after ${result.daysMissed} days of inactivity.`
              : `You lost ${result.heartPenalty} hearts after ${result.daysMissed} days of inactivity.`,
          penalty: result.heartPenalty,
          daysMissed: result.daysMissed,
        };

        // Show the half modal with a delay
        setTimeout(() => {
          showHalfModal(params);
        }, 1500);
      }
    } catch (error) {
      console.error('Error checking streak status:', error);
    }
  };

  // Sheet activation functions - these only prepare params and call the component's show method
  const showHalfModal = (params: any) => {
    setHalfModalParams(params);
    halfModalRef.current?.expand();
  };

  const showSettings = () => {
    settingsSheetRef.current?.show();
  };

  // Expose global functions
  useEffect(() => {
    if (typeof global !== 'undefined') {
      (global as any).showHalfModal = showHalfModal;
      (global as any).showSettings = showSettings;
      (global as any).showPrayerSheet = showPrayerSheet;
      (global as any).showBookChapterSelector = showBookChapterSelector;
      (global as any).showOldReflectionSheet = showOldReflectionSheet;
    }
  }, [showPrayerSheet, showBookChapterSelector, showOldReflectionSheet]);
  
  // Effect for preloading resources
  useEffect(() => {
    if (fontsLoaded && !appReady) {
      preloadResources();
    }
  }, [fontsLoaded, appReady]);
  
  // Effect for checking onboarding and streak status
  useEffect(() => {
    if (fontsLoaded && !isOnboardingChecked) {
      checkOnboarding().then(() => {
        SplashScreen.hideAsync().catch(err => console.log('Error hiding splash screen:', err));
        
        if ((segments as string[]).includes('(tabs)')) {
          checkStreakStatus();
        }
      });
    }
  }, [fontsLoaded, isOnboardingChecked, segments]);
  
  // Loading states
  if (!fontsLoaded && !fontError) return null;
  if (isLoading) return <AppLoading />;
  if (!isInitialized) return null;
  
  console.log(`[RootLayout] Rendering. Modal Dim Active: ${isModalDimActive}`);

  return (
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
        
        {/* Render the self-contained bottom sheet components */}
        <HalfModalSheet
          halfModalRef={halfModalRef}
          snapPoints={halfModalSnapPoints}
          params={halfModalParams}
        />
        
        <SettingsSheet
          settingsSheetRef={settingsSheetRef}
          snapPoints={settingsSnapPoints}
        />
        
        {/* Global sheets */}
        <GlobalPrayerSheet />
        <GlobalBookChapterSelectorSheet />
        <OldReflectionSheet />
        
        <DebugButton />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
