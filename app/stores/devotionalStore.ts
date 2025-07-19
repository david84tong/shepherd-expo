import { create } from 'zustand';
import { Devotional, devotionalBackgrounds } from '../models/Devotional';
import firestore from '@react-native-firebase/firestore';
import {
  fetchChaptersBatch,
  ChapterResponse,
  FetchError,
  fetchChapterWithCache,
  clearChapterCache,
} from '../api/bible';
import { BIBLE_BOOK_IDS } from '../models/Path';
import { createDevotionalFromVerse, checkNetworkConnectivity } from '../api/ai';
import auth from '@react-native-firebase/auth';
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathStore } from './pathStore';
import dayjs from 'dayjs';
import { appLog } from '../helper/helper';
import { Image as ExpoImage } from 'expo-image';

// Helper function to get a random devotional background
const getRandomDevotionalBackground = (excludeUrl?: string) => {
  const backgroundUrls = Object.values(devotionalBackgrounds);

  // Filter out the excluded URL if provided
  const availableBackgrounds = excludeUrl
    ? backgroundUrls.filter((url) => url !== excludeUrl)
    : backgroundUrls;

  // If all backgrounds are excluded (shouldn't happen), fall back to all backgrounds
  const backgroundsToChooseFrom =
    availableBackgrounds.length > 0 ? availableBackgrounds : backgroundUrls;

  const randomIndex = Math.floor(Math.random() * backgroundsToChooseFrom.length);
  const selectedBackground = backgroundsToChooseFrom[randomIndex];

  appLog('🖼️ [DevotionalStore] Selected random background:', {
    index: randomIndex,
    url: selectedBackground,
    totalBackgrounds: backgroundsToChooseFrom.length,
    excludedUrl: excludeUrl,
    wasExcluded: excludeUrl ? !availableBackgrounds.includes(selectedBackground) : false,
  });

  return selectedBackground;
};

// Safely get WidgetDataSharer with error handling
const getWidgetDataSharer = () => {
  try {
    appLog('📱 Attempting to access WidgetDataSharer from NativeModules...');
    appLog('📱 Available NativeModules:', Object.keys(NativeModules));

    const { WidgetDataSharer } = NativeModules;
    appLog('📱 WidgetDataSharer from destructuring:', WidgetDataSharer);

    if (!WidgetDataSharer) {
      console.warn('📱 WidgetDataSharer native module not found');
      appLog('📱 This might be because:');
      appLog('📱 1. The native module is not properly linked');
      appLog('📱 2. The app needs to be rebuilt');
      appLog('📱 3. The module is not included in the Xcode project');
      return null;
    }

    appLog('📱 WidgetDataSharer found successfully:', {
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
    console.warn(
      `📱 Cannot call ${method} - WidgetDataSharer not available, using AsyncStorage fallback`
    );

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
    console.error(`📱 Error calling ${method}`, error);

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
  isFromCheckIn: boolean; // Flag to indicate devotional is from check-in flow
  fetchingRecentDevotionals: boolean; // Flag to indicate we are fetching recent devotionals
  recentDevotionals: (Devotional | null)[]; // Store recent devotionals globally
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
  createAIDevotional: (
    verseText: string,
    reference: string,
    bookName: string,
    chapter: number,
    verse: number
  ) => Promise<void>;
  // Clear custom devotional when closing
  // Refresh widget data with current devotional
  refreshWidgetData: () => Promise<void>;
  // NEW ACTION: Update widget timeline with 5 days of data
  updateWidgetTimeline: () => Promise<void>;
  // NEW ACTION: Fetch current devotional plus 2 previous days
  fetchRecentDevotionals: () => Promise<(Devotional | null)[]>;
  clearCustomDevotional: () => void;
  setCustomDevotional: (devotional: Devotional) => void;
  setIsFromCheckIn: (value: boolean) => void;
  createCustomDevotionalFromCheckIn: (devotional: Devotional) => Promise<void>;
  updateLikeStatus: (devotionalId: string, liked: boolean) => void;
  incrementShareCount: (devotionalId: string) => void;
  // Utility function to clear Bible chapter cache
  clearBibleCache: () => Promise<void>;
  setFetchingRecentDevotionals: (value: boolean) => void;
  setRecentDevotionals: (devotionals: (Devotional | null)[]) => void;
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
  isFromCheckIn: false,
  fetchingRecentDevotionals: false,
  recentDevotionals: [],

  fetchTodaysDevotional: async () => {
    appLog('🚀 fetchTodaysDevotional function called!');
    set({ isLoading: true, error: null });

    try {
      const devotionalsRef = firestore().collection('dailyDevotionals');

      // Get today's date in user's local timezone in YYYY-MM-DD format
      const today = dayjs();
      const todayIdFormat = today.format('YYYY-MM-DD');

      appLog(
        'Looking for devotional with id property:',
        todayIdFormat,
        'Current time:',
        today.format('YYYY-MM-DD')
      );

      // Query for devotional where the 'id' field matches today's date in YYYY-MM-DD format
      const idQuerySnapshot = await devotionalsRef
        .where('date', '==', todayIdFormat)
        .limit(1)
        .get();

      let snapshot;
      if (!idQuerySnapshot.empty) {
        snapshot = idQuerySnapshot.docs[0];
        appLog(
          'Found devotional by id field:',
          snapshot.id,
          'with id property:',
          todayIdFormat
        );
      } else {
        appLog('No devotional found for today:', todayIdFormat);
        set({
          currentDevotional: null,
          dailyDevotional: null,
          isLoading: false,
          error: 'No devotional available for today',
        });
        return;
      }

      // Get the document data
      const devotionalData = snapshot.data() as Devotional;
      appLog('FETCHING devotionalData ====>', devotionalData);

      if (!devotionalData) {
        appLog('No devotional data found');
        set({
          currentDevotional: null,
          isLoading: false,
          error: 'No devotional available for today',
        });
        return;
      }

      const devotional: Devotional = {
        ...devotionalData,
        id: snapshot.id,
        // Extract 'en' values from nested objects, fallback to original if string
        prayer:
          typeof devotionalData.prayer === 'object' && devotionalData.prayer?.en
            ? devotionalData.prayer.en
            : devotionalData.prayer || '',
        reflectionPrompt:
          typeof (devotionalData as any).reflection === 'object' &&
          (devotionalData as any).reflection?.en
            ? (devotionalData as any).reflection.en
            : devotionalData.reflectionPrompt || '',
        // Keep the original id field from the document data
      };

      appLog('Fetched devotional:', devotional.id);
      appLog('Devotional from Firestore:', {
        hasVerse: !!devotionalData.verse,
        versePreview: devotionalData.verse?.substring(0, 100),
        bibleReference: devotionalData.bibleReference,
        prayer: devotionalData.prayer,
        reflectionPrompt: devotionalData.reflectionPrompt,
        reflection: (devotionalData as any).reflection,
      });

      // Determine the Bible reference to use for fetching
      const referenceToUse = devotionalData.bibleReference || devotionalData.verse;
      appLog('📍 Reference to use for fetching:', referenceToUse);

      // Check if we need to fetch the verse (if verse field contains a reference instead of actual text)
      const needsVerseFetch =
        referenceToUse &&
        (!devotionalData.bibleReference || // bibleReference is missing
          (devotionalData.verse && devotionalData.verse.includes(':'))); // verse looks like a reference

      if (needsVerseFetch) {
        appLog('🔄 Need to fetch verse from API');
        // Fetch the actual Bible verse if we have a reference
        try {
          const parsed = parseBibleReference(referenceToUse);
          if (parsed) {
            // Get book ID from book name
            const bookId = BIBLE_BOOK_IDS[parsed.book];
            if (bookId) {
              appLog(`🔄 Fetching verse: ${referenceToUse} (Book ID: ${bookId})`);

              // Fetch the chapter using user's saved translation from pathStore
              const userTranslation = usePathStore.getState().savedTranslation || 'ESV';
              const chapterData = await fetchChapterWithCache(
                userTranslation,
                bookId,
                parsed.chapter
              );

              if ('verses' in chapterData) {
                if (parsed.endVerse) {
                  // Handle verse range (e.g., "Proverbs 3:5-6")
                  const verses = [];
                  for (let verseNum = parsed.verse; verseNum <= parsed.endVerse; verseNum++) {
                    const verseData = chapterData.verses.find((v) => v.verse === verseNum);
                    if (verseData) {
                      verses.push(verseData.text);
                    }
                  }

                  if (verses.length > 0) {
                    devotional.verse = verses.join(' ');
                    devotional.bibleReference = referenceToUse; // Set the reference properly
                    appLog(
                      `✅ Found verse range (${parsed.verse}-${parsed.endVerse}): ${devotional.verse.substring(0, 100)}...`
                    );
                    appLog(`✅ Combined ${verses.length} verses`);
                    appLog(`✅ Devotional verse field set`, devotional.verse);
                    appLog(`✅ Bible reference set`, devotional.bibleReference);
                  } else {
                    appLog(
                      `⚠️ No verses found in range ${parsed.verse}-${parsed.endVerse} for chapter ${parsed.chapter}`
                    );
                  }
                } else {
                  // Handle single verse
                  const verseData = chapterData.verses.find((v) => v.verse === parsed.verse);
                  if (verseData) {
                    devotional.verse = verseData.text;
                    devotional.bibleReference = referenceToUse; // Set the reference properly
                    appLog(`✅ Found verse: ${verseData.text.substring(0, 50)}...`);
                    appLog(`✅ Full verse text`, verseData.text);
                    appLog(`✅ Devotional verse field set`, devotional.verse);
                    appLog(`✅ Bible reference set`, devotional.bibleReference);
                  } else {
                    appLog(`⚠️ Verse ${parsed.verse} not found in chapter ${parsed.chapter}`);
                    appLog(
                      `⚠️ Available verses:`,
                      chapterData.verses.map((v) => v.verse)
                    );
                  }
                }
              } else {
                appLog('❌ Error fetching chapter:', chapterData);
              }
            } else {
              appLog(`❌ Book not found in BIBLE_BOOK_IDS: ${parsed.book}`);
            }
          }
        } catch (error) {
          console.error('Error fetching Bible verse:', error);
          // Continue without the verse - don't fail the whole devotional fetch
        }
      } else {
        appLog('✅ No need to fetch verse from API');
        // If bibleReference is missing but we have a verse that looks like content, set it
        if (!devotional.bibleReference && referenceToUse && !referenceToUse.includes(':')) {
          devotional.bibleReference = referenceToUse;
        }
      }

      appLog('📚 Final devotional object before setting:', {
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
        error: null,
      });

      // The widget timeline is now updated by a separate function
      // that is called after this one completes.
      await get().updateWidgetTimeline();
    } catch (error) {
      console.error('Error fetching devotional:', error);
      await safeWidgetCall('updateWidgetStatus', 'noVerseAvailable');
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch devotional',
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
    // Get current user
    const currentUser = auth().currentUser;

    // Get the daily devotional's image URL to exclude it
    const { dailyDevotional } = get();
    const excludeImageUrl = dailyDevotional?.imageURL;

    const selectedImageURL = getRandomDevotionalBackground(excludeImageUrl);
    appLog('🎨 [DevotionalStore] Creating quick devotional with image:', selectedImageURL);

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
      date: dayjs().format('YYYY-MM-DD'),
      imageURL: selectedImageURL,
      verse: verseText,
    };

    appLog('[DevotionalStore] Created quick devotional from verse:', {
      id: quickDevotional.id,
      imageURL: quickDevotional.imageURL,
      verse: quickDevotional.verse?.substring(0, 50) + '...',
    });
    set({ customDevotional: quickDevotional, currentDevotional: quickDevotional });
    
    // Preload the quick devotional's background image
    if (quickDevotional?.imageURL) {
      ExpoImage.prefetch(quickDevotional.imageURL)
        .then(() => {
          appLog('✅ [DevotionalStore] Successfully preloaded quick devotional image:', quickDevotional.imageURL);
        })
        .catch((error) => {
          appLog('⚠️ [DevotionalStore] Failed to preload quick devotional image:', error);
        });
    }

    // Share the quick devotional with the widget
    if (reference && verseText) {
      appLog('📱 Sharing quick devotional with widget:', {
        bibleReference: reference,
        verseLength: verseText.length,
      });
      await safeWidgetCall(
        'updateVerseData',
        reference,
        verseText,
        null // No image for quick devotionals
      );
    }
  },

  // NEW ACTION: Create AI-powered devotional from verse
  createAIDevotional: async (
    verseText: string,
    reference: string,
    bookName: string,
    chapter: number,
    verse: number
  ) => {
    appLog('[DevotionalStore] Creating AI devotional for:', reference);
    set({ isCreatingDevotional: true, error: null });

    try {
      // Get current user
      const currentUser = auth().currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get ID token for AI service
      const idToken = await currentUser.getIdToken();
      if (!idToken) {
        throw new Error('Failed to get authentication token');
      }

      // Create context for AI
      const verseContext = {
        bookName: bookName,
        chapter: chapter,
        verse: verse,
        verseText: verseText,
      };

      appLog('[DevotionalStore] Calling AI service with context:', verseContext);

      // Call AI service to create devotional
      const aiResponse = await createDevotionalFromVerse(verseContext, idToken);
      
      // If the AI service returns a fallback, we still have a valid devotional
      if (!aiResponse) {
        throw new Error('Failed to generate devotional content');
      }

      // Get random background image, excluding the daily devotional's image
      const { dailyDevotional } = get();
      const excludeImageUrl = dailyDevotional?.imageURL;

      const selectedImageURL = getRandomDevotionalBackground(excludeImageUrl);
      appLog('🎨 [DevotionalStore] Creating AI devotional with image:', selectedImageURL);

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
        date: dayjs().format('YYYY-MM-DD'), // Store as YYYY-MM-DD format for consistency using local timezone
        imageURL: selectedImageURL,
        verse: verseText,
      };

      // Save to Firestore customDevotionals collection with userId as additional field
      try {
        await firestore().collection('customDevotionals').doc(aiDevotional.id).set({
          ...aiDevotional,
          userId: currentUser.uid, // Add userId as additional field for Firestore
        } as any);
        appLog('[DevotionalStore] Saved custom devotional to Firestore:', aiDevotional.id);

        // Also track in user document
        // Import is done at the top of the file to avoid circular dependency issues
        // const { useUserStore } = require('./userStore');
        // await useUserStore
        //   .getState()
        //   .addCustomDevotional(aiDevotional.id, firestore.Timestamp.now());
        appLog('[DevotionalStore] Added custom devotional reference to user document');
      } catch (Error) {
        console.error('[DevotionalStore] Failed to save custom devotional to Firestore:', Error);
      }

      appLog('[DevotionalStore] AI devotional created successfully:', aiDevotional);
      set({
        currentDevotional: aiDevotional,
        customDevotional: aiDevotional,
        isCreatingDevotional: false,
        error: null,
      });
      
      // Preload the AI devotional's background image
      if (aiDevotional?.imageURL) {
        ExpoImage.prefetch(aiDevotional.imageURL)
          .then(() => {
            appLog('✅ [DevotionalStore] Successfully preloaded AI devotional image:', aiDevotional.imageURL);
          })
          .catch((error) => {
            appLog('⚠️ [DevotionalStore] Failed to preload AI devotional image:', error);
          });
      }

      // Share the AI devotional with the widget
      if (reference && verseText) {
        appLog('📱 Sharing AI devotional with widget:', {
          bibleReference: reference,
          verseLength: verseText.length,
        });
        await safeWidgetCall(
          'updateVerseData',
          reference,
          verseText,
          null // No image for AI devotionals
        );
      }

      // Trigger a refresh of recent devotionals to update the UI immediately
      // This will help the HomeScreen component show the new devotional
      setTimeout(() => {
        const fetchRecentDevotionals = get().fetchRecentDevotionals;
        if (fetchRecentDevotionals) {
          appLog('[DevotionalStore] Triggering refresh of recent devotionals after creating new AI devotional');
          fetchRecentDevotionals().catch(error => {
            console.error('[DevotionalStore] Error refreshing recent devotionals:', error);
          });
        }
      }, 1000); // Small delay to ensure Firestore write is complete
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
          errorMessage =
            'Network connection issue. Please check your internet connection and try again.';
        }
      } else if (error instanceof Error) {
        if (error.message.includes('HTTP 401')) {
          errorMessage = 'Authentication failed. Please sign in again.';
        } else if (error.message.includes('HTTP 429')) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (error.message.includes('HTTP 500')) {
          errorMessage = 'Our AI service is temporarily unavailable. Please try again in a few moments.';
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
        error: errorMessage,
      });

      // Log the error for debugging
      console.error('[DevotionalStore] Detailed error info:', {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  },

  clearCustomDevotional: async () => {
    appLog('[DevotionalStore] Clearing custom devotional');
    set({
      customDevotional: null,
      isCreatingDevotional: false,
      error: null,
      isFromCheckIn: false,
    });

    // Instead of clearing widget data, restore the daily devotional data
    const { dailyDevotional } = get();
    if (dailyDevotional?.bibleReference && dailyDevotional?.verse) {
      appLog('📱 Restoring daily devotional to widget after clearing custom devotional:', {
        bibleReference: dailyDevotional.bibleReference,
        verseLength: dailyDevotional.verse.length,
        imageURL: dailyDevotional.imageURL,
      });
      await safeWidgetCall(
        'updateVerseData',
        dailyDevotional.bibleReference,
        dailyDevotional.verse,
        dailyDevotional.imageURL || null
      );
    } else {
      appLog('📱 No daily devotional available, setting widget to noVerseAvailable');
      await safeWidgetCall('updateWidgetStatus', 'noVerseAvailable');
    }
  },

  setCustomDevotional: (devotional: Devotional) => {
    appLog('[DevotionalStore] Setting custom devotional:', devotional);
    set({
      customDevotional: devotional,
      currentDevotional: devotional,
    });
    
    // Preload the custom devotional's background image
    if (devotional?.imageURL) {
      ExpoImage.prefetch(devotional.imageURL)
        .then(() => {
          appLog('✅ [DevotionalStore] Successfully preloaded custom devotional image:', devotional.imageURL);
        })
        .catch((error) => {
          appLog('⚠️ [DevotionalStore] Failed to preload custom devotional image:', error);
        });
    }
  },

  setIsFromCheckIn: (value: boolean) => {
    appLog('[DevotionalStore] Setting isFromCheckIn:', value);
    set({ isFromCheckIn: value });
  },

  createCustomDevotionalFromCheckIn: async (devotional: Devotional) => {
    appLog('[DevotionalStore] Creating custom devotional from check-in:', devotional);

    try {
      // Get current user
      const currentUser = auth().currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Generate unique ID for the custom devotional
      const customDevotionalId = `custom-${Date.now()}`;
      // Ensure we use the user's local timezone for the date
      const today = dayjs().format('YYYY-MM-DD');
      
      const devotionalWithId = {
        ...devotional,
        id: customDevotionalId,
        createdAt: new Date().toISOString(),
        date: devotional.date || today, // Use dayjs to get local date
        userId: currentUser.uid,
      };

      // Save to Firestore customDevotionals collection
      await firestore()
        .collection('customDevotionals')
        .doc(customDevotionalId)
        .set(devotionalWithId);

      appLog('[DevotionalStore] Saved custom devotional to Firestore:', customDevotionalId);

      // Update the store with the new devotional
      set({
        customDevotional: devotionalWithId,
        currentDevotional: devotionalWithId,
        isFromCheckIn: true,
      });
      
      // Preload the check-in devotional's background image
      if (devotionalWithId?.imageURL) {
        ExpoImage.prefetch(devotionalWithId.imageURL)
          .then(() => {
            appLog('✅ [DevotionalStore] Successfully preloaded check-in devotional image:', devotionalWithId.imageURL);
          })
          .catch((error) => {
            appLog('⚠️ [DevotionalStore] Failed to preload check-in devotional image:', error);
          });
      }

      // Also track in user document
      try {
        await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .update({
            customDevotionals: firestore.FieldValue.arrayUnion({
              devotionalId: customDevotionalId,
              createdAt: firestore.Timestamp.now(),
            }),
          });
        appLog('[DevotionalStore] Added custom devotional reference to user document');
      } catch (error) {
        console.error('[DevotionalStore] Failed to update user document:', error);
      }

      // Update widget with the custom devotional
      if (devotionalWithId.bibleReference && devotionalWithId.verse) {
        appLog('📱 Sharing custom check-in devotional with widget:', {
          bibleReference: devotionalWithId.bibleReference,
          verseLength: devotionalWithId.verse.length,
        });
        await safeWidgetCall(
          'updateVerseData',
          devotionalWithId.bibleReference,
          devotionalWithId.verse,
          devotionalWithId.imageURL || null
        );
      }

      // Trigger a refresh of recent devotionals to update the UI immediately
      // This will help the HomeScreen component show the new devotional
      // Immediate refresh
      const fetchRecentDevotionals = get().fetchRecentDevotionals;
      if (fetchRecentDevotionals) {
        appLog('[DevotionalStore] Triggering immediate refresh of recent devotionals');
        fetchRecentDevotionals().catch(error => {
          console.error('[DevotionalStore] Error in immediate refresh of recent devotionals:', error);
        });
      }

      // Also trigger a delayed refresh to ensure Firestore write is complete
      setTimeout(() => {
        const fetchRecentDevotionals = get().fetchRecentDevotionals;
        if (fetchRecentDevotionals) {
          fetchRecentDevotionals().catch(error => {
            console.error('[DevotionalStore] Error in delayed refresh of recent devotionals:', error);
          });
        }
      }, 2000); // Increased delay to ensure Firestore write is complete

    } catch (error) {
      console.error('[DevotionalStore] Error creating custom devotional from check-in:', error);
      throw error;
    }
  },

  // Refresh widget data with current devotional
  refreshWidgetData: async () => {
    const { currentDevotional } = get();
    if (currentDevotional?.bibleReference && currentDevotional?.verse) {
      appLog('📱 Refreshing widget data with current devotional:', {
        bibleReference: currentDevotional.bibleReference,
        verseLength: currentDevotional.verse.length,
        imageURL: currentDevotional.imageURL,
      });
      await safeWidgetCall(
        'updateVerseData',
        currentDevotional.bibleReference,
        currentDevotional.verse,
        currentDevotional.imageURL || null
      );
    } else {
      appLog('📱 No current devotional data available for widget refresh');
      await safeWidgetCall('updateWidgetStatus', 'noVerseAvailable');
    }
  },
  setFetchingRecentDevotionals: (value: boolean) => {
    set({ fetchingRecentDevotionals: value });
  },
  setRecentDevotionals: (devotionals: (Devotional | null)[]) => {
    set({ recentDevotionals: devotionals });
  },

  // NEW ACTION: Fetch current devotional plus 2 previous days
  fetchRecentDevotionals: async () => {
    appLog('🚀 Fetching current devotional plus 2 previous days...');
    try {
      useDevotionalStore.getState().setFetchingRecentDevotionals(true);
    
      const today = dayjs().startOf('day');

      // Get current user ID
      const currentUserId = auth().currentUser?.uid;
      if (!currentUserId) {
        appLog('❌ No authenticated user found');
        return [];
      }

      // Query ONLY for today's devotionals
      const todayDate = dayjs(today).startOf('day').format('YYYY-MM-DD');


      // Query both daily and custom devotionals
      let dailyQuerySnap;
      let customQuerySnap;
      try {
        // TEMPORARY: Fetch ALL custom devotionals for debugging (not just today's)
        const [dailyQuerySnapResult, customQuerySnapResult] = await Promise.all([
          // Daily devotionals for TODAY only (no userId filter)
          firestore().collection('dailyDevotionals').where('date', '==', todayDate).get(),
          // TEMPORARY: Custom devotionals for ALL dates (user-specific) - for debugging
          firestore()
            .collection('customDevotionals')
            .where('userId', '==', currentUserId)
            .orderBy('createdAt', 'desc')
            .get(),
        ]);

        dailyQuerySnap = dailyQuerySnapResult;
        customQuerySnap = customQuerySnapResult;
      } catch (error) {
        // If the query fails due to missing index, fall back to simpler query
        appLog('⚠️ Composite index not available, using fallback query');

        // Fetch daily devotionals for TODAY only
        dailyQuerySnap = await firestore()
          .collection('dailyDevotionals')
          .where('date', '==', todayDate)
          .get();

        // Fetch all custom devotionals for the user and filter in memory
        const allCustomDevotionals = await firestore()
          .collection('customDevotionals')
          .where('userId', '==', currentUserId)
          .get();


        // Filter by TODAY's date in memory using the date field
        const filteredCustomDocs = allCustomDevotionals.docs.filter((doc) => {
          const devotionalData = doc.data();
          const devotionalDate = devotionalData.date || devotionalData.createdAt;
          
          // Handle both YYYY-MM-DD format and ISO string format
          let dateToCompare;
          if (typeof devotionalDate === 'string') {
            if (devotionalDate.includes('T')) {
              // ISO string format, extract YYYY-MM-DD
              dateToCompare = devotionalDate.split('T')[0];
            } else {
              // Already in YYYY-MM-DD format
              dateToCompare = devotionalDate;
            }
          } else {
            // Handle Firestore Timestamp
            dateToCompare = dayjs(devotionalDate.toDate()).format('YYYY-MM-DD');
          }
          
          const matches = dateToCompare === todayDate;          
          return matches;
        });

        // Sort by createdAt in memory (most recent first)
        filteredCustomDocs.sort((a, b) => {
          const dateA = new Date(a.data().createdAt).getTime();
          const dateB = new Date(b.data().createdAt).getTime();
          return dateB - dateA;
        });

        customQuerySnap = {
          docs: filteredCustomDocs,
          empty: filteredCustomDocs.length === 0,
          size: filteredCustomDocs.length,
        };
      }

      appLog(
        `🔍 Found ${dailyQuerySnap.docs.length} daily devotionals and ${customQuerySnap.docs.length} custom devotionals in range`
      );

      // Combine both types of devotionals
      const allDevotionals = [
        ...dailyQuerySnap.docs.map(
          (doc) =>
            ({
              ...doc.data(),
              id: doc.id,
              type: 'daily',
              likedBy: doc.data().likedBy || [], // Ensure likedBy field is included
            }) as Devotional & { type: string }
        ),
        ...customQuerySnap.docs.map(
          (doc) =>
            ({
              ...doc.data(),
              id: doc.id,
              type: 'custom',
              date: doc.data().date || doc.data().createdAt, // Use date field if available, fallback to createdAt
              likedBy: doc.data().likedBy || [], // Ensure likedBy field is included
            }) as Devotional & { type: string }
        ),
      ];

      // Sort all devotionals by date (most recent first)
      allDevotionals.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt).getTime();
        const dateB = new Date(b.date || b.createdAt).getTime();
        return dateB - dateA;
      });


      // Use all devotionals for today (no need to slice)
      const recentDevotionals = allDevotionals;
      // Use whatever devotionals we have for today
      const rawDevotionals = recentDevotionals;

      // OPTIMIZED: Collect all unique chapter references for batch fetching
      const chaptersToFetch: Array<{ bookId: number; chapter: number }> = [];

      rawDevotionals.forEach((devotional) => {
        if (!devotional) return;

        const reference = devotional.bibleReference || devotional.verse;
        if (reference && reference.includes(':')) {
          try {
            const parsed = parseBibleReference(reference);
            if (parsed) {
              const bookId = BIBLE_BOOK_IDS[parsed.book];
              if (bookId) {
                chaptersToFetch.push({ bookId, chapter: parsed.chapter });
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
        appLog(`📚 Batch fetching ${chaptersToFetch.length} chapters for recent devotionals`);
        chapterResults = await fetchChaptersBatch(get().bibleVersion, chaptersToFetch);
      }

      // Process devotionals using batch-fetched data
      const processedDevotionals = await Promise.all(
        rawDevotionals.map(async (devotional) => {
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
                    const verseData = chapterData.verses.find((v) => v.verse === parsed.verse);
                    if (verseData) {
                      verseText = verseData.text;
                      appLog(
                        `✅ Found verse text for ${reference}: ${verseText.substring(0, 50)}...`
                      );
                    }
                  } else if (chapterData && 'error' in chapterData) {
                    console.error(
                      `❌ Failed to fetch chapter for ${reference}:`,
                      chapterData.message
                    );
                  }
                }
              }
            } catch (e) {
              console.error(`Failed to process verse text for ${reference}`, e);
            }
          }
          return { 
            ...devotional, 
            verse: verseText, 
            bibleReference: reference,
            likedBy: devotional.likedBy || [], // Ensure likedBy is always an array
          };
        })
      );

      appLog(`📚 Processed ${processedDevotionals.filter(Boolean).length} recent devotionals`);
      appLog(
        '🔍 Final processed devotionals:',
        processedDevotionals.map((d, i) => ({
          index: i,
          isNull: d === null,
          id: d?.id,
          date: d?.date,
          bibleReference: d?.bibleReference,
          likedBy: d?.likedBy,
          likes: d?.likes,
        }))
      );
      
      // Update global state with recent devotionals
      set({ recentDevotionals: processedDevotionals });
      
      return processedDevotionals;
    } catch (error) {
      console.error('Error fetching recent devotionals:', error);
      return [];
    } finally {
      useDevotionalStore.getState().setFetchingRecentDevotionals(false);
    }
  },

  // NEW ACTION: Update widget timeline with 5 days of data
  updateWidgetTimeline: async () => {
    appLog('🚀 Updating widget timeline with 5 days of data...');

    try {
      const today = dayjs().startOf('day');

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
        const found = querySnap.docs.find((doc) => doc.data().date === dateToFind);
        return found ? (found.data() as Devotional) : null;
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
        appLog(`📚 Batch fetching ${chaptersToFetch.length} chapters for widget timeline`);
        chapterResults = await fetchChaptersBatch(get().bibleVersion, chaptersToFetch);
      }

      // Process devotionals using batch-fetched data
      const processedDevotionals = await Promise.all(
        rawDevotionals.map(async (devotional) => {
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
                    const verseData = chapterData.verses.find((v) => v.verse === parsed.verse);
                    if (verseData) {
                      verseText = verseData.text;
                      appLog(
                        `✅ Found verse text for ${reference}: ${verseText.substring(0, 50)}...`
                      );
                    }
                  } else if (chapterData && 'error' in chapterData) {
                    console.error(
                      `❌ Failed to fetch chapter for ${reference}:`,
                      chapterData.message
                    );
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
        const date = new Date(today.toDate());
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
          status: 'noVerseAvailable',
        };
      });

      appLog(`📱 Prepared ${widgetEntries.length} entries for widget timeline.`);

      // Update both the single verse data for today AND the 5-day timeline
      const todaysData = processedDevotionals?.[0];
      appLog('todaysData ==>', todaysData);

      if (!todaysData) {
        await safeWidgetCall('updateWidgetStatus', 'noVerseAvailable');
        return;
      }
      if (todaysData && todaysData.bibleReference && todaysData.verse) {
        await safeWidgetCall(
          'updateVerseData',
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
    set((state) => {
      const currentUserId = auth().currentUser?.uid;
      if (!currentUserId) return state;

      const updateDevotional = (devotional: Devotional | null) => {
        if (devotional && devotional.id === devotionalId) {
          const newLikes = liked ? (devotional.likes || 0) + 1 : (devotional.likes || 0) - 1;
          const likedBy = devotional.likedBy || [];
          const newLikedBy = liked
            ? [...likedBy, currentUserId]
            : likedBy.filter((id) => id !== currentUserId);

          return { ...devotional, likes: newLikes < 0 ? 0 : newLikes, likedBy: newLikedBy };
        }
        return devotional;
      };

      const updatedState = {
        dailyDevotional: updateDevotional(state.dailyDevotional),
        currentDevotional: updateDevotional(state.currentDevotional),
        customDevotional: updateDevotional(state.customDevotional),
      };
      return updatedState;
    });
  },

  incrementShareCount: (devotionalId) => {
    set((state) => {
      const updateDevotional = (devotional: Devotional | null) => {
        if (devotional && devotional.id === devotionalId) {
          return { ...devotional, shares: (devotional.shares || 0) + 1 };
        }
        return devotional;
      };

      return {
        dailyDevotional: updateDevotional(state.dailyDevotional),
        currentDevotional: updateDevotional(state.currentDevotional),
        customDevotional: updateDevotional(state.customDevotional),
      };
    });
  },

  // Utility function to clear Bible chapter cache
  clearBibleCache: async () => {
    appLog('🧹 Clearing Bible chapter cache from devotional store...');
    await clearChapterCache();
  },
}));

// Helper function to parse Bible reference like "Jeremiah 29:13", "1 John 3:16", or "Proverbs 3:5-6"
const parseBibleReference = (
  reference: string
): { book: string; chapter: number; verse: number; endVerse?: number } | null => {
  try {
    // Handle verse ranges like "Proverbs 3:5-6"
    const rangeMatch = reference.match(/^(\d?\s*\w+(?:\s+\w+)*)\s+(\d+):(\d+)-(\d+)$/);
    if (rangeMatch) {
      const [, book, chapter, startVerse, endVerse] = rangeMatch;
      return {
        book: book.trim(),
        chapter: parseInt(chapter, 10),
        verse: parseInt(startVerse, 10),
        endVerse: parseInt(endVerse, 10),
      };
    }

    // Handle single verses like "1 John 3:16" or "Jeremiah 29:13"
    const singleMatch = reference.match(/^(\d?\s*\w+(?:\s+\w+)*)\s+(\d+):(\d+)$/);
    if (singleMatch) {
      const [, book, chapter, verse] = singleMatch;
      return {
        book: book.trim(),
        chapter: parseInt(chapter, 10),
        verse: parseInt(verse, 10),
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
    appLog('📱 Manually sharing current devotional with widget:', {
      bibleReference: currentDevotional.bibleReference,
      verseLength: currentDevotional.verse.length,
      imageURL: currentDevotional.imageURL,
    });
    await safeWidgetCall(
      'updateVerseData',
      currentDevotional.bibleReference,
      currentDevotional.verse,
      currentDevotional.imageURL || null
    );
  } else {
    appLog('📱 No current devotional data available for widget');
    await safeWidgetCall('updateWidgetStatus', 'noVerseAvailable');
  }
};

// Test function to check if native modules are working
const testNativeModules = () => {
  appLog('🔍 Testing NativeModules availability...');
  appLog('📱 Available NativeModules:', Object.keys(NativeModules));

  // Test if we can access any native module
  const testModule = NativeModules['AsyncStorage'] || NativeModules['RCTAsyncStorage'];
  if (testModule) {
    appLog('✅ Other native modules are working:', testModule);
  } else {
    appLog('❌ No native modules found at all');
  }

  // Test WidgetDataSharer specifically
  const { WidgetDataSharer } = NativeModules;
  appLog('📱 WidgetDataSharer test:', {
    exists: !!WidgetDataSharer,
    type: typeof WidgetDataSharer,
    methods: WidgetDataSharer ? Object.keys(WidgetDataSharer) : 'N/A',
  });
};

// Call the test function when the module loads
testNativeModules();

// Fallback function using AsyncStorage if native module is not available
const saveWidgetDataToAsyncStorage = async (
  bibleReference: string,
  verse: string,
  imageURL?: string
) => {
  try {
    const widgetData = {
      status: 'verseAvailable',
      bibleReference,
      verse,
      imageURL,
      timestamp: new Date().toISOString(),
    };

    await AsyncStorage.setItem('widget_daily_verse', JSON.stringify(widgetData));
    appLog('📱 Saved widget data to AsyncStorage as fallback');
  } catch (error) {
    console.error('📱 Error saving widget data to AsyncStorage:', error);
  }
};

const saveWidgetStatusToAsyncStorage = async (status: string) => {
  try {
    const widgetData = {
      status,
      timestamp: new Date().toISOString(),
    };

    await AsyncStorage.setItem('widget_daily_verse', JSON.stringify(widgetData));
    appLog('📱 Saved widget status to AsyncStorage as fallback');
  } catch (error) {
    console.error('📱 Error saving widget status to AsyncStorage:', error);
  }
};

// Default export for Expo Router compatibility
export default {};
