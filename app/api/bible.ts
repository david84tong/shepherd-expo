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
  console.log(`🌐 Fetching: ${url}`);
  console.log(`📱 Platform: React Native, UserAgent: ${navigator?.userAgent || 'unknown'}`);

  try {
    console.log(`🔄 Starting fetch request...`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'ShepherdApp/1.0'
      },
    });
    console.log(`✅ Fetch completed. Status: ${response.status}, StatusText: ${response.statusText}`);
    console.log(`📄 Response headers:`, response.headers);

    if (!response.ok) {
      // Attempt to get error message from API response body if available
      let apiErrorMessage = `Failed to fetch chapter ${bookId}:${chapter} (${translation}). Status: ${response.status}`;
      try {
        const errorBody = await response.json();
        console.log('❌ ERROR RESPONSE BODY:', JSON.stringify(errorBody, null, 2));
        if (errorBody && errorBody.message) {
          apiErrorMessage = errorBody.message; // Use API's error message
        }
      } catch (e) {
        /* Ignore parsing error, stick to default message */
      }

      console.log(`API Error: ${response.status} ${response.statusText} for ${url}`);
      return {
        error: true,
        message: apiErrorMessage,
        status: response.status,
      };
    }

    const rawJson = await response.json();
    console.log('📋 RAW JSON RESPONSE:');
    console.log(JSON.stringify(rawJson, null, 2));
    console.log('📋 END RAW JSON RESPONSE');

    let transformedVerses: Verse[] = [];
    let bookName = '';

    if (Array.isArray(rawJson)) {
      // Old/array format
      console.log('🔄 Processing as ARRAY format');
      const rawData: RawApiResponseArray = rawJson;
      if (rawData.length === 0) {
        console.warn(`API returned empty data array for ${url}`);
        return { error: true, message: 'API returned no verses for this chapter.' };
      }
      transformedVerses = rawData.map((v) => ({ verse: v.verseId, text: v.verse }));
      bookName = rawData[0].book.name;
      console.log(`✅ Array format: Found ${transformedVerses.length} verses for ${bookName}`);
    } else if (rawJson && rawJson.verses) {
      // New object format
      console.log('🔄 Processing as OBJECT format');
      const dataObj = rawJson as ApiChapterObject;
      transformedVerses = dataObj.verses.map((v) => ({ verse: v.verse, text: v.content }));
      bookName = dataObj.book.name;
      console.log(`✅ Object format: Found ${transformedVerses.length} verses for ${bookName}`);
    } else {
      console.log(`❌ Invalid data format received for ${url}:`, rawJson);
      console.log('❌ Expected either an array or an object with "verses" property');
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
    console.log(`🚨 NETWORK ERROR fetching ${url}:`);
    console.log(`❌ Error type: ${typeof err}`);
    console.log(`❌ Error name: ${err instanceof Error ? err.name : 'Unknown'}`);
    console.log(`❌ Error message: ${err instanceof Error ? err.message : String(err)}`);
    console.log(`❌ Error stack: ${err instanceof Error ? err.stack : 'No stack'}`);
    
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

  console.log(`Fetching chapters 1-10 of Genesis (Book ID ${bookId}) in ${translation}...`);

  const chapterPromises = chapterNumbers.map((chapter) =>
    fetchChapter(translation, bookId, chapter)
  );

  try {
    const results = await Promise.all(chapterPromises);
    console.log(`Successfully fetched ${results.filter((r) => !('error' in r)).length} chapters.`);
    results.forEach((result, index) => {
      if ('error' in result) {
        console.warn(`Error fetching chapter ${index + 1}: ${result.message}`);
      }
    });
    return results;
  } catch (error) {
    console.log('Error fetching multiple chapters:', error);
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred during batch fetch.';
    return chapterNumbers.map(() => ({ error: true, message }));
  }
};
