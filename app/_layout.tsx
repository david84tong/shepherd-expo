import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LogBox,
  Platform,
  StyleSheet,
  View,
  AppState,
  AppStateStatus,
  Text,
  Alert,
} from 'react-native';
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
import { useOnboardingStore } from './stores/onboardingStore';
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
import { adapty } from 'react-native-adapty';
import './stores/userStore';
import { IS_ANDROID, IS_IOS } from './utils/utils';

// Import highlight store setup function
import { setupHighlightListeners } from './stores/highlightStore';
import useHighlightStore from './stores/highlightStore';

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
  const originalConsoleError = console.log;
  console.error = (...args) => {
    originalConsoleError(...args);
    if (args[0] && typeof args[0] === 'string') {
      console.log(`An error occurred: ${args[0].substring(0, 100)}...`);
    }
  };

  // Set up global error handler
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (isFatal) {
      console.log(
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
  const [isRiveReady, setIsRiveReady] = useState(false);

  // Global modal state
  const isModalDimActive = useUIStore((state) => state.isModalDimActive);
  const isPrayerSheetVisible = useUIStore((state) => state.isPrayerSheetVisible);
  const showPrayerSheet = useUIStore((state) => state.showPrayerSheet);
  const showBookChapterSelector = useUIStore((state) => state.showBookChapterSelector);
  const showOldReflectionSheet = useUIStore((state) => state.showOldReflectionSheet);

  // Widget states from UI store
  const isWidgetPromptVisible = useUIStore((state) => state.isWidgetPromptVisible);
  const isWidgetGuideVisible = useUIStore((state) => state.isWidgetGuideVisible);
  const showWidgetPrompt = useUIStore((state) => state.showWidgetPrompt);
  const hideWidgetPrompt = useUIStore((state) => state.hideWidgetPrompt);
  const showWidgetGuide = useUIStore((state) => state.showWidgetGuide);
  const hideWidgetGuide = useUIStore((state) => state.hideWidgetGuide);

  // Sheet refs
  const halfModalRef = useRef<HalfModalSheetRef>(null);
  const settingsSheetRef = useRef<SettingsSheetRef>(null);
  const prayerSheetRef = useRef<GlobalPrayerSheetRefInternal>(null);

  // Snap points for sheets
  const halfModalSnapPoints = useMemo(() => ['60%'], []);
  const settingsSnapPoints = useMemo(() => ['95%'], []);
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
      console.log('bada');
      onAppForegroundOrInit();
    }
  }, [isInitialized]);

  // Check onboarding status with timeout
  const checkOnboarding = async () => {
    try {
      console.log(`[RootLayout] 🔄 Checking onboarding status...`);

      // Check if onboarding has been completed by looking for the key in AsyncStorage
      const onboardingCompleted = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      console.log('[RootLayout] Onboarding completed status:', onboardingCompleted);

      // If onboarding is completed, the value will be 'true'
      const isOnboardingCompleted = onboardingCompleted === 'true';

      // Initialize onboarding store to load saved screen
      console.log(`[RootLayout] 🏪 Initializing onboarding store...`);
      const onboardingStore = useOnboardingStore.getState();
      const savedScreen = await onboardingStore.initializeFromStorage();
      console.log(`[RootLayout] 📍 Onboarding store initialized, saved screen: ${savedScreen}`);

      setInitialRouteDetermined(true);
      setIsOnboardingChecked(true);
      disableFontScaling();

      // Log the status for debugging
      if (isOnboardingCompleted) {
        console.log('[RootLayout] ✅ User has completed onboarding');
      } else {
        console.log('[RootLayout] ❌ User has NOT completed onboarding');
        console.log(`[RootLayout] 📍 Saved onboarding screen: ${savedScreen}`);
        // Let the onboarding layout handle navigation to avoid timing issues
        console.log('[RootLayout] 📝 Navigation will be handled by onboarding layout');
      }

      return isOnboardingCompleted;
    } catch (error) {
      console.error('[RootLayout] ❌ Error checking onboarding status:', error);
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
      console.log('Error checking streak status:', error);
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
      console.log('Error initializing notifications:', error);
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

  // Add timeout for initialization if it takes too long. That's just a safety net.
  useEffect(() => {
    const initializationTimeout = setTimeout(() => {
      if (!appReady) {
        console.warn('App initialization timed out, forcing ready state');
        setAppReady(true);
        SplashScreen.hideAsync();
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(initializationTimeout);
  }, [appReady]);

  // Add error boundary for initialization
  useEffect(() => {
    const handleError = (error: Error) => {
      console.log('App initialization error:', error);
      setHasError(true);
      setAppReady(true);
      SplashScreen.hideAsync();
    };

    // Use React Native's ErrorUtils instead of window.addEventListener
    const originalErrorHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      handleError(error);
      // Call the original handler as well
      originalErrorHandler(error, isFatal);
    });

    return () => {
      // Restore original error handler on cleanup
      ErrorUtils.setGlobalHandler(originalErrorHandler);
    };
  }, []);

  // Modify the initializeApp function to handle both scenarios
  const initializeApp = async () => {
    try {
      console.log('🚀 Starting app initialization...');

      // Wait for fonts to load
      // if (!fontsLoaded && !fontError) {
      //   console.log('Waiting for fonts to load...');
      //   return;
      // }

      // Wait for Rive assets to be ready
      if (!riveAssets?.[0]?.uri) {
        console.log('Waiting for Rive assets to load...');
        return;
      }
      console.log('CALLED TO RESOLVED');

      try {
        // Initialize app components
        await checkOnboarding();
        await checkStreakStatus();
        await initializeNotifications();
      } catch (error) { }
      // Set Rive ready
      setIsRiveReady(true);
      setShowRiveAnimation(true);
      setAppReady(true);

      // Hide splash screen after a small delay to ensure Rive is ready
      setTimeout(() => {
        SplashScreen.hideAsync();
      }, 100);
    } catch (error) {
      console.log('Error during app initialization:', error);
      Alert.alert('Error during app initialization:', error);
      setHasError(true);
      setAppReady(true);
      SplashScreen.hideAsync();
    }
  };

  // Call initializeApp when fonts and Rive assets are ready
  useEffect(() => {
    if (riveAssets?.[0]?.uri && !appReady) {
      console.log('Assets ready, initializing app...');
      initializeApp();
    }
  }, [fontsLoaded, riveAssets, appReady]);

  const activateAdapty = async () => {
    try {
      const isActivated = await adapty.isActivated();
      console.log('isActivated ==>', isActivated);
      if (isActivated) return;
      // if(adapty){
      //   console.log("adapty ==>",adapty?.isActivated());
      // }
      await adapty.activate('public_live_6JQmP6iR.y5BUrJSqvfMEVYQBPBLz', {
        lockMethodsUntilReady: true,
      });
      console.log('Adapty activated');
    } catch (error) {
      console.log('Error activating Adapty:', error);
    }
  };

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground!
        console.log('App has come to the foreground!');
        onAppForegroundOrInit();
        useHighlightStore.getState().syncHighlights();
      }
      appState.current = nextAppState;
    };
    console.log('Activating Adapty');

    activateAdapty();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  // Add state for isCreator
  const [isCreator, setIsCreator] = useState(false);

  // Check isCreator from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem('isCreator').then((val) => {
      setIsCreator(val === 'true');
    });
  }, []);

  // Show Rive animation
  if (showRiveAnimation && riveAssets?.[0]?.uri) {
    return (
      <View style={[styles.riveContainer, { backgroundColor: '#FFF4D9' }]}>
        <Rive
          url={IS_IOS ? riveAssets[0].uri! : undefined}
          resourceName={IS_ANDROID ? "shepherd_splash_screen" : undefined}
          style={styles.riveAnimation}
          autoplay={true}
          onPause={() => {
            setShowRiveAnimation(false);
          }}
          onStop={() => {
            setShowRiveAnimation(false);
          }}
        />
      </View>
    );
  }

  // Loading states with error handling
  if (!fontsLoaded && !fontError) {
    return null; // Let the native splash screen show
  }

  if (!isRiveReady) {
    return null; // Let the native splash screen show
  }

  if (hasError) return <AppLoading loadingMessage="Something went wrong. Please try again..." />;

  console.log(`[RootLayout] Rendering. Modal Dim Active: ${isModalDimActive}`);
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#FFF4D9' }}>
      <BottomSheetModalProvider>
        {visibleForceUpdate ? (
          <ForceUpdateModal visible={visibleForceUpdate} />
        ) : (
          <>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'fade',
                animationDuration: 200,
                contentStyle: { backgroundColor: '#FFF4D9' },
              }}
            />

            {/* Half Modal Sheet for penalties, popups, etc. */}
            <HalfModalSheet
              halfModalRef={halfModalRef}
              snapPoints={halfModalSnapPoints}
              params={{
                type: halfModalParams.type,
                message: halfModalParams.message,
                subMessage: halfModalParams.subMessage,
                penalty: halfModalParams.penalty,
                daysMissed: halfModalParams.daysMissed,
              }}
            />

            {/* Settings Sheet */}
            <SettingsSheet settingsSheetRef={settingsSheetRef} snapPoints={settingsSnapPoints} />

            {/* Global Prayer Sheet (available from anywhere in the app) */}
            <GlobalPrayerSheet
              prayerSheetRef={prayerSheetRef}
              snapPoints={prayerSnapPoints}
              onPrayerGenerated={useUIStore.getState().prayerGeneratedCallback || undefined}
            />

            {/* Book/Chapter Selector Sheet */}
            {Boolean(showBookChapterSelector) && <GlobalBookChapterSelectorSheet />}

            {/* Old Reflection Sheet */}
            {Boolean(showOldReflectionSheet) && <OldReflectionSheet />}

            {/* Dimmed background for modal overlays */}
            {isModalDimActive && (
              <View
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  zIndex: 50,
                }}
              />
            )}

            {/* Debug button (visible only in development or for creators) */}
            {(__DEV__ || isCreator) && <DebugButton />}
          </>
        )}
      </BottomSheetModalProvider>
      {visibleForceUpdate && isInitialized ? (
        <ForceUpdateModal visible={visibleForceUpdate} />
      ) : null}
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
  container: {
    flex: 1,
    backgroundColor: '#FFF4D9',
  },
});
