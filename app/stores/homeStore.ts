import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { appLog } from '../helper/helper';
import analytics from '../../utils/analytics';

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
  prayerViewVisible: boolean; // Track if prayer view is showing
  showStreakScreen: boolean; // Track if streak screen should be shown
  keyboardVisible: boolean; // Track if keyboard is visible for journal
  journalViewVisible: boolean;
  bottomSheetRef: React.RefObject<any> | null;
  riveRef: React.RefObject<any> | null;
  currentSkin: string; // Track the currently equipped skin

  // Completion tracking states
  readingCompleted: boolean;
  prayerCompleted: boolean;
  reflectionCompleted: boolean;
  sawDailyBonus: boolean;
  tappedPrayAboutVerse: boolean;
  tappedReflectAboutVerse: boolean;
  sawStreakToday: boolean; // Track if streak screen was shown today
  showGlobalButtons: boolean;

  // Covenant success modal
  showCovenantSuccessModal: boolean;
  completedCovenantDays: number;

  // Navigation param handling

  // Daily XP tracking
  dailyXpEarned: number; // Track XP earned today
  lastXpResetDate: string; // Track when XP was last reset (YYYY-MM-DD format)
  // Daily streak tracking
  lastStreakDate: string; // Track when streak screen was last shown (YYYY-MM-DD format)

  // Setter functions
  setMode: (mode: HomeMode) => void;
  setSuccessType: (type: SuccessAnimationType | null) => void;
  setPrayerViewVisible: (visible: boolean) => void;
  setShowStreakScreen: (show: boolean) => void;
  setReadingCompleted: (completed: boolean) => void;
  setPrayerCompleted: (completed: boolean) => void;
  setReflectionCompleted: (completed: boolean) => void;
  setSawDailyBonus: (saw: boolean) => void;
  setTappedPrayAboutVerse: (tapped: boolean) => void;
  setTappedReflectAboutVerse: (tapped: boolean) => void;
  setSawStreakToday: (saw: boolean) => void; // Setter for sawStreakToday
  resetCompletionStates: () => void; // Reset all completion states
  setShowGlobalButtons: (show: boolean) => void;
  setKeyboardVisible: (visible: boolean) => void; // Control keyboard visibility state
  setJournalViewVisible: (visible: boolean) => void;
  setBottomSheetRef: (ref: React.RefObject<any> | null) => void;
  setRiveRef: (ref: React.RefObject<any> | null) => void;
  setCurrentSkin: (skin: string) => void;
  setShowCovenantSuccessModal: (show: boolean) => void;
  setCompletedCovenantDays: (days: number) => void;
  handleCovenantSuccess: (days: number) => void;

  // Daily XP functions
  addDailyXp: (amount: number) => number; // Returns actual XP added (may be limited)
  getDailyXpRemaining: () => number; // Returns remaining XP that can be earned today
  resetDailyXpIfNeeded: () => void; // Reset XP if it's a new day
  checkAndResetStreakIfNeeded: () => void; // Check and reset streak flag if it's a new day
}

export const isBonusAvailable = (state: HomeState) => {
  const isFirstReadingOfDay = !state.sawStreakToday;
  return state.readingCompleted && state.prayerCompleted && state.reflectionCompleted && isFirstReadingOfDay && !state.sawDailyBonus;
};

/**
 * Zustand store to manage the current operational mode of the Home screen.
 * Uses persist middleware to save completion states in AsyncStorage.
 */
export const useHomeStore = create<HomeState>()(
  persist(
    (set, get) => ({
      // Default UI states
      mode: 'DEFAULT',
      successType: null,
      prayerViewVisible: false,
      showStreakScreen: false,
      showGlobalButtons: false,
      keyboardVisible: false,
      journalViewVisible: false,
      bottomSheetRef: null,
      riveRef: null,
      currentSkin: '',
      // Default completion states
      readingCompleted: false,
      prayerCompleted: false,
      reflectionCompleted: false,
      sawDailyBonus: false,
      tappedPrayAboutVerse: false,
      tappedReflectAboutVerse: false,
      sawStreakToday: false,
      // Default covenant success modal
      showCovenantSuccessModal: false,
      completedCovenantDays: 0,
      // Default daily XP tracking
      dailyXpEarned: 0,
      lastXpResetDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
      // Default streak tracking
      lastStreakDate: '', // Empty string initially

      // Default navigation param handling

      // Setter functions
      setMode: (mode) => set({ mode }),
      setSuccessType: (type) => set({ successType: type }),
      setPrayerViewVisible: (visible) => set({ prayerViewVisible: visible }),
      setShowStreakScreen: (show) => {
        // Only allow showing streak screen if we haven't seen it today
        const state = get();
        if (show && state.sawStreakToday) {
          appLog('🚫 Preventing streak screen - already shown today');
          return;
        }
        set({ showStreakScreen: show });
      },
      setReadingCompleted: (completed) => {
        appLog('🔍 HOMESTORE - setReadingCompleted called:', { completed, timestamp: new Date().toLocaleTimeString() });
        set({ readingCompleted: completed });
      },
      setPrayerCompleted: (completed) => {
        appLog('🔍 HOMESTORE - setPrayerCompleted called:', { completed, timestamp: new Date().toLocaleTimeString() });
        set({ prayerCompleted: completed });
      },
      setReflectionCompleted: (completed) => {
        appLog('🔍 HOMESTORE - setReflectionCompleted called:', { completed, timestamp: new Date().toLocaleTimeString() });
        set({ reflectionCompleted: completed });
      },
      setSawDailyBonus: (saw) => set({ sawDailyBonus: saw }),
      setTappedPrayAboutVerse: (tapped) => set({ tappedPrayAboutVerse: tapped }),
      setTappedReflectAboutVerse: (tapped) => set({ tappedReflectAboutVerse: tapped }),
      setSawStreakToday: (saw) => {        
        const today = new Date().toISOString().split('T')[0];
        const { lastStreakDate } = get();
        
        // Check if it's a new day
        if (lastStreakDate !== today && saw) {
          // It's a new day, allow setting sawStreakToday
          appLog('🔍 HOMESTORE - setSawStreakToday called (new day):', { saw, date: today, timestamp: new Date().toLocaleTimeString() });
          set({ 
            sawStreakToday: saw,
            lastStreakDate: today 
          });
        } else if (!saw) {
          // Always allow resetting to false
          appLog('🔍 HOMESTORE - setSawStreakToday reset to false:', { timestamp: new Date().toLocaleTimeString() });
          set({ sawStreakToday: saw });
        } else {
          // Same day, don't allow setting to true again
          set({ sawStreakToday: saw });
          appLog('🚫 HOMESTORE - setSawStreakToday blocked (same day):', { date: today, lastStreakDate, timestamp: new Date().toLocaleTimeString() });
        }
      },
      setShowGlobalButtons: (show) => set({ showGlobalButtons: show }),
      setKeyboardVisible: (visible) => set({ keyboardVisible: visible }),
      setJournalViewVisible: (visible) => set({ journalViewVisible: visible }),
      setBottomSheetRef: (ref) => set({ bottomSheetRef: ref }),
      setRiveRef: (ref) => set({ riveRef: ref }),
      setCurrentSkin: (skin) => set({ currentSkin: skin }),
      setShowCovenantSuccessModal: (show) => set({ showCovenantSuccessModal: show }),
      setCompletedCovenantDays: (days) => set({ completedCovenantDays: days }),

      handleCovenantSuccess: (days) => {
        set({ 
          showCovenantSuccessModal: true,
          completedCovenantDays: days
        });
        analytics.logEvent('Covenant_Completed', { days });
      },

      // Daily XP functions
      resetDailyXpIfNeeded: () => {
        const today = new Date().toISOString().split('T')[0];
        const { lastXpResetDate } = get();
        
        if (lastXpResetDate !== today) {
          appLog('🔄 Resetting daily XP for new day:', today);
          set({ 
            dailyXpEarned: 0, 
            lastXpResetDate: today 
          });
        }
      },

      addDailyXp: (amount: number) => {
        // First check if we need to reset for a new day
        get().resetDailyXpIfNeeded();
        
        const { dailyXpEarned } = get();
        const MAX_DAILY_XP = 300;
        const remaining = Math.max(0, MAX_DAILY_XP - dailyXpEarned);
        const actualXpToAdd = Math.min(amount, remaining);
        
        if (actualXpToAdd > 0) {
          set({ dailyXpEarned: dailyXpEarned + actualXpToAdd });
          appLog(`📊 Daily XP: +${actualXpToAdd} (${dailyXpEarned + actualXpToAdd}/${MAX_DAILY_XP})`);
        } else {
          appLog('🚫 Daily XP limit reached (300/300)');
        }
        
        return actualXpToAdd;
      },

      getDailyXpRemaining: () => {
        // First check if we need to reset for a new day
        get().resetDailyXpIfNeeded();
        
        const { dailyXpEarned } = get();
        const MAX_DAILY_XP = 300;
        return Math.max(0, MAX_DAILY_XP - dailyXpEarned);
      },

      checkAndResetStreakIfNeeded: () => {
        const today = new Date().toISOString().split('T')[0];
        const { lastStreakDate, sawStreakToday } = get();
        
        if (lastStreakDate !== today && sawStreakToday) {
          appLog('🔄 Resetting sawStreakToday for new day:', today);
          set({ 
            sawStreakToday: false,
            lastStreakDate: today 
          });
        }
      },

      resetCompletionStates: () => {
        appLog('🔍 HOMESTORE - resetCompletionStates called - BEFORE reset:', {
          currentState: {
            readingCompleted: useHomeStore.getState().readingCompleted,
            prayerCompleted: useHomeStore.getState().prayerCompleted,
            reflectionCompleted: useHomeStore.getState().reflectionCompleted,
          },
          timestamp: new Date().toLocaleTimeString()
        });
        
        set({
          readingCompleted: false,
          prayerCompleted: false,
          reflectionCompleted: false,
          sawDailyBonus: false,
          tappedPrayAboutVerse: false,
          tappedReflectAboutVerse: false,
          sawStreakToday: false,
        });

        appLog('🔍 HOMESTORE - resetCompletionStates called - AFTER reset:', {
          newState: {
            readingCompleted: useHomeStore.getState().readingCompleted,
            prayerCompleted: useHomeStore.getState().prayerCompleted,
            reflectionCompleted: useHomeStore.getState().reflectionCompleted,
          },
          timestamp: new Date().toLocaleTimeString()
        });
      },
    }),
    {
      name: 'shepherd-home-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist these fields (completion states and daily XP tracking)
        readingCompleted: state.readingCompleted,
        prayerCompleted: state.prayerCompleted,
        reflectionCompleted: state.reflectionCompleted,
        sawDailyBonus: state.sawDailyBonus,
        tappedPrayAboutVerse: state.tappedPrayAboutVerse,
        tappedReflectAboutVerse: state.tappedReflectAboutVerse,
        sawStreakToday: state.sawStreakToday,
        currentSkin: state.currentSkin,
        dailyXpEarned: state.dailyXpEarned,
        lastXpResetDate: state.lastXpResetDate,
        lastStreakDate: state.lastStreakDate,
        showCovenantSuccessModal: state.showCovenantSuccessModal,
        completedCovenantDays: state.completedCovenantDays,
      }),
    }
  )
);

// Default export for Expo Router compatibility
export default {}
