import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { fetchChapter, ChapterResponse, FetchError, Verse } from '../api/bible';
import PrimaryButton from '../../components/PrimaryButton';
import SideButton from '~/components/SideButton';

const FONT_SIZE_KEY = 'userBibleFontSize';
const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 28;

export default function BibleScreen() {
  const [chapterData, setChapterData] = useState<ChapterResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<number>(DEFAULT_FONT_SIZE);
  const [currentBook, setCurrentBook] = useState<string>('Genesis');
  const [currentChapter, setCurrentChapter] = useState<number>(1);
  const [currentVersion, setCurrentVersion] = useState<string>('ESV');

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);

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

      loadChapter(currentVersion, currentBook, currentChapter);
    };

    loadInitialData();
  }, []);

  const loadChapter = async (version: string, book: string, chapter: number) => {
    setLoading(true);
    setError(null);

    try {
      // Convert book name to book ID - or use 1 for Genesis
      const bookId = 1; // In a real app, you would map book names to their IDs
      const result = await fetchChapter(version, bookId, chapter);

      if ('error' in result) {
        setError(result.message);
        setChapterData(null);
      } else {
        setChapterData(result);
        setCurrentBook(result.book);
        setCurrentChapter(result.chapter);
        setCurrentVersion(result.version);
        setError(null);
      }
    } catch (error) {
      setError("Failed to load chapter");
      setChapterData(null);
    } finally {
      setLoading(false);
    }
  };

  const navigateToPreviousChapter = () => {
    if (loading || !chapterData) return;
    
    if (currentChapter > 1) {
      loadChapter(currentVersion, currentBook, currentChapter - 1);
    }
    // In a complete implementation, you would also handle navigation to the previous book's
    // last chapter when at chapter 1
  };

  const navigateToNextChapter = () => {
    console.log('Next button pressed, current chapter:', currentChapter);
    if (loading || !chapterData) {
      console.log('Loading or no chapter data, skipping navigation');
      return;
    }
    
    // For simplicity, we're allowing navigation up to chapter 50 (maximum in Genesis)
    // In a real app, you would check the max chapters for each book
    if (currentChapter < 50) {
      console.log('Navigating to next chapter:', currentChapter + 1);
      loadChapter(currentVersion, currentBook, currentChapter + 1);
    } else {
      console.log('Already at maximum chapter');
    }
    // In a complete implementation, you would also handle navigation to the next book's
    // first chapter when at the last chapter
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
    // Placeholder for finish reading logic
    console.log('Finish Reading Pressed');
  };

  const renderBibleContent = () => {
    if (loading) {
      return <ActivityIndicator size="large" color="#3C584A" className="mt-10" />;
    }

    if (error) {
      return <Text className="text-red-500 mt-10 text-center px-4">Error loading chapter: {error}</Text>;
    }

    if (chapterData) {
      const verseTextStyle = [styles.verseText, { fontSize: fontSize }];
      const verseNumberStyle = [styles.verseNumber, { fontSize: fontSize }];

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
          <Text style={[styles.navButtonText, currentChapter <= 1 && styles.disabledButtonText]}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, (currentChapter >= 50 || loading) && styles.disabledNavButton]}
          onPress={navigateToNextChapter}
          disabled={currentChapter >= 50 || loading}
          activeOpacity={0.7}
        >
          <Text style={[styles.navButtonText, (currentChapter >= 50 || loading) && styles.disabledButtonText]}>→</Text>
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
