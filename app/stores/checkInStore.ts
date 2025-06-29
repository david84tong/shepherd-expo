import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CheckInData {
  mood: string;
  focus: string;
  struggle: string;
  completedAt: string; // ISO date string
}

interface CheckInState {
  // Current session data
  currentMood: string;
  currentFocus: string;
  currentStruggle: string;
  
  // Today's completed check-in
  todaysCheckIn: CheckInData | null;
  
  // Check-in history
  checkInHistory: CheckInData[];
  
  // Actions
  setMood: (mood: string) => void;
  setFocus: (focus: string) => void;
  setStruggle: (struggle: string) => void;
  skipFocus: () => void;
  skipStruggle: () => void;
  completeCheckIn: () => void;
  clearCurrentSession: () => void;
  getTodaysCheckIn: () => CheckInData | null;
  hasCompletedTodaysCheckIn: () => boolean;
  shouldShowCustomDevotional: () => boolean;
}

const getTodayDateString = () => {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
};

export const useCheckInStore = create<CheckInState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentMood: '',
      currentFocus: '',
      currentStruggle: '',
      todaysCheckIn: null,
      checkInHistory: [],

      // Actions
      setMood: (mood: string) => {
        set({ currentMood: mood });
      },

      setFocus: (focus: string) => {
        set({ currentFocus: focus });
      },

      setStruggle: (struggle: string) => {
        set({ currentStruggle: struggle });
      },

      skipFocus: () => {
        set({ currentFocus: '' });
      },

      skipStruggle: () => {
        set({ currentStruggle: '' });
      },

      completeCheckIn: () => {
        const state = get();
        const today = getTodayDateString();
        
        const checkInData: CheckInData = {
          mood: state.currentMood,
          focus: state.currentFocus,
          struggle: state.currentStruggle,
          completedAt: new Date().toISOString(),
        };

        // Add to history if not already exists for today
        const existingTodayIndex = state.checkInHistory.findIndex(
          (checkIn) => checkIn.completedAt.split('T')[0] === today
        );

        let newHistory = [...state.checkInHistory];
        if (existingTodayIndex >= 0) {
          // Update existing today's check-in
          newHistory[existingTodayIndex] = checkInData;
        } else {
          // Add new check-in
          newHistory.push(checkInData);
        }

        // Keep only last 30 days of history
        newHistory = newHistory
          .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
          .slice(0, 30);

        set({
          todaysCheckIn: checkInData,
          checkInHistory: newHistory,
        });
      },

      clearCurrentSession: () => {
        set({
          currentMood: '',
          currentFocus: '',
          currentStruggle: '',
        });
      },

      getTodaysCheckIn: () => {
        const state = get();
        const today = getTodayDateString();
        
        // Check if todaysCheckIn is actually from today
        if (state.todaysCheckIn && state.todaysCheckIn.completedAt.split('T')[0] === today) {
          return state.todaysCheckIn;
        }

        // Otherwise, look in history
        const todayCheckIn = state.checkInHistory.find(
          (checkIn) => checkIn.completedAt.split('T')[0] === today
        );

        return todayCheckIn || null;
      },

      hasCompletedTodaysCheckIn: () => {
        return get().getTodaysCheckIn() !== null;
      },

      shouldShowCustomDevotional: () => {
        const todaysCheckIn = get().getTodaysCheckIn();
        if (!todaysCheckIn) return false;
        
        // Show custom devotional if either focus or struggle is not empty
        return todaysCheckIn.focus !== '' || todaysCheckIn.struggle !== '';
      },
    }),
    {
      name: 'shepherd-checkin-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the completed data, not current session
      partialize: (state) => ({
        todaysCheckIn: state.todaysCheckIn,
        checkInHistory: state.checkInHistory,
      }),
    }
  )
);