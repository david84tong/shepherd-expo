import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore, { Timestamp } from '@react-native-firebase/firestore';
import { UserDoc } from '../models/User';
import { syncUserDocument, batchUpdate, removeFunctions } from '../../utils/firestore';
import { useUserStore } from '../stores/userStore';
import { syncStreakDataToWidget } from '../../utils/widgetSync';
import { appLog } from './helper';

// Constants
const USER_FETCH_CACHE_DURATION = 5000; // 5 seconds
const SYNC_DEBOUNCE_MS = 2000;

// Cache variables
let lastUserFetch: Promise<{ success: boolean; data?: UserDoc; error?: any }> | null = null;
let lastUserFetchTime = 0;
let syncTimeout: NodeJS.Timeout | null = null;
let pendingSyncData: Partial<UserDoc> | null = null;

export const isAuthenticated = (): boolean => {
  return !!auth().currentUser;
};

export const convertTimestamps = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj
      .map((item) => convertTimestamps(item))
      .filter((item) => item !== null && item !== undefined);
  }

  const out: any = {};
  for (const key in obj) {
    const value = obj[key];

    if (value === null || value === undefined) {
      continue; // skip null or undefined values
    }

    if (typeof value === 'object' && '_seconds' in value && '_nanoseconds' in value) {
      out[key] = new Timestamp(value._seconds, value._nanoseconds);
    } else if (typeof value === 'object') {
      const nested = convertTimestamps(value);
      // Only include nested object if it's not empty
      if (nested && (typeof nested !== 'object' || Object.keys(nested).length > 0)) {
        out[key] = nested;
      }
    } else {
      out[key] = value;
    }
  }

  return out;
};

export const debouncedSyncUserDocument = async (data: Partial<UserDoc>) => {
  pendingSyncData = { ...pendingSyncData, ...data };
  if (syncTimeout) clearTimeout(syncTimeout);

  syncTimeout = setTimeout(async () => {
    if (pendingSyncData && isAuthenticated()) {
      await syncUserDocument(pendingSyncData);
      pendingSyncData = null;
    }
  }, SYNC_DEBOUNCE_MS);
};

export const syncWithFirestore = async (): Promise<boolean> => {
  if (!isAuthenticated()) return false;
  const userData = useUserStore.getState();
  // await debouncedSyncUserDocument({
  await debouncedSyncUserDocument(removeFunctions(userData));
  return true;
};

export const updateUserData = async (updates: Partial<UserDoc>): Promise<void> => {
  if (isAuthenticated()) {
    const cleanedData = removeFunctions(updates);
    const updatedData = {
      ...cleanedData,
      updatedAt: Timestamp.now(),
    };
    await batchUpdate(updatedData);
  }
};

export const fetchFromFirestore = async ({
  currentLoggedUser,
}: {
  currentLoggedUser: FirebaseAuthTypes.User;
}): Promise<{
  success: boolean;
  data?: UserDoc;
  error?: any;
}> => {
  const now = Date.now();
  if (lastUserFetch && now - lastUserFetchTime < USER_FETCH_CACHE_DURATION) {
    return lastUserFetch;
  }

  lastUserFetchTime = now;
  lastUserFetch = (async () => {
    const currentUser = currentLoggedUser || auth?.()?.currentUser;
    appLog('currentUser ===>', currentUser);
    if (!currentUser) {
      appLog('User not authenticated, skipping Firestore fetch');
      return { success: false };
    }

    try {
      if (!currentUser?.uid) {
        appLog('No valid user ID available');
        return { success: false };
      }

      const userDoc = await firestore().collection('users').doc(currentUser?.uid).get();

      if (!userDoc.exists) {
        appLog('User document does not exist');
        return { success: false };
      }

      const userData = userDoc.data() as UserDoc;
      appLog('userData ======>', userData);

      if (userData) {
        // Ensure we have all required fields
        const updatedUserData = {
          ...userData,
          id: currentUser.uid,
          displayName: userData.displayName || currentUser.displayName || 'Anonymous User',
          email: userData.email || currentUser.email || '',
        };

        const convertedUserData = convertTimestamps(updatedUserData);
        appLog('Syncing user data to store:', convertedUserData);

        // Sync the data to store
        await useUserStore.getState().syncFirestoreData(convertedUserData);

        // Sync streak data to widget
        const syncStreakWithWidget = (streakCount: number, lastActivityDate: any) => {
          let activityDate: Date | null = null;
          if (lastActivityDate) {
            activityDate =
              lastActivityDate instanceof Date ? lastActivityDate : lastActivityDate.toDate();
          }
          if(streakCount === 0) return
          syncStreakDataToWidget(streakCount, activityDate).catch((error: Error) =>
            appLog('Failed to sync streak with widget:', error)
          );
        };

        // Sync streak data to widget after store sync
        syncStreakWithWidget(
          convertedUserData.streakCount || 0,
          convertedUserData.lastActivityDate
        );

        return { success: true, data: convertedUserData };
      }

      return { success: false };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return { success: false, error };
    }
  })();

  return lastUserFetch;
};

export const createUserDocumentIfNotExists = async (currentState: UserDoc): Promise<boolean> => {
  if (!currentState?.id) return false;

  try {
    await syncUserDocument(currentState);
    return true;
  } catch (error) {
    console.error('Error creating user document:', error);
    return false;
  }
};

// Default export for Expo Router compatibility
export default {}
