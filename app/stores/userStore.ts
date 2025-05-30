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
import { zuStandStorage } from './storage';

// Constants
const USER_FETCH_CACHE_DURATION = 5000; // 5 seconds
const SYNC_DEBOUNCE_MS = 2000;

// Types
type ProStatus = 'free' | 'trial' | 'pro';

// Initial state
const initialLamb: Lamb = {
  level: 1,
  xp: 0,
  mood: 'lamb-idle',
  hearts: 50,
  name: '',
  skin: 'default',
};

const initialState: UserDoc = {
  id: '',
  email: '',
  spiritualGoal: 'Walk',
  experienceLevel: 'new',
  frequencyGoal: 'daily',
  denomination: '',
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
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  completedReflections: [],
  completedPrayers: [],
  completedReadings: [],
};

// Utility functions
const isAuthenticated = (): boolean => {
  return !!auth().currentUser;
};

const undefinedToNull = <T>(obj: T): T => {
  if (obj === undefined) return null as unknown as T;
  if (Array.isArray(obj)) return obj.map(undefinedToNull) as unknown as T;

  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, v === undefined ? null : undefinedToNull(v)])
    ) as unknown as T;
  }
  return obj;
};

const convertTimestamps = (obj: any): any => {
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
};

const syncStreakWithWidget = (streakCount: number, lastActivityDate: Timestamp | Date | null) => {
  let activityDate: Date | null = null;

  if (lastActivityDate) {
    activityDate = lastActivityDate instanceof Date ? lastActivityDate : lastActivityDate.toDate();
  }

  syncStreakDataToWidget(streakCount, activityDate).catch((error) =>
    console.error('Failed to sync streak with widget:', error)
  );
};

// Store implementation
export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => {
      // Cache variables
      let lastUserFetch: Promise<boolean> | null = null;
      let lastUserFetchTime = 0;
      let syncTimeout: NodeJS.Timeout | null = null;
      let pendingSyncData: Partial<UserDoc> | null = null;

      const debouncedSyncUserDocument = async (data: Partial<UserDoc>) => {
        pendingSyncData = { ...pendingSyncData, ...data };
        if (syncTimeout) clearTimeout(syncTimeout);

        syncTimeout = setTimeout(async () => {
          if (pendingSyncData && isAuthenticated()) {
            await syncUserDocument(pendingSyncData);
            pendingSyncData = null;
          }
        }, SYNC_DEBOUNCE_MS);
      };

      return {
        ...initialState,

        // Core methods
        getUser: () => {
          const state = get();
          return state ? { ...state } : { ...initialState };
        },

        createUser: async (id: string, userData: Partial<UserDoc>) => {
          const newState = {
            ...initialState,
            ...userData,
            id,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };

          set(newState);

          const cleanedUserData = undefinedToNull({
            ...userData,
            id,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });

          const success = await createUserDocument(id, cleanedUserData);
          if (!success) {
            console.error('Failed to create user document in Firestore');
          }

          return success;
        },

        setUser: (user: Partial<UserDoc>) => {
          set((state) => {
            const updates = {
              ...user,
              updatedAt: Timestamp.now(),
            };

            if (isAuthenticated()) {
              batchUpdate(updates);
            }

            return updates;
          });
        },

        resetUserStore: () => {
          set({ ...initialState });
        },

        // Getters
        getSpiritualGoal: () => get().spiritualGoal || initialState.spiritualGoal,
        getExperienceLevel: () => get().experienceLevel || initialState.experienceLevel,
        getFrequencyGoal: () => get().frequencyGoal || initialState.frequencyGoal,
        getDenomination: () => get().denomination || initialState.denomination,
        getDisplayName: () => get().displayName || initialState.displayName,
        getSelectedPathId: () => get().selectedPathId || initialState.selectedPathId,
        getLamb: () => get().lamb || initialState.lamb,
        getStreakCount: () => get().streakCount || initialState.streakCount,
        getLastActivityDate: () => get().lastActivityDate || initialState.lastActivityDate,
        getVersesReadTotal: () => get().versesReadTotal || initialState.versesReadTotal,
        getChaptersReadTotal: () => get().chaptersReadTotal || initialState.chaptersReadTotal,
        getBibleVersion: () => get().bibleVersion || initialState.bibleVersion,
        getProStatus: () => get().proStatus || initialState.proStatus,
        getCreatedAt: () => get().createdAt || initialState.createdAt,
        getUpdatedAt: () => get().updatedAt || initialState.updatedAt,
        getGens: () => get().gens || initialState.gens,
        getLastReadingDate: () => get().lastReadingDate || initialState.lastReadingDate,
        getLastPrayerDate: () => get().lastPrayerDate || initialState.lastPrayerDate,
        getLastReflectionDate: () => get().lastReflectionDate || initialState.lastReflectionDate,
        getLastReadingPenaltyDate: () =>
          get().lastReadingPenaltyDate || initialState.lastReadingPenaltyDate,
        getLastPrayerPenaltyDate: () =>
          get().lastPrayerPenaltyDate || initialState.lastPrayerPenaltyDate,
        getLastReflectionPenaltyDate: () =>
          get().lastReflectionPenaltyDate || initialState.lastReflectionPenaltyDate,
        getCompletedReflections: () =>
          get().completedReflections || initialState.completedReflections,
        getCompletedPrayers: () => get().completedPrayers || initialState.completedPrayers,
        getCompletedReadings: () => get().completedReadings || initialState.completedReadings,
        getLambLevel: () => get().lamb?.level || initialState.lamb.level,
        getLambXp: () => get().lamb?.xp || initialState.lamb.xp,
        getLambMood: () => get().lamb?.mood || initialState.lamb.mood,
        getLambHearts: () => get().lamb?.hearts || initialState.lamb.hearts,
        getLambName: () => get().lamb?.name || initialState.lamb.name,
        getLambSkin: () => get().lamb?.skin || initialState.lamb.skin,

        // Setters
        setSpiritualGoal: (spiritualGoal) => set({ spiritualGoal }),
        setExperienceLevel: (experienceLevel) => set({ experienceLevel }),
        setFrequencyGoal: (frequencyGoal) => set({ frequencyGoal }),
        setDenomination: (denomination) => set({ denomination }),
        setDisplayName: (displayName) => set({ displayName }),
        setSelectedPathId: (selectedPathId) => set({ selectedPathId }),
        setLamb: (lamb) => set({ lamb }),

        setStreakCount: (count) => {
          set({ streakCount: count });
          if (isAuthenticated()) {
            updateField('streakCount', count);
          }
          syncStreakWithWidget(count, get().lastActivityDate);
        },

        setLastActivityDate: (date) => {
          set({ lastActivityDate: date });
          if (isAuthenticated()) {
            batchUpdate({ lastActivityDate: date });
          }
          syncStreakWithWidget(get().streakCount, date);
        },

        setLastReadingDate: (lastReadingDate) => {
          set({ lastReadingDate });
          if (isAuthenticated()) {
            batchUpdate({ lastReadingDate });
          }
        },

        setLastPrayerDate: (lastPrayerDate) => {
          set({ lastPrayerDate });
          if (isAuthenticated()) {
            batchUpdate({ lastPrayerDate });
          }
        },

        setLastReflectionDate: (lastReflectionDate) => {
          set({ lastReflectionDate });
          if (isAuthenticated()) {
            batchUpdate({ lastReflectionDate });
          }
        },

        setLastReadingPenaltyDate: (lastReadingPenaltyDate) => {
          set({ lastReadingPenaltyDate });
          if (isAuthenticated()) {
            batchUpdate({ lastReadingPenaltyDate });
          }
        },

        setLastPrayerPenaltyDate: (lastPrayerPenaltyDate) => {
          set({ lastPrayerPenaltyDate });
          if (isAuthenticated()) {
            batchUpdate({ lastPrayerPenaltyDate });
          }
        },

        setLastReflectionPenaltyDate: (lastReflectionPenaltyDate) => {
          set({ lastReflectionPenaltyDate });
          if (isAuthenticated()) {
            batchUpdate({ lastReflectionPenaltyDate });
          }
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

        setNotificationTime: async (time) => {
          set({ notificationTime: time });

          const user = get();
          if (user.id) {
            try {
              await firestore().collection('users').doc(user.id).update({
                notificationTime: time,
                updatedAt: firestore.Timestamp.now(),
              });

              await AsyncStorage.setItem(
                'shepherd-user-storage',
                JSON.stringify({ ...get(), notificationTime: time })
              );
            } catch (error) {
              console.error('Error updating notificationTime:', error);
              set({ notificationTime: user.notificationTime });
              throw error;
            }
          }
        },

        setCompletedReflections: (completedReflections) => set({ completedReflections }),
        setCompletedPrayers: (completedPrayers) => set({ completedPrayers }),
        setCompletedReadings: (completedReadings) => set({ completedReadings }),

        addCompletedReflection: (reflection) =>
          set((state) => ({
            completedReflections: [...(state.completedReflections || []), reflection],
          })),

        addCompletedPrayer: (prayer) =>
          set((state) => ({
            completedPrayers: [...(state.completedPrayers || []), prayer],
          })),

        addCompletedReading: (reading) => {
          set((state) => {
            const updatedReadings = [...(state.completedReadings || []), reading];
            if (isAuthenticated()) {
              debouncedSyncUserDocument({ completedReadings: updatedReadings });
            }
            return { completedReadings: updatedReadings };
          });
        },

        // Lamb setters
        setLambLevel: (level) =>
          set((state) => ({
            lamb: { ...(state.lamb || initialLamb), level },
          })),

        setLambXp: (xp) => {
          set((state) => ({
            lamb: { ...(state.lamb || initialLamb), xp },
          }));
          if (isAuthenticated()) {
            updateField('lamb.xp', xp);
          }
        },

        setLambMood: (mood) => {
          set((state) => ({
            lamb: { ...(state.lamb || initialLamb), mood },
          }));
          if (isAuthenticated()) {
            updateField('lamb.mood', mood);
          }
        },

        setLambHearts: (hearts) => {
          set((state) => ({
            lamb: { ...(state.lamb || initialLamb), hearts },
          }));
          if (isAuthenticated()) {
            updateField('lamb.hearts', hearts);
          }
        },

        setLambName: (name) => {
          set((state) => ({
            lamb: { ...(state.lamb || initialLamb), name },
          }));
          if (isAuthenticated()) {
            updateField('lamb.name', name);
          }
        },

        setLambSkin: (skin) =>
          set((state) => ({
            lamb: { ...(state.lamb || initialLamb), skin },
          })),

        // Utility functions
        incrementStreak: () => {
          set((state) => {
            const newStreakCount = (state.streakCount || 0) + 1;
            if (isAuthenticated()) {
              updateField('streakCount', newStreakCount);
            }
            return { streakCount: newStreakCount };
          });
        },

        addXp: (amount) => {
          set((state) => ({
            lamb: { ...(state.lamb || initialLamb), xp: (state.lamb?.xp || 0) + amount },
          }));
          if (isAuthenticated()) {
            updateField('lamb.xp', get().lamb?.xp || 0);
          }
        },

        // Firestore sync
        syncWithFirestore: async () => {
          if (!isAuthenticated()) return false;
          debouncedSyncUserDocument(get());
          return true;
        },

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
              const currentUser = auth().currentUser;
              if (!currentUser?.uid) {
                console.log('No valid user ID available');
                return false;
              }

              const userDoc = await firestore().collection('users').doc(currentUser.uid).get();

              if (!userDoc.exists) {
                console.log('User document does not exist, creating from local state');
                const currentState = get();
                if (currentState?.id) {
                  await syncUserDocument(currentState);
                  return true;
                }
                return false;
              }

              const userData = userDoc.data() as UserDoc;
              if (userData) {
                const updatedUserData = {
                  ...userData,
                  id: currentUser.uid,
                };

                const convertedUserData = convertTimestamps(updatedUserData);
                set(convertedUserData);
                return true;
              }

              return false;
            } catch (error) {
              console.error('Error fetching user data:', error);
              return false;
            }
          })();

          return lastUserFetch;
        },
      };
    },
    {
      name: 'shepherd-user-storage',
      storage: createJSONStorage(() => zuStandStorage as StateStorage),
      version: 1,
    }
  )
);
