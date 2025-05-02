import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserDoc, Lamb, Prayer, Reflection, Reading, UserStore } from '../models/User';
import auth from '@react-native-firebase/auth';
import firestore, { Timestamp } from '@react-native-firebase/firestore';
import { updateField, syncUserDocument, createUserDocument } from '../../utils/firestore';

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
  name: '',  // Start with empty name
  skin: 'default'
};

// Initial user state (only used if no persisted state exists)
const initialState: Partial<UserDoc> = {
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
  streakCount: 0,
  versesReadTotal: 0,
  chaptersReadTotal: 0,
  bibleVersion: 'ESV',
  proStatus: 'free',
  gens: 10,
  completedReflections: [] as unknown as [Reflection],
  completedPrayers: [] as unknown as [Prayer],
  completedReadings: [] as unknown as [Reading]
};

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      ...initialState as UserDoc,
      
      // Get complete user object
      getUser: () => {
        const state = get();
        console.log('Getting user state:', state);
        return {
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
        const newState = {
          ...initialState,
          ...userData,
          id,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        } as UserDoc;
        
        set(newState);
        
        // Try to create document in Firestore
        const success = await createUserDocument(id, userData);
        if (!success) {
          console.error('Failed to create user document in Firestore');
        }
        
        return success;
      },

      // Set complete user object
      setUser: (user) => {
        set((state) => {
          const newState = {
            ...state,
            ...user,
            updatedAt: Timestamp.now()
          };
          
          // Only sync with Firestore if authenticated
          if (isAuthenticated()) {
            syncUserDocument(newState);
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
      setStreakCount: (streakCount) => set({ streakCount }),
      setLastActivityDate: (lastActivityDate) => set({ lastActivityDate }),
      setLastReadingDate: (lastReadingDate) => set({ lastReadingDate }),
      setLastPrayerDate: (lastPrayerDate) => set({ lastPrayerDate }),
      setLastReflectionDate: (lastReflectionDate) => set({ lastReflectionDate }),
      setLastReadingPenaltyDate: (lastReadingPenaltyDate) => set({ lastReadingPenaltyDate }),
      setLastPrayerPenaltyDate: (lastPrayerPenaltyDate) => set({ lastPrayerPenaltyDate }),
      setLastReflectionPenaltyDate: (lastReflectionPenaltyDate) => set({ lastReflectionPenaltyDate }),
      setVersesReadTotal: (versesReadTotal) => set({ versesReadTotal }),
      setChaptersReadTotal: (chaptersReadTotal) => set({ chaptersReadTotal }),
      setBibleVersion: (bibleVersion) => set({ bibleVersion }),
      setProStatus: (proStatus) => set({ proStatus }),
      setCreatedAt: (createdAt) => set({ createdAt }),
      setUpdatedAt: (updatedAt) => set({ updatedAt }),
      setGens: (gens) => {
        set({ gens });
        if (isAuthenticated()) {
          updateField('gens', gens);
        }
      },
      setCompletedReflections: (completedReflections) => set({ completedReflections }),
      setCompletedPrayers: (completedPrayers) => set({ completedPrayers }),
      setCompletedReadings: (completedReadings) => set({ completedReadings }),
      
      // Add single items to the completed arrays
      addCompletedReflection: (reflection) => set(state => ({
        completedReflections: [...state.completedReflections, reflection] as unknown as [Reflection]
      })),
      addCompletedPrayer: (prayer) => set(state => ({
        completedPrayers: [...state.completedPrayers, prayer] as unknown as [Prayer]
      })),
      addCompletedReading: (reading) => {
        set((state) => {
          const newState = {
            ...state,
            completedReadings: [...state.completedReadings, reading] as unknown as [Reading],
            updatedAt: Timestamp.now()
          };
          // Only sync with Firestore if authenticated
          if (isAuthenticated()) {
            syncUserDocument(newState);
          }
          return newState;
        });
      },
      
      // Setters for Lamb
      setLambLevel: (level) => set(state => ({
        lamb: { ...state.lamb, level }
      })),
      setLambXp: (xp) => {
        set(state => ({
          lamb: { ...state.lamb, xp }
        }));
        if (isAuthenticated()) {
          updateField('lamb.xp', xp);
        }
      },
      setLambMood: (mood) => {
        set(state => ({
          lamb: { ...state.lamb, mood }
        }));
        if (isAuthenticated()) {
          updateField('lamb.mood', mood);
        }
      },
      setLambHearts: (hearts) => {
        set(state => ({
          lamb: { ...state.lamb, hearts }
        }));
        if (isAuthenticated()) {
          updateField('lamb.hearts', hearts);
        }
      },
      setLambName: (name) => {
        console.log('Setting lamb name:', name);
        set((state) => {
          const newState = {
            ...state,
            lamb: { ...state.lamb, name },
            updatedAt: Timestamp.now()
          };
          
          console.log('New state after setting lamb name:', newState);
          
          // Only sync with Firestore if authenticated
          if (isAuthenticated()) {
            updateField('lamb.name', name);
          }
          
          return newState;
        });
      },
      setLambSkin: (skin) => set(state => ({
        lamb: { ...state.lamb, skin }
      })),
      
      // Utility functions
      incrementStreak: () => set(state => ({ streakCount: state.streakCount + 1 })),
      addXp: (amount) => {
        set(state => ({ 
          lamb: { ...state.lamb, xp: state.lamb.xp + amount } 
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
        // Create an object with only the data fields, excluding functions
        const dataToSync: Partial<UserDoc> = {
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
          updatedAt: state.updatedAt, // Use current state's updatedAt
          gens: state.gens,
          completedReflections: state.completedReflections,
          completedPrayers: state.completedPrayers,
          completedReadings: state.completedReadings,
          // Ensure id and potentially uid/email are included if they exist on state
          id: state.id,
          ...(state.uid && { uid: state.uid }),
          ...(state.email && { email: state.email }),
          ...(state.denomination && { denomination: state.denomination }),
        };

        // Pass only the data object to syncUserDocument
        return await syncUserDocument(dataToSync);
      },
    }),
    {
      name: 'shepherd-user-storage',
      storage: createJSONStorage(() => customStorage),
      partialize: (state) => {
        const persistedState = {
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
          completedReadings: state.completedReadings
        };
        console.log('Persisting state:', persistedState);
        return persistedState;
      },
      version: 1,
      onRehydrateStorage: () => (state) => {
        console.log('User store rehydrated with state:', state);
        if (!state) {
          console.log('No state was rehydrated, using initial state');
        }
      },
    }
  )
);
