import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { Timestamp } from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';
import * as Sentry from "@sentry/react-native";
import { useUserStore } from '../stores/userStore';
import { Mixpanel } from "mixpanel-react-native";

import analytics, { AnalyticsEvent, EventCategory } from '../../utils/analytics';

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
      
      try {
        setIsLoading(true);

        // Initialize analytics
        await analytics.init();

        // Check if app has been initialized before
        const hasInitialized = await AsyncStorage.getItem(APP_INITIALIZED_KEY);

   

        if (!hasInitialized) {
          console.log('🚀 First app open, initializing user...');
               // Log first app open event
          analytics.logEvent(
            "First App Open",
            { isFirstLaunch: true }
          );
          
          // Generate anonymous user ID
          const anonymousUserId = generateUUID();

          // Create timestamp for user creation
          const currentTime = Timestamp.now();

          // Set up user with timestamps and anonymous ID
          await AsyncStorage.setItem('shepherd-anonymous-user-id', anonymousUserId);
          setDisplayName('Anonymous User');
          setCreatedAt(currentTime);
          setUpdatedAt(currentTime);

          // Set all activity dates to now
          setLastActivityDate(currentTime);
          setLastReadingDate(currentTime);
          setLastPrayerDate(currentTime);
          setLastReflectionDate(currentTime);
          setLastReadingPenaltyDate(currentTime);
          setLastPrayerPenaltyDate(currentTime);
          setLastReflectionPenaltyDate(currentTime);

          // Mark app as initialized
          await AsyncStorage.setItem(APP_INITIALIZED_KEY, 'true');
          console.log('✅ User initialized with ID:', anonymousUserId);
          
          // Set analytics user ID
          analytics.setUserId(anonymousUserId);
          analytics.setUserProperties({
            firstOpenDate: new Date().toISOString(),
            isAnonymous: true,
            displayName: 'Anonymous User'
          });
        } else {
          console.log('📱 App already initialized');

          // Log regular app open event
          analytics.logEvent(AnalyticsEvent.APP_OPEN);

          // Get current user data
          const userData = getUser();
          const firebaseUser = auth().currentUser;
          
          // Set analytics user ID if authenticated
          if (firebaseUser?.uid) {
            analytics.setUserId(firebaseUser.uid);
            analytics.setUserProperties({
              displayName: userData.displayName || 'Not set',
              email: firebaseUser.email || 'Not available',
              isAnonymous: false
            });
          } else if (userData?.id) {
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
            if (fetchSuccess) {
              console.log('✅ User data successfully fetched from Firestore');
            } else {
              console.warn('⚠️ User data could not be fetched from Firestore');
            }
          } catch (firestoreError) {
            console.error('❌ Error fetching user from Firestore:', firestoreError);
            // Log error to analytics
            analytics.logError('Error fetching user from Firestore', undefined, {
              errorDetails: String(firestoreError)
            });
          }
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('❌ Error initializing app:', error);
        // Log initialization error to analytics if analytics was initialized
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
  }, []);

  return { isInitialized, isLoading };
};
