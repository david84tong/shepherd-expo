import { create } from 'zustand';
import HalfModalType from '../../components/HalfModalSheet';
// Define the callback type directly here
export type BookChapterSelectorCallback = (bookId: number, chapter: number) => void;
import { Reflection } from '../models/User'; // Import Reflection type

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
}

export const useUIStore = create<UIState>((set) => ({
  // Modal dim state
  isModalDimActive: false,
  setIsModalDimActive: (isActive) => {
    console.log(`[UIStore] Setting isModalDimActive to: ${isActive}`); // Log state changes
    set({ isModalDimActive: isActive });
  },
  
  // Prayer sheet state and actions
  isPrayerSheetVisible: false,
  prayerGeneratedCallback: null,
  showPrayerSheet: (onPrayerGeneratedCallback) => {
    console.log('[UIStore] Showing prayer sheet');
    set({
      isPrayerSheetVisible: true,
      prayerGeneratedCallback: onPrayerGeneratedCallback || null,
    });
  },
  hidePrayerSheet: () => {
    console.log('[UIStore] Hiding prayer sheet');
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
    console.log('[UIStore] Showing book chapter selector');
    set({
      isBookChapterSelectorVisible: true,
      bookChapterSelectorParams: { initialBookId, initialChapter, onSelect },
    });
  },
  hideBookChapterSelector: () => {
    console.log('[UIStore] Hiding book chapter selector');
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
})); 
