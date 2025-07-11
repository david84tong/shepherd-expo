import { create } from 'zustand';
// Define the callback type directly here
export type BookChapterSelectorCallback = (bookId: number, chapter: number) => void;
import { Reflection } from '../models/User'; // Import Reflection type
import { appLog } from '../helper/helper';

interface UIState {
  isModalDimActive: boolean;
  setIsModalDimActive: (isActive: boolean) => void;
  
  // Prayer sheet state
  isPrayerSheetVisible: boolean;
  prayerGeneratedCallback: (() => void) | null;
  
  // Prayer sheet actions
  showPrayerSheet: (onPrayerGenerated?: () => void) => void;
  hidePrayerSheet: () => void;

  // Book Chapter Selector sheet state
  isBookChapterSelectorVisible: boolean;
  bookChapterSelectorParams: {
    initialBookId: number;
    initialChapter: number;
    onSelect: BookChapterSelectorCallback | null;
  };
  
  // Book Chapter Selector actions
  showBookChapterSelector: (
    initialBookId: number,
    initialChapter: number,
    onSelect: BookChapterSelectorCallback
  ) => void;
  hideBookChapterSelector: () => void;

  // New state for OldReflectionSheet
  isOldReflectionSheetVisible: boolean;
  reflectionToShow: Reflection | null;

  // New actions for OldReflectionSheet
  showOldReflectionSheet: (reflection: Reflection) => void;
  hideOldReflectionSheet: () => void;
  
  // Store sheet state
  isStoreSheetVisible: boolean;
  
  // Store sheet actions
  showStoreSheet: () => void;
  hideStoreSheet: () => void;
  
  // Stats sheet state
  isStatsSheetVisible: boolean;
  
  // Stats sheet actions
  showStatsSheet: () => void;
  hideStatsSheet: () => void;
  
  // Devotionals sheet state
  isDevotionalsSheetVisible: boolean;
  
  // Devotionals sheet actions
  showDevotionalsSheet: () => void;
  hideDevotionalsSheet: () => void;
  
  // Widget prompt and guide state
  isWidgetPromptVisible: boolean;
  isWidgetGuideVisible: boolean;
  
  // Widget prompt and guide actions
  showWidgetPrompt: () => void;
  hideWidgetPrompt: () => void;
  showWidgetGuide: () => void;
  hideWidgetGuide: () => void;

  showDevotionalContent: boolean;
  tabBarVisible: boolean;
  setShowDevotionalContent: (value: boolean) => void;
  setTabBarVisible: (visible: boolean) => void;

  // Devotional reader state
  devotionalReaderVisible: boolean;
  setDevotionalReaderVisible: (visible: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Modal dim state
  isModalDimActive: false,
  setIsModalDimActive: (isActive) => {
    appLog(`[UIStore] Setting isModalDimActive to: ${isActive}`); // Log state changes
    set({ isModalDimActive: isActive });
  },
  
  // Prayer sheet state and actions
  isPrayerSheetVisible: false,
  prayerGeneratedCallback: null,
  showPrayerSheet: (onPrayerGeneratedCallback) => {
    appLog('[UIStore] Showing prayer sheet');
    set({
      isPrayerSheetVisible: true,
      prayerGeneratedCallback: onPrayerGeneratedCallback || null,
    });
  },
  hidePrayerSheet: () => {
    appLog('[UIStore] Hiding prayer sheet');
    set({ isPrayerSheetVisible: false, prayerGeneratedCallback: null });
  },
  
  // Book Chapter Selector state and actions
  isBookChapterSelectorVisible: false,
  bookChapterSelectorParams: {
    initialBookId: 1,
    initialChapter: 1,
    onSelect: null,
  },
  showBookChapterSelector: (initialBookId, initialChapter, onSelect) => {
    appLog('[UIStore] Showing book chapter selector');
    set({
      isBookChapterSelectorVisible: true,
      bookChapterSelectorParams: { initialBookId, initialChapter, onSelect },
    });
  },
  hideBookChapterSelector: () => {
    appLog('[UIStore] Hiding book chapter selector');
    set({
      isBookChapterSelectorVisible: false,
      bookChapterSelectorParams: { initialBookId: 1, initialChapter: 1, onSelect: null },
    });
  },

  // New state for OldReflectionSheet
  isOldReflectionSheetVisible: false,
  reflectionToShow: null,

  // New actions for OldReflectionSheet
  showOldReflectionSheet: (reflection) => 
    set({ isOldReflectionSheetVisible: true, reflectionToShow: reflection }),
  hideOldReflectionSheet: () => 
    set({ isOldReflectionSheetVisible: false, reflectionToShow: null }),
    
  // Store sheet state and actions
  isStoreSheetVisible: false,
  showStoreSheet: () => {
    appLog('[UIStore] Showing store sheet');
    set({ isStoreSheetVisible: true });
  },
  hideStoreSheet: () => {
    appLog('[UIStore] Hiding store sheet');
    set({ isStoreSheetVisible: false });
  },
  
  // Stats sheet state and actions
  isStatsSheetVisible: false,
  showStatsSheet: () => {
    appLog('[UIStore] Showing stats sheet');
    set({ isStatsSheetVisible: true });
  },
  hideStatsSheet: () => {
    appLog('[UIStore] Hiding stats sheet');
    set({ isStatsSheetVisible: false });
  },
  
  // Devotionals sheet state and actions
  isDevotionalsSheetVisible: false,
  showDevotionalsSheet: () => {
    appLog('[UIStore] Showing devotionals sheet');
    set({ isDevotionalsSheetVisible: true });
  },
  hideDevotionalsSheet: () => {
    appLog('[UIStore] Hiding devotionals sheet');
    set({ isDevotionalsSheetVisible: false });
  },
    
  // Widget prompt and guide state
  isWidgetPromptVisible: false,
  isWidgetGuideVisible: false,
  
  // Widget prompt and guide actions
  showWidgetPrompt: () => {
    appLog('[UIStore] Showing widget prompt');
    set({ isWidgetPromptVisible: true });
  },
  hideWidgetPrompt: () => {
    appLog('[UIStore] Hiding widget prompt');
    set({ isWidgetPromptVisible: false });
  },
  showWidgetGuide: () => {
    appLog('[UIStore] Showing widget guide');
    set({ isWidgetPromptVisible: false, isWidgetGuideVisible: true });
  },
  hideWidgetGuide: () => {
    appLog('[UIStore] Hiding widget guide');
    set({ isWidgetGuideVisible: false });
  },

  showDevotionalContent: false,
  tabBarVisible: true,
  setShowDevotionalContent: (value) => set({ showDevotionalContent: value }),
  setTabBarVisible: (visible) => set({ tabBarVisible: visible }),

  // Devotional reader state
  devotionalReaderVisible: false,
  setDevotionalReaderVisible: (visible) => set({ devotionalReaderVisible: visible }),
})); 
