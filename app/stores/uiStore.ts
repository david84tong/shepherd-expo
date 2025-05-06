import { create } from 'zustand';

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
  bookChapterSelectorProps: {
    currentBookId: number;
    currentChapter: number;
    onSelectCallback: ((bookId: number, chapter: number) => void) | null;
  };
  
  // Book Chapter Selector actions
  showBookChapterSelector: (
    currentBookId: number, 
    currentChapter: number, 
    onSelect: (bookId: number, chapter: number) => void
  ) => void;
  hideBookChapterSelector: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Modal dim state
  isModalDimActive: false,
  setIsModalDimActive: (isActive) => {
    console.log(`[UIStore] Setting isModalDimActive to: ${isActive}`); // Log state changes
    set({ isModalDimActive: isActive });
  },
  
  // Prayer sheet state
  isPrayerSheetVisible: false,
  prayerGeneratedCallback: null,
  
  // Prayer sheet actions
  showPrayerSheet: (onPrayerGenerated) => {
    console.log('[UIStore] Showing prayer sheet');
    set({ 
      isPrayerSheetVisible: true,
      prayerGeneratedCallback: onPrayerGenerated || null
    });
  },
  
  hidePrayerSheet: () => {
    console.log('[UIStore] Hiding prayer sheet');
    set({ 
      isPrayerSheetVisible: false
    });
  },

  // Book Chapter Selector state
  isBookChapterSelectorVisible: false,
  bookChapterSelectorProps: {
    currentBookId: 1,
    currentChapter: 1,
    onSelectCallback: null
  },

  // Book Chapter Selector actions
  showBookChapterSelector: (currentBookId, currentChapter, onSelect) => {
    console.log('[UIStore] Showing book chapter selector');
    set({
      isBookChapterSelectorVisible: true,
      bookChapterSelectorProps: {
        currentBookId,
        currentChapter,
        onSelectCallback: onSelect
      }
    });
  },

  hideBookChapterSelector: () => {
    console.log('[UIStore] Hiding book chapter selector');
    set({
      isBookChapterSelectorVisible: false
    });
  }
})); 