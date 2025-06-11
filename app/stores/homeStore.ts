import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Define the possible states/modes for the home screen
export type HomeMode = 'DEFAULT' | 'PREVIEW' | 'PRAYER' | 'REFLECTION';

// Define the possible success types
export enum SuccessAnimationType {
  READING = 'reading',
  PRAYER = 'prayer',
  REFLECTION = 'reflection',
  BONUS = 'bonus',
  SECTION_COMPLETE = 'section_complete',
}

interface HomeState {
  // UI mode states
  mode: HomeMode;
  successType: SuccessAnimationType | null;
  devotionalReaderVisible: boolean; // Track if devotional reader is showing
  prayerViewVisible: boolean; // Track if prayer view is showing

  // Completion tracking states
  readingCompleted: boolean;
  prayerCompleted: boolean;
  reflectionCompleted: boolean;
  sawDailyBonus: boolean;
  tappedPrayAboutVerse: boolean;
  tappedReflectAboutVerse: boolean;
  sawStreakToday: boolean; // Track if streak screen was shown today

  // Setter functions
  setMode: (mode: HomeMode) => void;
  setSuccessType: (type: SuccessAnimationType | null) => void;
  setDevotionalReaderVisible: (visible: boolean) => void;
  setPrayerViewVisible: (visible: boolean) => void;
  setReadingCompleted: (completed: boolean) => void;
  setPrayerCompleted: (completed: boolean) => void;
  setReflectionCompleted: (completed: boolean) => void;
  setSawDailyBonus: (saw: boolean) => void;
  setTappedPrayAboutVerse: (tapped: boolean) => void;
  setTappedReflectAboutVerse: (tapped: boolean) => void;
  setSawStreakToday: (saw: boolean) => void; // Setter for sawStreakToday
  resetCompletionStates: () => void; // Reset all completion states
}

/**
 * Zustand store to manage the current operational mode of the Home screen.
 * Uses persist middleware to save completion states in AsyncStorage.
 */
export const useHomeStore = create<HomeState>()(
  persist(
    (set) => ({
      // Default UI states
      mode: 'DEFAULT',
      successType: null,
      devotionalReaderVisible: false,
      prayerViewVisible: false,

      // Default completion states
      readingCompleted: false,
      prayerCompleted: false,
      reflectionCompleted: false,
      sawDailyBonus: false,
      tappedPrayAboutVerse: false,
      tappedReflectAboutVerse: false,
      sawStreakToday: false,

      // Setter functions
      setMode: (mode) => set({ mode }),
      setSuccessType: (type) => set({ successType: type }),
      setDevotionalReaderVisible: (visible) => set({ devotionalReaderVisible: visible }),
      setPrayerViewVisible: (visible) => set({ prayerViewVisible: visible }),
      setReadingCompleted: (completed) => set({ readingCompleted: completed }),
      setPrayerCompleted: (completed) => set({ prayerCompleted: completed }),
      setReflectionCompleted: (completed) => set({ reflectionCompleted: completed }),
      setSawDailyBonus: (saw) => set({ sawDailyBonus: saw }),
      setTappedPrayAboutVerse: (tapped) => set({ tappedPrayAboutVerse: tapped }),
      setTappedReflectAboutVerse: (tapped) => set({ tappedReflectAboutVerse: tapped }),
      setSawStreakToday: (saw) => set({ sawStreakToday: saw }),
      resetCompletionStates: () =>
        set({
          readingCompleted: false,
          prayerCompleted: false,
          reflectionCompleted: false,
          sawDailyBonus: false,
          tappedPrayAboutVerse: false,
          tappedReflectAboutVerse: false,
          sawStreakToday: false,
        }),
    }),
    {
      name: 'shepherd-home-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist these fields (completion states)
        readingCompleted: state.readingCompleted,
        prayerCompleted: state.prayerCompleted,
        reflectionCompleted: state.reflectionCompleted,
        sawDailyBonus: state.sawDailyBonus,
        tappedPrayAboutVerse: state.tappedPrayAboutVerse,
        tappedReflectAboutVerse: state.tappedReflectAboutVerse,
        sawStreakToday: state.sawStreakToday,
      }),
    }
  )
);
