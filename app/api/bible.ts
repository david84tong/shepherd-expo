const BASE_URL = 'https://bible-go-api.rkeplin.com/v1';

// Define the actual structure returned by the new API
interface ApiVerse {
  id: number;
  book: { id: number; name: string; testament: string };
  chapterId: number;
  verseId: number;
  verse: string;
}

// Raw response is now just an array of ApiVerse
type RawApiResponse = ApiVerse[];

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
  const url = `${BASE_URL}/books/${bookId}/chapters/${chapter}?translation=${translation}`;
  console.log(`Fetching: ${url}`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      // Attempt to get error message from API response body if available
      let apiErrorMessage = `Failed to fetch chapter ${bookId}:${chapter} (${translation}). Status: ${response.status}`;
      try {
        const errorBody = await response.json();
        if (errorBody && errorBody.message) {
          apiErrorMessage = errorBody.message; // Use API's error message
        }
      } catch (e) {
        /* Ignore parsing error, stick to default message */
      }

      console.error(`API Error: ${response.status} ${response.statusText} for ${url}`);
      return {
        error: true,
        message: apiErrorMessage,
        status: response.status,
      };
    }

    // Parse the raw response (which is ApiVerse[])
    const rawData: RawApiResponse = await response.json();

    // Validate the raw data structure
    if (!Array.isArray(rawData)) {
      console.error(`Invalid data format received for ${url}: Expected array, got:`, rawData);
      return { error: true, message: 'Invalid data format received from API (expected array).' };
    }

    if (rawData.length === 0) {
      console.warn(`API returned empty data array for ${url}`);
      return { error: true, message: 'API returned no verses for this chapter.' };
    }

    // Transform the raw API data into our desired ChapterResponse structure
    const transformedVerses: Verse[] = rawData.map((apiVerse) => ({
      verse: apiVerse.verseId, // Use verseId from new API
      text: apiVerse.verse, // Use verse from new API
    }));

    // Get book name from the first verse
    const bookName = rawData[0].book.name;

    const chapterResponse: ChapterResponse = {
      book: bookName,
      chapter, // Use the requested chapter number
      version: translation, // Use the requested translation
      verses: transformedVerses,
    };

    return chapterResponse;
  } catch (err) {
    console.error(`Network or parsing error fetching ${url}:`, err);
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
    console.error('Error fetching multiple chapters:', error);
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred during batch fetch.';
    return chapterNumbers.map(() => ({ error: true, message }));
  }
};
