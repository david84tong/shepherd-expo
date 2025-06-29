import { create } from 'zustand';
import { Devotional } from '../models/Devotional';
import firestore from '@react-native-firebase/firestore';
import { fetchChaptersBatch, ChapterResponse, FetchError, fetchChapterWithCache, clearChapterCache } from '../api/bible';
import { BIBLE_BOOK_IDS } from '../models/Path';
import { createDevotionalFromVerse, checkNetworkConnectivity } from '../api/ai';
import auth from '@react-native-firebase/auth';
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathStore } from './pathStore';
import dayjs from 'dayjs';

// Safely get WidgetDataSharer with error handling
const getWidgetDataSharer = () => {
  try {
    console.log('📱 Attempting to access WidgetDataSharer from NativeModules...');
    console.log('📱 Available NativeModules:', Object.keys(NativeModules));
    
    const { WidgetDataSharer } = NativeModules;
    console.log('📱 WidgetDataSharer from destructuring:', WidgetDataSharer);
    
    if (!WidgetDataSharer) {
      console.warn('📱 WidgetDataSharer native module not found');
      console.log('📱 This might be because:');
      console.log('📱 1. The native module is not properly linked');
      console.log('📱 2. The app needs to be rebuilt');
      console.log('📱 3. The module is not included in the Xcode project');
      return null;
    }
    
    console.log('📱 WidgetDataSharer found successfully:', {
      hasUpdateVerseData: typeof WidgetDataSharer.updateVerseData === 'function',
      hasUpdateWidgetStatus: typeof WidgetDataSharer.updateWidgetStatus === 'function',
    });
    
    return WidgetDataSharer;
  } catch (error) {
    console.error('📱 Error accessing WidgetDataSharer:', error);
    return null;
  }
};

// Helper function to safely call widget methods
const safeWidgetCall = async (method: string, ...args: any[]) => {
  const widgetModule = getWidgetDataSharer();
  if (!widgetModule) {
    console.warn(`📱 Cannot call ${method} - WidgetDataSharer not available, using AsyncStorage fallback`);
    
    // Use AsyncStorage fallback
    if (method === 'updateVerseData' && args.length >= 2) {
      await saveWidgetDataToAsyncStorage(args[0], args[1], args[2]);
    } else if (method === 'updateWidgetStatus' && args.length >= 1) {
      await saveWidgetStatusToAsyncStorage(args[0]);
    }
    return;
  }
  
  try {
    if (method === 'updateVerseData' && widgetModule.updateVerseData) {
      widgetModule.updateVerseData(...args);
    } else if (method === 'updateWidgetStatus' && widgetModule.updateWidgetStatus) {
      widgetModule.updateWidgetStatus(...args);
    } else {
      console.warn(`📱 Method ${method} not available on WidgetDataSharer`);
    }
  } catch (error) {
    console.error(`📱 Error calling ${method}:`, error);
    
    // Fallback to AsyncStorage on error
    if (method === 'updateVerseData' && args.length >= 2) {
      await saveWidgetDataToAsyncStorage(args[0], args[1], args[2]);
    } else if (method === 'updateWidgetStatus' && args.length >= 1) {
      await saveWidgetStatusToAsyncStorage(args[0]);
    }
  }
};

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
  createQuickDevotional: (verseText: string, reference: string) => Promise<void>;
  // NEW ACTION: Create AI-powered devotional from verse
  createAIDevotional: (verseText: string, reference: string, bookName: string, chapter: number, verse: number) => Promise<void>;
  // Clear custom devotional when closing
  // Refresh widget data with current devotional
  refreshWidgetData: () => Promise<void>;
  // NEW ACTION: Update widget timeline with 5 days of data
  updateWidgetTimeline: () => Promise<void>;
  clearCustomDevotional: () => void;
  setCustomDevotional: (devotional: Devotional) => void;
  setIsFromCheckIn: (value: boolean) => void;
  updateLikeStatus: (devotionalId: string, liked: boolean) => void;
  incrementShareCount: (devotionalId: string) => void;
  // Utility function to clear Bible chapter cache
  clearBibleCache: () => Promise<void>;
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
      const devotionalsRef = firestore().collection('dailyDevotionals');
      
      // Get today's date in user's local timezone in YYYY-MM-DD format
      const today = dayjs();
      const todayIdFormat = today.format('YYYY-MM-DD');
      
      console.log(
        'Looking for devotional with id property:',
        todayIdFormat,
        'Current time:',
        today.format('YYYY-MM-DD')
      );
      
      // Query for devotional where the 'id' field matches today's date in YYYY-MM-DD format
      const idQuerySnapshot = await devotionalsRef
        .where('id', '==', todayIdFormat)
        .limit(1)
        .get();
        
      let snapshot;
      if (!idQuerySnapshot.empty) {
        snapshot = idQuerySnapshot.docs[0];
        console.log('Found devotional by id field:', snapshot.id, 'with id property:', todayIdFormat);
      } else {
        console.log('No devotional found with id property:', todayIdFormat, 'trying fallback strategies...');
        
        // Fallback: Try known test document IDs for development
        const testIds = ['proverbs_3_5', '2025-06-11', 'CFo121cim0OuAT1AwZpp'];
        
        for (const testId of testIds) {
          console.log('Trying test document ID:', testId);
          snapshot = await devotionalsRef.doc(testId).get();
          if (snapshot.exists) {
            console.log('Found test devotional with document ID:', testId);
            break;
          }
        }
        
        if (!snapshot?.exists) {
          console.log('No devotional found');
          set({ 
            currentDevotional: null, 
            isLoading: false,
            error: 'No devotional available for today' 
          });
          return;
        }
      }
      
            // Get the document data
      const devotionalData = snapshot.data() as Devotional;
      console.log("FETCHING devotionalData ====>",devotionalData);
      
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
        id: snapshot.id,
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
              
              // Fetch the chapter using user's saved translation from pathStore
              const userTranslation = usePathStore.getState().savedTranslation || 'ESV';
              const chapterData = await fetchChapterWithCache(userTranslation, bookId, parsed.chapter);
              
              if ('verses' in chapterData) {
                if (parsed.endVerse) {
                  // Handle verse range (e.g., "Proverbs 3:5-6")
                  const verses = [];
                  for (let verseNum = parsed.verse; verseNum <= parsed.endVerse; verseNum++) {
                    const verseData = chapterData.verses.find(v => v.verse === verseNum);
                    if (verseData) {
                      verses.push(verseData.text);
                    }
                  }
                  
                  if (verses.length > 0) {
                    devotional.verse = verses.join(' ');
                    devotional.bibleReference = referenceToUse; // Set the reference properly
                    console.log(`✅ Found verse range (${parsed.verse}-${parsed.endVerse}): ${devotional.verse.substring(0, 100)}...`);
                    console.log(`✅ Combined ${verses.length} verses`);
                    console.log(`✅ Devotional verse field set:`, devotional.verse);
                    console.log(`✅ Bible reference set:`, devotional.bibleReference);
                  } else {
                    console.log(`⚠️ No verses found in range ${parsed.verse}-${parsed.endVerse} for chapter ${parsed.chapter}`);
                  }
                } else {
                  // Handle single verse
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

      // The widget timeline is now updated by a separate function
      // that is called after this one completes.
      await get().updateWidgetTimeline();

    } catch (error) {
      console.error('Error fetching devotional:', error);
      await safeWidgetCall('updateWidgetStatus', 'noVerseAvailable');
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
  createQuickDevotional: async (verseText: string, reference: string) => {
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
      imageURL: 'https://firebasestorage.googleapis.com/v0/b/shepherd-c74ad.firebasestorage.app/o/waterBackground.png?alt=media&token=b0266692-ada8-4ec9-98ce-a1e0a242186d',
      verse: verseText,
    };

    console.log('[DevotionalStore] Created quick devotional from verse:', quickDevotional);
    set({ customDevotional: quickDevotional, currentDevotional: quickDevotional });

    // Share the quick devotional with the widget
    if (reference && verseText) {
      console.log('📱 Sharing quick devotional with widget:', {
        bibleReference: reference,
        verseLength: verseText.length
      });
      await safeWidgetCall('updateVerseData',
        reference,
        verseText,
        null // No image for quick devotionals
      );
    }
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
        imageURL: 'https://firebasestorage.googleapis.com/v0/b/shepherd-c74ad.firebasestorage.app/o/waterBackground.png?alt=media&token=b0266692-ada8-4ec9-98ce-a1e0a242186d',
        verse: verseText,
      };
      
      // Save to Firestore customDevotionals collection
      try {
        await firestore().collection('customDevotionals').doc(aiDevotional.id).set(aiDevotional);
        console.log('[DevotionalStore] Saved custom devotional to Firestore:', aiDevotional.id);
      } catch (Error) {
        console.error('[DevotionalStore] Failed to save custom devotional to Firestore:', Error);
      }
      
      console.log('[DevotionalStore] AI devotional created successfully:', aiDevotional);
      set({ 
        currentDevotional: aiDevotional, 
        customDevotional: aiDevotional,
        isCreatingDevotional: false,
        error: null 
      });

      // Share the AI devotional with the widget
      if (reference && verseText) {
        console.log('📱 Sharing AI devotional with widget:', {
          bibleReference: reference,
          verseLength: verseText.length
        });
        await safeWidgetCall('updateVerseData',
          reference,
          verseText,
          null // No image for AI devotionals
        );
      }
    } catch (error: unknown) {
      console.error('[DevotionalStore] Error creating AI devotional:', error);
      
      // Handle different types of errors
      let errorMessage = 'Failed to create AI devotional';
      
      if (error instanceof TypeError && error.message.includes('Network error')) {
        // Check network connectivity to provide better error message
        const isConnected = await checkNetworkConnectivity();
        if (!isConnected) {
          errorMessage = 'No internet connection. Please check your network and try again.';
        } else {
          errorMessage = 'Network connection issue. Please check your internet connection and try again.';
        }
      } else if (error instanceof Error) {
        if (error.message.includes('HTTP 401')) {
          errorMessage = 'Authentication failed. Please sign in again.';
        } else if (error.message.includes('HTTP 429')) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (error.message.includes('HTTP 500')) {
          errorMessage = 'Server error. Please try again later.';
        } else if (error.message.includes('User not authenticated')) {
          errorMessage = 'Please sign in to create custom devotionals.';
        } else if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      set({ 
        isCreatingDevotional: false, 
        error: errorMessage
      });
      
      // Log the error for debugging
      console.error('[DevotionalStore] Detailed error info:', {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  },

  clearCustomDevotional: async () => {
    console.log('[DevotionalStore] Clearing custom devotional');
    set({ customDevotional: null });
    
    // Clear widget data when custom devotional is cleared
    await safeWidgetCall('updateWidgetStatus', 'noVerseAvailable');
  },

  setCustomDevotional: (devotional: Devotional) => {
    console.log('[DevotionalStore] Setting custom devotional:', devotional);
    set({ 
      customDevotional: devotional,
      currentDevotional: devotional 
    });
  },
  
  setIsFromCheckIn: (value: boolean) => {
    console.log('[DevotionalStore] Setting isFromCheckIn:', value);
    set({ isFromCheckIn: value });
  },

  // Refresh widget data with current devotional
  refreshWidgetData: async () => {
    const { currentDevotional } = get();
    if (currentDevotional?.bibleReference && currentDevotional?.verse) {
      console.log('📱 Refreshing widget data with current devotional:', {
        bibleReference: currentDevotional.bibleReference,
        verseLength: currentDevotional.verse.length,
        imageURL: currentDevotional.imageURL
      });
      await safeWidgetCall('updateVerseData',
        currentDevotional.bibleReference,
        currentDevotional.verse,
        currentDevotional.imageURL || null
      );
    } else {
      console.log('📱 No current devotional data available for widget refresh');
      await safeWidgetCall('updateWidgetStatus', 'noVerseAvailable');
    }
  },

  // NEW ACTION: Update widget timeline with 5 days of data
  updateWidgetTimeline: async () => {
    console.log('🚀 Updating widget timeline with 5 days of data...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch 5 days of devotionals from Firestore
   
      // Get start and end dates for the 5 day range
      const startDate = dayjs(today).startOf('day').format('YYYY-MM-DD');
      const endDate = dayjs(today).startOf('day').add(4, 'days').format('YYYY-MM-DD');

      // Single query to fetch all devotionals in date range
      const querySnap = await firestore()
        .collection('dailyDevotionals')
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .get();

      // Map the results into an array of 5 days, filling nulls for missing dates
      const devotionalPromises = Array.from({ length: 5 }).map((_, i) => {
        const dateToFind = dayjs(today).startOf('day').add(i, 'days').format('YYYY-MM-DD');
        const found = querySnap.docs.find(doc => doc.data().date === dateToFind);
        return found ? found.data() as Devotional : null;
      });
      
      const rawDevotionals = await Promise.all(devotionalPromises);

      // OPTIMIZED: Collect all unique chapter references for batch fetching
      const chaptersToFetch: Array<{ bookId: number; chapter: number }> = [];
      const devotionalChapterMap = new Map<number, { devotional: Devotional; reference: string }>();
      
      rawDevotionals.forEach((devotional, index) => {
        if (!devotional) return;
        
        const reference = devotional.bibleReference || devotional.verse;
        if (reference && reference.includes(':')) {
          try {
            const parsed = parseBibleReference(reference);
            if (parsed) {
              const bookId = BIBLE_BOOK_IDS[parsed.book];
              if (bookId) {
                chaptersToFetch.push({ bookId, chapter: parsed.chapter });
                devotionalChapterMap.set(index, { devotional, reference });
              }
            }
          } catch (e) {
            console.error(`Failed to parse reference ${reference}`, e);
          }
        }
      });

      // Batch fetch all needed chapters
      let chapterResults: Map<string, ChapterResponse | FetchError> = new Map();
      if (chaptersToFetch.length > 0) {
        console.log(`📚 Batch fetching ${chaptersToFetch.length} chapters for widget timeline`);
        chapterResults = await fetchChaptersBatch(get().bibleVersion, chaptersToFetch);
      }

      // Process devotionals using batch-fetched data
      const processedDevotionals = await Promise.all(
        rawDevotionals.map(async (devotional, index) => {
          if (!devotional) return null;
          
          let verseText = devotional.verse;
          const reference = devotional.bibleReference || devotional.verse;

          if (verseText && verseText.includes(':')) {
            try {
              const parsed = parseBibleReference(reference);
              if (parsed) {
                const bookId = BIBLE_BOOK_IDS[parsed.book];
                if (bookId) {
                  const chapterKey = `${bookId}:${parsed.chapter}`;
                  const chapterData = chapterResults.get(chapterKey);
                  
                  if (chapterData && !('error' in chapterData)) {
                    const verseData = chapterData.verses.find(v => v.verse === parsed.verse);
                    if (verseData) {
                      verseText = verseData.text;
                      console.log(`✅ Found verse text for ${reference}: ${verseText.substring(0, 50)}...`);
                    }
                  } else if (chapterData && 'error' in chapterData) {
                    console.error(`❌ Failed to fetch chapter for ${reference}:`, chapterData.message);
                  }
                }
              }
            } catch (e) { 
              console.error(`Failed to process verse text for ${reference}`, e); 
            }
          }
          return { ...devotional, verse: verseText, bibleReference: reference };
        })
      );

      // Create widget timeline entries
      const widgetEntries = processedDevotionals.map((devotional, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        if (devotional) {
          
          return {
            date: date.getTime() / 1000,
            status: 'verseAvailable',
            bibleReference: devotional.bibleReference,
            verse: devotional.verse,
            imageURL: devotional.imageURL,
          };
        }
        return { 
          date: date.getTime() / 1000, 
          status: 'noVerseAvailable' 
        };
      });
      
      console.log(`📱 Prepared ${widgetEntries.length} entries for widget timeline.`);
      
      // Update both the single verse data for today AND the 5-day timeline
      const todaysData = processedDevotionals?.[0];
      console.log("todaysData ==>",todaysData);
      
      if(!todaysData){
        await safeWidgetCall('updateWidgetStatus', 'noVerseAvailable');
        return;
      }
      if (todaysData && todaysData.bibleReference && todaysData.verse) {
        await safeWidgetCall('updateVerseData',
          todaysData.bibleReference,
          todaysData.verse,
          todaysData.imageURL || null
        );
      } else {
        await safeWidgetCall('updateWidgetStatus', 'noVerseAvailable');
      }

      await safeWidgetCall('updateTimeline', widgetEntries);
      
    } catch (error) {
      console.error('Error updating widget timeline:', error);
    }
  },

  updateLikeStatus: (devotionalId, liked) => {
    set(state => {
      const currentUserId = auth().currentUser?.uid;
      if (!currentUserId) return state;

      const updateDevotional = (devotional: Devotional | null) => {
        if (devotional && devotional.id === devotionalId) {
          const newLikes = liked ? (devotional.likes || 0) + 1 : (devotional.likes || 0) - 1;
          const likedBy = devotional.likedBy || [];
          const newLikedBy = liked
            ? [...likedBy, currentUserId]
            : likedBy.filter(id => id !== currentUserId);

          return { ...devotional, likes: newLikes < 0 ? 0 : newLikes, likedBy: newLikedBy };
        }
        return devotional;
      };

      return {
        dailyDevotional: updateDevotional(state.dailyDevotional),
        currentDevotional: updateDevotional(state.currentDevotional),
      };
    });
  },

  incrementShareCount: (devotionalId) => {
    set(state => {
      const updateDevotional = (devotional: Devotional | null) => {
        if (devotional && devotional.id === devotionalId) {
          return { ...devotional, shares: (devotional.shares || 0) + 1 };
        }
        return devotional;
      };

      return {
        dailyDevotional: updateDevotional(state.dailyDevotional),
        currentDevotional: updateDevotional(state.currentDevotional),
      };
    });
  },

  // Utility function to clear Bible chapter cache
  clearBibleCache: async () => {
    console.log('🧹 Clearing Bible chapter cache from devotional store...');
    await clearChapterCache();
  },
}));

// Helper function to parse Bible reference like "Jeremiah 29:13", "1 John 3:16", or "Proverbs 3:5-6"
const parseBibleReference = (reference: string): { book: string; chapter: number; verse: number; endVerse?: number } | null => {
  try {
    // Handle verse ranges like "Proverbs 3:5-6"
    const rangeMatch = reference.match(/^(\d?\s*\w+(?:\s+\w+)*)\s+(\d+):(\d+)-(\d+)$/);
    if (rangeMatch) {
      const [, book, chapter, startVerse, endVerse] = rangeMatch;
      return {
        book: book.trim(),
        chapter: parseInt(chapter, 10),
        verse: parseInt(startVerse, 10),
        endVerse: parseInt(endVerse, 10)
      };
    }
    
    // Handle single verses like "1 John 3:16" or "Jeremiah 29:13"
    const singleMatch = reference.match(/^(\d?\s*\w+(?:\s+\w+)*)\s+(\d+):(\d+)$/);
    if (singleMatch) {
      const [, book, chapter, verse] = singleMatch;
      return {
        book: book.trim(),
        chapter: parseInt(chapter, 10),
        verse: parseInt(verse, 10)
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing Bible reference:', reference, error);
    return null;
  }
};

// Utility function to share current devotional with widget
export const shareCurrentDevotionalWithWidget = async () => {
  const { currentDevotional } = useDevotionalStore.getState();
  if (currentDevotional?.bibleReference && currentDevotional?.verse) {
    console.log('📱 Manually sharing current devotional with widget:', {
      bibleReference: currentDevotional.bibleReference,
      verseLength: currentDevotional.verse.length,
      imageURL: currentDevotional.imageURL
    });
    await safeWidgetCall('updateVerseData',
      currentDevotional.bibleReference,
      currentDevotional.verse,
      currentDevotional.imageURL || null
    );
  } else {
    console.log('📱 No current devotional data available for widget');
    await safeWidgetCall('updateWidgetStatus', 'noVerseAvailable');
  }
};

// Test function to check if native modules are working
const testNativeModules = () => {
  console.log('🔍 Testing NativeModules availability...');
  console.log('📱 Available NativeModules:', Object.keys(NativeModules));
  
  // Test if we can access any native module
  const testModule = NativeModules['AsyncStorage'] || NativeModules['RCTAsyncStorage'];
  if (testModule) {
    console.log('✅ Other native modules are working:', testModule);
  } else {
    console.log('❌ No native modules found at all');
  }
  
  // Test WidgetDataSharer specifically
  const { WidgetDataSharer } = NativeModules;
  console.log('📱 WidgetDataSharer test:', {
    exists: !!WidgetDataSharer,
    type: typeof WidgetDataSharer,
    methods: WidgetDataSharer ? Object.keys(WidgetDataSharer) : 'N/A'
  });
};

// Call the test function when the module loads
testNativeModules();

// Fallback function using AsyncStorage if native module is not available
const saveWidgetDataToAsyncStorage = async (bibleReference: string, verse: string, imageURL?: string) => {
  try {
    const widgetData = {
      status: 'verseAvailable',
      bibleReference,
      verse,
      imageURL,
      timestamp: new Date().toISOString()
    };
    
    await AsyncStorage.setItem('widget_daily_verse', JSON.stringify(widgetData));
    console.log('📱 Saved widget data to AsyncStorage as fallback');
  } catch (error) {
    console.error('📱 Error saving widget data to AsyncStorage:', error);
  }
};

const saveWidgetStatusToAsyncStorage = async (status: string) => {
  try {
    const widgetData = {
      status,
      timestamp: new Date().toISOString()
    };
    
    await AsyncStorage.setItem('widget_daily_verse', JSON.stringify(widgetData));
    console.log('📱 Saved widget status to AsyncStorage as fallback');
  } catch (error) {
    console.error('📱 Error saving widget status to AsyncStorage:', error);
  }
};


