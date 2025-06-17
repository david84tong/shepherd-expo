import { create } from 'zustand';
import { Devotional } from '../models/Devotional';
import firestore from '@react-native-firebase/firestore';
import { fetchChapter } from '../api/bible';
import { BIBLE_BOOK_IDS } from '../models/Path';
import { createDevotionalFromVerse } from '../api/ai';
import auth from '@react-native-firebase/auth';
// after we fetch devotional from firestore we need to get the verse from the API
// 

interface DevotionalStore {
  currentDevotional: Devotional | null;
  dailyDevotional: Devotional | null; // Daily devotional fetched from Firebase
  devotionals: Devotional[];
  isLoading: boolean;
  error: string | null;
  bibleVersion: string;
  locale: string;
  customDevotional: Devotional | null; // Quick devotional from Bible reader swipe
  isCreatingDevotional: boolean; // Loading state for AI devotional creation
  
  // Actions
  fetchTodaysDevotional: () => Promise<void>;
  setCurrentDevotional: (devotional: Devotional | null) => void;
  setLocale: (locale: string) => void;
  setBibleVersion: (version: string) => void;
  clearError: () => void;
  reset: () => void;
  // NEW ACTION: Quickly create a devotional from a verse the user selected
  createQuickDevotional: (verseText: string, reference: string) => void;
  // NEW ACTION: Create AI-powered devotional from verse
  createAIDevotional: (verseText: string, reference: string, bookName: string, chapter: number, verse: number) => Promise<void>;
  // Clear custom devotional when closing
  clearCustomDevotional: () => void;
}

export const useDevotionalStore = create<DevotionalStore>((set, get) => ({
  currentDevotional: null,
  dailyDevotional: null,
  devotionals: [],
  isLoading: false,
  error: null,
  bibleVersion: 'ESV',
  locale: 'en',
  customDevotional: null,
  isCreatingDevotional: false,

  fetchTodaysDevotional: async () => {
    console.log('🚀 fetchTodaysDevotional function called!');
    set({ isLoading: true, error: null });
    
    try {
      // Try to get today's devotional by ID first (format: YYYY-MM-DD)
      const today = new Date();
      const todayId = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      console.log('Trying to fetch devotional with ID:', todayId);
      
      const devotionalsRef = firestore().collection('dailyDevotionals');
      
      // First try to get by document ID
      let snapshot = await devotionalsRef.doc(todayId).get();
      
             if (!snapshot.exists) {
         console.log('No devotional found with today\'s ID, trying test document ID...');
         
         // Try the test document ID from Firestore
         snapshot = await devotionalsRef.doc('2025-06-11').get();
         
         if (!snapshot.exists) {
           console.log('Test document not found either, trying date range query...');
           
           // Fallback to date range query with broader range for testing
           const startOfToday = new Date(new Date().setDate(new Date().getDate() - 7)); // Look back 7 days
           startOfToday.setHours(0, 0, 0, 0);
           
           const endOfToday = new Date(new Date().setDate(new Date().getDate() + 7)); // Look ahead 7 days
           endOfToday.setHours(23, 59, 59, 999);
           
           console.log('Fetching devotional for createdAt between:', startOfToday.toISOString(), 'and', endOfToday.toISOString());
           
           const querySnapshot = await devotionalsRef
             .where('createdAt', '>=', firestore.Timestamp.fromDate(startOfToday))
             .where('createdAt', '<=', firestore.Timestamp.fromDate(endOfToday))
             .limit(1)
             .get();
             
           if (querySnapshot.empty) {
             console.log('No devotional found in date range either');
             set({ 
               currentDevotional: null, 
               isLoading: false,
               error: 'No devotional available for today' 
             });
             return;
           }
           
           snapshot = querySnapshot.docs[0];
         } else {
           console.log('Found test devotional with ID: 2025-06-11');
         }
       }
      
            // Get the document data
      const devotionalData = snapshot.data() as Devotional;
      
      if (!devotionalData) {
        console.log('No devotional data found');
        set({ 
          currentDevotional: null, 
          isLoading: false,
          error: 'No devotional available for today' 
        });
        return;
      }
      
      const devotional: Devotional = {
        ...devotionalData,
        // Extract 'en' values from nested objects, fallback to original if string
        prayer: typeof devotionalData.prayer === 'object' && devotionalData.prayer?.en 
          ? devotionalData.prayer.en 
          : devotionalData.prayer || '',
        reflectionPrompt: typeof (devotionalData as any).reflection === 'object' && (devotionalData as any).reflection?.en 
          ? (devotionalData as any).reflection.en 
          : devotionalData.reflectionPrompt || '',
        // Keep the original id field from the document data
      };
      
      console.log('Fetched devotional:', devotional.id);
      console.log('Devotional from Firestore:', {
        hasVerse: !!devotionalData.verse,
        versePreview: devotionalData.verse?.substring(0, 100),
        bibleReference: devotionalData.bibleReference,
        prayer: devotionalData.prayer,
        reflectionPrompt: devotionalData.reflectionPrompt,
        reflection: (devotionalData as any).reflection,
      });
      
      // Determine the Bible reference to use for fetching
      const referenceToUse = devotionalData.bibleReference || devotionalData.verse;
      console.log('📍 Reference to use for fetching:', referenceToUse);
      
      // Check if we need to fetch the verse (if verse field contains a reference instead of actual text)
      const needsVerseFetch = referenceToUse && (
        !devotionalData.bibleReference || // bibleReference is missing
        (devotionalData.verse && devotionalData.verse.includes(':')) // verse looks like a reference
      );
      
      if (needsVerseFetch) {
        console.log('🔄 Need to fetch verse from API');
        // Fetch the actual Bible verse if we have a reference
        try {
          const parsed = parseBibleReference(referenceToUse);
          if (parsed) {
            // Get book ID from book name
            const bookId = BIBLE_BOOK_IDS[parsed.book];
            if (bookId) {
              console.log(`🔄 Fetching verse: ${referenceToUse} (Book ID: ${bookId})`);
              
              // Fetch the chapter
              const chapterData = await fetchChapter(get().bibleVersion || 'ESV', bookId, parsed.chapter);
              
              if ('verses' in chapterData) {
                // Find the specific verse
                const verseData = chapterData.verses.find(v => v.verse === parsed.verse);
                if (verseData) {
                  devotional.verse = verseData.text;
                  devotional.bibleReference = referenceToUse; // Set the reference properly
                  console.log(`✅ Found verse: ${verseData.text.substring(0, 50)}...`);
                  console.log(`✅ Full verse text:`, verseData.text);
                  console.log(`✅ Devotional verse field set:`, devotional.verse);
                  console.log(`✅ Bible reference set:`, devotional.bibleReference);
                } else {
                  console.log(`⚠️ Verse ${parsed.verse} not found in chapter ${parsed.chapter}`);
                  console.log(`⚠️ Available verses:`, chapterData.verses.map(v => v.verse));
                }
              } else {
                console.log('❌ Error fetching chapter:', chapterData);
              }
            } else {
              console.log(`❌ Book not found in BIBLE_BOOK_IDS: ${parsed.book}`);
            }
          }
        } catch (error) {
          console.error('Error fetching Bible verse:', error);
          // Continue without the verse - don't fail the whole devotional fetch
        }
      } else {
        console.log('✅ No need to fetch verse from API');
        // If bibleReference is missing but we have a verse that looks like content, set it
        if (!devotional.bibleReference && referenceToUse && !referenceToUse.includes(':')) {
          devotional.bibleReference = referenceToUse;
        }
      }
      
      console.log('📚 Final devotional object before setting:', {
        id: devotional.id,
        bibleReference: devotional.bibleReference,
        verse: devotional.verse,
        hasVerse: !!devotional.verse,
        verseLength: devotional.verse?.length,
        reflectionPrompt: devotional.reflectionPrompt,
        reflectionPromptType: typeof devotional.reflectionPrompt,
        prayer: devotional.prayer,
        prayerType: typeof devotional.prayer,
      });
      
      set({ 
        dailyDevotional: devotional, // Set the daily devotional from Firebase
        currentDevotional: devotional, 
        isLoading: false,
        error: null 
      });
      
    } catch (error) {
      console.error('Error fetching devotional:', error);
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch devotional'
      });
    }
  },

  setCurrentDevotional: (devotional) => {
    set({ currentDevotional: devotional });
  },

  setLocale: (locale) => {
    set({ locale });
  },

  setBibleVersion: (version) => {
    set({ bibleVersion: version });
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({
      currentDevotional: null,
      dailyDevotional: null,
      devotionals: [],
      isLoading: false,
      error: null,
    });
  },

  // QUICK DEVOTIONAL CREATION -----------------------------------------------
  createQuickDevotional: (verseText: string, reference: string) => {
    const quickDevotional: Devotional = {
      id: `quick-${Date.now()}`,
      title: '',
      content: '',
      createdAt: new Date().toISOString(),
      context: '',
      bibleReference: reference,
      prayer: '',
      reflectionPrompt: '',
      likes: 0,
      shares: 0,
      completed: 0,
      date: new Date().toISOString(),
      imageURL: '',
      verse: verseText,
    };

    console.log('[DevotionalStore] Created quick devotional from verse:', quickDevotional);
    set({ customDevotional: quickDevotional, currentDevotional: quickDevotional });
  },

  // NEW ACTION: Create AI-powered devotional from verse
  createAIDevotional: async (verseText: string, reference: string, bookName: string, chapter: number, verse: number) => {
    console.log('[DevotionalStore] Creating AI devotional from verse:', { verseText, reference, bookName, chapter, verse });
    set({ isCreatingDevotional: true, error: null });
    
    try {
      // Get the current user's ID token for API authentication
      const currentUser = auth().currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      const idToken = await currentUser.getIdToken();
      
      // Create the verse context for the AI API
      const verseContext = {
        bookName,
        chapter,
        verse,
        verseText
      };
      
      // Call the AI API to create devotional content
      const aiResponse = await createDevotionalFromVerse(verseContext, idToken);
      
      // Create a full Devotional object from the AI response
      const aiDevotional: Devotional = {
        id: `ai-${Date.now()}`,
        title: aiResponse.title,
        content: aiResponse.context,
        createdAt: new Date().toISOString(),
        context: aiResponse.context,
        bibleReference: reference,
        prayer: aiResponse.prayer,
        reflectionPrompt: aiResponse.reflectionPrompt,
        likes: 0,
        shares: 0,
        completed: 0,
        date: new Date().toISOString(),
        imageURL: '',
        verse: verseText,
      };
      
      console.log('[DevotionalStore] AI devotional created successfully:', aiDevotional);
      set({ 
        currentDevotional: aiDevotional, 
        customDevotional: aiDevotional,
        isCreatingDevotional: false,
        error: null 
      });
    } catch (error) {
      console.error('Error creating AI devotional:', error);
      set({ 
        isCreatingDevotional: false, 
        error: error instanceof Error ? error.message : 'Failed to create AI devotional' 
      });
    }
  },

  clearCustomDevotional: () => {
    console.log('[DevotionalStore] Clearing custom devotional');
    set({ customDevotional: null });
  },
}));

// Helper function to parse Bible reference like "Jeremiah 29:13" or "1 John 3:16"
const parseBibleReference = (reference: string): { book: string; chapter: number; verse: number } | null => {
  try {
    // Handle references like "1 John 3:16" or "Jeremiah 29:13"
    const match = reference.match(/^(\d?\s*\w+(?:\s+\w+)*)\s+(\d+):(\d+)$/);
    if (!match) return null;
    
    const [, book, chapter, verse] = match;
    return {
      book: book.trim(),
      chapter: parseInt(chapter, 10),
      verse: parseInt(verse, 10)
    };
  } catch (error) {
    console.error('Error parsing Bible reference:', reference, error);
    return null;
  }
};

