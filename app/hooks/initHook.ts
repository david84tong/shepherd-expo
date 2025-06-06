import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { Timestamp } from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/react-native';
import { useUserStore } from '../stores/userStore';
import { usePathStore } from '../stores/pathStore';
import useSubscriptionStore from '../stores/subscriptionStore';
import { useDevotionalStore } from '../stores/devotionalStore';
import { Mixpanel } from 'mixpanel-react-native';
import { PATH_OPTIONS } from '../models/Path';
import { Platform } from 'react-native';
import { adapty } from 'react-native-adapty';
import analytics, { AnalyticsEvent } from '../../utils/analytics';
import { checkStreakAndApplyPenalties } from './streakHook';
import { syncUserDocument } from '../../utils/firestore';
import { fetchFromFirestore } from '../helper/firebaseHelper';

// Key to check if app has been initialized
const APP_INITIALIZED_KEY = 'shepherd-app-initialized';

// Generate a unique UUID for anonymous users
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v?.toString(16);
  });
};

// Helper function to safely format timestamp
const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return 'Not set';
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toLocaleString();
  }
  return 'Invalid timestamp';
};

// This function can be called after init or when app comes to foreground
export const onAppForegroundOrInit = async () => {
  console.log('onAppForegroundOrInit=====>', onAppForegroundOrInit);

  const getUser = useUserStore.getState().getUser;
  const setSelectedPath = usePathStore.getState().setSelectedPath;
  const syncWithFirestore = useUserStore.getState().syncWithFirestore;
  const userData = getUser();
  
  // Check and fetch today's devotional
  const devotionalStore = useDevotionalStore.getState();
  const todayUTC = new Date().toISOString().split('T')[0];
  const currentDevotional = devotionalStore.currentDevotional;
  
  // Fetch devotional if it doesn't exist or if it's not today's devotional
  if (!currentDevotional || currentDevotional.id !== todayUTC) {
    console.log('📖 Fetching today\'s devotional - current:', currentDevotional?.id, 'today:', todayUTC);
    try {
      await devotionalStore.fetchTodaysDevotional();
    } catch (error) {
      console.log('❌ Error fetching devotional:', error);
      analytics.logError('Error fetching daily devotional', undefined, {
        errorDetails: String(error),
      });
    }
  } else {
    console.log('✅ Today\'s devotional already loaded:', currentDevotional.id);
  }
  
  try {
    const fetchSuccess = await fetchFromFirestore?.({});

    if (fetchSuccess) {
      const updatedUserData = getUser?.();
      if (updatedUserData.selectedPathId) {
        const pathOption = PATH_OPTIONS.find((path) => path.id === updatedUserData.selectedPathId);
        if (pathOption) {
          setSelectedPath(pathOption);
        }
      }
    }
    console.log('onAppForegroundOrInit');
  } catch (firestoreError) {
    console.log('❌ Error fetching user from Firestore (foreground/init):', firestoreError);
    analytics.logError('Error fetching user from Firestore (foreground/init)', undefined, {
      errorDetails: String(firestoreError),
    });
  }
  await checkStreakAndApplyPenalties();
};

export const useAppInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get user store actions and getters
  const resetUserStore = useUserStore((state) => state.resetUserStore);
  const getUser = useUserStore((state) => state.getUser);
  const setUser = useUserStore((state) => state.setUser);
  const setDisplayName = useUserStore((state) => state.setDisplayName);
  const setCreatedAt = useUserStore((state) => state.setCreatedAt);
  const setUpdatedAt = useUserStore((state) => state.setUpdatedAt);
  const setLastActivityDate = useUserStore((state) => state.setLastActivityDate);
  const setLastReadingDate = useUserStore((state) => state.setLastReadingDate);
  const setLastPrayerDate = useUserStore((state) => state.setLastPrayerDate);
  const setLastReflectionDate = useUserStore((state) => state.setLastReflectionDate);
  const setLastReadingPenaltyDate = useUserStore((state) => state.setLastReadingPenaltyDate);
  const setLastPrayerPenaltyDate = useUserStore((state) => state.setLastPrayerPenaltyDate);
  const setLastReflectionPenaltyDate = useUserStore((state) => state.setLastReflectionPenaltyDate);
  const syncWithFirestore = useUserStore((state) => state.syncWithFirestore);

  // Get path store actions
  const setSelectedPath = usePathStore((state) => state.setSelectedPath);
  // Get subscription store actions
  const initializeRevenueCat = useSubscriptionStore((state) => state.initializeRevenueCat);

  // Function to restore user state from Firestore
  const restoreUserState = async () => {
    try {
      const firebaseUser = auth().currentUser;
      if (!firebaseUser) {
        console.log('No authenticated user found');
        return false;
      }

      console.log('Restoring user state for:', firebaseUser.uid);

      // First try to fetch from Firestore
      const fetchSuccess = await fetchFromFirestore?.({});

      if (!fetchSuccess) {
        console.log('Failed to fetch user data from Firestore');
        return false;
      }

      // Get the updated user data
      const userData = getUser?.();
      if (!userData) {
        console.log('No user data found after fetch');
        return false;
      }

      // Update all user store fields
      setUser(userData);
      setDisplayName(userData.displayName || 'Anonymous User');
      setCreatedAt(userData.createdAt);
      setUpdatedAt(userData.updatedAt);
      setLastActivityDate(userData.lastActivityDate);
      setLastReadingDate(userData.lastReadingDate);
      setLastPrayerDate(userData.lastPrayerDate);
      setLastReflectionDate(userData.lastReflectionDate);
      setLastReadingPenaltyDate(userData.lastReadingPenaltyDate);
      setLastPrayerPenaltyDate(userData.lastPrayerPenaltyDate);
      setLastReflectionPenaltyDate(userData.lastReflectionPenaltyDate);

      // Set selected path if exists
      if (userData.selectedPathId) {
        const pathOption = PATH_OPTIONS.find((path) => path.id === userData.selectedPathId);
        if (pathOption) {
          setSelectedPath(pathOption);
        }
      }

      // Sync with Firestore to ensure everything is up to date
      await syncWithFirestore?.();

      console.log('User state restored successfully');
      return true;
    } catch (error) {
      console.log('Error restoring user state:', error);
      return false;
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 Initializing app...');
      const trackAutomaticEvents = false;
      const mixpanel = new Mixpanel('7178bfcd1e0972001d3e6c066e8fb18b', trackAutomaticEvents);
      mixpanel.init();

      // Initialize Sentry
      Sentry.init({
        dsn: 'https://c9b3a3c9ed0846a755ee7175b07982f8@o4509279727321088.ingest.us.sentry.io/4509279728828416',
        sendDefaultPii: true,
        tracesSampleRate: 1.0,
      });

      try {
        setIsLoading(true);

        // Initialize analytics
        await analytics.init();

        // Check if app has been initialized before
        const hasInitialized = await AsyncStorage.getItem(APP_INITIALIZED_KEY);
        const firebaseUser = auth().currentUser;

        if (!hasInitialized) {
          console.log('🚀 First app open, initializing user...');
          analytics.logEvent('First App Open', { isFirstLaunch: true });

          const anonymousUserId = generateUUID();
          const currentTime = Timestamp.now();
          await AsyncStorage.setItem('shepherd-anonymous-user-id', anonymousUserId);

          // Batch all initial user fields
          const initialUserData = {
            id: anonymousUserId,
            displayName: 'Anonymous User',
            createdAt: currentTime,
            updatedAt: currentTime,
            lastActivityDate: currentTime,
          };

          useUserStore.getState().setUser(initialUserData); // Update Zustand store locally
          await syncUserDocument(initialUserData);

          await AsyncStorage.setItem(APP_INITIALIZED_KEY, 'true');
          console.log('✅ User initialized with ID:', anonymousUserId);

          analytics.setUserId(anonymousUserId);
          analytics.setUserProperties({
            firstOpenDate: new Date().toISOString(),
            isAnonymous: true,
            displayName: 'Anonymous User',
          });

          // If it was a truly new anonymous user, re-identify with RevenueCat if it used a different temp ID
          // or if it initialized with null before this ID was generated.
          if (anonymousUserId !== anonymousUserId) {
            console.log(
              'RevenueCat: Logging in new anonymous user after ID generation:',
              anonymousUserId
            );
            await initializeRevenueCat(anonymousUserId, anonymousUserId); // Re-init or logIn with the new ID
          }
        } else {
          console.log('📱 App already initialized, restoring state...');
          analytics.logEvent(AnalyticsEvent.APP_OPEN);

          if (firebaseUser) {
            // User is authenticated, restore their state
            const restored = await restoreUserState();
            if (!restored) {
              console.log('Failed to restore user state, resetting store...');
              resetUserStore();
            }
          } else {
            // No authenticated user, check for anonymous user
            const anonymousId = await AsyncStorage.getItem('shepherd-anonymous-user-id');
            if (anonymousId) {
              const userData = getUser?.();
              if (!userData || !userData.id) {
                console.log('No user data found, resetting store...');
                resetUserStore();
              }
            }
          }
        }

        // Check streak regardless of initialization state
        await checkStreakAndApplyPenalties();
        
        // Fetch today's devotional after user initialization
        const devotionalStore = useDevotionalStore.getState();
        const todayUTC = new Date().toISOString().split('T')[0];
        const currentDevotional = devotionalStore.currentDevotional;
        
        if (!currentDevotional || currentDevotional.id !== todayUTC) {
          console.log('📖 Fetching today\'s devotional during app init');
          try {
            await devotionalStore.fetchTodaysDevotional();
          } catch (error) {
            console.log('❌ Error fetching devotional during init:', error);
          }
        }

        setIsInitialized(true);
      } catch (error) {
        console.log('❌ Error initializing app:', error);
        if (analytics.isInitialized) {
          analytics.logError('App initialization failed', undefined, {
            errorDetails: String(error),
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [
    initializeRevenueCat,
    fetchFromFirestore,
    getUser,
    setSelectedPath,
    setDisplayName,
    setCreatedAt,
    setUpdatedAt,
    setLastActivityDate,
    setLastReadingDate,
    setLastPrayerDate,
    setLastReflectionDate,
    setLastReadingPenaltyDate,
    setLastPrayerPenaltyDate,
    setLastReflectionPenaltyDate,
    resetUserStore,
    setUser,
    syncWithFirestore,
  ]);

  return { isInitialized, isLoading };
};
