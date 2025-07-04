import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Platform } from 'react-native';

// Constants for storage
const NOTES_STORAGE_KEY = 'user_verse_notes';
const SYNC_DEBOUNCE_TIME = 10000; // 10 seconds

export interface VerseNote {
  id: string;               // Unique ID (bookId_chapter_verse)
  userId: string;           // User ID
  bookId: number;           // Bible book ID
  chapter: number;          // Chapter number
  verse: number;            // Verse number
  content: string;          // Note content
  timestamp: number;        // For sync conflict resolution
  needsSync?: boolean;      // Flag to indicate if this note needs to be synced
}

// State interface
interface NoteState {
  notes: {[key: string]: VerseNote};
  initialized: boolean;
  syncInProgress: boolean;
  lastSyncTime: number;
  
  // Actions
  addOrUpdateNote: (bookId: number, chapter: number, verse: number, content: string) => void;
  removeNote: (bookId: number, chapter: number, verse: number) => void;
  getNote: (bookId: number, chapter: number, verse: number) => VerseNote | null;
  loadNotes: () => Promise<void>;
  syncNotes: () => Promise<void>;
}

// Helper to create note key
const createNoteKey = (bookId: number, chapter: number, verse: number) => 
  `${bookId}_${chapter}_${verse}`;

// Create the store
export const useNoteStore = create<NoteState>((set, get) => {
  // Setup sync debounce
  let syncTimer: NodeJS.Timeout | null = null;

  // Schedule a debounced sync
  const scheduleSync = () => {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      get().syncNotes();
    }, SYNC_DEBOUNCE_TIME);
  };

  return {
    notes: {},
    initialized: false,
    syncInProgress: false,
    lastSyncTime: 0,

    // Add or update a note
    addOrUpdateNote: (bookId: number, chapter: number, verse: number, content: string) => {
      const userId = auth().currentUser?.uid || 'anonymous';
      const key = createNoteKey(bookId, chapter, verse);
      const now = Date.now();

      // Create new note
      const note: VerseNote = {
        id: key,
        userId,
        bookId,
        chapter,
        verse,
        content,
        timestamp: now,
        needsSync: true
      };

      // Update state
      set(state => {
        const newNotes = { ...state.notes, [key]: note };
        
        // Save to AsyncStorage
        AsyncStorage.setItem(
          `${NOTES_STORAGE_KEY}_${userId}`, 
          JSON.stringify(Object.values(newNotes))
        ).catch(err => console.error('Failed to save notes', err));
        
        // Schedule sync
        scheduleSync();
        
        return { notes: newNotes };
      });
    },

    // Remove a note
    removeNote: (bookId: number, chapter: number, verse: number) => {
      const userId = auth().currentUser?.uid || 'anonymous';
      const key = createNoteKey(bookId, chapter, verse);

      set(state => {
        // Create a copy without the note
        const { [key]: removed, ...newNotes } = state.notes;
        
        // If we didn't have this note, don't change state
        if (!removed) return state;
        
        // Save to AsyncStorage
        AsyncStorage.setItem(
          `${NOTES_STORAGE_KEY}_${userId}`, 
          JSON.stringify(Object.values(newNotes))
        ).catch(err => console.error('Failed to save notes', err));
        
        // Delete from Firestore if we have a user and are online
        if (userId !== 'anonymous' && Platform.OS !== 'web') {
          const userRef = firestore().collection('users').doc(userId);
          
          // Get current document and update it
          userRef.get().then(doc => {
            if (doc.exists) {
              const notes = doc.data()?.notes || {};
              
              // Create a new notes object without the removed one
              const { [key]: removedNote, ...updatedNotes } = notes;
              
              // Update the document
              userRef.update({
                notes: updatedNotes
              }).catch(err => console.error('Failed to delete note from Firestore', err));
            }
          }).catch(err => console.error('Failed to read user document', err));
        }
        
        return { notes: newNotes };
      });
    },

    // Get a note if it exists
    getNote: (bookId: number, chapter: number, verse: number) => {
      const key = createNoteKey(bookId, chapter, verse);
      return get().notes[key] || null;
    },

    // Load notes from local storage and Firestore
    loadNotes: async () => {
      try {
        const userId = auth().currentUser?.uid || 'anonymous';
        let notesMap: {[key: string]: VerseNote} = {};
        
        // First try to load from AsyncStorage (works even when offline)
        const storedNotes = await AsyncStorage.getItem(`${NOTES_STORAGE_KEY}_${userId}`);
        
        // Defensive JSON.parse: Prevents crashes from empty or malformed JSON in notes storage.
        let noteArray: VerseNote[] = [];
        if (storedNotes && typeof storedNotes === 'string' && storedNotes.trim().length > 0 && (storedNotes.trim().startsWith('{') || storedNotes.trim().startsWith('['))) {
          try {
            noteArray = JSON.parse(storedNotes) as VerseNote[];
          } catch (e) {
            console.log('Failed to parse storedNotes as JSON:', storedNotes);
            noteArray = [];
          }
        }
        
        notesMap = noteArray.reduce((acc, note) => {
          acc[note.id] = note;
          return acc;
        }, {} as {[key: string]: VerseNote});
        
        // If we have a logged-in user, also try to load from Firestore
        if (userId !== 'anonymous' && Platform.OS !== 'web') {
          try {
            const userDoc = await firestore()
              .collection('users')
              .doc(userId)
              .get();
            
            if (userDoc.exists) {
              const firestoreNotes = userDoc.data()?.notes || {};
              
              // Merge Firestore notes with local ones, preferring newer timestamps
              Object.values(firestoreNotes).forEach((note: any) => {
                const localNote = notesMap[note.id];
                
                // If the Firestore note is newer or we don't have it locally, use it
                if (!localNote || (note.timestamp > localNote.timestamp)) {
                  notesMap[note.id] = {
                    ...note,
                    needsSync: false // Already synced with Firestore
                  };
                }
              });
              
              // Save the merged notes back to AsyncStorage
              AsyncStorage.setItem(
                `${NOTES_STORAGE_KEY}_${userId}`,
                JSON.stringify(Object.values(notesMap))
              ).catch(err => console.error('Failed to save merged notes', err));
            }
          } catch (firebaseErr) {
            console.error('Error loading notes from Firestore:', firebaseErr);
            // We can still continue with local notes
          }
        }
        
        // Set the notes in the store
        set({ notes: notesMap, initialized: true });
      } catch (err) {
        console.error('Failed to load notes', err);
        set({ initialized: true });
      }
    },

    // Sync notes to Firestore
    syncNotes: async () => {
      const { notes, syncInProgress } = get();
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
        // Find notes that need sync
        const unsyncedNotes = Object.values(notes).filter(n => n.needsSync);
        
        if (unsyncedNotes.length > 0) {
          // Store notes directly in the user document
          const userRef = firestore().collection('users').doc(userId);
          
          // Get current user document
          const userDoc = await userRef.get();
          
          if (!userDoc.exists) {
            console.error('User document does not exist');
            set({ syncInProgress: false });
            return;
          }
          
          // Get current notes or initialize empty object
          const currentNotes = userDoc.data()?.notes || {};
          
          // Update with new notes
          const updatedNotes = { ...currentNotes };
          
          // Process unsyncedNotes
          unsyncedNotes.forEach(note => {
            const { needsSync, ...noteData } = note;
            updatedNotes[note.id] = noteData;
          });
          
          // Update the user document with all notes
          await userRef.update({
            notes: updatedNotes
          });
          
          // Update local state to remove needsSync flag
          const localNotes = { ...notes };
          unsyncedNotes.forEach(note => {
            const key = note.id;
            if (localNotes[key]) {
              localNotes[key] = { ...localNotes[key], needsSync: false };
            }
          });
          
          set({ 
            notes: localNotes,
            lastSyncTime: Date.now() 
          });
          
          // Save updated notes to AsyncStorage
          AsyncStorage.setItem(
            `${NOTES_STORAGE_KEY}_${userId}`, 
            JSON.stringify(Object.values(localNotes))
          ).catch(err => console.error('Failed to save notes after sync', err));
        }
      } catch (err) {
        console.error('Failed to sync notes', err);
      } finally {
        set({ syncInProgress: false });
      }
    }
  };
});

// Add this listener to sync when app is backgrounded
export const setupNoteListeners = () => {
  if (Platform.OS !== 'web') {
    // Add app state listener if needed
  }
};

export default useNoteStore; 