import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import firestore, { Timestamp } from '@react-native-firebase/firestore';
import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';

import {
  updateField,
  syncUserDocument,
  createUserDocument,
  batchUpdate,
} from '../../utils/firestore';
import { syncStreakDataToWidget } from '../../utils/widgetSync';
import { UserDoc, Lamb, Prayer, Reflection, Reading, UserStore } from '../models/User';

// Helper function to check if user is authenticated
const isAuthenticated = () => {
  const currentUser = auth().currentUser;
  if (!currentUser) {
    console.log('No authenticated user found, skipping Firestore operation');
    return false;
  }
  return true;
};

// Create a custom storage object with logging
const customStorage: StateStorage = {
  getItem: async (name: string) => {
    console.log('Loading state from storage:', name);
    const value = await AsyncStorage.getItem(name);
    console.log('Loaded state:', value ? JSON.parse(value) : null);
    return value;
  },
  setItem: async (name: string, value: string) => {
    console.log('Saving state to storage:', name, JSON.parse(value));
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string) => {
    await AsyncStorage.removeItem(name);
  },
};

// Initial lamb state (only used if no persisted state exists)
const initialLamb: Lamb = {
  level: 1,
  xp: 0,
  mood: 'lamb-idle',
  hearts: 50,
  name: '', // Start with empty name
  skin: 'default',
};
export type ProStatus = 'free' | 'trial' | 'pro';

// Initial user state (only used if no persisted state exists)
const initialState: Partial<UserDoc & UserStore> = {
  spiritualGoal: 'Walk',
  experienceLevel: 'new',
  frequencyGoal: 'daily',
  displayName: '',
  selectedPathId: '',
  lamb: initialLamb,
  lastActivityDate: Timestamp.now(),
  lastReadingDate: Timestamp.now(),
  lastPrayerDate: Timestamp.now(),
  lastReflectionDate: Timestamp.now(),
  lastReadingPenaltyDate: Timestamp.now(),
  lastPrayerPenaltyDate: Timestamp.now(),
  lastReflectionPenaltyDate: Timestamp.now(),
  notificationTime: 'none',
  streakCount: 0,
  versesReadTotal: 0,
  chaptersReadTotal: 0,
  bibleVersion: 'ESV',
  proStatus: 'free',
  gens: 10,
  completedReflections: [] as unknown as [Reflection],
  completedPrayers: [] as unknown as [Prayer],
  completedReadings: [] as unknown as [Reading],
};

const allInitialStateFunctions = {
  // Getters
  getUser: () => {},
  getSpiritualGoal: () => '',
  getExperienceLevel: () => '',
  getFrequencyGoal: () => '',
  getDenomination: () => '',
  getDisplayName: () => '',
  getSelectedPathId: () => '',
  getLamb: () => initialState.lamb,
  getStreakCount: () => 0,
  getLastActivityDate: () => null,
  getVersesReadTotal: () => 0,
  getChaptersReadTotal: () => 0,
  getBibleVersion: () => '',
  getProStatus: () => 'free' as ProStatus,
  getCreatedAt: () => new Date(),
  getUpdatedAt: () => new Date(),
  getGens: () => 0,
  getLastReadingDate: () => null,
  getLastPrayerDate: () => null,
  getLastReflectionDate: () => null,
  getLastReadingPenaltyDate: () => null,
  getLastPrayerPenaltyDate: () => null,
  getLastReflectionPenaltyDate: () => null,
  getCompletedReflections: () => [],
  getCompletedPrayers: () => [],
  getCompletedReadings: () => [],
  getLambLevel: () => 0,
  getLambXp: () => 0,
  getLambMood: () => '',
  getLambHearts: () => 0,
  getLambName: () => '',
  getLambSkin: () => '',

  // Setters
  createUser: async (id: string, userData: Partial<UserDoc>): Promise<boolean> => false,
  setUser: (user: Partial<UserDoc>) => {},
  resetUserStore: () => {},
  setSpiritualGoal: (spiritualGoal: string) => {},
  setExperienceLevel: (experienceLevel: string) => {},
  setFrequencyGoal: (frequencyGoal: string) => {},
  setDenomination: (denomination: string) => {},
  setDisplayName: (displayName: string) => {},
  setSelectedPathId: (selectedPathId: string) => {},
  setLamb: (lamb: typeof initialState.lamb) => {},
  setStreakCount: (count: number) => {},
  setLastActivityDate: (date: any) => {},
  setLastReadingDate: (lastReadingDate: any) => {},
  setLastPrayerDate: (lastPrayerDate: any) => {},
  setLastReflectionDate: (lastReflectionDate: any) => {},
  setLastReadingPenaltyDate: (lastReadingPenaltyDate: any) => {},
  setLastPrayerPenaltyDate: (lastPrayerPenaltyDate: any) => {},
  setLastReflectionPenaltyDate: (lastReflectionPenaltyDate: any) => {},
  setVersesReadTotal: (versesReadTotal: number) => {},
  setChaptersReadTotal: (chaptersReadTotal: number) => {},
  setBibleVersion: (bibleVersion: string) => {},
  setProStatus: (proStatus: 'free' | 'trial' | 'pro') => {},
  setCreatedAt: (createdAt: any) => {},
  setUpdatedAt: (updatedAt: any) => {},
  setGens: (gens: number) => {},
  setNotificationTime: (time: string) => Promise.resolve(),
  setCompletedReflections: (completedReflections: any[]) => {},
  setCompletedPrayers: (completedPrayers: any[]) => {},
  setCompletedReadings: (completedReadings: any[]) => {},
  addCompletedReflection: (reflection: any) => {},
  addCompletedPrayer: (prayer: any) => {},
  addCompletedReading: (reading: any) => {},
  setLambLevel: (level: number) => {},
  setLambXp: (xp: number) => {},
  setLambMood: (mood: string) => {},
  setLambHearts: (hearts: number) => {},
  setLambName: (name: string) => {},
  setLambSkin: (skin: string) => {},

  // Utility functions
  incrementStreak: () => {},
  addXp: (amount: number) => {},
  syncWithFirestore: () => Promise.resolve(false),
  fetchFromFirestore: () => Promise.resolve(false),
};

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

// Utility to convert Firestore timestamp objects to Timestamp instances
function convertTimestamps(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const out = { ...obj };
  for (const key in out) {
    if (
      out[key] &&
      typeof out[key] === 'object' &&
      '_seconds' in out[key] &&
      '_nanoseconds' in out[key]
    ) {
      out[key] = new Timestamp(out[key]._seconds, out[key]._nanoseconds);
    }
  }
  return out;
}

// Add function to sync streak data with widget
const syncStreakWithWidget = (streakCount: number, lastActivityDate: any) => {
  // Get date from Firebase timestamp
  let activityDate: Date | null = null;
  if (lastActivityDate) {
    if (lastActivityDate instanceof Date) {
      activityDate = lastActivityDate;
    } else if (typeof lastActivityDate.toDate === 'function') {
      activityDate = lastActivityDate.toDate();
    }
  }

  // Sync with widget
  syncStreakDataToWidget(streakCount, activityDate).catch((error) =>
    console.log('Failed to sync streak with widget:', error)
  );
};

// --- Add cache for fetchFromFirestore ---
let lastUserFetch: Promise<boolean> | null = null;
let lastUserFetchTime: number = 0;
const USER_FETCH_CACHE_DURATION = 5000; // 5 seconds

// --- Debounce syncUserDocument ---
let syncTimeout: NodeJS.Timeout | null = null;
let pendingSyncData: Partial<UserDoc> | null = null;
const SYNC_DEBOUNCE_MS = 2000;

async function debouncedSyncUserDocument(data: Partial<UserDoc>) {
  pendingSyncData = { ...pendingSyncData, ...data };
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    if (pendingSyncData) {
      await syncUserDocument(pendingSyncData);
      pendingSyncData = null;
    }
  }, SYNC_DEBOUNCE_MS);
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      ...(initialState as UserDoc),
      ...allInitialStateFunctions,

      // Get complete user object
      getUser: () => {
        const state = get();
        console.log('Getting user state:', state);
        return {
          id: state.id,
          email: state.email,
          spiritualGoal: state.spiritualGoal,
          experienceLevel: state.experienceLevel,
          frequencyGoal: state.frequencyGoal,
          denomination: state.denomination,
          displayName: state.displayName,
          selectedPathId: state.selectedPathId,
          lamb: state.lamb,
          streakCount: state.streakCount,
          lastActivityDate: state.lastActivityDate,
          lastReadingDate: state.lastReadingDate,
          lastPrayerDate: state.lastPrayerDate,
          lastReflectionDate: state.lastReflectionDate,
          lastReadingPenaltyDate: state.lastReadingPenaltyDate,
          lastPrayerPenaltyDate: state.lastPrayerPenaltyDate,
          lastReflectionPenaltyDate: state.lastReflectionPenaltyDate,
          versesReadTotal: state.versesReadTotal,
          chaptersReadTotal: state.chaptersReadTotal,
          bibleVersion: state.bibleVersion,
          proStatus: state.proStatus,
          createdAt: state.createdAt,
          updatedAt: state.updatedAt,
          gens: state.gens,
          completedReflections: state.completedReflections,
          completedPrayers: state.completedPrayers,
          completedReadings: state.completedReadings,
        } as UserDoc;
      },

      // Create new user
      createUser: async (id: string, userData: Partial<UserDoc>) => {
        // Prepare all user data at once
        const newState = {
          ...initialState,
          ...userData,
          id,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        } as UserDoc;

        // Update local state immediately
        set(newState);

        // Convert undefined to null and prepare data for Firestore
        const cleanedUserData = undefinedToNull({
          ...userData,
          id,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        // Single Firestore call to create/update the document
        const success = await createUserDocument(id, cleanedUserData);
        if (!success) {
          console.log('Failed to create user document in Firestore');
        }

        return success;
      },

      // Set complete user object
      setUser: (user) => {
        set((state) => {
          const newState = {
            ...user,
          };

          // Only sync with Firestore if authenticated
          if (isAuthenticated()) {
            // Batch all updates into a single call
            const updates = {
              ...user,
              updatedAt: Timestamp.now(),
            };
            batchUpdate(updates);
          }

          return newState;
        });
      },

      // Reset user store to initial state
      resetUserStore: () => {
        console.log('Resetting user store to initial state');
        set(initialState as UserDoc);
      },

      // Getters for UserDoc
      getSpiritualGoal: () => get().spiritualGoal,
      getExperienceLevel: () => get().experienceLevel,
      getFrequencyGoal: () => get().frequencyGoal,
      getDenomination: () => get().denomination,
      getDisplayName: () => get().displayName,
      getSelectedPathId: () => get().selectedPathId,
      getLamb: () => get().lamb,
      getStreakCount: () => get().streakCount,
      getLastActivityDate: () => get().lastActivityDate,
      getVersesReadTotal: () => get().versesReadTotal,
      getChaptersReadTotal: () => get().chaptersReadTotal,
      getBibleVersion: () => get().bibleVersion,
      getProStatus: () => get().proStatus,
      getCreatedAt: () => get().createdAt,
      getUpdatedAt: () => get().updatedAt,
      getGens: () => get().gens,
      getLastReadingDate: () => get().lastReadingDate,
      getLastPrayerDate: () => get().lastPrayerDate,
      getLastReflectionDate: () => get().lastReflectionDate,
      getLastReadingPenaltyDate: () => get().lastReadingPenaltyDate,
      getLastPrayerPenaltyDate: () => get().lastPrayerPenaltyDate,
      getLastReflectionPenaltyDate: () => get().lastReflectionPenaltyDate,
      getCompletedReflections: () => get().completedReflections,
      getCompletedPrayers: () => get().completedPrayers,
      getCompletedReadings: () => get().completedReadings,
      // Getters for Lamb
      getLambLevel: () => get().lamb.level,
      getLambXp: () => get().lamb.xp,
      getLambMood: () => get().lamb.mood,
      getLambHearts: () => get().lamb.hearts,
      getLambName: () => get().lamb.name,
      getLambSkin: () => get().lamb.skin,

      // Setters for UserDoc
      setSpiritualGoal: (spiritualGoal) => set({ spiritualGoal }),
      setExperienceLevel: (experienceLevel) => set({ experienceLevel }),
      setFrequencyGoal: (frequencyGoal) => set({ frequencyGoal }),
      setDenomination: (denomination) => set({ denomination }),
      setDisplayName: (displayName) => set({ displayName }),
      setSelectedPathId: (selectedPathId) => set({ selectedPathId }),
      setLamb: (lamb) => set({ lamb }),
      setStreakCount: (count: number) => {
        const lastActivityDate = get().lastActivityDate;

        set((state) => {
          const newState = {
            streakCount: count,
          };

          // Sync to Firestore if authenticated
          if (isAuthenticated()) {
            updateField('streakCount', count);
          }

          return newState;
        });

        // Sync with widget
        syncStreakWithWidget(count, lastActivityDate);
      },
      setLastActivityDate: (date: any) => {
        const streakCount = get().streakCount;

        set((state) => {
          const newState = {
            lastActivityDate: date,
          };

          // Batch update with Firestore
          if (isAuthenticated()) {
            batchUpdate({ lastActivityDate: date });
          }

          return newState;
        });

        // Sync with widget
        syncStreakWithWidget(streakCount, date);
      },
      setLastReadingDate: (lastReadingDate) => {
        set((state) => {
          const newState = {
            lastReadingDate,
          };

          if (isAuthenticated()) {
            batchUpdate({ lastReadingDate });
          }

          return newState;
        });
      },
      setLastPrayerDate: (lastPrayerDate) => {
        set((state) => {
          const newState = {
            lastPrayerDate,
          };

          if (isAuthenticated()) {
            batchUpdate({ lastPrayerDate });
          }

          return newState;
        });
      },
      setLastReflectionDate: (lastReflectionDate) => {
        set((state) => {
          const newState = {
            lastReflectionDate,
          };

          if (isAuthenticated()) {
            batchUpdate({ lastReflectionDate });
          }

          return newState;
        });
      },
      setLastReadingPenaltyDate: (lastReadingPenaltyDate) => {
        set((state) => {
          const newState = {
            lastReadingPenaltyDate,
          };

          if (isAuthenticated()) {
            batchUpdate({ lastReadingPenaltyDate });
          }

          return newState;
        });
      },
      setLastPrayerPenaltyDate: (lastPrayerPenaltyDate) => {
        set((state) => {
          const newState = {
            lastPrayerPenaltyDate,
          };

          if (isAuthenticated()) {
            batchUpdate({ lastPrayerPenaltyDate });
          }

          return newState;
        });
      },
      setLastReflectionPenaltyDate: (lastReflectionPenaltyDate) => {
        set((state) => {
          const newState = {
            lastReflectionPenaltyDate,
          };

          if (isAuthenticated()) {
            batchUpdate({ lastReflectionPenaltyDate });
          }

          return newState;
        });
      },
      setVersesReadTotal: (versesReadTotal) => set({ versesReadTotal }),
      setChaptersReadTotal: (chaptersReadTotal) => set({ chaptersReadTotal }),
      setBibleVersion: (bibleVersion) => set({ bibleVersion }),
      setProStatus: (proStatus) => {
        set({ proStatus });
        if (isAuthenticated()) {
          updateField('proStatus', proStatus);
        }
      },
      setCreatedAt: (createdAt) => set({ createdAt }),
      setUpdatedAt: (updatedAt) => set({ updatedAt }),
      setGens: (gens) => {
        set({ gens });
        if (isAuthenticated()) {
          updateField('gens', gens);
        }
      },
      setNotificationTime: async (time: string) => {
        // Update local state
        set({ notificationTime: time });

        // Get current user
        const user = get().getUser?.();
        if (user?.id) {
          try {
            // Update Firestore
            await firestore().collection('users').doc(user.id).update({
              notificationTime: time,
              updatedAt: firestore.Timestamp.now(),
            });

            // Also update AsyncStorage to ensure persistence
            const currentState = get();
            await AsyncStorage.setItem(
              'shepherd-user-storage',
              JSON.stringify({
                ...currentState,
                notificationTime: time,
              })
            );

            console.log('✅ Successfully persisted notification time:', time);
          } catch (error) {
            console.log('Error updating notificationTime:', error);
            // If Firestore update fails, revert local state
            set({ notificationTime: user.notificationTime });
            throw error;
          }
        } else {
          // If no user ID, just update AsyncStorage
          const currentState = get();
          await AsyncStorage.setItem(
            'shepherd-user-storage',
            JSON.stringify({
              ...currentState,
              notificationTime: time,
            })
          );
        }
      },
      setCompletedReflections: (completedReflections) => set({ completedReflections }),
      setCompletedPrayers: (completedPrayers) => set({ completedPrayers }),
      setCompletedReadings: (completedReadings) => set({ completedReadings }),
      // Add single items to the completed arrays
      addCompletedReflection: (reflection) =>
        set((state) => ({
          completedReflections: [...state.completedReflections, reflection] as unknown as [
            Reflection,
          ],
        })),
      addCompletedPrayer: (prayer) =>
        set((state) => ({
          completedPrayers: [...state.completedPrayers, prayer] as unknown as [Prayer],
        })),
      addCompletedReading: (reading) => {
        set((state) => {
          const newState = {
            completedReadings: [...state.completedReadings, reading] as unknown as [Reading],
          };
          // Only sync with Firestore if authenticated
          if (isAuthenticated()) {
            debouncedSyncUserDocument(newState);
          }
          return newState;
        });
      },

      // Setters for Lamb
      setLambLevel: (level) =>
        set((state) => ({
          lamb: { ...state.lamb, level },
        })),
      setLambXp: (xp) => {
        set((state) => ({
          lamb: { ...state.lamb, xp },
        }));
        if (isAuthenticated()) {
          updateField('lamb.xp', xp);
        }
      },
      setLambMood: (mood) => {
        set((state) => ({
          lamb: { ...state.lamb, mood },
        }));
        if (isAuthenticated()) {
          updateField('lamb.mood', mood);
        }
      },
      setLambHearts: (hearts) => {
        set((state) => ({
          lamb: { ...state.lamb, hearts },
        }));
        if (isAuthenticated()) {
          updateField('lamb.hearts', hearts);
        }
      },
      setLambName: (name) => {
        console.log('Setting lamb name:', name);
        set((state) => {
          const newState = {
            lamb: { ...state.lamb, name },
          };

          console.log('New state after setting lamb name:', newState);

          // Only sync with Firestore if authenticated
          if (isAuthenticated()) {
            updateField('lamb.name', name);
          }

          return newState;
        });
      },
      setLambSkin: (skin) =>
        set((state) => ({
          lamb: { ...state.lamb, skin },
        })),

      // Utility functions
      incrementStreak: () => {
        set((state) => {
          const newStreakCount = state.streakCount + 1;
          const newState = {
            streakCount: newStreakCount,
          };

          // Only sync with Firestore if authenticated
          if (isAuthenticated()) {
            // updateField('streakCount', newStreakCount);
          }

          return newState;
        });
      },
      addXp: (amount) => {
        set((state) => ({
          lamb: { ...state.lamb, xp: state.lamb.xp + amount },
        }));
        if (isAuthenticated()) {
          updateField('lamb.xp', get().lamb.xp);
        }
      },

      // Sync with Firestore
      syncWithFirestore: async () => {
        if (!isAuthenticated()) {
          return false;
        }
        const state = get();
        // Debounced sync
        debouncedSyncUserDocument(state);
        return true;
      },

      // Fetch user data from Firestore and update the store
      fetchFromFirestore: async () => {
        const now = Date.now();
        if (lastUserFetch && now - lastUserFetchTime < USER_FETCH_CACHE_DURATION) {
          return lastUserFetch;
        }
        lastUserFetchTime = now;
        lastUserFetch = (async () => {
          if (!isAuthenticated()) {
            console.log('User not authenticated, skipping Firestore fetch');
            return false;
          }
          try {
            console.log('Fetching latest user data from Firestore');
            const currentUser = auth().currentUser;
            if (!currentUser || !currentUser.uid) {
              console.log('No valid user ID available, skipping Firestore fetch');
              return false;
            }
            // First try to get the document directly
            const userDoc = await firestore().collection('users').doc(currentUser.uid).get();
            if (!userDoc.exists) {
              console.log('User document does not exist in Firestore for ID:', currentUser.uid);
              // If document doesn't exist, try to create it with local data
              const currentState = get();
              if (currentState && currentState.id) {
                console.log('Creating user document from local state');
                await syncUserDocument(currentState);
                return true;
              }
              return false;
            }
            const userData = userDoc.data() as UserDoc;
            if (userData) {
              console.log('Got user data from Firestore, updating local store');
              // Ensure the data has an id field (matching Firebase uid)
              const updatedUserData = {
                ...userData,
                id: currentUser.uid,
              };
              // Convert all Firestore timestamp objects to Timestamp instances
              const convertedUserData = convertTimestamps(updatedUserData);
              set((state) => ({
                ...state,
                ...convertedUserData,
              }));
              return true;
            }
            return false;
          } catch (error) {
            console.error('Error fetching user data from Firestore:', error);
            return false;
          }
        })();
        return lastUserFetch;
      },
    }),
    {
      name: 'shepherd-user-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
