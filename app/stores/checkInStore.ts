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
  
  // Last check-in timestamp
  lastCheckInTime: string | null;
  
  // Navigation flag to prevent showing during navigation
  isNavigating: boolean;
  
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
  hasBeenOneHourSinceLastCheckIn: () => boolean;
  resetCheckInData: () => void;
  setIsNavigating: (value: boolean) => void;
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
      lastCheckInTime: null,
      isNavigating: false,

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
        const now = new Date().toISOString();
        
        const checkInData: CheckInData = {
          mood: state.currentMood,
          focus: state.currentFocus,
          struggle: state.currentStruggle,
          completedAt: now,
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
          lastCheckInTime: now,
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
      
      hasBeenOneHourSinceLastCheckIn: () => {
        const state = get();
        
        if (!state.lastCheckInTime) return true; // If never checked in, return true
        
        const lastCheckIn = new Date(state.lastCheckInTime);
        const now = new Date();
        const hoursSinceLastCheckIn = (now.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60);
        
        console.log('[CheckInStore] Time since last check-in:', {
          lastCheckInTime: state.lastCheckInTime,
          hoursSinceLastCheckIn,
          hasBeenOneHour: hoursSinceLastCheckIn >= 1
        });
        
        return hoursSinceLastCheckIn >= 1;
      },
      
      resetCheckInData: () => {
        set({
          currentMood: '',
          currentFocus: '',
          currentStruggle: '',
          todaysCheckIn: null,
          checkInHistory: [],
          lastCheckInTime: null,
          isNavigating: false,
        });
      },
      
      setIsNavigating: (value: boolean) => {
        set({ isNavigating: value });
      },
    }),
    {
      name: 'shepherd-checkin-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the completed data, not current session
      partialize: (state) => ({
        todaysCheckIn: state.todaysCheckIn,
        checkInHistory: state.checkInHistory,
        lastCheckInTime: state.lastCheckInTime,
      }),
    }
  )
);

// Default export for Expo Router compatibility
export default {}