import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LogBox, View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Rive from 'rive-react-native';
import '../global.css';

import AppLoading from '../components/AppLoading';
import { DebugButton } from '../components/DebugModal';
import { HalfModalType } from './halfModal';
import { isSignedIn } from './hooks/authHook';
import { useAppInitialization } from './hooks/initHook';
import { checkStreakAndApplyPenalties } from './hooks/streakHook';
import { usePreloadAssets } from './stores/assetsStore';
import { useNotificationStore } from './stores/notificationStore';
import { useUIStore } from './stores/uiStore';
import { useUserStore } from './stores/userStore';

// Import the sheet components
import GlobalBookChapterSelectorSheet from '../components/GlobalBookChapterSelectorSheet';
import GlobalPrayerSheet, { PrayerSheetRef as GlobalPrayerSheetRefInternal } from '../components/GlobalPrayerSheet';
import HalfModalSheet, { HalfModalSheetRef } from '../components/HalfModalSheet';
import OldReflectionSheet from '../components/OldReflectionSheet';
import SettingsSheet, { SettingsSheetRef } from '../components/SettingsSheet';
import { useAssets } from 'expo-asset';

// Define missing ref types
type PrayerSheetRef = {
  show: () => void;
  hide: () => void;
  expand: () => void;
};

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
  const [riveAssets] = useAssets([
    require('../assets/riveAnimations/shepherd-splash_screen.riv'),
  ]);

  // Loading states
  const [appReady, setAppReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
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
  const showOldReflectionSheet = useUIStore(state => state.showOldReflectionSheet);

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
  const { isInitialized, isLoading } = useAppInitialization();

  usePreloadAssets(); // Garante preload global dos assets

  // Preload resources
  const preloadResources = () => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.1;
      setLoadProgress(Math.min(progress, 0.95));

      // Update loading message based on progress
      if (progress < 0.3) {
        setLoadingMessage('Loading fonts...');
      } else if (progress < 0.6) {
        setLoadingMessage('Loading assets...');
      } else if (progress < 0.9) {
        setLoadingMessage('Initializing app...');
      } else {
        setLoadingMessage('Almost ready...');
      }

      if (progress >= 1) {
        clearInterval(interval);
        setTimeout(() => {
          setLoadProgress(1);
          setAppReady(true);
        }, 500);
      }
    }, 200);
  };

  // Check onboarding status with timeout
  const checkOnboarding = async () => {
    try {
      // Apenas inicializa o estado da aplicação
      setInitialRouteDetermined(true);
      setIsOnboardingChecked(true);
    } catch (error) {
      console.error('Error during initialization:', error);
      setHasError(true);
      setInitialRouteDetermined(true);
      setIsOnboardingChecked(true);
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

        // Show the half modal with a delay
        setTimeout(() => {
          showHalfModal(params);
        }, 1500);
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

  // Effect for preloading resources
  useEffect(() => {
    if (fontsLoaded && !appReady) {
      preloadResources();
    }
  }, [fontsLoaded, appReady]);

  // Consolidated initialization effect
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Wait for fonts to load
        if (!fontsLoaded && !fontError) return;

        console.log('Fonts loaded, initializing app...');

        // Start resource loading
        preloadResources();

        // Check onboarding status
        await checkOnboarding();

        // Only proceed with these if we're in the tabs section
        if ((segments as string[]).includes('(tabs)')) {
          await checkStreakStatus();
        }

        // Initialize notifications
        await initializeNotifications();

        // Show Rive animation first
        setShowRiveAnimation(true);
        
        // Wait a bit to ensure Rive animation is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Then hide splash screen
        await SplashScreen.hideAsync();
      } catch (error) {
        console.error('Error during app initialization:', error);
        setHasError(true);
        // Still try to hide splash screen even if there's an error
        await SplashScreen.hideAsync();
      }
    };

    initializeApp();
  }, [fontsLoaded, fontError]);

  // Loading states with error handling
  if (!fontsLoaded && !fontError) return <AppLoading loadingMessage="Loading fonts..." />;
  if (isLoading) return <AppLoading loadingMessage={loadingMessage} progress={loadProgress} />;
  if (!isInitialized) return <AppLoading loadingMessage="Initializing app..." />;
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
          }}
        >
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
              animation: 'fade',
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
            options={{ headerShown: false, animation: 'slide_from_bottom' }}
          />
        </Stack>

        {/* Hide progress indicators on LoadingScreen */}
        {segments.join('/') !== 'onboarding/LoadingScreen' && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              backgroundColor: '#3C584A',
              opacity: loadProgress < 1 ? 0.7 : 0,
              width: `${loadProgress * 100}%`,
            }}
          />
        )}

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
        <GlobalPrayerSheet
          prayerSheetRef={prayerSheetRef}
          snapPoints={prayerSnapPoints}
          onPrayerGenerated={useUIStore.getState().prayerGeneratedCallback || undefined}
        />
        <GlobalBookChapterSelectorSheet />
        <OldReflectionSheet />

        {__DEV__ && <DebugButton />}
      </BottomSheetModalProvider>
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
