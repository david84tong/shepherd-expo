import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LogBox, Platform, StyleSheet, View, AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Purchases from 'react-native-purchases';
import Rive from 'rive-react-native';
import '../global.css';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AppLoading from '../components/AppLoading';
import { DebugButton } from '../components/DebugModal';
import { HalfModalType } from './halfModal';
import { useAppInitialization, onAppForegroundOrInit } from './hooks/initHook';
import { checkStreakAndApplyPenalties } from './hooks/streakHook';
import { usePreloadAssets } from './stores/assetsStore';
import { useNotificationStore } from './stores/notificationStore';
import { useUIStore } from './stores/uiStore';
import { ONBOARDING_COMPLETED_KEY } from './models/Onboarding';
import analytics from '~/utils/analytics';
// Import the sheet components
import { useAssets } from 'expo-asset';
import GlobalBookChapterSelectorSheet from '../components/GlobalBookChapterSelectorSheet';
import GlobalPrayerSheet, {
  PrayerSheetRef as GlobalPrayerSheetRefInternal,
} from '../components/GlobalPrayerSheet';
import HalfModalSheet, { HalfModalSheetRef } from '../components/HalfModalSheet';
import OldReflectionSheet from '../components/OldReflectionSheet';
import SettingsSheet, { SettingsSheetRef } from '../components/SettingsSheet';
import useForceUpdateCheck from './hooks/useForceUpdateCheck';
import ForceUpdateModal from '~/components/ForceUpdateModal';
import { disableFontScaling } from './helper/disableFontScaling';
import Toast from 'react-native-toast-message';
import WidgetPrompt from '../components/WidgetPrompt';

// Define missing ref types
type PrayerSheetRef = {
  show: () => void;
  hide: () => void;
  expand: () => void;
};

// Configure RevenueCat
Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
Purchases.configure({
  apiKey:
    Platform.select({
      ios: 'appl_HaJSTaiQWLDPXKMjOPocMXEOKrm',
    }) || 'appl_HaJSTaiQWLDPXKMjOPocMXEOKrm', // Fallback key to satisfy TypeScript
});

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
  const { visibleForceUpdate } = useForceUpdateCheck();
  const [fontsLoaded, fontError] = useFonts({
    'Feather Bold': require('../assets/fonts/Feather Bold.ttf'),
    'DIN Next Rounded LT W01 Regular': require('../assets/fonts/DIN Next Rounded LT W01 Regular.ttf'),
    'Nunito-Bold': require('../assets/fonts/Nunito-Bold.ttf'),
    'Nunito-Black': require('../assets/fonts/Nunito-Black.ttf'),
    'Nunito-Medium': require('../assets/fonts/Nunito-Medium.ttf'),
    'Nunito-Regular': require('../assets/fonts/Nunito-Regular.ttf'),
    'Nunito-BlackItalic': require('../assets/fonts/Nunito-BlackItalic.ttf'),
  });
  const [riveAssets] = useAssets([require('../assets/riveAnimations/shepherd-splash_screen.riv')]);

  // Loading states
  const [appReady, setAppReady] = useState(false);
  const [isOnboardingChecked, setIsOnboardingChecked] = useState(false);
  const [initialRouteDetermined, setInitialRouteDetermined] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading Shepherd...');
  const [hasError, setHasError] = useState(false);
  const [showRiveAnimation, setShowRiveAnimation] = useState(false);

  // Global modal state
  const isModalDimActive = useUIStore((state) => state.isModalDimActive);
  const isPrayerSheetVisible = useUIStore((state) => state.isPrayerSheetVisible);
  const showPrayerSheet = useUIStore((state) => state.showPrayerSheet);
  const showBookChapterSelector = useUIStore((state) => state.showBookChapterSelector);
  const showOldReflectionSheet = useUIStore((state) => state.showOldReflectionSheet);

  // Sheet refs
  const halfModalRef = useRef<HalfModalSheetRef>(null);
  const settingsSheetRef = useRef<SettingsSheetRef>(null);
  const prayerSheetRef = useRef<GlobalPrayerSheetRefInternal>(null);

  // Snap points for sheets
  const halfModalSnapPoints = useMemo(() => ['60%'], []);
  const settingsSnapPoints = useMemo(() => ['40%', '90%'], []);
  const prayerSnapPoints = useMemo(() => ['60%', '85%'], []);

  // HalfModal params
  const [halfModalParams, setHalfModalParams] = useState<{
    type?: HalfModalType;
    message?: string;
    subMessage?: string;
    penalty?: number;
    daysMissed?: number;
  }>({});

  // App initialization
  const { isInitialized } = useAppInitialization();

  const appState = useRef(AppState.currentState);

  usePreloadAssets(); // Garante preload global dos assets

  // Call onAppForegroundOrInit after initialization
  useEffect(() => {
    if (isInitialized) {
      console.log("bada")
      onAppForegroundOrInit();
    }
  }, [isInitialized]);

  // Check onboarding status with timeout
  const checkOnboarding = async () => {
    try {
      // Check if onboarding has been completed by looking for the key in AsyncStorage
      const onboardingCompleted = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      console.log('Onboarding completed status:', onboardingCompleted);

      // If onboarding is completed, the value will be 'true'
      const isOnboardingCompleted = onboardingCompleted === 'true';

      setInitialRouteDetermined(true);
      setIsOnboardingChecked(true);
      disableFontScaling();

      // Log the status for debugging
      if (isOnboardingCompleted) {
        console.log('User has completed onboarding');
      } else {
        console.log('User has NOT completed onboarding');
      }

      return isOnboardingCompleted;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setHasError(true);
      setInitialRouteDetermined(true);
      setIsOnboardingChecked(true);
      return false;
    }
  };

  // Check streak status on app startup
  const checkStreakStatus = async () => {
    try {
      const result = await checkStreakAndApplyPenalties();

      if (result && result.heartPenalty > 0) {
        // Prepare params for heart penalty modal
        const params = {
          type: HalfModalType.HEART_PENALTY,
          message: result.streakBroken ? 'Hearts Lost!' : 'Hearts Lost!',
          subMessage: result.streakBroken
            ? `Your streak has been reset. You lost ${result.heartPenalty} hearts after ${result.daysMissed} days of inactivity.`
            : `You lost ${result.heartPenalty} hearts after ${result.daysMissed} days of inactivity.`,
          penalty: result.heartPenalty,
          daysMissed: result.daysMissed,
        };
        analytics.logEvent('heart_penalty_modal_shown', {
          penalty: result.heartPenalty,
          daysMissed: result.daysMissed,
        });
        // Show the half modal with a delay
        setTimeout(() => {
          showHalfModal(params);
        }, 3000);
      }


    } catch (error) {
      console.error('Error checking streak status:', error);
    }
  };

  // Initialize notifications system
  const initializeNotifications = async () => {
    try {
      console.log('Initializing notification system...');
      const notificationStore = useNotificationStore.getState();
      await notificationStore.initializeNotifications();
      console.log('Notification system initialized successfully');
    } catch (error) {
      console.error('Error initializing notifications:', error);
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

  // Effect to watch isPrayerSheetVisible and control the sheet ref
  useEffect(() => {
    if (isPrayerSheetVisible && prayerSheetRef.current) {
      console.log('[RootLayout] Opening prayer sheet via ref');
      prayerSheetRef.current.show();
    }
  }, [isPrayerSheetVisible]);

  // Consolidated initialization effect
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Wait for fonts to load
        if (!fontsLoaded && !fontError) return;

        console.log('Fonts loaded, initializing app...');

        // Check onboarding status and get the result
        const isOnboardingCompleted = await checkOnboarding();
        console.log('Onboarding completed check result:', isOnboardingCompleted);

        // Initialize notifications
        await initializeNotifications();

        // Show Rive animation first
        setShowRiveAnimation(true);

        // Wait a bit to ensure Rive animation is ready
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Then hide splash screen
        await SplashScreen.hideAsync();

        // Navigate based on onboarding status after splash screen is hidden
        if (isOnboardingCompleted) {
          await checkStreakStatus();
        }
      } catch (error) {
        console.error('Error during app initialization:', error);
        setHasError(true);
        // Still try to hide splash screen even if there's an error
        await SplashScreen.hideAsync();
      }
    };

    initializeApp();
  }, [fontsLoaded, fontError, router]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground!
        // Call your functions here
        
        console.log('App has come to the foreground!');
        // e.g. refresh user data, sync, analytics, etc.
        onAppForegroundOrInit();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  // Loading states with error handling
  if (!fontsLoaded && !fontError) {
    return riveAssets?.[0]?.localUri ? (
      <View style={styles.riveContainer}>
        <Rive url={riveAssets[0].localUri} style={styles.riveAnimation} autoplay={true} />
      </View>
    ) : null;
  }
  if (!isInitialized) {
    return riveAssets?.[0]?.localUri ? (
      <View style={styles.riveContainer}>
        <Rive url={riveAssets[0].localUri} style={styles.riveAnimation} autoplay={true} />
      </View>
    ) : null;
  }
  if (hasError) return <AppLoading loadingMessage="Something went wrong. Please try again..." />;

  // Show Rive animation if it's time
  if (showRiveAnimation && riveAssets) {
    return (
      <View style={styles.riveContainer}>
        <Rive
          url={riveAssets[0].localUri!}
          style={styles.riveAnimation}
          autoplay={true}
          onPause={() => {
            setShowRiveAnimation(false);
          }}
        />
      </View>
    );
  }

  console.log(`[RootLayout] Rendering. Modal Dim Active: ${isModalDimActive}`);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: '#FFF4D9',
            },
            animation: 'slide_from_right',
          }}>
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="login"
            options={{
              headerShown: false,
              animation: 'slide_from_bottom',
              animationDuration: 200,
              gestureEnabled: false,
              contentStyle: { backgroundColor: '#FFF4D9' },
            }}
          />
          <Stack.Screen
            name="onboarding"
            options={{
              headerShown: false,
              animation: 'fade',
              animationDuration: 200,
              gestureEnabled: false,
              contentStyle: { backgroundColor: '#FFF4D9' },
            }}
          />
          <Stack.Screen
            name="bibleReader"
            options={{
              animation: 'slide_from_right',
              animationDuration: 350,
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="bible"
            options={{
              animation: 'slide_from_right',
              animationDuration: 350,
              headerShown: false,
            }}
          />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="success"
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
        </Stack>

        {/* Hide progress indicators on LoadingScreen */}
        {segments.join('/') !== 'onboarding/LoadingScreen' && (
          <View
            style={{
              position: 'absolute',
              top: -10,
              left: 0,
              right: 0,
              height: 4,
              backgroundColor: '#3C584A',
              opacity: 0.7,
              width: '100%',
            }}
          />
        )}

        {/* Render the self-contained bottom sheet components */}
        <HalfModalSheet
          halfModalRef={halfModalRef}
          snapPoints={halfModalSnapPoints}
          params={halfModalParams}
        />

        <SettingsSheet settingsSheetRef={settingsSheetRef} snapPoints={settingsSnapPoints} />

        {/* Global sheets */}
        <GlobalPrayerSheet
          prayerSheetRef={prayerSheetRef}
          snapPoints={prayerSnapPoints}
          onPrayerGenerated={useUIStore.getState().prayerGeneratedCallback || undefined}
        />
        <GlobalBookChapterSelectorSheet />
        <OldReflectionSheet />

        {__DEV__ && <DebugButton />}

        <WidgetPrompt />
      </BottomSheetModalProvider>
      {/* {visibleForceUpdate && isInitialized ? <ForceUpdateModal visible={visibleForceUpdate} /> : null}
       */}
      {/* Toast Message component */}
      <Toast />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  riveAnimation: {
    height: '100%',
    width: '100%',
  },
  riveContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: '#FFF4D9',
    justifyContent: 'center',
  },
});
