import auth from '@react-native-firebase/auth';
import firestore, { Timestamp } from '@react-native-firebase/firestore';
import { UserDoc } from '../app/models/User';

/**
 * Firestore utility functions for handling user data
 */

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
      uid: currentUser.uid,
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
        skin: 'default'
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
      completedReadings: userData.completedReadings || []
    };

    // Create the document with the specified ID
    await firestore()
      .collection('users')
      .doc(id)
      .set(docToCreate);

    console.log('Successfully created user document with ID:', id);
    return true;
  } catch (error) {
    console.error('Error creating user document:', error);
    return false;
  }
};

// Update a single field in the user document
export const updateUserField = async (field: string, value: any) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.log('No authenticated user found, skipping sync');
      return false;
    }

    await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .update({
        [field]: value,
        updatedAt: Timestamp.now()
      });

    return true;
  } catch (error) {
    console.error(`Error updating user field ${field}:`, error);
    return false;
  }
};

// Update lamb properties
export const updateLambField = async (field: string, value: any) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.log('No authenticated user found, skipping sync');
      return false;
    }

    await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .update({
        [`lamb.${field}`]: value,
        updatedAt: Timestamp.now()
      });

    return true;
  } catch (error) {
    console.error(`Error updating lamb field ${field}:`, error);
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

    const docToSync = {
      ...userDoc,
      uid: currentUser.uid,
      email: currentUser.email,
      updatedAt: Timestamp.now(),
      createdAt: userDoc.createdAt || Timestamp.now()
    };

    await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .set(docToSync, { merge: true });

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

    const doc = await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .get();

    return doc.exists ? doc.data() as UserDoc : null;
  } catch (error) {
    console.error('Error getting user document:', error);
    return null;
  }
};
