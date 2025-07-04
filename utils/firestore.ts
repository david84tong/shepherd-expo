import auth from '@react-native-firebase/auth';
import firestore, { Timestamp } from '@react-native-firebase/firestore';

import { UserDoc } from '../app/models/User';

/**
 * Firebase Request Debugger
 */
class FirebaseDebugger {
  private static instance: FirebaseDebugger;
  private requestCount: number = 0;
  private requestLog: Array<{
    timestamp: Date;
    operation: string;
    path: string;
    data?: any;
  }> = [];

  private constructor() {}

  static getInstance(): FirebaseDebugger {
    if (!FirebaseDebugger.instance) {
      FirebaseDebugger.instance = new FirebaseDebugger();
    }
    return FirebaseDebugger.instance;
  }

  logRequest(operation: string, path: string, data?: any) {
    this.requestCount++;
    this.requestLog.push({
      timestamp: new Date(),
      operation,
      path,
      data,
    });
    console.log(`[Firebase Debug] Request #${this.requestCount}: ${operation} ${path}`);
  }

  getRequestCount(): number {
    return this.requestCount;
  }

  getRequestLog(): Array<{
    timestamp: Date;
    operation: string;
    path: string;
    data?: any;
  }> {
    return this.requestLog;
  }

  reset() {
    this.requestCount = 0;
    this.requestLog = [];
  }

  printSummary() {
    console.log('\n=== Firebase Request Summary ===');
    console.log(`Total Requests: ${this.requestCount}`);
    console.log('\nRequest Log:');
    this.requestLog.forEach((log, index) => {
      console.log(`\n${index + 1}. ${log.timestamp.toISOString()}`);
      console.log(`   Operation: ${log.operation}`);
      console.log(`   Path: ${log.path}`);
      if (log.data) {
        console.log('   Data:', JSON.stringify(log.data, null, 2));
      }
    });
    console.log('\n=============================\n');
  }
}

// Create debugger instance
const firebaseDebugger = FirebaseDebugger.getInstance();

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

// Batch update utility with debouncing
let pendingBatchUpdates: Record<string, any> = {};
let batchTimeout: NodeJS.Timeout | null = null;

export const batchUpdate = async (updates: Record<string, any>) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.log('No authenticated user found, skipping batch update');
      return false;
    }

    // Merge new updates with pending updates
    pendingBatchUpdates = {
      ...pendingBatchUpdates,
      ...updates,
      updatedAt: Timestamp.now(),
    };

    // Clear existing timeout if any
    if (batchTimeout) {
      clearTimeout(batchTimeout);
    }

    // Set new timeout to commit batch
    batchTimeout = setTimeout(async () => {
      try {
        const batch = firestore().batch();
        const userRef = firestore().collection('users').doc(currentUser.uid);

        // Add all pending updates to the batch
        batch.update(userRef, pendingBatchUpdates);

        // Log the batch update
        firebaseDebugger.logRequest(
          'BATCH_UPDATE',
          `users/${currentUser.uid}`,
          pendingBatchUpdates
        );

        // Commit the batch
        await batch.commit();

        // Clear pending updates
        pendingBatchUpdates = {};
        console.log('Successfully committed batched updates');
      } catch (error) {
        console.error('Error committing batched updates:', error);
      }
    }, 1000); // Wait 1 second before committing batch

    return true;
  } catch (error) {
    console.error('Error in batch update:', error);
    return false;
  }
};

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

    // Log the create operation
    firebaseDebugger.logRequest('CREATE', `users/${id}`, docToCreateCleaned);

    // Create the document with the specified ID
    await firestore().collection('users').doc(id).set(docToCreateCleaned);

    console.log('Successfully created user document with ID:', id);
    return true;
  } catch (error) {
    console.log('Error creating user document:', error);
    return false;
  }
};

// Update a single field (top-level or nested) in the user document
export const updateField = async (fieldPath: string, value: any) => {
  // Log the field update
  // Use batchUpdate instead of individual updates
  return batchUpdate({ [fieldPath]: value });
};

// Sync entire user document
export const syncUserDocument = async (userDoc: Partial<UserDoc>) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.log('No authenticated user found, skipping sync');
      return false;
    }

    const userId = currentUser.uid;
    const docToSync = {
      ...userDoc,
      id: userId,
      email: currentUser.email,
      updatedAt: Timestamp.now(),
    };
    const docToSyncCleaned = undefinedToNull(docToSync);

    // Log the sync operation
    firebaseDebugger.logRequest('SYNC', `users/${userId}`, docToSyncCleaned);

    // Use set with merge instead of update for better performance
    await firestore().collection('users').doc(userId).set(docToSyncCleaned, { merge: true });

    console.log('Successfully synced with Firestore');
    return true;
  } catch (error) {
    console.log('Error syncing with Firestore:', error);
    return false;
  }
};

// Add request cache
const requestCache = new Map<
  string,
  {
    data: any;
    timestamp: number;
    promise: Promise<any> | null;
  }
>();

const CACHE_DURATION = 5000; // 5 seconds cache

// Helper to get cached request or make new one
const getCachedRequest = async <T>(key: string, requestFn: () => Promise<T>): Promise<T> => {
  const now = Date.now();
  const cached = requestCache.get(key);

  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // If there's an ongoing request, return its promise
  if (cached?.promise) {
    return cached.promise;
  }

  // Make new request
  const promise = requestFn();
  requestCache.set(key, {
    data: null,
    timestamp: now,
    promise,
  });

  try {
    const data = await promise;
    requestCache.set(key, {
      data,
      timestamp: now,
      promise: null,
    });
    return data;
  } catch (error) {
    requestCache.delete(key);
    throw error;
  }
};

// Modify getUserDocument to use cache
export const getUserDocument = async () => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.log('No authenticated user found');
      return null;
    }

    const userId = currentUser.uid;
    const cacheKey = `user_${userId}`;

    return await getCachedRequest(cacheKey, async () => {
      // Log the get operation
      firebaseDebugger.logRequest('GET', `users/${userId}`, null);

      const doc = await firestore().collection('users').doc(userId).get();
      return doc.exists ? (doc.data() as UserDoc) : null;
    });
  } catch (error) {
    console.log('Error getting user document:', error);
    return null;
  }
};

// Add cache clearing function
export const clearFirestoreCache = () => {
  requestCache.clear();
};

// Export debug functions
export const getFirebaseRequestCount = () => firebaseDebugger.getRequestCount();
export const getFirebaseRequestLog = () => firebaseDebugger.getRequestLog();
export const resetFirebaseRequestCount = () => firebaseDebugger.reset();
export const printFirebaseRequestSummary = () => firebaseDebugger.printSummary();
// Save feedback to Firestore
export const saveFeedback = async (feedbackData: {
  type: string;
  reasons: string[];
  feedback: string;
  userId: string;
  timestamp: string;
}) => {
  try {
    console.log('🔍 saveFeedback called with data:', feedbackData);

    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.log('❌ No authenticated user found, skipping feedback save');
      console.log('No authenticated user found, skipping feedback save');
      return false;
    }

    console.log('👤 Current user found:', currentUser.uid, currentUser.email);

    const feedbackDoc = {
      ...feedbackData,
      createdAt: Timestamp.now(),
      userEmail: currentUser.email,
    };

    console.log('📄 Feedback document to save:', feedbackDoc);

    // Save to feedback collection
    const docRef = await firestore().collection('feedback').add(feedbackDoc);
    console.log('✅ Feedback saved with document ID:', docRef.id);

    console.log('Successfully saved feedback to Firestore');
    return true;
  } catch (error) {
    console.error('Error saving feedback:', error);
    console.error('❌ Full error details:', JSON.stringify(error, null, 2));
    return false;
  }
};

// Utility to remove all function properties from an object
export function removeFunctions(obj: any): any {
  if (Array.isArray(obj)) return obj.map(removeFunctions);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => typeof v !== 'function')
        .map(([k, v]) => [k, removeFunctions(v)])
    );
  }
  return obj;
}
