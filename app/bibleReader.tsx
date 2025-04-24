import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { fetchChapter, ChapterResponse, FetchError, Verse } from './api/bible';
import PrimaryButton from '../components/PrimaryButton';
import SideButton from '~/components/SideButton';
import { usePathStore } from './stores/pathStore';
import { useHomeStore, SuccessAnimationType } from './stores/homeStore';
import { router, useLocalSearchParams } from 'expo-router';

const FONT_SIZE_KEY = 'userBibleFontSize';
const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 28;

export default function BibleReaderScreen() {
  const [chapterData, setChapterData] = useState<ChapterResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<number>(DEFAULT_FONT_SIZE);
  
  // Get saved reading state from pathStore
  const { 
    savedBook, 
    savedBookId, 
    savedChapter, 
    setSavedReading,
    setPathInProgress 
  } = usePathStore();
  
  const [currentBook, setCurrentBook] = useState<string>(savedBook);
  const [currentBookId, setCurrentBookId] = useState<number>(savedBookId);
  const [currentChapter, setCurrentChapter] = useState<number>(savedChapter);
  const [currentVersion, setCurrentVersion] = useState<string>('ESV');
  
  const setHomeMode = useHomeStore((state) => state.setMode);
  const setSuccessType = useHomeStore((state) => state.setSuccessType);
  const setReadingCompleted = useHomeStore((state) => state.setReadingCompleted);
  const prayerCompleted = useHomeStore((state) => state.prayerCompleted);
  const reflectionCompleted = useHomeStore((state) => state.reflectionCompleted);
  
  // Get URL parameters directly
  const params = useLocalSearchParams();
  
  // When coming to this tab from a preview, clear the path in progress state
  useEffect(() => {
    // This ensures that when we navigate via tab the tabbar stays visible
    setPathInProgress(false);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);

      console.log("🔄 BibleReader: Loading initial data");
      console.log("📋 URL Params:", params);
      
      // Get route params from useLocalSearchParams
      const urlBookId = params.bookId ? parseInt(params.bookId as string, 10) : null;
      const urlChapters = params.chapters ? (params.chapters as string).split(',').map(c => parseInt(c, 10)) : null;
      const urlTitle = params.title as string || null;
      
      // Log what we found in the URL
      console.log(`📱 URL bookId: ${urlBookId}, chapters: ${urlChapters}, title: ${urlTitle}`);
      console.log(`💾 Saved: bookId: ${savedBookId}, chapter: ${savedChapter}, book: ${savedBook}`);
      
      // Determine what to load based on priority:
      // 1. URL parameters if present and valid
      // 2. Saved state from store if URL params not available
      let bookIdToLoad = urlBookId && !isNaN(urlBookId) ? urlBookId : savedBookId;
      let chapterToLoad = urlChapters && urlChapters.length > 0 && !isNaN(urlChapters[0]) ? urlChapters[0] : savedChapter;
      
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
      await loadChapter(currentVersion, 'Loading...', bookIdToLoad, chapterToLoad);
    };

    loadInitialData();
  }, []);

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
    // Reset states
    setPathInProgress(false);
    setHomeMode('DEFAULT');
    setReadingCompleted(true);
    
    // Check if all tasks are completed
    const allCompleted = prayerCompleted && reflectionCompleted;
    
    if (allCompleted) {
      console.log('All tasks completed! Setting success type to BONUS');
      setSuccessType(SuccessAnimationType.BONUS);
    } else {
      console.log('Reading completed, but not all tasks. Setting success type to READING');
      setSuccessType(SuccessAnimationType.READING);
    }
    
    // Navigate to success animation screen instead of going back
    router.navigate({
      pathname: "/success",
      params: {
        message: allCompleted ? "Daily Trifecta Complete!" : "Reading Complete!",
        subMessage: allCompleted ? "Amazing! You've completed all three spiritual disciplines today." : "You've finished today's chapter. Great progress!"
      }
    });
  };

  const renderBibleContent = () => {
    // Memoize style calculations to prevent unnecessary style object recreations
    // IMPORTANT: These need to be here before any conditional returns
    const verseTextStyle = useMemo(() => {
      return [styles.verseText, { fontSize: fontSize }];
    }, [fontSize]);
    
    const verseNumberStyle = useMemo(() => {
      return [styles.verseNumber, { fontSize: fontSize }];
    }, [fontSize]);

    if (loading) {
      return <ActivityIndicator size="large" color="#3C584A" className="mt-10" />;
    }

    if (error) {
      return <Text className="text-red-500 mt-10 text-center px-4">Error loading chapter: {error}</Text>;
    }

    if (chapterData) {
      return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
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

  return (
    <SafeAreaView className="flex-1 bg-main-bg">
      <View style={styles.newHeaderContainer}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.headerButton}>
            <Text style={styles.headerButtonText}>
              {chapterData ? `${chapterData.book} ${chapterData.chapter}` : 'Loading...'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.headerButton}>
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
      <View style={styles.floatingNavContainer}>
        <TouchableOpacity
          style={[styles.navButton, currentChapter <= 1 && styles.disabledNavButton]}
          onPress={navigateToPreviousChapter}
          disabled={currentChapter <= 1 || loading}
          activeOpacity={0.7}
        >
          <Text style={useMemo(() => {
            return [
              styles.navButtonText, 
              currentChapter <= 1 && styles.disabledButtonText
            ];
          }, [currentChapter])}
          >←</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={useMemo(() => {
            return [
              styles.navButton, 
              loading && styles.disabledNavButton
            ];
          }, [loading])}
          onPress={navigateToNextChapter}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={useMemo(() => {
            return [
              styles.navButtonText, 
              loading && styles.disabledButtonText
            ];
          }, [loading])}
          >→</Text>
        </TouchableOpacity>
      </View>

      {/* Finish Reading Button - Fixed at bottom */}
      <View style={styles.finishButtonContainer}>
        <SideButton
          title="Finish Reading"
          onPress={handleFinishReading}
          disabled={false}
        />
      </View>
    </SafeAreaView>
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
  finishButtonContainer: {
    position: 'absolute',
    bottom: 20, // Adjust spacing as needed
    left: 20,
    right: 20,
  },
}); 