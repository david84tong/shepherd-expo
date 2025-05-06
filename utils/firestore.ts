import auth from '@react-native-firebase/auth';
import firestore, { Timestamp } from '@react-native-firebase/firestore';

import { UserDoc } from '../app/models/User';

/**
 * Firestore utility functions for handling user data
 */

// Add this utility at the top (after imports)
function undefinedToNull(obj: any): any {
  if (Array.isArray(obj)) return obj.map(undefinedToNull);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => {
        if (v === undefined) {
          console.log(`[undefinedToNull] Converting key from undefined to null:`, k);
          return [k, null];
        }
        return [k, undefinedToNull(v)];
      })
    );
  }
  return obj;
}

// Create a new user document with specified ID
export const createUserDocument = async (id: string, userData: Partial<UserDoc>) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.log('No authenticated user found, skipping document creation');
      return false;
    }

    const docToCreate = {
      ...userData,
      id,
      email: currentUser.email,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      // Set default values for required fields if not provided
      spiritualGoal: userData.spiritualGoal || 'Walk',
      experienceLevel: userData.experienceLevel || 'new',
      frequencyGoal: userData.frequencyGoal || 'daily',
      displayName: userData.displayName || 'Anonymous User',
      selectedPathId: userData.selectedPathId || '',
      lamb: userData.lamb || {
        level: 1,
        xp: 0,
        mood: 'lamb-idle',
        hearts: 50,
        name: '',
        skin: 'default',
      },
      streakCount: userData.streakCount || 0,
      lastActivityDate: userData.lastActivityDate || Timestamp.now(),
      versesReadTotal: userData.versesReadTotal || 0,
      chaptersReadTotal: userData.chaptersReadTotal || 0,
      bibleVersion: userData.bibleVersion || 'ESV',
      proStatus: userData.proStatus || 'free',
      gens: userData.gens || 10,
      completedReflections: userData.completedReflections || [],
      completedPrayers: userData.completedPrayers || [],
      completedReadings: userData.completedReadings || [],
    };
    const docToCreateCleaned = undefinedToNull(docToCreate);

    // Create the document with the specified ID
    await firestore().collection('users').doc(id).set(docToCreateCleaned);

    console.log('Successfully created user document with ID:', id);
    return true;
  } catch (error) {
    console.error('Error creating user document:', error);
    return false;
  }
};

// Update a single field (top-level or nested) in the user document
export const updateField = async (fieldPath: string, value: any) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.log('No authenticated user found, skipping sync');
      return false;
    }

    // Use uid from Firebase auth for the document ID
    const userId = currentUser.uid;

    await firestore()
      .collection('users')
      .doc(userId)
      .update({
        [fieldPath]: value,
        updatedAt: Timestamp.now(),
      });

    return true;
  } catch (error) {
    console.error(`Error updating user field ${fieldPath}:`, error);
    return false;
  }
};

// Sync entire user document
export const syncUserDocument = async (userDoc: Partial<UserDoc>) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.log('No authenticated user found, skipping sync');
      return false;
    }

    // Use uid from Firebase auth for the document ID
    const userId = currentUser.uid;

    const docToSync = {
      ...userDoc,
      id: userId,
      email: currentUser.email,
      updatedAt: Timestamp.now(),
      createdAt: userDoc.createdAt || Timestamp.now(),
    };
    const docToSyncCleaned = undefinedToNull(docToSync);

    await firestore().collection('users').doc(userId).set(docToSyncCleaned, { merge: true });

    console.log('Successfully synced with Firestore');
    return true;
  } catch (error) {
    console.error('Error syncing with Firestore:', error);
    return false;
  }
};

// Get user document
export const getUserDocument = async () => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.log('No authenticated user found');
      return null;
    }

    // Use uid from Firebase auth for the document ID
    const userId = currentUser.uid;

    const doc = await firestore().collection('users').doc(userId).get();

    return doc.exists ? (doc.data() as UserDoc) : null;
  } catch (error) {
    console.error('Error getting user document:', error);
    return null;
  }
};
