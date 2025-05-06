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
  isPrayerSheetVisible: false,
  prayerGeneratedCallback: null,
  showPrayerSheet: () => {},
  hidePrayerSheet: () => {},
  isBookChapterSelectorVisible: false,
  bookChapterSelectorProps: {
    currentBookId: 0,
    currentChapter: 0,
    onSelectCallback: null,
  },
  showBookChapterSelector: () => {},
  hideBookChapterSelector: () => {},
}));
