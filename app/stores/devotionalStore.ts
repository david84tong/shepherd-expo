import { create } from 'zustand';
import { Devotional } from '../models/Devotional';
import firestore from '@react-native-firebase/firestore';
import { fetchChapter } from '../api/bible';
import { BIBLE_BOOK_IDS } from '../models/Path';
// after we fetch devotional from firestore we need to get the verse from the API
// 

interface DevotionalStore {
  currentDevotional: Devotional | null;
  devotionals: Devotional[];
  isLoading: boolean;
  error: string | null;
  bibleVersion: string;
  locale: string;
  
  // Actions
  fetchTodaysDevotional: () => Promise<void>;
  setCurrentDevotional: (devotional: Devotional | null) => void;
  setLocale: (locale: string) => void;
  setBibleVersion: (version: string) => void;
  clearError: () => void;
  reset: () => void;
}

export const useDevotionalStore = create<DevotionalStore>((set, get) => ({
  currentDevotional: null,
  devotionals: [],
  isLoading: false,
  error: null,
  bibleVersion: 'ESV',
  locale: 'en',

  fetchTodaysDevotional: async () => {
    console.log('🚀 fetchTodaysDevotional function called!');
    set({ isLoading: true, error: null });
    
    try {
      // Get today's date in UTC format (YYYY-MM-DD)
      const todayUTC = new Date().toISOString().split('T')[0]; // "2025-06-03"
      
      console.log('Fetching devotional for UTC date:', todayUTC);
      
      // Query for document where the "id" field equals todayUTC
      const devotionalsRef = firestore().collection('dailyDevotionals');
      const snapshot = await devotionalsRef
        .where('id', '==', todayUTC)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        console.log('No devotional found for date:', todayUTC);
        set({ 
          currentDevotional: null, 
          isLoading: false,
          error: 'No devotional available for today' 
        });
        return;
      }
      
      // Get the first (and should be only) document
      const doc = snapshot.docs[0];
      const devotionalData = doc.data() as Devotional;
      
      const devotional: Devotional = {
        ...devotionalData,
        // Keep the original id field from the document data
      };
      
      console.log('Fetched devotional:', devotional.id);
      console.log('Devotional from Firestore:', {
        hasVerse: !!devotionalData.verse,
        versePreview: devotionalData.verse?.substring(0, 100),
        bibleReference: devotionalData.bibleReference,
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
      });
      
      set({ 
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
      devotionals: [],
      isLoading: false,
      error: null,
    });
  }
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

