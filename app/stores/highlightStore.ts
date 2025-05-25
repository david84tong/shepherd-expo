import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Platform } from 'react-native';

// Constants for storage
const HIGHLIGHTS_STORAGE_KEY = 'user_verse_highlights';
const SYNC_DEBOUNCE_TIME = 10000; // 10 seconds

// Highlight colors - using values that match app theme
export const HIGHLIGHT_COLORS = {
  amber: 'rgba(220, 178, 128, 0.2)',
  green: 'rgba(60, 88, 74, 0.15)',
  blue: 'rgba(144, 205, 244, 0.2)',
  purple: 'rgba(147, 127, 180, 0.2)',
  pink: 'rgba(242, 157, 173, 0.2)',
};

export type HighlightColorKey = keyof typeof HIGHLIGHT_COLORS;

export interface VerseHighlight {
  id: string;               // Unique ID (bookId_chapter_verse)
  userId: string;           // User ID
  bookId: number;           // Bible book ID
  chapter: number;          // Chapter number
  verse: number;            // Verse number
  colorKey: HighlightColorKey; // Color key
  timestamp: number;        // For sync conflict resolution
  needsSync?: boolean;      // Flag to indicate if this highlight needs to be synced
}

// State interface
interface HighlightState {
  highlights: {[key: string]: VerseHighlight};
  initialized: boolean;
  syncInProgress: boolean;
  lastSyncTime: number;
  
  // Actions
  addHighlight: (bookId: number, chapter: number, verse: number, colorKey: HighlightColorKey) => void;
  removeHighlight: (bookId: number, chapter: number, verse: number) => void;
  getHighlight: (bookId: number, chapter: number, verse: number) => VerseHighlight | null;
  loadHighlights: () => Promise<void>;
  syncHighlights: () => Promise<void>;
}

// Helper to create highlight key
const createHighlightKey = (bookId: number, chapter: number, verse: number) => 
  `${bookId}_${chapter}_${verse}`;

// Create the store
export const useHighlightStore = create<HighlightState>((set, get) => {
  // Setup sync debounce
  let syncTimer: NodeJS.Timeout | null = null;

  // Schedule a debounced sync
  const scheduleSync = () => {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      get().syncHighlights();
    }, SYNC_DEBOUNCE_TIME);
  };

  return {
    highlights: {},
    initialized: false,
    syncInProgress: false,
    lastSyncTime: 0,

    // Add or update a highlight
    addHighlight: (bookId: number, chapter: number, verse: number, colorKey: HighlightColorKey) => {
      const userId = auth().currentUser?.uid || 'anonymous';
      const key = createHighlightKey(bookId, chapter, verse);
      const now = Date.now();

      // Create new highlight
      const highlight: VerseHighlight = {
        id: key,
        userId,
        bookId,
        chapter,
        verse,
        colorKey,
        timestamp: now,
        needsSync: true
      };

      // Update state
      set(state => {
        const newHighlights = { ...state.highlights, [key]: highlight };
        
        // Save to AsyncStorage
        AsyncStorage.setItem(
          `${HIGHLIGHTS_STORAGE_KEY}_${userId}`, 
          JSON.stringify(Object.values(newHighlights))
        ).catch(err => console.error('Failed to save highlights', err));
        
        // Schedule sync
        scheduleSync();
        
        return { highlights: newHighlights };
      });
    },

    // Remove a highlight
    removeHighlight: (bookId: number, chapter: number, verse: number) => {
      const userId = auth().currentUser?.uid || 'anonymous';
      const key = createHighlightKey(bookId, chapter, verse);

      set(state => {
        // Create a copy without the highlight
        const { [key]: removed, ...newHighlights } = state.highlights;
        
        // If we didn't have this highlight, don't change state
        if (!removed) return state;
        
        // Save to AsyncStorage
        AsyncStorage.setItem(
          `${HIGHLIGHTS_STORAGE_KEY}_${userId}`, 
          JSON.stringify(Object.values(newHighlights))
        ).catch(err => console.error('Failed to save highlights', err));
        
        // Delete from Firestore if we have a user and are online
        if (userId !== 'anonymous' && Platform.OS !== 'web') {
          const userRef = firestore().collection('users').doc(userId);
          
          // Get current document and update it
          userRef.get().then(doc => {
            if (doc.exists) {
              const highlights = doc.data()?.highlights || {};
              
              // Create a new highlights object without the removed one
              const { [key]: removedHighlight, ...updatedHighlights } = highlights;
              
              // Update the document
              userRef.update({
                highlights: updatedHighlights
              }).catch(err => console.error('Failed to delete highlight from Firestore', err));
            }
          }).catch(err => console.error('Failed to read user document', err));
        }
        
        return { highlights: newHighlights };
      });
    },

    // Get a highlight if it exists
    getHighlight: (bookId: number, chapter: number, verse: number) => {
      const key = createHighlightKey(bookId, chapter, verse);
      return get().highlights[key] || null;
    },

    // Load highlights from local storage and Firestore
    loadHighlights: async () => {
      try {
        const userId = auth().currentUser?.uid || 'anonymous';
        let highlightsMap: {[key: string]: VerseHighlight} = {};
        
        // First try to load from AsyncStorage (works even when offline)
        const storedHighlights = await AsyncStorage.getItem(`${HIGHLIGHTS_STORAGE_KEY}_${userId}`);
        
        if (storedHighlights) {
          const highlightArray = JSON.parse(storedHighlights) as VerseHighlight[];
          highlightsMap = highlightArray.reduce((acc, highlight) => {
            acc[highlight.id] = highlight;
            return acc;
          }, {} as {[key: string]: VerseHighlight});
        }
        
        // If we have a logged-in user, also try to load from Firestore
        if (userId !== 'anonymous' && Platform.OS !== 'web') {
          try {
            const userDoc = await firestore()
              .collection('users')
              .doc(userId)
              .get();
            
            if (userDoc.exists) {
              const firestoreHighlights = userDoc.data()?.highlights || {};
              
              // Merge Firestore highlights with local ones, preferring newer timestamps
              Object.values(firestoreHighlights).forEach((highlight: any) => {
                const localHighlight = highlightsMap[highlight.id];
                
                // If the Firestore highlight is newer or we don't have it locally, use it
                if (!localHighlight || (highlight.timestamp > localHighlight.timestamp)) {
                  highlightsMap[highlight.id] = {
                    ...highlight,
                    needsSync: false // Already synced with Firestore
                  };
                }
              });
              
              // Save the merged highlights back to AsyncStorage
              AsyncStorage.setItem(
                `${HIGHLIGHTS_STORAGE_KEY}_${userId}`,
                JSON.stringify(Object.values(highlightsMap))
              ).catch(err => console.error('Failed to save merged highlights', err));
            }
          } catch (firebaseErr) {
            console.error('Error loading highlights from Firestore:', firebaseErr);
            // We can still continue with local highlights
          }
        }
        
        // Set the highlights in the store
        set({ highlights: highlightsMap, initialized: true });
      } catch (err) {
        console.error('Failed to load highlights', err);
        set({ initialized: true });
      }
    },

    // Sync highlights to Firestore
    syncHighlights: async () => {
      const { highlights, syncInProgress } = get();
      const userId = auth().currentUser?.uid;
      
      // Don't sync if:
      // - We're already syncing
      // - There's no authenticated user
      // - We're running on web (Expo web issues with Firebase)
      if (syncInProgress || !userId || Platform.OS === 'web') {
        return;
      }
      
      set({ syncInProgress: true });
      
      try {
        // Find highlights that need sync
        const unsyncedHighlights = Object.values(highlights).filter(h => h.needsSync);
        
        if (unsyncedHighlights.length > 0) {
          // Store highlights directly in the user document instead of a subcollection
          const userRef = firestore().collection('users').doc(userId);
          
          // Get current user document
          const userDoc = await userRef.get();
          
          if (!userDoc.exists) {
            console.error('User document does not exist');
            set({ syncInProgress: false });
            return;
          }
          
          // Get current highlights or initialize empty object
          const currentHighlights = userDoc.data()?.highlights || {};
          
          // Update with new highlights
          const updatedHighlights = { ...currentHighlights };
          
          // Process unsyncedHighlights
          unsyncedHighlights.forEach(highlight => {
            const { needsSync, ...highlightData } = highlight;
            updatedHighlights[highlight.id] = highlightData;
          });
          
          // Update the user document with all highlights
          await userRef.update({
            highlights: updatedHighlights
          });
          
          // Update local state to remove needsSync flag
          const localHighlights = { ...highlights };
          unsyncedHighlights.forEach(highlight => {
            const key = highlight.id;
            if (localHighlights[key]) {
              localHighlights[key] = { ...localHighlights[key], needsSync: false };
            }
          });
          
          set({ 
            highlights: localHighlights,
            lastSyncTime: Date.now() 
          });
          
          // Save updated highlights to AsyncStorage
          AsyncStorage.setItem(
            `${HIGHLIGHTS_STORAGE_KEY}_${userId}`, 
            JSON.stringify(Object.values(localHighlights))
          ).catch(err => console.error('Failed to save highlights after sync', err));
        }
      } catch (err) {
        console.error('Failed to sync highlights', err);
      } finally {
        set({ syncInProgress: false });
      }
    }
  };
});

// Add this listener to sync when app is backgrounded
export const setupHighlightListeners = () => {
  if (Platform.OS !== 'web') {
    // Add app state listener here if needed
  }
};

export default useHighlightStore; 