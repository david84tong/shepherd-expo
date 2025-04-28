import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserDoc, Lamb, Prayer, Reflection, Reading } from '../models/User';
import firestore from '@react-native-firebase/firestore';

interface UserStore extends UserDoc {
  // Getters for UserDoc fields
  getSpiritualGoal: () => UserDoc['spiritualGoal'];
  getExperienceLevel: () => UserDoc['experienceLevel'];
  getFrequencyGoal: () => UserDoc['frequencyGoal'];
  getDenomination: () => UserDoc['denomination'];
  getDisplayName: () => string;
  getSelectedPathId: () => string;
  getLamb: () => Lamb;
  getStreakCount: () => number;
  getLastActivityDate: () => UserDoc['lastActivityDate'];
  getVersesReadTotal: () => number; 
  getChaptersReadTotal: () => number;
  getBibleVersion: () => string;
  getProStatus: () => UserDoc['proStatus'];
  getCreatedAt: () => UserDoc['createdAt'];
  getUpdatedAt: () => UserDoc['updatedAt'];
  getGens: () => number;
  getLastReadingDate: () => UserDoc['lastReadingDate'];
  getLastPrayerDate: () => UserDoc['lastPrayerDate'];
  getLastReflectionDate: () => UserDoc['lastReflectionDate'];
  getLastReadingPenaltyDate: () => UserDoc['lastReadingPenaltyDate'];
  getLastPrayerPenaltyDate: () => UserDoc['lastPrayerPenaltyDate'];
  getLastReflectionPenaltyDate: () => UserDoc['lastReflectionPenaltyDate'];
  getCompletedReflections: () => [Reflection];
  getCompletedPrayers: () => [Prayer];
  getCompletedReadings: () => [Reading];
  
  // Getters for Lamb fields
  getLambLevel: () => number;
  getLambXp: () => number;
  getLambMood: () => string;
  getLambHearts: () => number;
  getLambName: () => string;
  getLambSkin: () => string;
  
  // Setters for UserDoc fields
  setSpiritualGoal: (goal: UserDoc['spiritualGoal']) => void;
  setExperienceLevel: (level: UserDoc['experienceLevel']) => void;
  setFrequencyGoal: (goal: UserDoc['frequencyGoal']) => void;
  setDenomination: (denomination?: string) => void;
  setDisplayName: (name: string) => void;
  setSelectedPathId: (pathId: string) => void;
  setLamb: (lamb: Lamb) => void;
  setStreakCount: (count: number) => void;
  setLastActivityDate: (date: UserDoc['lastActivityDate']) => void;
  setLastReadingDate: (date: UserDoc['lastReadingDate']) => void;
  setLastPrayerDate: (date: UserDoc['lastPrayerDate']) => void;
  setLastReflectionDate: (date: UserDoc['lastReflectionDate']) => void;
  setLastReadingPenaltyDate: (date: UserDoc['lastReadingPenaltyDate']) => void;
  setLastPrayerPenaltyDate: (date: UserDoc['lastPrayerPenaltyDate']) => void;
  setLastReflectionPenaltyDate: (date: UserDoc['lastReflectionPenaltyDate']) => void;
  setVersesReadTotal: (count: number) => void;
  setChaptersReadTotal: (count: number) => void;
  setBibleVersion: (version: string) => void;
  setProStatus: (status: UserDoc['proStatus']) => void;
  setCreatedAt: (timestamp: UserDoc['createdAt']) => void;
  setUpdatedAt: (timestamp: UserDoc['updatedAt']) => void;
  setGens: (gens: number) => void;
  setCompletedReflections: (reflections: [Reflection]) => void;
  setCompletedPrayers: (prayers: [Prayer]) => void;
  setCompletedReadings: (readings: [Reading]) => void;
  addCompletedReflection: (reflection: Reflection) => void;
  addCompletedPrayer: (prayer: Prayer) => void;
  addCompletedReading: (reading: Reading) => void;
  
  // Setters for Lamb fields
  setLambLevel: (level: number) => void;
  setLambXp: (xp: number) => void;
  setLambMood: (mood: string) => void;
  setLambHearts: (hearts: number) => void;
  setLambName: (name: string) => void;
  setLambSkin: (skin: string) => void;
  
  // Utility functions
  incrementStreak: () => void;
  addXp: (amount: number) => void;
  resetUserStore: () => void;
}

// Initial lamb state
const initialLamb: Lamb = {
  level: 1,
  xp: 0,
  mood: 'lamb-idle',
  hearts: 50,
  name: 'Shepherd',
  skin: 'default'
};

// Initial user state with null timestamps (will be set when needed)
const initialState: Partial<UserDoc> = {
  spiritualGoal: 'Walk',
  experienceLevel: 'new',
  frequencyGoal: 'daily',
  displayName: '',
  selectedPathId: '',
  lamb: initialLamb,
  lastActivityDate: firestore.Timestamp.now(),
  lastReadingDate: firestore.Timestamp.now(),
  lastPrayerDate: firestore.Timestamp.now(),
  lastReflectionDate: firestore.Timestamp.now(),
  lastReadingPenaltyDate: firestore.Timestamp.now(),
  lastPrayerPenaltyDate: firestore.Timestamp.now(),
  lastReflectionPenaltyDate: firestore.Timestamp.now(),
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
      setGens: (gens) => set({ gens }),
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
      addCompletedReading: (reading) => set(state => ({
        completedReadings: [...state.completedReadings, reading] as unknown as [Reading]
      })),
      
      // Setters for Lamb
      setLambLevel: (level) => set(state => ({
        lamb: { ...state.lamb, level }
      })),
      setLambXp: (xp) => set(state => ({
        lamb: { ...state.lamb, xp }
      })),
      setLambMood: (mood) => set(state => ({
        lamb: { ...state.lamb, mood }
      })),
      setLambHearts: (hearts) => set(state => ({
        lamb: { ...state.lamb, hearts }
      })),
      setLambName: (name) => set(state => ({
        lamb: { ...state.lamb, name }
      })),
      setLambSkin: (skin) => set(state => ({
        lamb: { ...state.lamb, skin }
      })),
      
      // Utility functions
      incrementStreak: () => set(state => ({ streakCount: state.streakCount + 1 })),
      addXp: (amount) => set(state => ({ 
        lamb: { ...state.lamb, xp: state.lamb.xp + amount } 
      })),
      resetUserStore: () => set(initialState as UserDoc)
    }),
    {
      name: 'shepherd-user-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Persist all fields except functions
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
      }),
    }
  )
);
