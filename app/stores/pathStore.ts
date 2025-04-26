import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Unit } from '../models/Path'; // Import Unit type

// Type definition for a complete path object
export interface PathInfo {
  pathId: string;
  pathTitle: string;
  unitId: string;
  unitTitle: string;
  bookId: number;
  startChapter: number;
  endChapter: number;
}

interface PathState {
  pathInProgress: boolean;
  setPathInProgress: (inProgress: boolean) => void;
  // Bible reading state
  savedBook: string;
  savedBookId: number; // Numeric ID for API calls
  savedChapter: number;
  setSavedReading: (book: string, bookId: number, chapter: number) => void;
  
  // Path selection state
  selectedPathId: string | null;
  selectedPathTitle: string | null;
  selectedUnitId: string | null;
  selectedUnitTitle: string | null;
  startChapter: number | null;
  endChapter: number | null;
  selectedBookChapter: string | null; // Format: "BookName Chapter" (e.g., "John 3")
  
  // Complete current path object
  currentPath: PathInfo | null;
  
  // Completed unit tracking
  completedUnitIds: string[];
  
  // Set selected path information
  setSelectedPath: (
    pathId: string, 
    pathTitle: string, 
    unitId: string, 
    unitTitle: string,
    startChapter: number,
    endChapter: number
  ) => void;
  
  // Set current path with all information
  setCurrentPath: (path: PathInfo | null) => void;
  
  // Set selected book chapter
  setSelectedBookChapter: (bookChapter: string) => void;
  
  // State for previewing the next unit
  nextUnitPreview: Unit | null;
  setNextUnitPreview: (unit: Unit | null) => void;
  
  // Mark a unit as completed
  markUnitAsCompleted: (unitId: string) => void;
}

export const usePathStore = create<PathState>()(
  persist(
    (set, get) => ({
      pathInProgress: false,
      setPathInProgress: (inProgress) => set({ pathInProgress: inProgress }),
      
      // Default to John 3
      savedBook: 'John',
      savedBookId: 43, // John is book ID 43 in the API
      savedChapter: 3, 
      
      // Set saved reading state
      setSavedReading: (book, bookId, chapter) => 
        set({ savedBook: book, savedBookId: bookId, savedChapter: chapter }),
        
      // Default path selection state
      selectedPathId: null,
      selectedPathTitle: null,
      selectedUnitId: null,
      selectedUnitTitle: null,
      startChapter: null,
      endChapter: null,
      selectedBookChapter: null,
      
      // Default current path
      currentPath: null,
      
      // Default completed units
      completedUnitIds: [],
      
      // Set selected path
      setSelectedPath: (
        pathId, 
        pathTitle, 
        unitId, 
        unitTitle,
        startChapter,
        endChapter
      ) => set({
        selectedPathId: pathId,
        selectedPathTitle: pathTitle,
        selectedUnitId: unitId,
        selectedUnitTitle: unitTitle,
        startChapter: startChapter,
        endChapter: endChapter
      }),
      
      // Set current path with all information
      setCurrentPath: (path) => set({ currentPath: path }),
      
      // Set selected book chapter
      setSelectedBookChapter: (bookChapter) => set({ selectedBookChapter: bookChapter }),
      
      // State for previewing the next unit
      nextUnitPreview: null, // Initial state for next unit preview
      setNextUnitPreview: (unit) => set({ nextUnitPreview: unit }), // Setter for next unit preview
      
      // Mark unit as completed
      markUnitAsCompleted: (unitId) => {
        console.log(`💾 Marking unit ${unitId} as completed in store.`);
        // Avoid duplicates
        if (!get().completedUnitIds.includes(unitId)) {
          set((state) => ({
            completedUnitIds: [...state.completedUnitIds, unitId]
          }));
        }
      },
    }),
    {
      name: 'shepherd-path-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Persist all fields except functions and non-essential UI state
        savedBook: state.savedBook,
        savedBookId: state.savedBookId,
        savedChapter: state.savedChapter,
        selectedPathId: state.selectedPathId,
        selectedPathTitle: state.selectedPathTitle,
        selectedUnitId: state.selectedUnitId,
        selectedUnitTitle: state.selectedUnitTitle,
        startChapter: state.startChapter,
        endChapter: state.endChapter,
        selectedBookChapter: state.selectedBookChapter,
        currentPath: state.currentPath,
        completedUnitIds: state.completedUnitIds,
        nextUnitPreview: state.nextUnitPreview,
      }),
    }
  )
);
