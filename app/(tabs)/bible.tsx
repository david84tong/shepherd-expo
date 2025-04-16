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

const FONT_SIZE_KEY = 'userBibleFontSize';
const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 28;

export default function BibleScreen() {
  const [chapterData, setChapterData] = useState<ChapterResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<number>(DEFAULT_FONT_SIZE);

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

      const result = await fetchChapter('ESV', 1, 1);

      if ('error' in result) {
        setError(result.message);
        setChapterData(null);
      } else {
        setChapterData(result);
        setError(null);
      }
      setLoading(false);
    };

    loadInitialData();
  }, []);

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
});
