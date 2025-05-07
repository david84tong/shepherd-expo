import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated as RNAnimated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Easing as RNEasing,
} from 'react-native';
import { fetchChapter, ChapterResponse, FetchError, Verse } from './api/bible';
import PrimaryButton from '../components/PrimaryButton';
import SideButton from '~/components/SideButton';
import { usePathStore } from './stores/pathStore';
import { useHomeStore, SuccessAnimationType } from './stores/homeStore';
import { useUserStore } from './stores/userStore';
import { useUIStore } from './stores/uiStore';
import { router, useLocalSearchParams } from 'expo-router';
import { BIBLE_PATHS, Path, Unit, BIBLE_BOOK_IDS, BIBLE_CHAPTER_COUNTS } from './models/Path';
import firestore from '@react-native-firebase/firestore';
import Reanimated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  withSequence, 
  withDelay, 
  Easing as ReanimatedEasing  // Use ReanimatedEasing for clarity
} from 'react-native-reanimated'; // Use Reanimated for dot indicator

const FONT_SIZE_KEY = 'userBibleFontSize';
const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 28;

// Helper to get book name from book ID
const BIBLE_BOOK_IDS_REVERSE = Object.fromEntries(
  Object.entries(BIBLE_BOOK_IDS).map(([name, id]) => [id, name])
);

// Define component props
interface BibleReaderProps {
  isEmbedded?: boolean; // Whether it's embedded in another screen
  initialBookId?: number; // Initial book ID to display
  initialBookName?: string; // Initial book name
  initialChapter?: number; // Initial chapter to display
  onNavigateBack?: () => void; // Optional callback for custom back navigation
}

// Custom Loading Indicator Component (using Reanimated)
const PulsingDotsIndicator = () => {
  const dot1Opacity = useSharedValue(0.3);
  const dot2Opacity = useSharedValue(0.3);
  const dot3Opacity = useSharedValue(0.3);

  const dotAnim = (opacity: Reanimated.SharedValue<number>, delay: number) => {
    return withRepeat(
      withSequence(
        withDelay(delay, withTiming(1, { duration: 400, easing: ReanimatedEasing.out(ReanimatedEasing.quad) })),
        withTiming(0.3, { duration: 400, easing: ReanimatedEasing.in(ReanimatedEasing.quad) })
      ),
      -1, // infinite repeat
      false // don't reverse
    );
  };

  useEffect(() => {
    dot1Opacity.value = dotAnim(dot1Opacity, 0);
    dot2Opacity.value = dotAnim(dot2Opacity, 150);
    dot3Opacity.value = dotAnim(dot3Opacity, 300);
  }, []);

  const animatedStyle1 = useAnimatedStyle(() => ({ opacity: dot1Opacity.value }));
  const animatedStyle2 = useAnimatedStyle(() => ({ opacity: dot2Opacity.value }));
  const animatedStyle3 = useAnimatedStyle(() => ({ opacity: dot3Opacity.value }));

  return (
    <View className="items-center justify-center flex-1 mt-20">
      <View className="flex-row space-x-2 mb-4">
        <Reanimated.View className="w-3 h-3 bg-accentGold rounded-full" style={animatedStyle1} />
        <Reanimated.View className="w-3 h-3 bg-accentGold rounded-full" style={animatedStyle2} />
        <Reanimated.View className="w-3 h-3 bg-accentGold rounded-full" style={animatedStyle3} />
      </View>
      <Text className="font-feather text-description text-base">Loading Chapter...</Text>
    </View>
  );
};

// Export the component for reuse
export const BibleReader: React.FC<BibleReaderProps> = ({
  isEmbedded = false,
  initialBookId,
  initialBookName,
  initialChapter,
  onNavigateBack,
}) => {
  const [chapterData, setChapterData] = useState<ChapterResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<number>(DEFAULT_FONT_SIZE);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  
  // Animation values for button container (using RNAnimated for these)
  const buttonsAnim = useRef(new RNAnimated.Value(0)).current; // 0: hidden, 1: visible
  
  // Reference to the ScrollView
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Get UI store for the book chapter selector
  const showBookChapterSelector = useUIStore(state => state.showBookChapterSelector);
  
  // Get saved reading state from pathStore
  const { 
    savedBook, 
    savedBookId, 
    savedChapter, 
    savedTranslation,
    setSavedReading,
    setPathInProgress,
    pathInProgress,
    endChapter,
    savedBookId: selectedBookId,
    currentPath,
    setCurrentPath,
    markUnitAsCompleted,
    setNextUnitPreview
  } = usePathStore();
  
  // Initialize with props if provided, otherwise use saved state
  const [currentBook, setCurrentBook] = useState<string>(initialBookName || savedBook);
  const [currentBookId, setCurrentBookId] = useState<number>(initialBookId || savedBookId);
  const [currentChapter, setCurrentChapter] = useState<number>(initialChapter || savedChapter);
  const [currentVersion, setCurrentVersion] = useState<string>(savedTranslation);
  
  const setHomeMode = useHomeStore((state) => state.setMode);
  const setSuccessType = useHomeStore((state) => state.setSuccessType);
  const setReadingCompleted = useHomeStore((state) => state.setReadingCompleted);
  const prayerCompleted = useHomeStore((state) => state.prayerCompleted);
  const reflectionCompleted = useHomeStore((state) => state.reflectionCompleted);
  const sawDailyBonus = useHomeStore((state) => state.sawDailyBonus);
  
  // Get userStore functions for saving reading
  const addCompletedReading = useUserStore(state => state.addCompletedReading);
  const setLastReadingDate = useUserStore(state => state.setLastReadingDate);
  const setVersesReadTotal = useUserStore(state => state.setVersesReadTotal);
  const setChaptersReadTotal = useUserStore(state => state.setChaptersReadTotal);
  const getVersesReadTotal = useUserStore(state => state.getVersesReadTotal);
  const getChaptersReadTotal = useUserStore(state => state.getChaptersReadTotal);
  
  // Always call hooks unconditionally, even if we don't use the results
  const params = useLocalSearchParams();
  const effectiveParams = !isEmbedded ? params : null;

  // When coming to this tab from a preview, clear the path in progress state
  useEffect(() => {
    if (!isEmbedded) {
      // Check if we're coming from the map, preview, or direct navigation
      if (effectiveParams?.source === 'map' || effectiveParams?.source === 'debug-button' || effectiveParams?.source === 'preview') {
        // Keep pathInProgress true if coming from map or preview
        console.log(`📱 Navigation source: ${effectiveParams?.source}, keeping pathInProgress state.`);
      } else {
        // Only reset pathInProgress if not coming from map/preview/debug
        console.log('📱 Navigation source not map/preview/debug, setting pathInProgress false');
        setPathInProgress(false);
      }
    }
  }, [isEmbedded, effectiveParams?.source]);

  // Memoized loadChapter function
  const loadChapter = useCallback(async (version: string, book: string, bookId: number, chapter: number) => {
    setLoading(true);
    setError(null);
    console.log(`📚 LOADING CHAPTER - version:${version}, book:${book} (${bookId}), chapter:${chapter}`);

    try {
      const result = await fetchChapter(version, bookId, chapter);
      if ('error' in result) {
        console.error(`❌ Error loading chapter: ${result.message}`);
        setError(result.message);
        setChapterData(null);
      } else {
        console.log(`✅ Successfully loaded: ${result.book} ${result.chapter}`);
        setChapterData(result);
        setCurrentBook(result.book);
        setCurrentBookId(bookId); // Ensure currentBookId is updated to the loaded bookId
        setCurrentChapter(result.chapter);
        setCurrentVersion(result.version);
        // Update the store with the successfully loaded chapter info, including potentially canonicalized book name
        setSavedReading(result.book, bookId, result.chapter);
        setError(null);
      }
    } catch (error) {
      console.error("Failed to load chapter", error);
      setError("Failed to load chapter");
      setChapterData(null);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setChapterData, setCurrentBook, setCurrentBookId, setCurrentChapter, setCurrentVersion, setSavedReading]);

  // Effect for initial setup and reacting to prop/param changes for the *target* chapter
  useEffect(() => {
    console.log("🔄 BibleReader: useEffect[InitialSetup] triggered.");
    let bookIdToUse: number | undefined = undefined;
    let chapterToUse: number | undefined = undefined;
    let bookNameToUse: string | undefined = undefined;

    const urlBookIdString = !isEmbedded && effectiveParams?.bookId ? effectiveParams.bookId as string : null;
    const urlBookId = urlBookIdString ? parseInt(urlBookIdString, 10) : null;
    const urlChaptersString = !isEmbedded && effectiveParams?.chapters ? effectiveParams.chapters as string : null;
    const urlChapters = urlChaptersString ? urlChaptersString.split(',').map(c => parseInt(c, 10)) : null;
    const urlTitle = !isEmbedded && effectiveParams?.title ? effectiveParams.title as string : null;

    if (initialBookId !== undefined && initialChapter !== undefined) {
      bookIdToUse = initialBookId;
      chapterToUse = initialChapter;
      bookNameToUse = initialBookName || BIBLE_BOOK_IDS_REVERSE[initialBookId] || savedBook; // Fallback to existing savedBook if name not provided
      console.log(`InitialSetup: Using initial props - Target Book: ${bookNameToUse}, ID: ${bookIdToUse}, Ch: ${chapterToUse}`);
    } else if (!isEmbedded && urlBookId !== null && !isNaN(urlBookId) && urlChapters !== null && urlChapters.length > 0 && !isNaN(urlChapters[0])) {
      bookIdToUse = urlBookId;
      chapterToUse = urlChapters[0];
      bookNameToUse = urlTitle || BIBLE_BOOK_IDS_REVERSE[urlBookId] || savedBook; // Fallback to existing savedBook
      console.log(`InitialSetup: Using URL params - Target Book: ${bookNameToUse}, ID: ${bookIdToUse}, Ch: ${chapterToUse}`);
    }

    if (bookIdToUse !== undefined && chapterToUse !== undefined && bookNameToUse !== undefined) {
      // Update the store if the determined target differs from current store state.
      // This ensures that changes in initial props/URL params correctly update the reading target.
      if (bookIdToUse !== savedBookId || chapterToUse !== savedChapter || bookNameToUse !== savedBook) {
        console.log(`InitialSetup: Updating store to initial/URL params - Book: ${bookNameToUse}, ID: ${bookIdToUse}, Ch: ${chapterToUse}`);
        setSavedReading(bookNameToUse, bookIdToUse, chapterToUse);
      }
    } else {
      console.log("InitialSetup: No new initial props/URL params. Existing store state will drive loading.");
      // If there are no initial/URL params, and chapterData is null (e.g., first ever load and store is at default)
      // we need to ensure the first load from store happens. The useEffectLoadChapterFromStore should handle this.
    }

    // Load font size (runs once on mount, or if key changes - essentially on mount)
    const loadFont = async () => {
      try {
        const savedSize = await AsyncStorage.getItem(FONT_SIZE_KEY);
        if (savedSize !== null) {
          const parsedSize = parseInt(savedSize, 10);
          if (!isNaN(parsedSize) && parsedSize >= MIN_FONT_SIZE && parsedSize <= MAX_FONT_SIZE) {
            setFontSize(parsedSize);
          }
        }
      } catch (e) {
        console.error("Failed to load font size from AsyncStorage", e);
      }
    };
    loadFont();
  }, [
    initialBookId, initialChapter, initialBookName, // Props
    effectiveParams, isEmbedded,                   // For URL params logic
    savedBookId, savedChapter, savedBook,          // To compare against for conditional setSavedReading
    setSavedReading                               // Store setter
  ]);

  // Effect for loading chapter data from the store OR when translation changes
  useEffect(() => {
    // This effect now also handles translation changes implicitly because `savedTranslation` is a dependency.
    console.log(`🔄 BibleReader: useEffect[LoadChapterFromStore] triggered. Loading: ${savedBook} Ch:${savedChapter} (ID:${savedBookId}) Ver:${savedTranslation}`);
    if (savedBookId !== undefined && savedChapter !== undefined && savedBook !== undefined && savedTranslation !== undefined) {
      loadChapter(savedTranslation, savedBook, savedBookId, savedChapter);
    } else {
      console.warn("useEffect[LoadChapterFromStore]: Store values for book/chapter/translation are incomplete. Skipping loadChapter.");
    }
  }, [savedBookId, savedChapter, savedBook, savedTranslation, loadChapter]); // loadChapter is memoized

  useEffect(() => {
    // Reset scroll status when chapter data changes
    setHasScrolledToBottom(false);
    
    // If we have chapter data, check if it's a small chapter that fits in view
    if (!loading && chapterData && chapterData.verses.length < 10) {
      // For very small chapters (less than 10 verses), assume they fit in view
      console.log(`[ChapterEffect] Small chapter with ${chapterData.verses.length} verses detected. Showing buttons without scroll.`);
      setHasScrolledToBottom(true);
    }
  }, [chapterData, loading]);

  // Keep the existing useEffect for animation
  useEffect(() => {
    console.log(`[AnimationEffect] hasScrolledToBottom changed to: ${hasScrolledToBottom}. Animating buttons.`);
    RNAnimated.timing(buttonsAnim, {
      toValue: hasScrolledToBottom ? 1 : 0,
      duration: 400,
      easing: RNEasing.out(RNEasing.quad),
      useNativeDriver: true,
    }).start();
  }, [hasScrolledToBottom, buttonsAnim]);

  // Reset hasScrolledToBottom when chapter, bookId or version changes.
  // This will trigger the animation to hide the buttons via the other useEffect.
  useEffect(() => {
    console.log('[ChapterChangeEffect] Chapter, BookID, or Version changed. Setting hasScrolledToBottom = false.');
    // Reset hasScrolledToBottom, but the chapterData useEffect will set it true again
    // if the new chapter is short enough to fit without scrolling
    setHasScrolledToBottom(false);
  }, [currentChapter, currentBookId, currentVersion]);

  // This useEffect specifically handles reloads when savedTranslation changes AFTER initial load
  // and the currently displayed version differs.
  // With the main useEffect now also depending on savedTranslation, this might be redundant
  // or could be simplified. For now, let's keep it but ensure its conditions are robust.
  useEffect(() => {
    if (!loading && chapterData && currentVersion !== savedTranslation) {
      console.log(`📚 User changed translation from ${currentVersion} (loaded) to ${savedTranslation} (desired). Reloading chapter.`);
      // Call loadChapter with the new savedTranslation.
      // currentBook, currentBookId, currentChapter reflect the currently viewed chapter.
      loadChapter(savedTranslation, currentBook, currentBookId, currentChapter);
    }
  }, [savedTranslation, loading, chapterData, currentVersion, currentBook, currentBookId, currentChapter]);

  const navigateToPreviousChapter = () => {
    if (loading || !chapterData) return;
    console.log(`NavPrev: Current local state before action: BookID=${currentBookId}, Ch=${currentChapter}`);
    
    let prevChapter = currentChapter - 1;
    let prevBookId = currentBookId;
    let prevBookName = currentBook; // Use current local book name

    if (prevChapter < 1) {
      // Attempt to find the previous book and its last chapter
      const currentBookOrderIndex = Object.values(BIBLE_BOOK_IDS).indexOf(currentBookId);
      if (currentBookOrderIndex > 0) {
        const prevBookEntry = Object.entries(BIBLE_BOOK_IDS)[currentBookOrderIndex - 1];
        prevBookName = prevBookEntry[0];
        prevBookId = prevBookEntry[1];
        prevChapter = BIBLE_CHAPTER_COUNTS[prevBookId] || 1; // Go to last chapter of prev book
        console.log(`NavPrev: Moving to previous book: ${prevBookName} Ch:${prevChapter}`);
      } else {
        console.log("NavPrev: At the very first book and chapter. Cannot go back further.");
        return; // Already at the first chapter of the first book
      }
    }
    console.log(`NavPrev: Setting store to Book: ${prevBookName}, ID: ${prevBookId}, Ch: ${prevChapter}`);
    setSavedReading(prevBookName, prevBookId, prevChapter);
  };

  const navigateToNextChapter = () => {
    if (loading || !chapterData) return;
    console.log(`NavNext: Current local state before action: BookID=${currentBookId}, Ch=${currentChapter}`);

    const totalChaptersInCurrentBook = BIBLE_CHAPTER_COUNTS[currentBookId];
    let nextChapter = currentChapter + 1;
    let nextBookId = currentBookId;
    let nextBookName = currentBook; // Use current local book name

    if (totalChaptersInCurrentBook && nextChapter > totalChaptersInCurrentBook) {
      // Attempt to find the next book and go to its first chapter
      const currentBookOrderIndex = Object.values(BIBLE_BOOK_IDS).indexOf(currentBookId);
      const bookEntries = Object.entries(BIBLE_BOOK_IDS);
      if (currentBookOrderIndex < bookEntries.length - 1) {
        const nextBookEntry = bookEntries[currentBookOrderIndex + 1];
        nextBookName = nextBookEntry[0];
        nextBookId = nextBookEntry[1];
        nextChapter = 1; // Go to first chapter of next book
        console.log(`NavNext: Moving to next book: ${nextBookName} Ch:${nextChapter}`);
      } else {
        console.log("NavNext: At the very last book and chapter. Cannot go further.");
        return; // Already at the last chapter of the last book
      }
    }
    console.log(`NavNext: Setting store to Book: ${nextBookName}, ID: ${nextBookId}, Ch: ${nextChapter}`);
    setSavedReading(nextBookName, nextBookId, nextChapter);
  };

  const updateFontSize = async (newSize: number) => {
    if (newSize >= MIN_FONT_SIZE && newSize <= MAX_FONT_SIZE) {
      setFontSize(newSize);
      try {
        await AsyncStorage.setItem(FONT_SIZE_KEY, newSize.toString());
      } catch (e) {
        console.error("Failed to save font size to AsyncStorage", e);
      }
    }
  };

  const increaseFontSize = () => {
    updateFontSize(fontSize + 1);
  };

  const decreaseFontSize = () => {
    updateFontSize(fontSize - 1);
  };

  const handleFinishReading = () => {
    console.log('Finish Reading Pressed - Updating completion status');
    let nextUnit: Unit | null = null;
    let shouldStayInPath = false;

    // Create current timestamp
    const now = firestore.Timestamp.now();
    
    // Save reading data to userStore
    console.log('Saving reading data to userStore');
    try {
      // Create a proper Reading object with the correct structure
      addCompletedReading({
        date: now,
        book: currentBook,
        chapters: [`${currentChapter}`] as unknown as [string],
        isUnit: pathInProgress
      });
      
      // Update last reading date
      setLastReadingDate(now);
      
      // Update total verses and chapters read
      const currentVerses = getVersesReadTotal();
      const currentChapters = getChaptersReadTotal();
      
      // Add the number of verses in this chapter
      const versesInChapter = chapterData ? chapterData.verses.length : 0;
      setVersesReadTotal(currentVerses + versesInChapter);
      setChaptersReadTotal(currentChapters + 1);
      
      console.log(`Reading saved successfully. Added ${versesInChapter} verses and 1 chapter.`);
      console.log(`New totals: ${currentVerses + versesInChapter} verses, ${currentChapters + 1} chapters`);
    } catch (error) {
      console.error('Error saving reading data:', error);
    }

    // If we are in a path and at the end chapter, mark the UNIT as completed
    if (pathInProgress && currentPath && isAtEndChapter) {
      console.log(`✅ Unit ${currentPath.unitId} completed! Attempting to mark...`);
      markUnitAsCompleted(currentPath.unitId);

      // Find the next unit logic
      const currentPathIndex = BIBLE_PATHS.findIndex(p => p.id === currentPath.pathId);
      if (currentPathIndex !== -1) {
        const currentPathData = BIBLE_PATHS[currentPathIndex];
        const currentUnitIndex = currentPathData.units.findIndex(u => u.id === currentPath.unitId);

        if (currentUnitIndex !== -1) {
          // Check if there's a next unit in the current path
          if (currentUnitIndex < currentPathData.units.length - 1) {
            nextUnit = currentPathData.units[currentUnitIndex + 1];
            console.log(`🔜 Next unit in same path found: ${nextUnit.title}`);
          } else {
            // Check if there's a next path
            if (currentPathIndex < BIBLE_PATHS.length - 1) {
              const nextPath = BIBLE_PATHS[currentPathIndex + 1];
              if (nextPath.units.length > 0) {
                nextUnit = nextPath.units[0];
                console.log(`⏭️ Next unit in next path found: ${nextUnit.title}`);
              }
            }
          }
        }
      }

      if (nextUnit) {
        shouldStayInPath = true; 
        console.log(`🚀 Setting next unit preview and staying in path.`);
      } else {
        console.log(`🏁 Reached the end of all paths.`);
      }

    } else {
      // Log why it wasn't marked / why we didn't look for the next unit
      console.log("⚠️ Did not mark unit or look for next unit. Conditions:");
      console.log(`   - pathInProgress: ${pathInProgress}`);
      console.log(`   - currentPath: ${JSON.stringify(currentPath)}`);
      console.log(`   - isAtEndChapter: ${isAtEndChapter}`);
    }

    // Update store state
    setNextUnitPreview(nextUnit); // Set the next unit (or null if none)
    setPathInProgress(shouldStayInPath); // Keep in path only if there's a next unit

    // --- Existing navigation logic --- 
    setHomeMode('DEFAULT');
    setReadingCompleted(true);

    // Check if all tasks are completed
    if (sawDailyBonus) {
      setSuccessType(SuccessAnimationType.READING);
    } else if (prayerCompleted && reflectionCompleted) {
      // Only show BONUS type if the daily bonus hasn't been seen yet
      console.log("All disciplines completed - showing BONUS");
      setSuccessType(SuccessAnimationType.BONUS);
    } else {
      console.log("Regular reading completion - showing READING");
      setSuccessType(SuccessAnimationType.READING);
    }

    // Navigate to success animation screen - Use replace to unmount BibleReader
    router.replace({
      pathname: "/success",
      params: {
        message: sawDailyBonus ? "Reading Complete!" : (prayerCompleted && reflectionCompleted ? "Daily Trifecta Complete!" : "Reading Complete!"),
        subMessage: sawDailyBonus ? "You've finished today's chapter. Great progress!" : (prayerCompleted && reflectionCompleted ? "Amazing! You've completed all three spiritual disciplines today." : "You've finished today's chapter. Great progress!")
      }
    });
  };

  // Check if the current chapter is the end chapter of the selected path
  const isAtEndChapter = useMemo(() => {
    if (!pathInProgress || !currentPath) {
      console.log('[isAtEndChapter] Not in path or no currentPath data. Returning false.');
      return false; 
    }
    
    const isActuallyAtEnd = currentBookId === currentPath.bookId && currentChapter === currentPath.endChapter;
    console.log(`[isAtEndChapter] Calculation: pathInProgress=${pathInProgress}, currentPath.bookId=${currentPath.bookId}, currentBookId=${currentBookId}, currentPath.endChapter=${currentPath.endChapter}, currentChapter=${currentChapter}. Result: ${isActuallyAtEnd}`);
    return isActuallyAtEnd;
  }, [pathInProgress, currentPath, currentBookId, currentChapter]);

  // Determine if the finish button should be enabled
  const isFinishEnabled = useMemo(() => {
    // Only enable if on the end chapter in a path AND scrolled to bottom
    if (pathInProgress && currentPath && currentChapter === currentPath.endChapter && hasScrolledToBottom) {
      return true;
    }
    // If not in a path AND scrolled to bottom
    if (!pathInProgress && hasScrolledToBottom) {
      return true;
    }
    // Otherwise, disabled
    return false;
  }, [pathInProgress, currentPath, currentChapter, hasScrolledToBottom]);

  const handleContentLayout = (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    if (!loading && chapterData && scrollViewRef.current) {
      // Get the layout dimensions of the content container
      const { height: layoutHeight } = event.nativeEvent.layout;
      
      // Force an initial scroll event to check content size
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    
    const threshold = pathInProgress ? 10 : 100; 
    const scrolledToBottomThreshold = contentSize.height - threshold;
    const bottomReached = layoutMeasurement.height + contentOffset.y >= scrolledToBottomThreshold;

    // If content doesn't require scrolling, automatically show buttons
    if (contentSize.height <= layoutMeasurement.height) {
      if (!hasScrolledToBottom) {
        console.log('[handleScroll] Content fits without scrolling. Showing buttons.');
        setHasScrolledToBottom(true);
      }
      return;
    }

    // console.log(`[ScrollEvent] pathInProgress: ${pathInProgress}, threshold: ${threshold}, offset.y: ${contentOffset.y.toFixed(2)}, layoutH: ${layoutMeasurement.height.toFixed(2)}, contentH: ${contentSize.height.toFixed(2)}, calcBottom: ${(layoutMeasurement.height + contentOffset.y).toFixed(2)}, scrollBottomThr: ${scrolledToBottomThreshold.toFixed(2)}, bottomReached: ${bottomReached}`);

    if (bottomReached && !hasScrolledToBottom) {
      console.log(`[handleScroll] Bottom of current view reached. pathInProgress: ${pathInProgress}, isAtEndChapter: ${isAtEndChapter}. Setting hasScrolledToBottom = true.`);
      setHasScrolledToBottom(true);
    } 
    // Note: hasScrolledToBottom is reset to false only when a new chapter/version loads.
  };

  // Memoize style calculations to prevent unnecessary style object recreations
  const verseTextStyle = useMemo(() => {
    return [styles.verseText, { fontSize: fontSize }];
  }, [fontSize]);
  
  const verseNumberStyle = useMemo(() => {
    return [styles.verseNumber, { fontSize: fontSize }];
  }, [fontSize]);

  const renderBibleContent = () => {
    if (loading) {
      return <PulsingDotsIndicator />;
    }

    if (error) {
      return <Text className="text-red-500 mt-10 text-center font-feather px-4">Error loading chapter: {error}</Text>;
    }

    if (chapterData) {
      return (
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContainer}
          onScroll={handleScroll}
          scrollEventThrottle={16} 
          onLayout={handleContentLayout}
        >
          {chapterData.verses.map((verse: Verse) => (
            <Text key={verse.verse} style={verseTextStyle} selectable={true}>
              <Text style={verseNumberStyle}>{verse.verse} </Text>
              {verse.text}
            </Text>
          ))}
        </ScrollView>
      );
    }

    return <Text className="text-text/70 mt-10">No data available.</Text>;
  };

  const handleOpenSelector = () => {
    console.log('🔍 DEBUG: Opening selector');
    showBookChapterSelector(currentBookId, currentChapter, handleSelectBookChapter);
  };

  const handleSelectBookChapter = (bookId: number, chapter: number) => {
    console.log(`📖 New selection: Book ID ${bookId}, Chapter ${chapter}`);
    // Find book name from reverse map for logging/UI update (optional here)
    const bookNames: Record<number, string> = Object.fromEntries(
      Object.entries(BIBLE_BOOK_IDS).map(([name, id]) => [id, name])
    );
    const bookName = bookNames[bookId] || 'Unknown Book';
    
    // Load the newly selected chapter
    loadChapter(currentVersion, bookName, bookId, chapter);
  };

  // Handle back navigation based on context
  const handleBackNavigation = () => {
    if (onNavigateBack) {
      // Custom back navigation when embedded
      onNavigateBack();
    } else if (!isEmbedded && effectiveParams?.source === 'map') {
      // Navigation back to map when coming from map
      console.log('📱 Navigating back to map, setting pathInProgress to false');
      setPathInProgress(false);
      router.back();
    } else {
      // Default back navigation
      router.back();
    }
  };

  // Animated styles for buttons
  const buttonsContainerStyle = {
    opacity: buttonsAnim,
    transform: [
      {
        translateY: buttonsAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [100, 0], // Slide up from bottom
        }),
      },
    ],
  };

  return (
    <SafeAreaView className="flex-1 bg-main-bg">
      <View style={styles.newHeaderContainer}>
        <View style={styles.headerLeft}>
          {!isEmbedded && (
            <TouchableOpacity onPress={handleBackNavigation} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.headerButton} onPress={handleOpenSelector}>
            <Text style={styles.headerButtonText}>
              {chapterData ? `${chapterData.book} ${chapterData.chapter}` : 'Loading...'}
            </Text>
          </TouchableOpacity>
          
          {/* <TouchableOpacity style={styles.headerButton} onPress={handleOpenSelector}>
            <Text style={styles.headerButtonText}>
              {chapterData ? chapterData.version : '...'}
            </Text>
          </TouchableOpacity> */}
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={decreaseFontSize} style={styles.iconButton} disabled={fontSize <= MIN_FONT_SIZE}>
            <Text style={[styles.fontSizeAdjustText, fontSize <= MIN_FONT_SIZE && styles.disabledButtonText]}>-</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={increaseFontSize} style={styles.iconButton} disabled={fontSize >= MAX_FONT_SIZE}>
            <Text style={[styles.fontSizeAdjustText, fontSize >= MAX_FONT_SIZE && styles.disabledButtonText]}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentArea}>
        {renderBibleContent()}
      </View>

      {/* Floating chapter navigation buttons - Now Animated */}
      <RNAnimated.View style={[styles.floatingNavContainer, isEmbedded && styles.floatingNavContainerEmbedded, buttonsContainerStyle]}>
        <TouchableOpacity
          style={[styles.navButton, (currentChapter <= 1 || loading) && styles.disabledNavButton]}
          onPress={navigateToPreviousChapter}
          disabled={currentChapter <= 1 || loading}
          activeOpacity={0.7}
        >
          <Text style={[styles.navButtonText, (currentChapter <= 1 || loading) && styles.disabledButtonText]}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.navButton,
            (loading || (pathInProgress && isAtEndChapter)) && styles.disabledNavButton
          ]}
          onPress={navigateToNextChapter}
          disabled={loading || (pathInProgress && isAtEndChapter)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.navButtonText,
            (loading || (pathInProgress && isAtEndChapter)) && styles.disabledButtonText
          ]}>→</Text>
        </TouchableOpacity>
      </RNAnimated.View>

      {/* Finish Reading Button - Now Animated */}
      {!isEmbedded && <RNAnimated.View 
        style={[
          styles.finishButtonContainer,
          buttonsContainerStyle // Apply the same animation
        ]}
      >
        <SideButton
          title="Finish Reading"
          onPress={handleFinishReading}
          disabled={!isFinishEnabled || !hasScrolledToBottom} // Ensure finish button is also tied to hasScrolledToBottom for enabled state
        />
      </RNAnimated.View>}
    </SafeAreaView>
  );
};

// Standalone screen that uses the component
export default function BibleReaderScreen() {
  const params = useLocalSearchParams();
  
  // Extract params for initial state
  const urlBookId = params.bookId ? parseInt(params.bookId as string, 10) : undefined;
  const urlChapters = params.chapters ? (params.chapters as string).split(',').map(c => parseInt(c, 10)) : undefined;
  const initialChapter = urlChapters && urlChapters.length > 0 ? urlChapters[0] : undefined;
  
  return (
    <BibleReader 
      initialBookId={urlBookId}
      initialChapter={initialChapter}
    />
  );
}

// Styles
const styles = StyleSheet.create({
  newHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#FFF4D9',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4A8',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 244, 217, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 24,
    color: '#3C584A',
    fontFamily: 'Inter-Bold',
  },
  headerButton: {
    backgroundColor: 'rgba(220, 178, 128, 0.2)',
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  headerButtonText: {
    color: '#3C584A',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
  },
  navButton: {
    backgroundColor: '#FFE4A8',
    borderRadius: 24,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 4,
  },
  navButtonText: {
    color: '#3C584A',
    fontSize: 24,
    fontWeight: '700',
  },
  disabledNavButton: {
    backgroundColor: 'rgba(220, 178, 128, 0.1)',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  fontSizeAdjustText: {
    fontSize: 20,
    color: '#3C584A',
    fontFamily: 'Inter-Medium',
  },
  disabledButtonText: {
    color: '#DCB280',
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#FFF4D9',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  verseText: {
    lineHeight: 24,
    marginBottom: 10,
    color: '#3C584A',
    fontFamily: 'Inter-Regular',
  },
  verseNumber: {
    fontWeight: 'bold',
    color: '#DCB280',
    fontFamily: 'Inter-Bold',
  },
  floatingNavContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  floatingNavContainerEmbedded: {
    bottom: 100, // Move up when tab bar is present
  },
  finishButtonContainer: {
    position: 'absolute',
    bottom: 20, // Adjust spacing as needed
    left: 20,
    right: 20,
  },
}); 