import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { Timestamp } from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/react-native';
import { useUserStore } from '../stores/userStore';
import { usePathStore } from '../stores/pathStore';
import useSubscriptionStore from '../stores/subscriptionStore';
import { Mixpanel } from 'mixpanel-react-native';
import { PATH_OPTIONS, PathOption } from '../models/Path';
import { Platform } from 'react-native';
import { adapty } from 'react-native-adapty';
import analytics, { AnalyticsEvent } from '../../utils/analytics';
import { checkStreakAndApplyPenalties } from './streakHook';
import { syncUserDocument } from '../../utils/firestore';
import { fetchFromFirestore } from '../helper/firebaseHelper';
import { Path } from '../models/Path';
import { useUserStore as oldUserStore } from '../stores/userStore';
import { usePathStore as oldPathStore } from '../stores/pathStore';
import { analytics as oldAnalytics } from '../helper/analyticsHelper';
import { useHomeStore } from '../stores/homeStore';
// Key to check if app has been initialized
const APP_INITIALIZED_KEY = 'app_initialized';
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
  const currentUser = auth().currentUser;
  try {
    if (!currentUser) {
      console.log('No authenticated user found');
      return;
    }
    const { success, data: firestoreData } = await fetchFromFirestore({
      currentLoggedUser: currentUser,
    });
    if (success && firestoreData) {
      // Update the Zustand store with Firestore data
      useUserStore.getState().syncFirestoreData(firestoreData);
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
        console.log('Syncing completedMapPaths from Firestore:', firestoreData.completedMapPaths);
        useUserStore.getState().setCompletedMapPaths(firestoreData.completedMapPaths);
      }
    }
    console.log('onAppForegroundOrInit complete');
  } catch (firestoreError) {
    console.error('Error fetching user from Firestore (foreground/init):', firestoreError);
  }
  await checkStreakAndApplyPenalties();
};
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
    const { success, data: firestoreData } = await fetchFromFirestore({
      currentLoggedUser: firebaseUser,
    });
    if (!success || !firestoreData) {
      console.log('Failed to fetch user data from Firestore');
      return false;
    }
    console.log('Successfully fetched Firestore data:', firestoreData);
    const prayerCompleted = useHomeStore.getState().prayerCompleted;
    const reflectionCompleted = useHomeStore.getState().reflectionCompleted;
    const readingCompleted = useHomeStore.getState().readingCompleted;
    const completedMapPaths = useUserStore.getState().completedMapPaths;
    // Update the Zustand store with Firestore data
    useUserStore.getState().syncFirestoreData(firestoreData);
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
      console.log('No user data found after sync');
      return false;
    }
    console.log('User state restored successfully');
    return true;
  } catch (error) {
    console.error('Error restoring user state:', error);
    return false;
  }
};
export const useAppInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await restoreUserState();
        setIsInitialized(true);
      } catch (error) {
        console.error('Error during app initialization:', error);
        setIsInitialized(true); // Set to true even on error to not block the app
      }
    };
    initializeApp();
  }, []);
  return { isInitialized };
};
