import auth from '@react-native-firebase/auth';
import { useEffect, useState } from 'react';
import { useUserStore } from '../stores/userStore';
import { usePathStore } from '../stores/pathStore';
import { PATH_OPTIONS, PathOption } from '../models/Path';
import { checkStreakAndApplyPenalties } from './streakHook';
import { fetchFromFirestore } from '../helper/firebaseHelper';
import { useHomeStore } from '../stores/homeStore';
import importAnalytics, { initializeAnalytics, trackEvent } from '../../utils/analytics';
import { appLog } from '../helper/helper';
import { initializeStatsig } from '../utils/statsig';
// This function can be called after init or when app comes to foreground
export const onAppForegroundOrInit = async () => {
  appLog('onAppForegroundOrInit=====>', onAppForegroundOrInit);

  // Initialize analytics if not already initialized (idempotent)
  appLog('🔧 Initializing analytics on app foreground...');
  try {
    await initializeAnalytics();
  } catch (e) {
    appLog('Analytics already initialized or failed softly:', e);
  }

  // Initialize Statsig via provider (noop here). Keep idempotent and fast.
  appLog('🧪 Initializing Statsig on app foreground...');
  try {
    await initializeStatsig();
  } catch (e) {
    appLog('Statsig already initialized or handled by provider:', e);
  }

  const getUser = useUserStore.getState().getUser;
  const setSelectedPath = usePathStore.getState().setSelectedPath;
  const currentUser = auth().currentUser;
  try {
    if (!currentUser) {
      appLog('No authenticated user found');
      return;
    }
    const { success, data: firestoreData } = await fetchFromFirestore({
      currentLoggedUser: currentUser,
    });
    if (success && firestoreData) {
      // Update the Zustand store with Firestore data
      await useUserStore.getState().syncFirestoreData(firestoreData);

      // Update selected path if needed
      const updatedUserData = getUser();
      if (updatedUserData.selectedPathId) {
        const pathOption = PATH_OPTIONS.find(
          (path: PathOption) => path.id === updatedUserData.selectedPathId
        );
        if (pathOption) {
          setSelectedPath(pathOption);
        }
      }
      // Update completedMapPaths from Firestore if available
      if (firestoreData?.completedMapPaths) {
        appLog('Syncing completedMapPaths from Firestore:', firestoreData.completedMapPaths);
        useUserStore.getState().setCompletedMapPaths(firestoreData.completedMapPaths);
      }
    }
    appLog('onAppForegroundOrInit complete');
  } catch (firestoreError) {
    console.error('Error fetching user from Firestore (foreground/init):', firestoreError);
  }
  // Check streak and show freeze modal if needed
  const result = await checkStreakAndApplyPenalties();
  
  // Show streak freeze modal if a freeze was used
  if (result && 'streakFreezeUsed' in result && result.streakFreezeUsed) {
    // Access the global streak freeze modal function
    if (typeof global !== 'undefined' && (global as any).streakFreezeSheetRef) {
      appLog('❄️ Showing streak freeze modal from foreground/init - freeze was used');
      (global as any).streakFreezeSheetRef.current?.show(true);
      
      // Log analytics
      // Use top-level import to satisfy linter
      importAnalytics.logEvent('streak_freeze_used_foreground', {
        freezesRemaining: result.freezesRemaining,
        streakFreezeUsed: result.streakFreezeUsed,
        daysMissed: result.daysMissed,
      });
    } else {
      appLog('❌ Could not show streak freeze modal - global ref not available');
    }
  }
};
// Function to restore user state from Firestore
const restoreUserState = async () => {
  try {
    const firebaseUser = auth().currentUser;
    if (!firebaseUser) {
      appLog('No authenticated user found');
      return false;
    }
    appLog('Restoring user state for:', firebaseUser.uid);
    // First try to fetch from Firestore
    const { success, data: firestoreData } = await fetchFromFirestore({
      currentLoggedUser: firebaseUser,
    });
    if (!success || !firestoreData) {
      appLog('Failed to fetch user data from Firestore');
      return false;
    }
    appLog('Successfully fetched Firestore data:', firestoreData);
    const prayerCompleted = useHomeStore.getState().prayerCompleted;
    const reflectionCompleted = useHomeStore.getState().reflectionCompleted;
    const readingCompleted = useHomeStore.getState().readingCompleted;
    const completedMapPaths = useUserStore.getState().completedMapPaths;
    // Update the Zustand store with Firestore data
    await useUserStore.getState().syncFirestoreData(firestoreData);

    if (firestoreData?.completedPrayers && !prayerCompleted) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const hasPrayedToday = firestoreData.completedPrayers.some((prayer) => {
        if (!prayer.date || !prayer.date.toDate) {
          return false;
        }
        const prayerDate = prayer.date.toDate();
        prayerDate.setHours(0, 0, 0, 0);
        return prayerDate.getTime() === today.getTime();
      });
      if (hasPrayedToday) {
        useHomeStore.getState().setPrayerCompleted(true);
      }
    }
    if (firestoreData?.completedReflections && !reflectionCompleted) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const hasReflectedToday = firestoreData.completedReflections.some((prayer) => {
        if (!prayer.date || !prayer.date.toDate) {
          return false;
        }
        const prayerDate = prayer.date.toDate();
        prayerDate.setHours(0, 0, 0, 0);
        return prayerDate.getTime() === today.getTime();
      });
      if (hasReflectedToday) {
        useHomeStore.getState().setReflectionCompleted(true);
      }
    }
    if (firestoreData?.completedReadings && !readingCompleted) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const hasReadToday = firestoreData.completedReadings.some((prayer) => {
        if (!prayer.date || !prayer.date.toDate) {
          return false;
        }
        const prayerDate = prayer.date.toDate();
        prayerDate.setHours(0, 0, 0, 0);
        return prayerDate.getTime() === today.getTime();
      });
      if (hasReadToday) {
        useHomeStore.getState().setReadingCompleted(true);
      }
    }
    if (firestoreData?.completedMapPaths && !completedMapPaths?.length) {
      useUserStore.getState().setCompletedMapPaths(firestoreData?.completedMapPaths);
    }
    // If we have a selected path, update the path store
    if (firestoreData.selectedPathId) {
      const pathOption = PATH_OPTIONS.find(
        (path: PathOption) => path.id === firestoreData.selectedPathId
      );
      if (pathOption) {
        usePathStore.getState().setSelectedPath(pathOption);
      }
    }
    // Ensure we have all the required data
    const userData = useUserStore.getState().getUser();
    if (!userData) {
      appLog('No user data found after sync');
      return false;
    }
    appLog('User state restored successfully');
    return true;
  } catch (error) {
    console.error('Error restoring user state:', error);
    return false;
  }
};
export const useAppInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAnalyticsReady, setIsAnalyticsReady] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize analytics first and wait for completion
        appLog('🔧 Initializing analytics...');
        await initializeAnalytics();
        appLog('✅ Analytics initialized successfully');
        setIsAnalyticsReady(true);

        // Initialize Statsig for experiments
        appLog('🧪 Initializing Statsig...');
        await initializeStatsig();
        appLog('✅ Statsig initialized successfully');

        // Test analytics integration
        trackEvent('test_analytics_integration', {
          source: 'init_hook',
          timestamp: new Date().toISOString(),
        });

        // Restore user state
        await restoreUserState();
        setIsInitialized(true);
      } catch (error) {
        console.error('Error during app initialization:', error);
        setIsAnalyticsReady(true); // Set to true even on error to not block the app
        setIsInitialized(true);
      }
    };
    initializeApp();
  }, []);
  return { isInitialized, isAnalyticsReady };
};

// Default export for Expo Router compatibility
export default {};
