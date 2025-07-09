import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore, { Timestamp } from '@react-native-firebase/firestore';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { updateField, createUserDocument, removeFunctions } from '../../utils/firestore';
import { syncStreakDataToWidget } from '../../utils/widgetSync';
import { UserDoc, Lamb, UserStore, MapPathCompletion, CheckIn } from '../models/User';
import { isAuthenticated, updateUserData } from '../helper/firebaseHelper';

// Constants

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
  ageRange: '',
  username: '',
  isProFromOnboarding: false,
  hasSeenWidgetModal: false,
  hasSeenBibleReaderTutorial: false,
  level: 1,
  xp: 0,
  streak: 0,
  isPro: false,
  isProWithReferral: false,
  proExpiryDate: Timestamp.now(),
  completedMapPaths: [],
  skins: [],
  checkIns: [],
  setNotificationTime: async (_time: string) => {
    // This will be overridden by the actual implementation
    console.warn('setNotificationTime not implemented in initial state');
  },
};

// Utility functions
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

const syncStreakWithWidget = (streakCount: number, lastActivityDate: Timestamp | Date | null) => {
  let activityDate: Date | null = null;

  if (lastActivityDate) {
    activityDate = lastActivityDate instanceof Date ? lastActivityDate : lastActivityDate?.toDate?.();
  }
  
  if(streakCount === 0) return
  syncStreakDataToWidget(streakCount, activityDate).catch((error) =>
    console.error('Failed to sync streak with widget:', error)
  );
};

// Store implementation
export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Core methods
      getUser: () => {
        const state = get();
        return state ? { ...state } : { ...initialState };
      },

      // Enhanced function to sync Firestore data
      syncFirestoreData: (firestoreData: UserDoc) => {
        if (!firestoreData) {
          console.error('Attempted to sync null/undefined Firestore data');
          return;
        }
        console.log('Syncing Firestore data to local store:', firestoreData);
        set((state) => {
          // Ensure we keep local data if Firestore data is undefined
          return {
            ...(state || {}),
            ...(firestoreData || {}),
            // Ensure critical fields are properly synced
            id: firestoreData.id || state.id,
            displayName: firestoreData.displayName || state.displayName,
            email: firestoreData.email || state.email,
            createdAt: firestoreData.createdAt || state.createdAt,
            updatedAt: firestoreData.updatedAt || state.updatedAt,
            lastActivityDate: firestoreData.lastActivityDate || state.lastActivityDate,
            // Sync progress data
            level: firestoreData.level || state.level,
            xp: firestoreData.xp || state.xp,
            streak: firestoreData.streak || state.streak,
            streakCount: firestoreData.streakCount || state.streakCount,
            // Sync completion data - use Firestore data if available
            completedReadings: firestoreData.completedReadings ?? state.completedReadings ?? [],
            completedPrayers: firestoreData.completedPrayers ?? state.completedPrayers ?? [],
            completedReflections:
              firestoreData.completedReflections ?? state.completedReflections ?? [],
            // Ensure completedMapPaths is properly synced from Firestore
            completedMapPaths: firestoreData.completedMapPaths ?? state.completedMapPaths ?? [],
            // Sync lamb data
            lamb: {
              ...(state.lamb || {}),
              ...(firestoreData.lamb || {}),
              name:
                firestoreData.lamb?.name ||
                firestoreData?.displayName ||
                state.lamb?.name ||
                'My Lamb',
              level: firestoreData.lamb?.level || state.lamb?.level || 1,
            },
            // Sync path data
            selectedPathId: firestoreData.selectedPathId || state.selectedPathId,
            // Sync dates
            lastReadingDate: firestoreData.lastReadingDate || state.lastReadingDate,
            lastPrayerDate: firestoreData.lastPrayerDate || state.lastPrayerDate,
            lastReflectionDate: firestoreData.lastReflectionDate || state.lastReflectionDate,
            // Sync penalty dates
            lastReadingPenaltyDate:
              firestoreData.lastReadingPenaltyDate || state.lastReadingPenaltyDate,
            lastPrayerPenaltyDate:
              firestoreData.lastPrayerPenaltyDate || state.lastPrayerPenaltyDate,
            lastReflectionPenaltyDate:
              firestoreData.lastReflectionPenaltyDate || state.lastReflectionPenaltyDate,
            // Sync pro status
            isPro: firestoreData.isPro || state.isPro || false,
            isProWithReferral: firestoreData.isProWithReferral || state.isProWithReferral || false,
            proExpiryDate: firestoreData.proExpiryDate || state.proExpiryDate,
            // Sync check-in data - ensure it's always an array
            checkIns: Array.isArray(firestoreData.checkIns) ? firestoreData.checkIns : (state.checkIns || []),
          };
        });
        console.log('Firestore data sync complete');
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

        const cleanedUserData = removeFunctions(undefinedToNull({
          ...userData,
          id,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }));

        const success = await createUserDocument(id, cleanedUserData);
        if (!success) {
          console.error('Failed to create user document in Firestore');
        }

        return success;
      },

      setUser: (user: Partial<UserDoc>) => {
        set((_state) => {
          const updates = {
            ...user,
            updatedAt: Timestamp.now(),
          };

          if (isAuthenticated()) {
            updateUserData(removeFunctions(updates));
          }

          return updates;
        });
      },

      resetUserStore: () => {
        set({ ...initialState });
      },

      // Getters
      getSpiritualGoal: () => {
        const state = get();
        return state?.spiritualGoal || initialState.spiritualGoal;
      },
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
      getHasSeenWidgetModal: () => get().hasSeenWidgetModal || false,
      getHasSeenBibleReaderTutorial: () => get().hasSeenBibleReaderTutorial || false,
      getSkins: () => get().skins || initialState.skins,
      getCheckIns: () => get().checkIns,

      // Setters
      setSpiritualGoal: (spiritualGoal) => set({ spiritualGoal }),
      setExperienceLevel: (experienceLevel) => set({ experienceLevel }),
      setFrequencyGoal: (frequencyGoal) => set({ frequencyGoal }),
      setDenomination: (denomination) => set({ denomination }),
      setDisplayName: (displayName) => set({ displayName }),
      setSelectedPathId: (selectedPathId) => set({ selectedPathId }),
      setIsProFromOnboarding: (isProFromOnboarding) => set({ isProFromOnboarding }),
      setLamb: (lamb) => set({ lamb }),

      setStreakCount: (count) => {
        set({ streakCount: count, streak: count });
        if (isAuthenticated()) {
          updateField('streakCount', count);
          updateField('streak', count);
        }
        
        syncStreakWithWidget(count, get().lastActivityDate);
      },

      setLastActivityDate: (date) => {
        set({ lastActivityDate: date });
        if (isAuthenticated()) {
          updateUserData({ lastActivityDate: date });
        }
        syncStreakWithWidget(get().streakCount, date);
      },

      setLastReadingDate: (lastReadingDate) => {
        set({ lastReadingDate });
        if (isAuthenticated()) {
          updateUserData({ lastReadingDate });
        }
      },

      setLastPrayerDate: (lastPrayerDate) => {
        set({ lastPrayerDate });
        if (isAuthenticated()) {
          updateUserData({ lastPrayerDate });
        }
      },

      setLastReflectionDate: (lastReflectionDate) => {
        set({ lastReflectionDate });
        if (isAuthenticated()) {
          updateUserData({ lastReflectionDate });
        }
      },

      setLastReadingPenaltyDate: (lastReadingPenaltyDate) => {
        set({ lastReadingPenaltyDate });
        if (isAuthenticated()) {
          updateUserData({ lastReadingPenaltyDate });
        }
      },

      setLastPrayerPenaltyDate: (lastPrayerPenaltyDate) => {
        set({ lastPrayerPenaltyDate });
        if (isAuthenticated()) {
          updateUserData({ lastPrayerPenaltyDate });
        }
      },

      setLastReflectionPenaltyDate: (lastReflectionPenaltyDate) => {
        set({ lastReflectionPenaltyDate });
        if (isAuthenticated()) {
          updateUserData({ lastReflectionPenaltyDate });
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
        set((state) => {
          const updatedReflections = [...(state.completedReflections || []), reflection];
          if (isAuthenticated()) {
            updateUserData({ completedReflections: updatedReflections });
          }
          return { completedReflections: updatedReflections };
        }),

      addCompletedPrayer: (prayer) =>
        set((state) => {
          const updatedPrayers = [...(state.completedPrayers || []), prayer];
          if (isAuthenticated()) {
            updateUserData({ completedPrayers: updatedPrayers });
          }
          return { completedPrayers: updatedPrayers };
        }),

      addCompletedReading: (reading) => {
        set((state) => {
          const updatedReadings = [...(state.completedReadings || []), reading];
          if (isAuthenticated()) {
            updateUserData({ completedReadings: updatedReadings });
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
            updateField('streak', newStreakCount);
          }
          return { streakCount: newStreakCount, streak: newStreakCount };
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

      setHasSeenWidgetModal: (hasSeen: boolean) => {
        set({ hasSeenWidgetModal: hasSeen });
        if (isAuthenticated()) {
          updateField('hasSeenWidgetModal', hasSeen);
        }
      },

      setHasSeenBibleReaderTutorial: (hasSeen: boolean) => {
        
        set({ hasSeenBibleReaderTutorial: hasSeen });
        if (isAuthenticated()) {
          updateField('hasSeenBibleReaderTutorial', hasSeen);
        }
      },

      setCompletedMapPaths: (completedMapPaths: MapPathCompletion[]) => {
        set({ completedMapPaths });
        if (isAuthenticated()) {
          updateUserData({ completedMapPaths });
        }
      },

      addCompletedMapPath: (path: MapPathCompletion) =>
        set((state) => {
          const updatedPaths = [...(state.completedMapPaths || []), path];
          if (isAuthenticated()) {
            updateUserData({ completedMapPaths: updatedPaths });
          }
          return { completedMapPaths: updatedPaths };
        }),

      // Skins methods
      setSkins: (skins: string[]) => {
        set({ skins });
        if (isAuthenticated()) {
          updateUserData({ skins });
        }
      },

      addSkin: (skin: string) => {
        set((state) => {
          const currentSkins = state.skins || [];
          if (!currentSkins.includes(skin)) {
            const updatedSkins = [...currentSkins, skin];
            if (isAuthenticated()) {
              updateUserData({ skins: updatedSkins });
            }
            return { skins: updatedSkins };
          }
          return state;
        });
      },

      setCheckIns: async (checkIns: UserDoc['checkIns']) => {
        console.log('[setCheckIns] Called with:', checkIns);
        set({ checkIns });
        if (isAuthenticated()) {
          updateUserData({ checkIns });
        }
      },

      addCheckIn: async (_dateKey: string, checkInData: CheckIn) => {
        // Ignore dateKey, just push to array
        set((state) => {
          // Ensure checkIns is always an array
          const currentCheckIns = Array.isArray(state.checkIns) ? state.checkIns : [];
          const updatedCheckIns = [...currentCheckIns, checkInData];
          if (isAuthenticated()) {
            updateUserData({ checkIns: updatedCheckIns });
          }
          return { checkIns: updatedCheckIns };
        });
      },
    }),
    {
      name: 'shepherd-user-storage',
      storage: createJSONStorage(() => AsyncStorage as any),
      migrate: (persistedState, version) => {
        if (!persistedState) return initialState;
        return { ...initialState, ...persistedState };
      },
    }
  )
);
