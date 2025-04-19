import { create } from 'zustand';

interface PathState {
  pathInProgress: boolean;
  setPathInProgress: (inProgress: boolean) => void;
  // Bible reading state
  savedBook: string;
  savedBookId: number; // Numeric ID for API calls
  savedChapter: number;
  setSavedReading: (book: string, bookId: number, chapter: number) => void;
}

export const usePathStore = create<PathState>((set) => ({
  pathInProgress: false,
  setPathInProgress: (inProgress) => set({ pathInProgress: inProgress }),
  
  // Default to John 3
  savedBook: 'John',
  savedBookId: 43, // John is book ID 43 in the API
  savedChapter: 3, 
  
  // Set saved reading state
  setSavedReading: (book, bookId, chapter) => 
    set({ savedBook: book, savedBookId: bookId, savedChapter: chapter }),
}));
