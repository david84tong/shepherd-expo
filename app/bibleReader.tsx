import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { fetchChapter, ChapterResponse, FetchError, Verse } from './api/bible';
import PrimaryButton from '../components/PrimaryButton';
import SideButton from '~/components/SideButton';
import { usePathStore } from './stores/pathStore';
import { useHomeStore, SuccessAnimationType } from './stores/homeStore';
import { useUserStore } from './stores/userStore';
import { router, useLocalSearchParams } from 'expo-router';
import { BIBLE_PATHS, Path, Unit, BIBLE_BOOK_IDS, BIBLE_CHAPTER_COUNTS } from './models/Path';
import firestore from '@react-native-firebase/firestore';
import BookChapterSelectorSheet from '../components/BookChapterSelectorSheet';

const FONT_SIZE_KEY = 'userBibleFontSize';
const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 28;

// Define component props
interface BibleReaderProps {
  isEmbedded?: boolean; // Whether it's embedded in another screen
  initialBookId?: number; // Initial book ID to display
  initialBookName?: string; // Initial book name
  initialChapter?: number; // Initial chapter to display
  onNavigateBack?: () => void; // Optional callback for custom back navigation
}

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
  const [isSelectorVisible, setIsSelectorVisible] = useState(false);
  
  // Animation values for button container
  const buttonContainerAnim = useRef(new Animated.Value(100)).current;
  const buttonOpacityAnim = useRef(new Animated.Value(0)).current;
  
  // Reference to the ScrollView
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Get saved reading state from pathStore
  const { 
    savedBook, 
    savedBookId, 
    savedChapter, 
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
  const [currentVersion, setCurrentVersion] = useState<string>('ESV');
  
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

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);

      console.log("🔄 BibleReader: Loading initial data");
      if (!isEmbedded) {
        console.log("📋 URL Params:", effectiveParams);
      }
      
      // Get route params from useLocalSearchParams if not embedded
      const urlBookId = !isEmbedded && effectiveParams?.bookId ? parseInt(effectiveParams.bookId as string, 10) : null;
      const urlChapters = !isEmbedded && effectiveParams?.chapters ? (effectiveParams.chapters as string).split(',').map(c => parseInt(c, 10)) : null;
      const urlTitle = !isEmbedded && effectiveParams?.title ? effectiveParams.title as string : null;
      
      // If embedded, use props; otherwise check URL params then fall back to saved state
      const bookIdToLoad = initialBookId || (urlBookId && !isNaN(urlBookId) ? urlBookId : currentBookId);
      const chapterToLoad = initialChapter || (urlChapters && urlChapters.length > 0 && !isNaN(urlChapters[0]) ? urlChapters[0] : currentChapter);
      
      console.log(`🎯 Loading: bookId: ${bookIdToLoad}, chapter: ${chapterToLoad}`);

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

      // Load from determined values, not default state
      await loadChapter(currentVersion, initialBookName || 'Loading...', bookIdToLoad, chapterToLoad);
    };

    loadInitialData();
  }, [initialBookId, initialChapter]);

  useEffect(() => {
    // Animate the button container after component mounts
    if (!loading && chapterData) {
      Animated.parallel([
        Animated.timing(buttonContainerAnim, {
          toValue: 0,
          duration: 500,
          delay: 300,
          useNativeDriver: true,
        }),
        Animated.timing(buttonOpacityAnim, {
          toValue: 1,
          duration: 400,
          delay: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, chapterData]);

  const loadChapter = async (version: string, book: string, bookId: number, chapter: number) => {
    setLoading(true);
    setError(null);
    
    console.log(`📚 LOADING CHAPTER - version:${version}, book:${book}, bookId:${bookId}, chapter:${chapter}`);

    try {
      // Key line: bookId is now being passed properly to the API
      const result = await fetchChapter(version, bookId, chapter);

      if ('error' in result) {
        console.error(`❌ Error loading chapter: ${result.message}`);
        setError(result.message);
        setChapterData(null);
      } else {
        console.log(`✅ Successfully loaded: ${result.book} ${result.chapter}`);
        setChapterData(result);
        
        // Update the UI state with actual data
        setCurrentBook(result.book);
        setCurrentBookId(bookId);
        setCurrentChapter(result.chapter);
        setCurrentVersion(result.version);
        
        // Save to the store for persistence
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
  };

  const navigateToPreviousChapter = () => {
    if (loading || !chapterData) return;
    
    if (currentChapter > 1) {
      loadChapter(currentVersion, currentBook, currentBookId, currentChapter - 1);
    } else {
      // Would need to go to previous book's last chapter
      console.log("At first chapter - would need to go to previous book");
    }
  };

  const navigateToNextChapter = () => {
    console.log('Next button pressed, current chapter:', currentChapter);
    if (loading || !chapterData) {
      console.log('Loading or no chapter data, skipping navigation');
      return;
    }
    
    // Simple chapter navigation for now
    loadChapter(currentVersion, currentBook, currentBookId, currentChapter + 1);
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
      setSuccessType(SuccessAnimationType.BONUS);
    } else {
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
    // If not in a path or no current path defined, consider it "at end"
    if (!pathInProgress || !currentPath) {
      return false; // If not in a path, isAtEndChapter isn't strictly meaningful here
    }
    
    // Check if we're on the right book and at the final chapter from the currentPath
    const isActuallyAtEnd = currentBookId === currentPath.bookId && currentChapter === currentPath.endChapter;
    
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

  // Reset hasScrolledToBottom only when chapter changes, but never set it to false again for the same chapter
  useEffect(() => {
    setHasScrolledToBottom(false);
  }, [currentChapter]);

  // Handle scroll events to detect when user reaches bottom
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    // Check if user has scrolled to the bottom (with a small threshold)
    const scrolledToBottom = layoutMeasurement.height + contentOffset.y >= 
      contentSize.height - 100; // 100px threshold
    // Only mark as scrolled to bottom if we're at the end chapter AND at the bottom of the content
    if (scrolledToBottom && !hasScrolledToBottom) {
      // Only set to true if actually at the end chapter or not in a path
      if (isAtEndChapter || !pathInProgress) {
        console.log('📜 User has scrolled to bottom! Enabling Finish button.');
        setHasScrolledToBottom(true);
      }
    }
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
      return <ActivityIndicator size="large" color="#3C584A" className="mt-10" />;
    }

    if (error) {
      return <Text className="text-red-500 mt-10 text-center px-4">Error loading chapter: {error}</Text>;
    }

    if (chapterData) {
      return (
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContainer}
          onScroll={handleScroll}
          scrollEventThrottle={16} // Frequent enough for smooth detection
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
    setIsSelectorVisible(true);
  };

  const handleCloseSelector = () => {
    setIsSelectorVisible(false);
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
          
          <TouchableOpacity style={styles.headerButton} onPress={handleOpenSelector}>
            <Text style={styles.headerButtonText}>
              {chapterData ? chapterData.version : '...'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={decreaseFontSize} style={styles.iconButton} disabled={fontSize <= MIN_FONT_SIZE}>
            <Text style={[styles.fontSizeAdjustText, fontSize <= MIN_FONT_SIZE && styles.disabledButtonText]}>-</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={increaseFontSize} style={styles.iconButton} disabled={fontSize >= MAX_FONT_SIZE}>
            <Text style={[styles.fontSizeAdjustText, fontSize >= MAX_FONT_SIZE && styles.disabledButtonText]}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.iconPlaceholder}>🔊</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.iconPlaceholder}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.iconPlaceholder}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentArea}>
        {renderBibleContent()}
      </View>

      {/* Floating chapter navigation buttons */}
      <View style={[
        styles.floatingNavContainer,
        isEmbedded && styles.floatingNavContainerEmbedded
      ]}>
        <TouchableOpacity
          style={[styles.navButton, (currentChapter <= 1 || loading) && styles.disabledNavButton]}
          onPress={navigateToPreviousChapter}
          disabled={currentChapter <= 1 || loading}
          activeOpacity={0.7}
        >
          <Text style={[styles.navButtonText, (currentChapter <= 1 || loading) && styles.disabledButtonText]}>←</Text>
        </TouchableOpacity>
        {/* Next Chapter button always renders, but disable at end-of-unit */}
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
      </View>

      {/* Finish Reading Button - Only show in standalone mode */}
      {!isEmbedded && <Animated.View 
        style={[
          styles.finishButtonContainer,
          {
            opacity: buttonOpacityAnim,
            transform: [{ translateY: buttonContainerAnim }]
          }
        ]}
      >
        <SideButton
          title="Finish Reading"
          onPress={handleFinishReading}
          disabled={!isFinishEnabled} // Use the calculated enabled state
        />
      </Animated.View>}

      {/* Book Chapter Selector Sheet */}
      <BookChapterSelectorSheet 
        visible={isSelectorVisible}
        onClose={handleCloseSelector}
        currentBookId={currentBookId}
        currentChapter={currentChapter}
        onSelect={handleSelectBookChapter}
      />
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
  iconPlaceholder: {
    fontSize: 20,
    color: '#3C584A',
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