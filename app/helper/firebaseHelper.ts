import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore, { Timestamp } from '@react-native-firebase/firestore';
import { UserDoc } from '../models/User';
import { syncUserDocument, batchUpdate } from '../../utils/firestore';
import { useUserStore } from '../stores/userStore';

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
  await debouncedSyncUserDocument(userData);
  return true;
};

export const updateUserData = async (updates: Partial<UserDoc>): Promise<void> => {
  if (isAuthenticated()) {
    const updatedData = {
      ...updates,
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
    console.log('currentUser ===>', currentUser);
    if (!currentUser) {
      console.log('User not authenticated, skipping Firestore fetch');
      return { success: false };
    }

    try {
      if (!currentUser?.uid) {
        console.log('No valid user ID available');
        return { success: false };
      }

      const userDoc = await firestore().collection('users').doc(currentUser?.uid).get();

      if (!userDoc.exists) {
        console.log('User document does not exist');
        return { success: false };
      }

      const userData = userDoc.data() as UserDoc;
      console.log('userData ======>', userData);

      if (userData) {
        // Ensure we have all required fields
        const updatedUserData = {
          ...userData,
          id: currentUser.uid,
          displayName: userData.displayName || currentUser.displayName || 'Anonymous User',
          email: userData.email || currentUser.email || '',
        };

        const convertedUserData = convertTimestamps(updatedUserData);
        console.log('Syncing user data to store:', convertedUserData);

        // Sync the data to store
        useUserStore.getState().syncFirestoreData(convertedUserData);

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
