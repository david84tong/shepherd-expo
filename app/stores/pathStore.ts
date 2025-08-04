import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Unit, PathOption, SHORTER_BIBLE_PATHS_2 } from '../models/Path'; // Import Unit and PathOption types
import { appLog } from '../helper/helper';

// Type definition for a complete path object
export interface PathInfo {
  pathId: string;
  pathTitle: string;
  unitId: string;
  unitTitle: string;
  bookId: number;
  startChapter: number;
  endChapter: number;
  prayer: string;
  reflection: string;
  startVerse?: number; // Optional starting verse number for verse-split units
  endVerse?: number; // Optional ending verse number for verse-split units
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
  
  // Daily completion tracking
  completedUnitToday: boolean;
  lastCompletionDate: string | null; // Store as YYYY-MM-DD format
  setCompletedUnitToday: (completed: boolean) => void;
  checkAndResetDailyCompletion: () => void;
  
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
  
  // Update next unit preview based on completed units
  updateNextUnitPreview: () => void;
  
  // Initialize next unit preview on app start
  initializeNextUnitPreview: () => void;
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
      savedTranslation: 'ESV', // Default translation
      
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
      
      // Default daily completion tracking
      completedUnitToday: false,
      lastCompletionDate: null,
      
      // Set completed unit today
      setCompletedUnitToday: (completed) => {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        appLog(`🔍 DEBUG: setCompletedUnitToday called with completed: ${completed}`);
        appLog(`📅 DEBUG: Today's date: ${today}`);
        appLog(`📅 DEBUG: Current lastCompletionDate: ${get().lastCompletionDate}`);
        appLog(`📅 DEBUG: Current completedUnitToday: ${get().completedUnitToday}`);
        
        set({ 
          completedUnitToday: completed,
          lastCompletionDate: completed ? today : get().lastCompletionDate
        });
        
        appLog(`✅ DEBUG: After update - completedUnitToday: ${get().completedUnitToday}, lastCompletionDate: ${get().lastCompletionDate}`);
      },
      
      // Check if we need to reset daily completion (new day)
      checkAndResetDailyCompletion: () => {
        const state = get();
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        if (state.lastCompletionDate !== today) {
          // New day - reset completion status and update the last completion date
          appLog(`🔄 New day detected. Updating lastCompletionDate from ${state.lastCompletionDate} to ${today}`);
          set({ 
            lastCompletionDate: today,
            completedUnitToday: false // Reset for new day
          });
        }
      },
      
      // Set selected path
      setSelectedPath: (path: PathOption) => {
        
        set({ 
          selectedPath: path,
          selectedPathId: path.id,
          selectedPathTitle: path.title
        });
        
        // Update next unit preview after setting the path
        get().updateNextUnitPreview();
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
        appLog(`🔍 DEBUG: markUnitAsCompleted called with unitId: ${unitId}`);
        const currentCompletedIds = get().completedUnitIds;
        appLog(`📋 DEBUG: Current completedUnitIds before adding:`, currentCompletedIds);
        appLog(`📋 DEBUG: Current completedUnitIds length: ${currentCompletedIds.length}`);
        
        // Avoid duplicates
        if (!currentCompletedIds.includes(unitId)) {
          appLog(`✅ DEBUG: Unit ${unitId} not in completedUnitIds, adding it now...`);
          set((state) => ({
            completedUnitIds: [...state.completedUnitIds, unitId]
          }));
          
          // Log the updated state
          const updatedCompletedIds = get().completedUnitIds;
          appLog(`📋 DEBUG: Updated completedUnitIds after adding:`, updatedCompletedIds);
          appLog(`📋 DEBUG: Updated completedUnitIds length: ${updatedCompletedIds.length}`);
          appLog(`✅ DEBUG: Successfully added unit ${unitId} to completedUnitIds`);
          
          // Update next unit preview after marking as completed
          get().updateNextUnitPreview();
        } else {
          appLog(`⚠️ DEBUG: Unit ${unitId} already exists in completedUnitIds, skipping...`);
        }
      },
      
      // Update next unit preview based on completed units
      updateNextUnitPreview: () => {
        const state = get();
        const { selectedPath, completedUnitIds } = state;
        
        appLog(`🔍 DEBUG: updateNextUnitPreview called`);
        appLog(`📋 DEBUG: Current completedUnitIds:`, completedUnitIds);
        appLog(`📋 DEBUG: completedUnitIds length: ${completedUnitIds.length}`);

        if (!selectedPath) {
          appLog(`⚠️ DEBUG: No selectedPath, returning early`);
          return;
        }
        
        appLog(`📋 DEBUG: Selected path: ${selectedPath.id} - ${selectedPath.title}`);
        
        // Get ordered paths based on selected path
        const pathMap = Object.fromEntries(SHORTER_BIBLE_PATHS_2.map((p) => [p.id, p]));

        const orderedPaths = selectedPath.order.map((id) => pathMap[id]).filter(Boolean);
        appLog(`📋 DEBUG: Number of ordered paths: ${orderedPaths.length}`);
        
        // Find the first uncompleted unit across all ordered paths
        let nextUnit = null;
        let totalUnitsChecked = 0;
        let completedUnitsFound = 0;
        
        for (const path of orderedPaths) {
          appLog(`🔍 DEBUG: Checking path: ${path.id} - ${path.title}`);
          for (const unit of path.units) {
            totalUnitsChecked++;
            if (!completedUnitIds.includes(unit.id)) {
              nextUnit = unit;
              appLog(`✅ DEBUG: Found next uncompleted unit: ${unit.id} - ${unit.title}`);
              break;
            } else {
              completedUnitsFound++;
              appLog(`⏭️ DEBUG: Unit ${unit.id} already completed, skipping...`);
            }
          }
          if (nextUnit) break;
        }
        
        appLog(`📊 DEBUG: Total units checked: ${totalUnitsChecked}, Completed units found: ${completedUnitsFound}`);
        
        if (nextUnit) {
          appLog(`✅ DEBUG: Setting nextUnitPreview to: ${nextUnit.id} - ${nextUnit.title}`);
          set({ nextUnitPreview: nextUnit });
        } else {
          appLog(`🎉 DEBUG: All units completed! Setting nextUnitPreview to null`);
          set({ nextUnitPreview: null });
        }
      },
      
      // Initialize next unit preview on app start
      initializeNextUnitPreview: () => {
        get().updateNextUnitPreview();
      },
    }),
    {
      name: 'shepherd-path-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => {
        return {
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
          lastCompletionDate: state.lastCompletionDate,
          completedUnitToday: state.completedUnitToday, // Persist the daily completion status
        };
      },
    }
  )
);