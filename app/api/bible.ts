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

      console.log(`API Error: ${response.status} ${response.statusText} for ${url}`);
      return {
        error: true,
        message: apiErrorMessage,
        status: response.status,
      };
    }

    const rawJson = await response.json();

    let transformedVerses: Verse[] = [];
    let bookName = '';

    if (Array.isArray(rawJson)) {
      // Old/array format
      const rawData: RawApiResponseArray = rawJson;
      if (rawData.length === 0) {
        console.warn(`API returned empty data array for ${url}`);
        return { error: true, message: 'API returned no verses for this chapter.' };
      }
      transformedVerses = rawData.map((v) => ({ verse: v.verseId, text: v.verse }));
      bookName = rawData[0].book.name;
    } else if (rawJson && rawJson.verses) {
      // New object format
      const dataObj = rawJson as ApiChapterObject;
      transformedVerses = dataObj.verses.map((v) => ({ verse: v.verse, text: v.content }));
      bookName = dataObj.book.name;
    } else {
      console.log(`Invalid data format received for ${url}:`, rawJson);
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
    console.log(`Network or parsing error fetching ${url}:`, err);
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
