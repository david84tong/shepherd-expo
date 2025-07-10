const BASE_URL = 'https://skylar.gg';
// https://www.rkeplin.com/the-holy-bible-open-source-rest-api/
// Define the actual structure returned by the new API
interface ApiVerse {
  id: number;
  book: { id: number; name: string; testament: string };
  chapterId: number;
  verseId: number;
  verse: string;
}

// Raw response is now just an array of ApiVerse
type RawApiResponseArray = ApiVerse[];

// New API response shape (object)
interface ApiChapterObject {
  book: { id: string | number; name: string };
  chapter: string | number;
  verses: { content: string; verse: number }[];
}

// Keep our desired Verse structure
export interface Verse {
  verse: number;
  text: string;
}

// Keep our desired ChapterResponse structure
export interface ChapterResponse {
  book: string;
  chapter: number;
  version: string;
  verses: Verse[];
}

// Keep FetchError interface
export interface FetchError {
  error: boolean;
  message: string;
  status?: number;
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { appLog } from '../helper/helper';

// Cache for in-memory storage (faster than AsyncStorage for frequent access)
const chapterCache = new Map<string, ChapterResponse>();
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Interface for cached data with expiry
interface CachedChapterData {
  data: ChapterResponse;
  timestamp: number;
}

/**
 * Generates a cache key for a chapter
 */
const getCacheKey = (translation: string, bookId: number, chapter: number): string => {
  return `bible_chapter_${translation}_${bookId}_${chapter}`;
};

/**
 * Checks if cached data is still valid
 */
const isCacheValid = (timestamp: number): boolean => {
  return Date.now() - timestamp < CACHE_EXPIRY;
};

/**
 * Fetches a single chapter with caching
 */
export const fetchChapterWithCache = async (
  translation: string,
  bookId: number,
  chapter: number
): Promise<ChapterResponse | FetchError> => {
  const cacheKey = getCacheKey(translation, bookId, chapter);
  
  // Check in-memory cache first
  if (chapterCache.has(cacheKey)) {
    appLog(`📚 Using in-memory cache for ${translation} ${bookId}:${chapter}`);
    return chapterCache.get(cacheKey)!;
  }
  
  // Check AsyncStorage cache
  try {
    const cachedData = await AsyncStorage.getItem(cacheKey);
    if (cachedData) {
      const parsed: CachedChapterData = JSON.parse(cachedData);
      if (isCacheValid(parsed.timestamp)) {
        appLog(`📚 Using AsyncStorage cache for ${translation} ${bookId}:${chapter}`);
        // Store in memory cache for faster future access
        chapterCache.set(cacheKey, parsed.data);
        return parsed.data;
      }
    }
  } catch (error) {
    console.warn('Failed to read from AsyncStorage cache:', error);
  }
  
  // Fetch from API
  appLog(`🌐 Fetching from API: ${translation} ${bookId}:${chapter}`);
  const result = await fetchChapter(translation, bookId, chapter);
  
  // Cache successful results
  if (!('error' in result)) {
    const cacheData: CachedChapterData = {
      data: result,
      timestamp: Date.now()
    };
    
    // Store in memory cache
    chapterCache.set(cacheKey, result);
    
    // Store in AsyncStorage cache
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to write to AsyncStorage cache:', error);
    }
  }
  
  return result;
};

/**
 * Fetches multiple chapters efficiently with batching and deduplication
 */
export const fetchChaptersBatch = async (
  translation: string,
  chapters: Array<{ bookId: number; chapter: number }>
): Promise<Map<string, ChapterResponse | FetchError>> => {
  appLog(`🚀 Batch fetching ${chapters.length} chapters for ${translation}`);
  
  const results = new Map<string, ChapterResponse | FetchError>();
  const uniqueChapters = new Map<string, { bookId: number; chapter: number }>();
  
  // Deduplicate chapters
  chapters.forEach(({ bookId, chapter }) => {
    const key = `${bookId}:${chapter}`;
    if (!uniqueChapters.has(key)) {
      uniqueChapters.set(key, { bookId, chapter });
    }
  });
  
  appLog(`📊 Deduplicated to ${uniqueChapters.size} unique chapters`);
  
  // Check cache for all chapters first
  const chaptersToFetch: Array<{ bookId: number; chapter: number; key: string }> = [];
  
  for (const [key, { bookId, chapter }] of uniqueChapters) {
    const cacheKey = getCacheKey(translation, bookId, chapter);
    
    // Check in-memory cache
    if (chapterCache.has(cacheKey)) {
      results.set(key, chapterCache.get(cacheKey)!);
      continue;
    }
    
    // Check AsyncStorage cache
    try {
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed: CachedChapterData = JSON.parse(cachedData);
        if (isCacheValid(parsed.timestamp)) {
          chapterCache.set(cacheKey, parsed.data);
          results.set(key, parsed.data);
          continue;
        }
      }
    } catch (error) {
      console.warn('Failed to read from AsyncStorage cache:', error);
    }
    
    // Need to fetch this chapter
    chaptersToFetch.push({ bookId, chapter, key });
  }
  
  appLog(`📊 ${results.size} chapters found in cache, ${chaptersToFetch.length} need fetching`);
  
  // Fetch remaining chapters in parallel
  if (chaptersToFetch.length > 0) {
    const fetchPromises = chaptersToFetch.map(async ({ bookId, chapter, key }) => {
      const result = await fetchChapter(translation, bookId, chapter);
      
      // Cache successful results
      if (!('error' in result)) {
        const cacheKey = getCacheKey(translation, bookId, chapter);
        const cacheData: CachedChapterData = {
          data: result,
          timestamp: Date.now()
        };
        
        // Store in memory cache
        chapterCache.set(cacheKey, result);
        
        // Store in AsyncStorage cache
        try {
          await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (error) {
          console.warn('Failed to write to AsyncStorage cache:', error);
        }
      }
      
      return { key, result };
    });
    
    const fetchResults = await Promise.all(fetchPromises);
    fetchResults.forEach(({ key, result }) => {
      results.set(key, result);
    });
  }
  
  appLog(`✅ Batch fetch completed. ${results.size} total results`);
  return results;
};

/**
 * Clears all cached chapter data
 */
export const clearChapterCache = async (): Promise<void> => {
  appLog('🧹 Clearing chapter cache...');
  
  // Clear in-memory cache
  chapterCache.clear();
  
  // Clear AsyncStorage cache
  try {
    const keys = await AsyncStorage.getAllKeys();
    const bibleKeys = keys.filter(key => key.startsWith('bible_chapter_'));
    if (bibleKeys.length > 0) {
      await AsyncStorage.multiRemove(bibleKeys);
      appLog(`🧹 Cleared ${bibleKeys.length} cached chapters from AsyncStorage`);
    }
  } catch (error) {
    console.error('Failed to clear AsyncStorage cache:', error);
  }
};

/**
 * Fetches a single chapter from the Bible API (rkeplin.com).
 * @param translation - The Bible translation ID (e.g., 'KJV', 'NIV')
 * @param bookId - The numeric book ID (e.g., 1 for Genesis)
 * @param chapter - The chapter number
 * @returns The chapter data or an error object
 */
export const fetchChapter = async (
  translation: string,
  bookId: number, // Changed from book name to book ID
  chapter: number
): Promise<ChapterResponse | FetchError> => {
  // Construct the URL for the new API
  const url = `${BASE_URL}/books/${bookId}/chapters/${chapter}/${translation}`;
  appLog(`🌐 Fetching: ${url}`);
  appLog(`📱 Platform: React Native, UserAgent: ${navigator?.userAgent || 'unknown'}`);

  try {
    appLog(`🔄 Starting fetch request...`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'ShepherdApp/1.0'
      },
    });
    appLog(`✅ Fetch completed. Status: ${response.status}, StatusText: ${response.statusText}`);
    appLog(`📄 Response headers:`, response.headers);

    if (!response.ok) {
      // Attempt to get error message from API response body if available
      let apiErrorMessage = `Failed to fetch chapter ${bookId}:${chapter} (${translation}). Status: ${response.status}`;
      try {
        const errorBody = await response.json();
        appLog('❌ ERROR RESPONSE BODY:', JSON.stringify(errorBody, null, 2));
        if (errorBody && errorBody.message) {
          apiErrorMessage = errorBody.message; // Use API's error message
        }
      } catch (e) {
        /* Ignore parsing error, stick to default message */
      }

      appLog(`API Error: ${response.status} ${response.statusText} for ${url}`);
      return {
        error: true,
        message: apiErrorMessage,
        status: response.status,
      };
    }

    const rawJson = await response.json();
    // appLog('📋 RAW JSON RESPONSE:');
    // appLog(JSON.stringify(rawJson, null, 2));
    // appLog('📋 END RAW JSON RESPONSE');

    let transformedVerses: Verse[] = [];
    let bookName = '';

    if (Array.isArray(rawJson)) {
      // Old/array format
      appLog('🔄 Processing as ARRAY format');
      const rawData: RawApiResponseArray = rawJson;
      if (rawData.length === 0) {
        console.warn(`API returned empty data array for ${url}`);
        return { error: true, message: 'API returned no verses for this chapter.' };
      }
      transformedVerses = rawData.map((v) => ({ verse: v.verseId, text: v.verse }));
      bookName = rawData[0].book.name;
      appLog(`✅ Array format: Found ${transformedVerses.length} verses for ${bookName}`);
    } else if (rawJson && rawJson.verses) {
      // New object format
      appLog('🔄 Processing as OBJECT format');
      const dataObj = rawJson as ApiChapterObject;
      transformedVerses = dataObj.verses.map((v) => ({ verse: v.verse, text: v.content }));
      bookName = dataObj.book.name;
      appLog(`✅ Object format: Found ${transformedVerses.length} verses for ${bookName}`);
    } else {
      appLog(`❌ Invalid data format received for ${url}:`, rawJson);
      appLog('❌ Expected either an array or an object with "verses" property');
      return { error: true, message: 'Invalid data format received from API.' };
    }

    const chapterResponse: ChapterResponse = {
      book: bookName,
      chapter,
      version: translation,
      verses: transformedVerses,
    };

    return chapterResponse;
  } catch (err) {
    appLog(`🚨 NETWORK ERROR fetching ${url}:`);
    appLog(`❌ Error type: ${typeof err}`);
    appLog(`❌ Error name: ${err instanceof Error ? err.name : 'Unknown'}`);
    appLog(`❌ Error message: ${err instanceof Error ? err.message : String(err)}`);
    appLog(`❌ Error stack: ${err instanceof Error ? err.stack : 'No stack'}`);
    
    const message = err instanceof Error ? err.message : 'An unknown error occurred.';
    return { error: true, message: `Network or JSON parsing error: ${message}` };
  }
};

/**
 * Fetches the first 10 chapters of Genesis using the new API.
 * @param translation - The Bible translation ID (e.g., 'KJV') Defaults to 'KJV'
 * @returns An array of chapter data or error objects.
 */
export const fetchFirst10GenesisChapters = async (
  translation: string = 'KJV'
): Promise<(ChapterResponse | FetchError)[]> => {
  const bookId = 1; // Genesis is book 1
  const chapterNumbers = Array.from({ length: 10 }, (_, i) => i + 1); // Chapters 1 to 10

  appLog(`Fetching chapters 1-10 of Genesis (Book ID ${bookId}) in ${translation}...`);

  const chapterPromises = chapterNumbers.map((chapter) =>
    fetchChapter(translation, bookId, chapter)
  );

  try {
    const results = await Promise.all(chapterPromises);
    appLog(`Successfully fetched ${results.filter((r) => !('error' in r)).length} chapters.`);
    results.forEach((result, index) => {
      if ('error' in result) {
        console.warn(`Error fetching chapter ${index + 1}: ${result.message}`);
      }
    });
    return results;
  } catch (error) {
    appLog('Error fetching multiple chapters:', error);
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred during batch fetch.';
    return chapterNumbers.map(() => ({ error: true, message }));
  }
};

// Default export for Expo Router compatibility
export default {}
