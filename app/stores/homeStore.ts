import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the possible states/modes for the home screen
export type HomeMode = 'DEFAULT' | 'PREVIEW' | 'PRAYER' | 'REFLECTION';

// Define the possible success types
export enum SuccessAnimationType {
    READING = 'reading',
    PRAYER = 'prayer',
    REFLECTION = 'reflection',
}

interface HomeState {
  // UI mode states
  mode: HomeMode;
  successType: SuccessAnimationType | null;
  
  // Completion tracking states
  readingCompleted: boolean;
  prayerCompleted: boolean;
  reflectionCompleted: boolean;
  
  // Setter functions
  setMode: (mode: HomeMode) => void;
  setSuccessType: (type: SuccessAnimationType | null) => void;
  setReadingCompleted: (completed: boolean) => void;
  setPrayerCompleted: (completed: boolean) => void;
  setReflectionCompleted: (completed: boolean) => void;
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
      
      // Default completion states
      readingCompleted: false,
      prayerCompleted: false,
      reflectionCompleted: false,
      
      // Setter functions
      setMode: (mode) => set({ mode }),
      setSuccessType: (type) => set({ successType: type }),
      setReadingCompleted: (completed) => set({ readingCompleted: completed }),
      setPrayerCompleted: (completed) => set({ prayerCompleted: completed }),
      setReflectionCompleted: (completed) => set({ reflectionCompleted: completed }),
      resetCompletionStates: () => set({ 
        readingCompleted: false, 
        prayerCompleted: false, 
        reflectionCompleted: false 
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
      }),
    }
  )
);
