import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Unit } from '../models/Path'; // Import Unit type
import { PathOption } from '../onboarding/8';

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
  selectedPath: PathOption | null;
  pathInProgress: boolean;
  setPathInProgress: (inProgress: boolean) => void;
  // Bible reading state
  savedBook: string;
  savedBookId: number; // Numeric ID for API calls
  savedChapter: number;
  savedTranslation: string; // Store the user's preferred Bible translation
  setSavedReading: (book: string, bookId: number, chapter: number) => void;
  setSavedTranslation: (translation: string) => void; // Set the preferred translation
  
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
  setSelectedPath: (path: PathOption) => void;
  
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
      selectedPath: null,
      pathInProgress: false,
      setPathInProgress: (inProgress) => set({ pathInProgress: inProgress }),
      
      // Default to John 3
      savedBook: 'John',
      savedBookId: 43, // John is book ID 43 in the API
      savedChapter: 3, 
      savedTranslation: 'WEB', // Default translation
      
      // Set saved reading state
      setSavedReading: (book, bookId, chapter) => 
        set({ savedBook: book, savedBookId: bookId, savedChapter: chapter }),
        
      // Set saved translation
      setSavedTranslation: (translation) => 
        set({ savedTranslation: translation }),
        
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
      setSelectedPath: (path: PathOption) => {
        set({ 
          selectedPath: path,
          selectedPathId: path.id,
          selectedPathTitle: path.title
        });
      },
      
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
        selectedPath: state.selectedPath,
        savedBook: state.savedBook,
        savedBookId: state.savedBookId,
        savedChapter: state.savedChapter,
        savedTranslation: state.savedTranslation,
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