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
  Alert,
  Linking,
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
import { usePreloadAssets, usePreloadRiveAssets, useAssetsStore } from './stores/assetsStore';
import { useNotificationStore } from './stores/notificationStore';
import { useUIStore } from './stores/uiStore';
import { ONBOARDING_COMPLETED_KEY } from './models/Onboarding';
import analytics from '~/utils/analytics';
import { useOnboardingStore } from './stores/onboardingStore';
// Import the sheet components
import { useAssets } from 'expo-asset';
import GlobalBookChapterSelectorSheet from '../components/GlobalBookChapterSelectorSheet';
import GlobalCheckIn, { GlobalCheckInRef } from '../components/GlobalCheckIn';
import { useCheckInStore } from './stores/checkInStore';
import GlobalPrayerSheet, {
  PrayerSheetRef as GlobalPrayerSheetRefInternal,
} from '../components/GlobalPrayerSheet';
import GlobalStoreSheet, { StoreSheetRef } from '../components/GlobalStoreSheet';
import GlobalStatsSheet, { StatsSheetRef } from '../components/GlobalStatsSheet';
import HalfModalSheet, { HalfModalSheetRef } from '../components/HalfModalSheet';
import OldReflectionSheet from '../components/OldReflectionSheet';
import SettingsSheet, { SettingsSheetRef } from '../components/SettingsSheet';
import GlobalDevotionalsSheet, { DevotionalsSheetRef } from '../components/GlobalDevotionalsSheet';
import useForceUpdateCheck from './hooks/useForceUpdateCheck';
import ForceUpdateModal from '~/components/ForceUpdateModal';
import { disableFontScaling } from './helper/disableFontScaling';
import { adapty } from 'react-native-adapty';
import './stores/userStore';
import { IS_ANDROID } from './utils/utils';

// Import highlight store setup function
import useHighlightStore from './stores/highlightStore';
import './stores/userStore';
import './stores/subscriptionStore';
import { useRemoteConfig } from './hooks/useRemoteConfig';
import { initializeLanguage } from './utils/i18n';
import { useHomeStore } from './stores/homeStore';
import { useDevotionalStore } from './stores/devotionalStore';
import { appLog } from './helper/helper';
import { COVENANT_STATES } from './hooks/streakHook';
import { useUserStore } from './stores/userStore';
import CovenantSuccessSheet, { CovenantSuccessSheetRef } from '../components/CovenantSuccessSheet';

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
  const originalConsoleError = appLog;
  console.error = (...args) => {
    originalConsoleError(...args);
    if (args[0] && typeof args[0] === 'string') {
      appLog(`An error occurred: ${args[0].substring(0, 100)}...`);
    }
  };

  // Set up global error handler
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (isFatal) {
      appLog(
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
    'DIN Next Rounded LT W01 Regular': require('../assets/fonts/DIN Next Rounded LT W01 Regular.ttf'),
    'Nunito-Bold': require('../assets/fonts/Nunito-Bold.ttf'),
    'Nunito-Black': require('../assets/fonts/Nunito-Black.ttf'),
    'Nunito-Medium': require('../assets/fonts/Nunito-Medium.ttf'),
    'Nunito-MediumItalic': require('../assets/fonts/Nunito-MediumItalic.ttf'),
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
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);

  // Global modal state
  const isModalDimActive = useUIStore((state) => state.isModalDimActive);
  const isPrayerSheetVisible = useUIStore((state) => state.isPrayerSheetVisible);
  const showPrayerSheet = useUIStore((state) => state.showPrayerSheet);
  const showBookChapterSelector = useUIStore((state) => state.showBookChapterSelector);
  const showOldReflectionSheet = useUIStore((state) => state.showOldReflectionSheet);
  const showStoreSheet = useUIStore((state) => state.showStoreSheet);
  const showStatsSheet = useUIStore((state) => state.showStatsSheet);
  const isStatsSheetVisible = useUIStore((state) => state.isStatsSheetVisible);
  const showDevotionalsSheet = useUIStore((state) => state.showDevotionalsSheet);
  const isDevotionalsSheetVisible = useUIStore((state) => state.isDevotionalsSheetVisible);

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
  const storeSheetRef = useRef<StoreSheetRef>(null);
  const statsSheetRef = useRef<StatsSheetRef>(null);
  const checkInRef = useRef<GlobalCheckInRef>(null);
  const devotionalsSheetRef = useRef<DevotionalsSheetRef>(null);
  const covenantSuccessSheetRef = useRef<CovenantSuccessSheetRef>(null);

  // Snap points for sheets
  const halfModalSnapPoints = useMemo(() => ['60%'], []);
  const settingsSnapPoints = useMemo(() => ['95%'], []);

  // HalfModal params
  const [halfModalParams, setHalfModalParams] = useState<{
    type?: HalfModalType;
    message?: string;
    subMessage?: string;
    penalty?: number;
    daysMissed?: number;
  }>({});

  // App initialization
  const { isInitialized, isAnalyticsReady } = useAppInitialization();

  const appState = useRef(AppState.currentState);

  usePreloadAssets(); // Garante preload global dos assets
  usePreloadRiveAssets(); // Preload Rive assets during splash screen
  useRemoteConfig();

  // Get Rive assets loading status from store
  const riveAssetsLoaded = useAssetsStore((s) => s.riveLoaded);
  const preloadedRiveAssets = useAssetsStore((s) => s.riveAssets);

  // Call onAppForegroundOrInit after initialization
  useEffect(() => {
    appLog('isInitialized ==>', isInitialized);
    if (isInitialized) {
      onAppForegroundOrInit();
      // Check and show check-in after a delay to ensure everything is ready
      // But only if hearts lost modal is not scheduled to show
      setTimeout(() => {
        if (!isHeartsLostModalVisible.current) {
          checkAndShowCheckInIfNeeded();
        }
      }, 3000);
    }
  }, [isInitialized]);

  // Check onboarding status with timeout
  const checkOnboarding = async () => {
    try {
      appLog(`[RootLayout] 🔄 Checking onboarding status...`);

      // Check if onboarding has been completed by looking for the key in AsyncStorage
      const onboardingCompleted = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      appLog('[RootLayout] Onboarding completed status:', onboardingCompleted);

      // If onboarding is completed, the value will be 'true'
      const isOnboardingCompleted = onboardingCompleted === 'true';

      // Initialize onboarding store to load saved screen
      appLog(`[RootLayout] 🏪 Initializing onboarding store...`);
      const onboardingStore = useOnboardingStore.getState();
      const savedScreen = await onboardingStore.initializeFromStorage();
      appLog(`[RootLayout] 📍 Onboarding store initialized, saved screen: ${savedScreen}`);

      setInitialRouteDetermined(true);
      setIsOnboardingChecked(true);
      disableFontScaling();

      // Log the status for debugging
      if (isOnboardingCompleted) {
        appLog('[RootLayout] ✅ User has completed onboarding');
      } else {
        appLog('[RootLayout] ❌ User has NOT completed onboarding');
        appLog(`[RootLayout] 📍 Saved onboarding screen: ${savedScreen}`);
        // Let the onboarding layout handle navigation to avoid timing issues
        appLog('[RootLayout] 📝 Navigation will be handled by onboarding layout');
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
        // Set flag to indicate hearts lost modal is visible
        isHeartsLostModalVisible.current = true;
        // Show the half modal with a delay
        setTimeout(() => {
          showHalfModal(params);
        }, 3000);
      }
    } catch (error) {
      appLog('Error checking streak status:', error);
    }
  };
  
  // Add ref to track if check-in is already scheduled
  const checkInScheduledRef = useRef(false);
  // Add ref to track if hearts lost modal is visible
  const isHeartsLostModalVisible = useRef(false);
  
  // Check if one hour has passed since last check-in AND today's check-in is not complete
  const checkAndShowCheckInIfNeeded = () => {
    // Import auth to check if user is logged in
    const auth = require('@react-native-firebase/auth').default;
    const currentUser = auth().currentUser;
    
    appLog('[CheckIn] checkAndShowCheckInIfNeeded called');
    appLog('[CheckIn] Current user:', currentUser?.uid, 'Anonymous:', currentUser?.isAnonymous);
    
    // Don't show check-in if user is not logged in at all
    if (!currentUser) {
      appLog('[CheckIn] Skipping check-in: User not logged in');
      return;
    }
    
    // Check if check-in is already scheduled
    if (checkInScheduledRef.current) {
      appLog('[CheckIn] ❌ Check-in already scheduled, skipping duplicate call');
      return;
    }
    
    // Check if hearts lost modal is visible
    if (isHeartsLostModalVisible.current) {
      appLog('[CheckIn] ❌ Hearts lost modal is visible, delaying check-in');
      return;
    }
    
    const checkInStore = useCheckInStore.getState();
    const hasCompletedToday = checkInStore.hasCompletedTodaysCheckIn();
    const hasBeenOneHour = checkInStore.hasBeenOneHourSinceLastCheckIn();
    const lastCheckInTime = checkInStore.lastCheckInTime;
    const todaysCheckIn = checkInStore.getTodaysCheckIn();
    const checkInHistory = checkInStore.checkInHistory;
    
    appLog('[CheckIn] Store state:', {
      hasCompletedToday,
      hasBeenOneHour,
      lastCheckInTime,
      todaysCheckIn,
      checkInHistoryLength: checkInHistory?.length || 0,
      isNavigating: checkInStore.isNavigating
    });
    
    // Check if currently navigating
    if (checkInStore.isNavigating) {
      appLog('[CheckIn] ❌ Not showing check-in: Currently navigating');
      return;
    }
    
    // Check if already completed today
    if (hasCompletedToday) {
      appLog('[CheckIn] ❌ Not showing check-in: Already completed today', {
        todaysCheckIn,
        completedAt: todaysCheckIn?.completedAt
      });
      return;
    }
    
    // Check if one hour has passed since last check-in
    if (!hasBeenOneHour) {
      appLog('[CheckIn] ❌ Not showing check-in: Less than one hour since last check-in', {
        lastCheckInTime,
        currentTime: new Date().toISOString()
      });
      return;
    }
    
    // All conditions met - show check-in
    appLog('[CheckIn] ✅ All conditions met - showing check-in');
    // Mark as scheduled
    checkInScheduledRef.current = true;
    
    // Show check-in with a delay to ensure app is ready
    setTimeout(() => {
      appLog('[CheckIn] Calling showCheckIn() now...');
      showCheckIn();
      // Reset the flag after showing
      checkInScheduledRef.current = false;
    }, 2000);
  };

  // Initialize notifications system
  const initializeNotifications = async () => {
    try {
      appLog('Initializing notification system...');
      const notificationStore = useNotificationStore.getState();
      await notificationStore.initializeNotifications();
      appLog('Notification system initialized successfully');
    } catch (error) {
      appLog('Error initializing notifications:', error);
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

  const showCheckIn = () => {
    appLog('[showCheckIn] Function called at:', new Date().toISOString());
    
    // Import auth to check if user is logged in
    const auth = require('@react-native-firebase/auth').default;
    const currentUser = auth().currentUser;
    
    // Don't show check-in if user is not logged in at all
    if (!currentUser) {
      appLog('[showCheckIn] Not showing check-in: User not logged in');
      return;
    }
    
    appLog('[showCheckIn] User authenticated:', currentUser.uid, 'Anonymous:', currentUser.isAnonymous);
    appLog('[showCheckIn] checkInRef.current exists:', !!checkInRef.current);
    appLog('[showCheckIn] isUserLoggedIn state:', isUserLoggedIn);
    
    // Check if the ref exists before trying to expand
    if (checkInRef.current) {
      appLog('[showCheckIn] checkInRef exists, calling forceShow()');
      try {
        // Use forceShow for more reliable opening
        checkInRef.current.forceShow();
        appLog('[showCheckIn] forceShow() called successfully');
      } catch (error) {
        console.error('[showCheckIn] Error calling forceShow():', error);
      }
    } else {
      console.error('[showCheckIn] checkInRef.current is null, cannot show check-in');
      appLog('[showCheckIn] Attempting to retry in 500ms...');
      
      // Retry after a short delay
      setTimeout(() => {
        if (checkInRef.current) {
          appLog('[showCheckIn] Retry successful, calling forceShow()');
          checkInRef.current.forceShow();
        } else {
          console.error('[showCheckIn] Retry failed, checkInRef still null');
        }
      }, 500);
    }
  };

  // Monitor auth state changes
  useEffect(() => {
    const auth = require('@react-native-firebase/auth').default;
    const unsubscribe = auth().onAuthStateChanged((user: any) => {
      const isLoggedIn = !!user; // Include anonymous users as logged in
      setIsUserLoggedIn(isLoggedIn);
      appLog('[Auth] User auth state changed:', { 
        isLoggedIn, 
        isAnonymous: user?.isAnonymous,
        uid: user?.uid 
      });
    });
    
    return unsubscribe;
  }, []);

  // Expose global functions
  useEffect(() => {
    if (typeof global !== 'undefined') {
      (global as any).showHalfModal = showHalfModal;
      (global as any).showSettings = showSettings;
      (global as any).showPrayerSheet = showPrayerSheet;
      (global as any).showBookChapterSelector = showBookChapterSelector;
      (global as any).showOldReflectionSheet = showOldReflectionSheet;
      (global as any).showStoreSheet = showStoreSheet;
      (global as any).showStatsSheet = showStatsSheet;
      (global as any).showCheckIn = showCheckIn;
      (global as any).showDevotionalsSheet = showDevotionalsSheet;
    }
  }, [showPrayerSheet, showBookChapterSelector, showOldReflectionSheet, showStoreSheet, showStatsSheet, showCheckIn, showDevotionalsSheet]);

  // Effect to watch isPrayerSheetVisible and control the sheet ref
  useEffect(() => {
    if (isPrayerSheetVisible && prayerSheetRef.current) {
      appLog('[RootLayout] Opening prayer sheet via ref');
      prayerSheetRef.current.show();
    }
  }, [isPrayerSheetVisible]);

  // Effect to watch isStatsSheetVisible and control the sheet ref
  useEffect(() => {
    if (isStatsSheetVisible && statsSheetRef.current) {
      appLog('[RootLayout] Opening stats sheet via ref');
      statsSheetRef.current.show();
    }
  }, [isStatsSheetVisible]);

  // Effect to watch isDevotionalsSheetVisible and control the sheet ref
  useEffect(() => {
    if (isDevotionalsSheetVisible && devotionalsSheetRef.current) {
      appLog('[RootLayout] Opening devotionals sheet via ref');
      devotionalsSheetRef.current.show();
    }
  }, [isDevotionalsSheetVisible]);

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
    initializeLanguage()
    const handleError = (error: Error) => {
      appLog('App initialization error:', error);
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
      appLog('🚀 Starting app initialization...');

      // Wait for fonts to load
      // if (!fontsLoaded && !fontError) {
      //   appLog('Waiting for fonts to load...');
      //   return;
      // }

      // Wait for Rive assets to be ready (both splash and preloaded)
      if (!riveAssets?.[0]?.uri || !riveAssetsLoaded) {
        appLog('Waiting for Rive assets to load...', { 
          splashRive: !!riveAssets?.[0]?.uri, 
          preloadedRive: riveAssetsLoaded 
        });
        return;
      }
      appLog('🎬 All Rive assets loaded successfully');

      try {
        // Initialize app components
        await checkOnboarding();
        await checkStreakStatus();
        await initializeNotifications();
        
        // Note: checkAndShowCheckInIfNeeded is called in the isInitialized useEffect
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
      appLog('Error during app initialization:', error);
      Alert.alert('Error during app initialization:', error instanceof Error ? error.message : String(error));
      setHasError(true);
      setAppReady(true);
      SplashScreen.hideAsync();
    }
  };

  // Call initializeApp when fonts and Rive assets are ready
  useEffect(() => {
    if (riveAssets?.[0]?.uri && riveAssetsLoaded && !appReady) {
      appLog('🎬 All assets ready, initializing app...');
      initializeApp();
    }
  }, [fontsLoaded, riveAssets, riveAssetsLoaded, appReady]);

  const activateAdapty = async () => {
    try {
      const isActivated = await adapty.isActivated();
      appLog('isActivated ==>', isActivated);
      if (isActivated) return;
      // if(adapty){
      //   appLog("adapty ==>",adapty?.isActivated());
      // }
      await adapty.activate('public_live_6JQmP6iR.y5BUrJSqvfMEVYQBPBLz', {
        lockMethodsUntilReady: true,
      });
      appLog('Adapty activated');
    } catch (error) {
      appLog('Error activating Adapty:', error);
    }
  };

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground!
        appLog('App has come to the foreground!');
        onAppForegroundOrInit();
        useHighlightStore.getState().syncHighlights();
        // Only check for check-in if hearts lost modal is not visible
        if (!isHeartsLostModalVisible.current) {
          checkAndShowCheckInIfNeeded();
        }
      }
      appState.current = nextAppState;
    };
    appLog('Activating Adapty');

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

  // Add deep linking handler
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      appLog('Deep link received:', event.url);
      if (event.url === 'io.bytehouse://stay') {
        // Navigate to the stay screen or handle the deep link as needed
        router.replace('/(tabs)');
      }
    };

    // Handle deep links when app is already running
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Handle deep links when app is opened from a deep link
    Linking.getInitialURL().then((url) => {
      if (url && url === 'io.bytehouse://stay') {
        router.replace('/(tabs)');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  // Fetch recent devotionals when reading is completed or when all activities are completed
  useEffect(() => {
    const readingCompleted = useHomeStore.getState().readingCompleted;
    const prayerCompleted = useHomeStore.getState().prayerCompleted;
    const reflectionCompleted = useHomeStore.getState().reflectionCompleted;

    if (readingCompleted || (prayerCompleted && readingCompleted && reflectionCompleted)) {
      appLog('📚 [Layout] Fetching recent devotionals due to completion state change');
      const fetchRecentDevotionals = useDevotionalStore.getState().fetchRecentDevotionals;
      fetchRecentDevotionals()
        .then((devotionals) => {
          appLog(
            '📚 [Layout] Fetched recent devotionals:',
            devotionals.map((d) => d?.id)
          );
          appLog('📚 [Layout] Devotionals count:', devotionals.length);
          appLog('📚 [Layout] Non-null devotionals:', devotionals.filter(Boolean).length);
        })
        .catch((error) => {
          console.error('❌ [Layout] Error fetching recent devotionals:', error);
        });
    }
  }, []);

  // Monitor completion states and fetch devotionals when they change
  const readingCompleted = useHomeStore((state) => state.readingCompleted);
  const prayerCompleted = useHomeStore((state) => state.prayerCompleted);
  const reflectionCompleted = useHomeStore((state) => state.reflectionCompleted);

  useEffect(() => {
    if (readingCompleted || (prayerCompleted && readingCompleted && reflectionCompleted)) {
      appLog('📚 [Layout] Fetching recent devotionals due to completion state change');
      const fetchRecentDevotionals = useDevotionalStore.getState().fetchRecentDevotionals;
      fetchRecentDevotionals()
        .then((devotionals) => {
          appLog(
            '📚 [Layout] Fetched recent devotionals:',
            devotionals.map((d) => d?.id)
          );
          appLog('📚 [Layout] Devotionals count:', devotionals.length);
          appLog('📚 [Layout] Non-null devotionals:', devotionals.filter(Boolean).length);
        })
        .catch((error) => {
          console.error('❌ [Layout] Error fetching recent devotionals:', error);
        });
    }
  }, [readingCompleted, prayerCompleted, reflectionCompleted]);

  // Covenant success modal state
  const showCovenantSuccessModal = useHomeStore((state) => state.showCovenantSuccessModal);
  const completedCovenantDays = useHomeStore((state) => state.completedCovenantDays);
  const setShowCovenantSuccessModal = useHomeStore((state) => state.setShowCovenantSuccessModal);
  const setCovenantProgress = useUserStore((state) => state.setCovenantProgress);

  const handleNextCovenant = (days: number) => {
    setCovenantProgress({
      currentStreak: completedCovenantDays,
      targetDays: days,
      progress: 0, // TODO: calculate progress
      state: COVENANT_STATES.IN_PROGRESS
    });
    setShowCovenantSuccessModal(false);
  };

  // Watch for covenant success modal state and show sheet
  useEffect(() => {
    if (showCovenantSuccessModal && covenantSuccessSheetRef.current) {
      appLog('[RootLayout] Opening covenant success sheet via ref');
      covenantSuccessSheetRef.current.show();
    }
  }, [showCovenantSuccessModal]);

  // Show Rive animation
  if (showRiveAnimation && riveAssets?.[0]?.uri) {
    return (
      <View style={[styles.riveContainer, { backgroundColor: '#FFF4D9' }]}>
        {IS_ANDROID ? (
          <Rive
            resourceName={'shepherd_splash_screen'}
            style={styles.riveAnimation}
            autoplay={true}
            onPause={() => {
              setShowRiveAnimation(false);
            }}
            onStop={() => {
              setShowRiveAnimation(false);
            }}
          />
        ) : (
          <Rive
            url={riveAssets[0].uri!}
            style={styles.riveAnimation}
            autoplay={true}
            onPause={() => {
              setShowRiveAnimation(false);
            }}
            onStop={() => {
              setShowRiveAnimation(false);
            }}
          />
        )}
      </View>
    );
  }

  // Loading states with error handling
  if (!fontsLoaded && !fontError && !IS_ANDROID) {
    return null; // Let the native splash screen show
  }

  if (!isRiveReady) {
    return null; // Let the native splash screen show
  }

  if (hasError) return <AppLoading loadingMessage="Something went wrong. Please try again..." />;
  // return <SaveProgressScreen />
  appLog(`[RootLayout] Rendering. Modal Dim Active: ${isModalDimActive}`);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#FDEBB8' }}>
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
                contentStyle: { backgroundColor: '#FDEBB8' },
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
              onDismiss={() => {
                // If this was a hearts lost modal, clear the flag and check if we need to show check-in
                if (halfModalParams.type === HalfModalType.HEART_PENALTY) {
                  isHeartsLostModalVisible.current = false;
                  // Check if we should show check-in after hearts lost modal is dismissed
                  setTimeout(() => {
                    checkAndShowCheckInIfNeeded();
                  }, 500);
                }
              }}
            />

            {/* Settings Sheet */}
            <SettingsSheet settingsSheetRef={settingsSheetRef} snapPoints={settingsSnapPoints} />

            {/* Global Prayer Sheet (available from anywhere in the app) */}
            <GlobalPrayerSheet
              prayerSheetRef={prayerSheetRef}
              onPrayerGenerated={useUIStore.getState().prayerGeneratedCallback || undefined}
            />

            {/* Global Store Sheet */}
            <GlobalStoreSheet storeSheetRef={storeSheetRef} />

            {/* Global Stats Sheet */}
            <GlobalStatsSheet statsSheetRef={statsSheetRef} />

            {/* Book/Chapter Selector Sheet */}
            {Boolean(showBookChapterSelector) && <GlobalBookChapterSelectorSheet />}

            {/* Old Reflection Sheet */}
            {Boolean(showOldReflectionSheet) && <OldReflectionSheet />}

            {/* Global Check-In Sheet - Only show for logged-in users */}
            {isUserLoggedIn && <GlobalCheckIn checkInRef={checkInRef} />}

            {/* Global Devotionals Sheet */}
            <GlobalDevotionalsSheet devotionalsSheetRef={devotionalsSheetRef} />

            {/* Global Covenant Success Sheet */}
            <CovenantSuccessSheet
              covenantSheetRef={covenantSuccessSheetRef}
              completedDays={completedCovenantDays}
              onSelectNextCovenant={handleNextCovenant}
            />

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
  container: {
    backgroundColor: '#FFF4D9',
    flex: 1,
  },
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
