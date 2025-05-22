import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { Timestamp } from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';
import * as Sentry from "@sentry/react-native";
import { useUserStore } from '../stores/userStore';
import { usePathStore } from '../stores/pathStore';
import useSubscriptionStore from '../stores/subscriptionStore';
import { Mixpanel } from "mixpanel-react-native";
import { PATH_OPTIONS } from '../models/Path';
import { Platform } from 'react-native';

import analytics, { AnalyticsEvent } from '../../utils/analytics';
import {  checkStreakAndApplyPenalties } from './streakHook';
import { syncUserDocument } from '../../utils/firestore';

// Key to check if app has been initialized
const APP_INITIALIZED_KEY = 'shepherd-app-initialized';

// Generate a unique UUID for anonymous users
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
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
  const getUser = useUserStore.getState().getUser;
  const fetchFromFirestore = useUserStore.getState().fetchFromFirestore;
  const setSelectedPath = usePathStore.getState().setSelectedPath;
  const syncWithFirestore = useUserStore.getState().syncWithFirestore;
  const userData = getUser();
  try {
    const fetchSuccess = await fetchFromFirestore();


    if (fetchSuccess) {
      const updatedUserData = getUser();
      if (updatedUserData.selectedPathId) {
        const pathOption = PATH_OPTIONS.find(path => path.id === updatedUserData.selectedPathId);
        if (pathOption) {
          setSelectedPath(pathOption);
        }
      }
    }
    console.log("onAppForegroundOrInit")
  } catch (firestoreError) {
    console.error('❌ Error fetching user from Firestore (foreground/init):', firestoreError);
    analytics.logError('Error fetching user from Firestore (foreground/init)', undefined, {
      errorDetails: String(firestoreError)
    });
  }
  await checkStreakAndApplyPenalties();
};


export const useAppInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get user store actions and getters
  const resetUserStore = useUserStore(state => state.resetUserStore);
  const getUser = useUserStore(state => state.getUser);
  const setDisplayName = useUserStore(state => state.setDisplayName);
  const setCreatedAt = useUserStore(state => state.setCreatedAt);
  const setUpdatedAt = useUserStore(state => state.setUpdatedAt);
  const setLastActivityDate = useUserStore(state => state.setLastActivityDate);
  const setLastReadingDate = useUserStore(state => state.setLastReadingDate);
  const setLastPrayerDate = useUserStore(state => state.setLastPrayerDate);
  const setLastReflectionDate = useUserStore(state => state.setLastReflectionDate);
  const setLastReadingPenaltyDate = useUserStore(state => state.setLastReadingPenaltyDate);
  const setLastPrayerPenaltyDate = useUserStore(state => state.setLastPrayerPenaltyDate);
  const setLastReflectionPenaltyDate = useUserStore(state => state.setLastReflectionPenaltyDate);
  const fetchFromFirestore = useUserStore(state => state.fetchFromFirestore);

  // Get path store actions
  const setSelectedPath = usePathStore(state => state.setSelectedPath);
  // Get subscription store actions
  const initializeRevenueCat = useSubscriptionStore(state => state.initializeRevenueCat);

  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 Initializing app...');
      const trackAutomaticEvents = false;
      const mixpanel = new Mixpanel("7178bfcd1e0972001d3e6c066e8fb18b", trackAutomaticEvents);
      mixpanel.init();
      // Initialize Sentry for error tracking
      Sentry.init({
        dsn: "https://c9b3a3c9ed0846a755ee7175b07982f8@o4509279727321088.ingest.us.sentry.io/4509279728828416",
        // Adds more context data to events (IP address, cookies, user, etc.)
        // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
        sendDefaultPii: true,
        // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
        // We recommend adjusting this value in production.
        tracesSampleRate: 1.0,
      });

      // RevenueCat Initialization - using actual keys now
      // IMPORTANT: Store these keys securely, e.g., environment variables, not hardcoded for production builds.
      const REVENUECAT_API_KEY_IOS = 'appl_HaJSTaiQWLDPXKMjOPocMXEOKrm';
      const REVENUECAT_API_KEY_ANDROID = ''; // Add your Android key if you have one

      let revenueCatKey = '';
      if (Platform.OS === 'ios') {
        revenueCatKey = REVENUECAT_API_KEY_IOS;
      } else if (Platform.OS === 'android') {
        revenueCatKey = REVENUECAT_API_KEY_ANDROID;
      }

      // Determine current user ID for RevenueCat
      let currentUserIdForRevenueCat: string | null = null;
      const firebaseUserOnInit = auth().currentUser;
      if (firebaseUserOnInit) {
        currentUserIdForRevenueCat = firebaseUserOnInit.uid;
      } else {
        // Try to get anonymous ID if exists, otherwise null for first-time init
        currentUserIdForRevenueCat = await AsyncStorage.getItem('shepherd-anonymous-user-id');
      }
      
      // Call initializeRevenueCat from the subscription store
      // It will set log level and configure Purchases
      initializeRevenueCat(revenueCatKey, currentUserIdForRevenueCat);
      
      try {
        setIsLoading(true);

        // Initialize analytics
        await analytics.init();

        // Check if app has been initialized before
        const hasInitialized = await AsyncStorage.getItem(APP_INITIALIZED_KEY);
        let appUserId = currentUserIdForRevenueCat; // Use the ID we determined for RevenueCat

        if (!hasInitialized) {
          console.log('🚀 First app open, initializing user...');
          analytics.logEvent("First App Open", { isFirstLaunch: true });
          
          const anonymousUserId = generateUUID();
          appUserId = anonymousUserId; // This is the definitive ID for a new user

          const currentTime = Timestamp.now();
          await AsyncStorage.setItem('shepherd-anonymous-user-id', anonymousUserId);

          // Batch all initial user fields
          const initialUserData = {
            id: anonymousUserId,
            displayName: 'Anonymous User',
            createdAt: currentTime,
            updatedAt: currentTime,
            lastActivityDate: currentTime,
            // Uncomment and add more fields as needed:
            // lastReadingDate: currentTime,
            // lastPrayerDate: currentTime,
            // lastReflectionDate: currentTime,
            // lastReadingPenaltyDate: currentTime,
            // lastPrayerPenaltyDate: currentTime,
            // lastReflectionPenaltyDate: currentTime,
          };

          useUserStore.getState().setUser(initialUserData); // Update Zustand store locally
          await syncUserDocument(initialUserData);

          await AsyncStorage.setItem(APP_INITIALIZED_KEY, 'true');
          console.log('✅ User initialized with ID:', anonymousUserId);
          
          analytics.setUserId(anonymousUserId);
          analytics.setUserProperties({
            firstOpenDate: new Date().toISOString(),
            isAnonymous: true,
            displayName: 'Anonymous User'
          });
          
          // If it was a truly new anonymous user, re-identify with RevenueCat if it used a different temp ID
          // or if it initialized with null before this ID was generated.
          if (currentUserIdForRevenueCat !== anonymousUserId) {
             console.log('RevenueCat: Logging in new anonymous user after ID generation:', anonymousUserId);
             await initializeRevenueCat(revenueCatKey, anonymousUserId); // Re-init or logIn with the new ID
          }

        } else {
          console.log('📱 App already initialized');
          analytics.logEvent(AnalyticsEvent.APP_OPEN);

          const userData = getUser();
          const firebaseUser = auth().currentUser;
          
          if (firebaseUser?.uid) {
            appUserId = firebaseUser.uid;
            analytics.setUserId(firebaseUser.uid);
            analytics.setUserProperties({
              displayName: userData.displayName || 'Not set',
              email: firebaseUser.email || 'Not available',
              isAnonymous: false
            });
          } else if (userData?.id) {
            appUserId = userData.id;
            analytics.setUserId(userData.id);
          }
          // Log user state
          console.log('📊 Current User Data:', {
            // Auth Status
            isAuthenticated: !!firebaseUser,
            firebaseUID: firebaseUser?.uid || 'Not authenticated',
            firebaseEmail: firebaseUser?.email || 'Not available',

            // User Profile
            displayName: userData.displayName || 'Not set',
            spiritualGoal: userData.spiritualGoal || 'Not set',
            experienceLevel: userData.experienceLevel || 'Not set',
            frequencyGoal: userData.frequencyGoal || 'Not set',
            selectedPathId: userData.selectedPathId || 'Not set',

            // Stats
            streakCount: userData.streakCount || 0,
            versesReadTotal: userData.versesReadTotal || 0,
            chaptersReadTotal: userData.chaptersReadTotal || 0,

            // Timestamps
            createdAt: formatTimestamp(userData.createdAt),
            lastActivityDate: formatTimestamp(userData.lastActivityDate),

            // Lamb Status
            lambLevel: userData?.lamb?.level || 1,
            lambXp: userData?.lamb?.xp || 0,
            lambMood: userData?.lamb?.mood || 'lamb-idle',
            lambHearts: userData?.lamb?.hearts || 50,
            lambName: userData?.lamb?.name || 'Not set',
          });

          // Fetch user from Firestore and update userStore
          try {
            const fetchSuccess = await fetchFromFirestore();
              // After fetchFromFirestore
            console.log("AFTER FETCH - lastActivityDate:", 
              useUserStore.getState().lastActivityDate,
              "raw Zustand value:", JSON.stringify(useUserStore.getState().lastActivityDate)
            );

       
          await useUserStore.getState().syncWithFirestore();
            if (fetchSuccess) {
              console.log('✅ User data successfully fetched from Firestore');
              const updatedUserData = getUser();
              if (updatedUserData.selectedPathId) {
                console.log(`🛣️ Setting selected path from Firestore: ${updatedUserData.selectedPathId}`);
                const pathOption = PATH_OPTIONS.find(path => path.id === updatedUserData.selectedPathId);
                if (pathOption) {
                  setSelectedPath(pathOption);
                  console.log(`✅ Selected path set to: ${pathOption.title}`);
                } else {
                  console.warn(`⚠️ Path with ID ${updatedUserData.selectedPathId} not found in PATH_OPTIONS`);
                }
              } else {
                console.log('ℹ️ No selectedPathId found in user data');
              }
            } else {
              console.warn('⚠️ User data could not be fetched from Firestore');
            }
          } catch (firestoreError) {
            console.error('❌ Error fetching user from Firestore:', firestoreError);
            analytics.logError('Error fetching user from Firestore', undefined, {
              errorDetails: String(firestoreError)
            });
          }
          console.log("checkStreakAndApplyPenalties")
          await checkStreakAndApplyPenalties();
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('❌ Error initializing app:', error);
        if (analytics.isInitialized) {
          analytics.logError('App initialization failed', undefined, {
            errorDetails: String(error)
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [initializeRevenueCat, fetchFromFirestore, getUser, setSelectedPath, setDisplayName, setCreatedAt, setUpdatedAt, setLastActivityDate, setLastReadingDate, setLastPrayerDate, setLastReflectionDate, setLastReadingPenaltyDate, setLastPrayerPenaltyDate, setLastReflectionPenaltyDate]);

  return { isInitialized, isLoading };
};
