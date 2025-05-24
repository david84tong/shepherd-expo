import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Modal, TouchableWithoutFeedback, SafeAreaView, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { fetchChapter, Verse, ChapterResponse } from '~/app/api/bible';
import { usePathStore } from '~/app/stores/pathStore';
import { Feather } from '@expo/vector-icons';
import Reanimated, { 
  FadeInUp,
  useAnimatedStyle, 
  useSharedValue, 
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Animated as RNAnimated, Easing as RNEasing } from 'react-native';
import Toast from 'react-native-toast-message';
import Clipboard from '@react-native-clipboard/clipboard';
import { useUIStore } from '~/app/stores/uiStore';
import { useHomeStore, SuccessAnimationType } from '~/app/stores/homeStore';
import { useUserStore } from '~/app/stores/userStore';
import { useRouter } from 'expo-router';
import firestore from '@react-native-firebase/firestore';
import { BIBLE_PATHS } from '~/app/models/Path';
import analytics from '../utils/analytics';
import { 
  useReaderSettingsStore, 
  CARD_LINE_HEIGHT_PRESETS,
  LineHeightPreset,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE
} from '~/app/stores/readerSettingsStore';

// Add theme color key to match bibleReader.tsx
const THEME_COLOR_KEY = 'userBibleThemeColor';
const TAP_GUIDANCE_KEY = 'userHideTapGuidance';

const THEME_COLORS = {
  white: {
    background: '#FFFFFF',
    modalBackground: '#FFFFFF',
    text: '#3C584A',
    border: '#E5E5E5',
    verseHighlight: 'rgba(220, 178, 128, 0.2)',
    sliderTrack: '#E5E5E5',
    bubbleBackground: '#FFFFFF',
    bubbleBorder: '#E0E0E0',
    verseNumberText: '#B89B4C',
    verseNumberBackground: 'rgba(220, 178, 128, 0.15)',
    iconColor: '#B89B4C',
    headerText: '#B89B4C',
    progressBarBackground: 'rgba(220, 178, 128, 0.2)',
    progressBarFill: '#DCB280',
  },
  light: { 
    background: '#FFF9E6',
    modalBackground: '#FFF4D9',
    text: '#4A3B25',
    border: '#FFE4A8',
    verseHighlight: 'rgba(220, 178, 128, 0.2)',
    sliderTrack: '#E5E5E5',
    bubbleBackground: '#FFF4D9',
    bubbleBorder: '#F7B500',
    verseNumberText: '#000000',
    verseNumberBackground: 'rgba(247, 181, 0, 0.15)',
    iconColor: '#D4A04C',
    headerText: '#F7B500',
    progressBarBackground: 'rgba(247, 181, 0, 0.2)',
    progressBarFill: '#F7B500',
  },
  dark: {
    background: '#2C2C2C',
    modalBackground: '#3C3C3C',
    text: '#E0E0E0',
    border: '#4A4A4A',
    verseHighlight: 'rgba(107, 107, 107, 0.34)',
    sliderTrack: '#5A5A5A',
    bubbleBackground: '#3A3A3A',
    bubbleBorder: '#5A5A5A',
    verseNumberText: '#B0B0B0',
    verseNumberBackground: 'rgba(107, 107, 107, 0.2)',
    iconColor: '#A0A0AF',
    headerText: '#B0B0B0',
    progressBarBackground: 'rgba(107, 107, 107, 0.2)',
    progressBarFill: '#8A8A8A',
  },
} as const;
type ThemeType = keyof typeof THEME_COLORS;

// For Bible navigation - Add bible book counts 
const BIBLE_CHAPTER_COUNTS: {[bookId: number]: number} = {
  1: 50,   // Genesis
  2: 40,   // Exodus
  3: 27,   // Leviticus
  4: 36,   // Numbers
  5: 34,   // Deuteronomy
  6: 24,   // Joshua
  7: 21,   // Judges
  8: 4,    // Ruth
  9: 31,   // 1 Samuel
  10: 24,  // 2 Samuel
  11: 22,  // 1 Kings
  12: 25,  // 2 Kings
  13: 29,  // 1 Chronicles
  14: 36,  // 2 Chronicles
  15: 10,  // Ezra
  16: 13,  // Nehemiah
  17: 10,  // Esther
  18: 42,  // Job
  19: 150, // Psalms
  20: 31,  // Proverbs
  21: 12,  // Ecclesiastes
  22: 8,   // Song of Solomon
  23: 66,  // Isaiah
  24: 52,  // Jeremiah
  25: 5,   // Lamentations
  26: 48,  // Ezekiel
  27: 12,  // Daniel
  28: 14,  // Hosea
  29: 3,   // Joel
  30: 9,   // Amos
  31: 1,   // Obadiah
  32: 4,   // Jonah
  33: 7,   // Micah
  34: 3,   // Nahum
  35: 3,   // Habakkuk
  36: 3,   // Zephaniah
  37: 2,   // Haggai
  38: 14,  // Zechariah
  39: 4,   // Malachi
  40: 28,  // Matthew
  41: 16,  // Mark
  42: 24,  // Luke
  43: 21,  // John
  44: 28,  // Acts
  45: 16,  // Romans
  46: 16,  // 1 Corinthians
  47: 13,  // 2 Corinthians
  48: 6,   // Galatians
  49: 6,   // Ephesians
  50: 4,   // Philippians
  51: 4,   // Colossians
  52: 5,   // 1 Thessalonians
  53: 3,   // 2 Thessalonians
  54: 6,   // 1 Timothy
  55: 4,   // 2 Timothy
  56: 3,   // Titus
  57: 1,   // Philemon
  58: 13,  // Hebrews
  59: 5,   // James
  60: 5,   // 1 Peter
  61: 3,   // 2 Peter
  62: 5,   // 1 John
  63: 1,   // 2 John
  64: 1,   // 3 John
  65: 1,   // Jude
  66: 22,  // Revelation
};

// For Bible navigation - Map book IDs to names
const BIBLE_BOOK_NAMES: {[bookId: number]: string} = {
  1: "Genesis", 2: "Exodus", 3: "Leviticus", 4: "Numbers", 5: "Deuteronomy",
  6: "Joshua", 7: "Judges", 8: "Ruth", 9: "1 Samuel", 10: "2 Samuel",
  11: "1 Kings", 12: "2 Kings", 13: "1 Chronicles", 14: "2 Chronicles",
  15: "Ezra", 16: "Nehemiah", 17: "Esther", 18: "Job", 19: "Psalms",
  20: "Proverbs", 21: "Ecclesiastes", 22: "Song of Solomon", 23: "Isaiah",
  24: "Jeremiah", 25: "Lamentations", 26: "Ezekiel", 27: "Daniel",
  28: "Hosea", 29: "Joel", 30: "Amos", 31: "Obadiah", 32: "Jonah",
  33: "Micah", 34: "Nahum", 35: "Habakkuk", 36: "Zephaniah", 37: "Haggai",
  38: "Zechariah", 39: "Malachi", 40: "Matthew", 41: "Mark", 42: "Luke",
  43: "John", 44: "Acts", 45: "Romans", 46: "1 Corinthians", 47: "2 Corinthians",
  48: "Galatians", 49: "Ephesians", 50: "Philippians", 51: "Colossians",
  52: "1 Thessalonians", 53: "2 Thessalonians", 54: "1 Timothy", 55: "2 Timothy",
  56: "Titus", 57: "Philemon", 58: "Hebrews", 59: "James", 60: "1 Peter",
  61: "2 Peter", 62: "1 John", 63: "2 John", 64: "3 John", 65: "Jude",
  66: "Revelation"
};

interface NewBibleReaderProps {
  bookId: number;
  chapter: number;
  translation?: string;
  isInPathMode?: boolean;
  onNavigateBack?: () => void; // Callback for back navigation when in path mode
  onSwitchToDefaultReader?: () => void; // Notify parent to switch to default reader
  onHandoffChapterData?: (data: ChapterResponse | null) => void; // Handoff chapter data to parent
  onOpenSettings?: () => void; // Open shared settings sheet from parent
}

interface TypingTextProps {
  text: string;
  className?: string; 
  baseTextStyle: object; 
  speed?: number;
  onComplete?: () => void;
  skipAnimation?: boolean;
}

const TypingText: React.FC<TypingTextProps> = ({ 
  text, 
  className, 
  baseTextStyle,
  speed = 30, 
  onComplete,
  skipAnimation = false
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const indexRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (skipAnimation) {
      setDisplayedText(text);
      onComplete && onComplete();
      return;
    }
    setDisplayedText('');
    indexRef.current = 0;
    const typeNextChar = () => {
      if (indexRef.current < text.length) {
        indexRef.current++;
        setDisplayedText(text.substring(0, indexRef.current));
        timerRef.current = setTimeout(typeNextChar, speed);
      } else {
        onComplete && onComplete();
      }
    };
    timerRef.current = setTimeout(typeNextChar, 0);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, speed, skipAnimation, onComplete]);

  return <Text style={baseTextStyle} className={className}>{displayedText}</Text>;
};

const NewBibleReader: React.FC<NewBibleReaderProps> = ({ 
  bookId, 
  chapter, 
  translation = 'ESV',
  isInPathMode = false,
  onNavigateBack,
  onSwitchToDefaultReader,
  onHandoffChapterData,
  onOpenSettings,
}) => {
  const [chapterData, setChapterData] = useState<ChapterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [skipTyping, setSkipTyping] = useState(false);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [showTapGuidance, setShowTapGuidance] = useState(true);
  const [tapCount, setTapCount] = useState(0);
  const [showBackButton, setShowBackButton] = useState(false);
  const [previousChapterInfo, setPreviousChapterInfo] = useState<{bookId: number, chapter: number} | null>(null);
  
  const progressValue = useSharedValue(0);
  const pathInProgress = usePathStore((s) => s.pathInProgress);
  const currentPath = usePathStore((s) => s.currentPath);
  const setSavedReading = usePathStore((s) => s.setSavedReading);
  const scrollViewRef = useRef<ScrollView>(null);

  // Reference for the header container
  const headerContainerRef = useRef<View>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Add state to track scrolling
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  // Get settings from the shared store
  const readerSettings = useReaderSettingsStore();

  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const slideAnim = useRef(new RNAnimated.Value(0)).current;

  // Convert line height preset name to pixel value for the card view
  const lineHeight = CARD_LINE_HEIGHT_PRESETS[readerSettings.lineHeightPreset || 'REGULAR'];
  
  // Get theme colors based on current theme - add fallback to prevent undefined
  const themeKey = (readerSettings.theme && readerSettings.theme in THEME_COLORS) 
    ? readerSettings.theme as ThemeType 
    : 'light';
  const theme = THEME_COLORS[themeKey];
  
  const verseTextStyle = { 
    fontSize: readerSettings.fontSize || MIN_FONT_SIZE, 
    lineHeight: lineHeight, 
    color: theme.text 
  };

  const showBookChapterSelector = useUIStore(state => state.showBookChapterSelector);

  const hasFilteredRef = useRef(false);

  const markUnitAsCompleted = usePathStore((s) => s.markUnitAsCompleted);
  const setNextUnitPreview = usePathStore((s) => s.setNextUnitPreview);
  const setPathInProgress = usePathStore((s) => s.setPathInProgress);

  // home/user store helpers (mirrors BibleReader)
  const setHomeMode = useHomeStore((s) => s.setMode);
  const setSuccessType = useHomeStore((s) => s.setSuccessType);
  const setReadingCompleted = useHomeStore((s) => s.setReadingCompleted);
  const prayerCompleted = useHomeStore((s) => s.prayerCompleted);
  const reflectionCompleted = useHomeStore((s) => s.reflectionCompleted);
  const sawDailyBonus = useHomeStore((s) => s.sawDailyBonus);

  const addCompletedReading = useUserStore((s) => s.addCompletedReading);
  const setLastReadingDate = useUserStore((s) => s.setLastReadingDate);
  const setVersesReadTotal = useUserStore((s) => s.setVersesReadTotal);
  const setChaptersReadTotal = useUserStore((s) => s.setChaptersReadTotal);
  const getVersesReadTotal = useUserStore((s) => s.getVersesReadTotal);
  const getChaptersReadTotal = useUserStore((s) => s.getChaptersReadTotal);

  const router = useRouter();

  // Track translation changes in analytics
  useEffect(() => {
    analytics.setUserProperties({ translation });
  }, [translation]);

  useEffect(() => {
    const loadTapGuidance = async () => {
      try {
        // Only load tap guidance from AsyncStorage
        const hideTapGuidance = await AsyncStorage.getItem(TAP_GUIDANCE_KEY);
        if (hideTapGuidance === 'true') {
          setShowTapGuidance(false);
        }
      } catch (e) {
        console.error("Failed to load tap guidance setting from AsyncStorage", e);
      }
    };
    loadTapGuidance();
  }, []);

  // Helper function to load a chapter
  const loadChapter = useCallback(async (bookId: number, chapter: number) => {
    setLoading(true);
    setCurrentIndex(0); // Reset to first verse when loading a new chapter
    setIsTypingComplete(false);
    setSkipTyping(false);
    progressValue.value = withTiming(0, { duration: 0 });
    
    try {
      const res = await fetchChapter(translation, bookId, chapter);
      if ('error' in res) {
        console.error(res.message);
        setLoading(false);
        return false;
      } else {
        setChapterData(res);
        setLoading(false);
        return true;
      }
    } catch (error) {
      console.error('Error loading chapter:', error);
      setLoading(false);
      return false;
    }
  }, [translation, progressValue]);

  // Function to navigate to the next chapter
  const navigateToNextChapter = useCallback(() => {
    // Add haptic feedback for navigation
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Store current chapter info for back button
    setPreviousChapterInfo({ bookId, chapter });
    setShowBackButton(true);
    
    const chaptersInCurrentBook = BIBLE_CHAPTER_COUNTS[bookId];
    
    if (chapter >= chaptersInCurrentBook) {
      // At the last chapter of current book, go to next book
      const nextBookId = bookId + 1;
      
      if (nextBookId <= 66) { // 66 books in the Bible
        const nextBookName = BIBLE_BOOK_NAMES[nextBookId] || 'Next Book';
        console.log(`End of ${chapterData?.book} reached. Navigating to ${nextBookName} 1`);
        loadChapter(nextBookId, 1);
      } else {
        // Reached the end of the Bible
        console.log('Reached the end of the Bible');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert("End of the Bible", "You've reached Revelation 22, the last chapter of the Bible.");
      }
    } else {
      // Go to next chapter in current book
      loadChapter(bookId, chapter + 1);
    }
  }, [bookId, chapter, chapterData, loadChapter]);

  // Function to navigate back to the previous chapter
  const navigateToPreviousChapter = useCallback(() => {
    if (!previousChapterInfo) return;
    
    // Add haptic feedback for navigation
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const { bookId: prevBookId, chapter: prevChapter } = previousChapterInfo;
    
    // Load the previous chapter
    loadChapter(prevBookId, prevChapter).then(success => {
      if (success && chapterData) {
        // Show all verses at once when returning to previous chapter
        setTimeout(() => {
          setCurrentIndex(chapterData.verses.length - 1);
          setIsTypingComplete(true);
          setShowBackButton(false);
          setPreviousChapterInfo(null);
        }, 300); // Small delay to ensure chapter data is loaded
      }
    });
  }, [previousChapterInfo, loadChapter, chapterData]);

  useEffect(() => {
    // Reset back button state when chapter props change directly
    setShowBackButton(false);
    setPreviousChapterInfo(null);
    
    // Initial chapter load
    loadChapter(bookId, chapter);
  }, [bookId, chapter, loadChapter]);

  useEffect(() => {
    if (chapterData?.verses?.length) {
      const newProgress = (currentIndex + 1) / chapterData.verses.length;
      progressValue.value = withTiming(newProgress, { duration: 600 });
    }
  }, [currentIndex, chapterData, progressValue]);

  const handleScroll = useCallback(() => {
    setIsScrolling(true);
    
    // Clear any existing timeout
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    
    // Set a timeout to mark scrolling as finished after 300ms of no scroll events
    scrollTimeout.current = setTimeout(() => {
      setIsScrolling(false);
    }, 300);
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // ---- FINISH READING HANDLER (needs to be in scope before handleNextVerse) ----
  const handleFinishReading = useCallback(() => {
    if (!currentPath || !chapterData) return;

    // haptic
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // save reading
    const now = firestore.Timestamp.now();
    addCompletedReading({
      date: now,
      book: chapterData.book,
      chapters: [String(chapterData.chapter)] as unknown as [string],
      isUnit: true,
    });
    setLastReadingDate(now);

    const totalVerses = getVersesReadTotal();
    const totalChapters = getChaptersReadTotal();
    setVersesReadTotal(totalVerses + chapterData.verses.length);
    setChaptersReadTotal(totalChapters + 1);

    // mark unit complete
    markUnitAsCompleted(currentPath.unitId);

    // next unit preview similar to default reader
    let nextUnit: any = null;
    const pathIdx = BIBLE_PATHS.findIndex(p => p.id === currentPath.pathId);
    if (pathIdx !== -1) {
      const p = BIBLE_PATHS[pathIdx];
      const uIdx = p.units.findIndex(u => u.id === currentPath.unitId);
      if (uIdx !== -1 && uIdx < p.units.length -1) nextUnit = p.units[uIdx+1];
    }
    setNextUnitPreview(nextUnit);
    setPathInProgress(!!nextUnit);

    // success screen logic identical to default
    setHomeMode('DEFAULT');
    setReadingCompleted(true);
    if (sawDailyBonus) {
      setSuccessType(SuccessAnimationType.READING);
    } else if (prayerCompleted && reflectionCompleted) {
      setSuccessType(SuccessAnimationType.BONUS);
    } else {
      setSuccessType(SuccessAnimationType.READING);
    }

    analytics.logEvent("CardBibleReader_Tapped_FinishReading", {
      pathId: currentPath.pathId,
      unitId: currentPath.unitId,
      startVerse: currentPath.startVerse,
      endVerse: currentPath.endVerse,
      bookId: currentPath.bookId,
      chapter: currentPath.startChapter,
    });

    router.replace({
      pathname: '/success',
      params: {
        message: 'Reading Complete!',
        subMessage: 'Great progress!',
      }
    });
  }, [currentPath, chapterData, addCompletedReading, setLastReadingDate, getVersesReadTotal, getChaptersReadTotal, markUnitAsCompleted, setNextUnitPreview, setPathInProgress, setHomeMode, setReadingCompleted, sawDailyBonus, prayerCompleted, reflectionCompleted, setSuccessType]);

  // -----------------------------

  const handleNextVerse = useCallback(() => {
    if (!chapterData || isScrolling) return;
    
    // Trigger haptic feedback for every tap
    Haptics.selectionAsync();
    
    // Track tap count and hide guidance after 2 taps
    if (showTapGuidance) {
      const newTapCount = tapCount + 1;
      setTapCount(newTapCount);
      
      if (newTapCount >= 2) {
        setShowTapGuidance(false);
        // Save preference to AsyncStorage
        AsyncStorage.setItem(TAP_GUIDANCE_KEY, 'true').catch(e => 
          console.error("Failed to save tap guidance setting", e)
        );
      }
    }
    
    if (!isTypingComplete) {
      setSkipTyping(true); 
      return;
    }
    
    if (currentIndex < chapterData.verses.length - 1) {
      // Still have verses to show in current chapter
      setCurrentIndex((i) => i + 1);
      setSkipTyping(false);
      setIsTypingComplete(false);
      // Schedule auto-scroll after the next verse is added
      setTimeout(scrollToBottom, 150);
    } else {
      // Reached the end of the chapter
      if (isInPathMode) {
        handleFinishReading();
      } else {
        navigateToNextChapter();
      }
    }
  }, [currentIndex, chapterData, isTypingComplete, scrollToBottom, showTapGuidance, tapCount, isScrolling, navigateToNextChapter, handleFinishReading, isInPathMode]);

  const handleTypingComplete = useCallback(() => {
    setIsTypingComplete(true);
  }, []);

  const animatedProgressStyle = useAnimatedStyle(() => {
    return { width: `${progressValue.value * 100}%` };
  });

  const handlePresentSettingsModal = useCallback(() => {
    // If a parent-provided settings handler exists, use it to open the
    // shared sheet so both readers reference one source of truth.
    if (onOpenSettings) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onOpenSettings();
      return;
    }

    // Fallback to legacy local modal when no parent handler is supplied.
    setIsSettingsModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    RNAnimated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
      easing: RNEasing.out(RNEasing.cubic),
    }).start();
  }, [slideAnim, onOpenSettings]);

  const handleCloseSettingsModal = useCallback(() => {
    RNAnimated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
      easing: RNEasing.in(RNEasing.cubic),
    }).start(() => {
      setIsSettingsModalVisible(false);
    });
  }, [slideAnim]);

  const handleFontSizeChange = useCallback((value: number) => {
    readerSettings.setFontSize(Math.round(value));
  }, [readerSettings]);

  const handleThemeChange = useCallback((newTheme: ThemeType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    readerSettings.setTheme(newTheme);
  }, [readerSettings]);

  const handleLineHeightChange = useCallback((preset: LineHeightPreset) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    readerSettings.setLineHeightPreset(preset);
  }, [readerSettings]);

  const handleDefaultReaderToggle = useCallback(async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    analytics.logEvent("CardBibleReader_Tapped_ToggleDefaultReader", {
      value: value ? 'card' : 'default'
    });

    // Update the store
    await readerSettings.setCardView(value);

    // Close this modal if we're switching to default reader (card view OFF)
    if (!value) {
      setIsSettingsModalVisible(false);
      
      // Handoff chapter data to parent before switching
      if (onHandoffChapterData) {
        onHandoffChapterData(chapterData);
      }
      
      // Notify parent to switch to default reader
      if (onSwitchToDefaultReader) {
        setTimeout(() => {
          if (onSwitchToDefaultReader) onSwitchToDefaultReader();
        }, 50);
      }
    }
  }, [readerSettings, onHandoffChapterData, chapterData, onSwitchToDefaultReader]);

  // Handler for opening the selector
  const handleOpenSelector = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showBookChapterSelector(bookId, chapter, (newBookId: number, newChapter: number) => {
      loadChapter(newBookId, newChapter);
    });
  };

  useEffect(() => {
    if (
      chapterData &&
      isInPathMode &&
      currentPath &&
      currentPath.startVerse &&
      currentPath.endVerse &&
      bookId === currentPath.bookId &&
      chapter === currentPath.startChapter &&
      !hasFilteredRef.current
    ) {
      const { startVerse, endVerse } = currentPath;
      console.log(`📖 [NewBibleReader] Filtering verses ${startVerse}-${endVerse}`);
      const filtered = chapterData.verses.filter(
        v => v.verse >= startVerse && v.verse <= endVerse
      );
      setChapterData({ ...chapterData, verses: filtered });
      hasFilteredRef.current = true;
    }
  }, [chapterData, isInPathMode, currentPath, bookId, chapter]);

  // Add this useEffect to sync chapter changes
  useEffect(() => {
    if (bookId && chapter) {
      // This ensures the UI state in the selector modal stays in sync
      const updateUIState = async () => {
        // Allow the chapter data to load first
        if (!loading && chapterData) {
          console.log(`📚 [NewBibleReader] Syncing UI state for book ${bookId}, chapter ${chapter}`);
          setSavedReading(chapterData.book, bookId, chapter);
        }
      };
      
      updateUIState();
    }
  }, [bookId, chapter, chapterData, loading, setSavedReading]);

  if (loading || !chapterData) {
    return (
      <SafeAreaView style={{backgroundColor: theme.background, flex:1}} className="items-center justify-center">
        <ActivityIndicator size="large" color={theme.progressBarFill} />
      </SafeAreaView>
    );
  }

  const versesToShow: Verse[] = chapterData.verses.slice(0, currentIndex + 1);

  return (
    <SafeAreaView style={{backgroundColor: theme.background, flex:1}}>
      {/* Absolute background to cover outer safe areas */}
      <View style={{...StyleSheet.absoluteFillObject}} pointerEvents="none" />

      <View style={{flex:1, paddingBottom: 24, paddingHorizontal:16, paddingTop:16}}>

        
        {/* HEADER: Bible Book/Chapter, tap to open selector, styled like bibleReader.tsx */}
        <View className="flex-row items-center justify-between mb-3  px-[4px] py-[10px]">
          <View className="flex-row items-center">
            {isInPathMode && onNavigateBack && (
              <TouchableOpacity
                onPress={onNavigateBack}
                className="mr-2 bg-[#DCB28033] rounded-[22px] p-[6px]"
              >
                <Feather name="arrow-left" size={20} color={theme.iconColor} />
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={handleOpenSelector} className="bg-[#DCB28033] rounded-[15px] py-[5px] px-[12px] mr-2">
              <Text className="font-feather text-[14px] text-[#3C584A]">
                {chapterData ? `${chapterData.book} ${chapterData.chapter}` : 'Loading...'}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handlePresentSettingsModal} className="bg-[#DCB28033] rounded-[15px] py-[5px] px-[12px] items-center justify-center">
            <Feather name="settings" size={20} color={theme.iconColor} />
          </TouchableOpacity>
        </View>
        {/* Add progress bar at the top */}
        <View style={{height: 8, backgroundColor: theme.progressBarBackground, borderRadius: 2, marginBottom: 8, overflow: 'hidden'}}>
          <Reanimated.View
            style={[{
              height: '100%',
              backgroundColor: theme.progressBarFill,
              borderRadius: 2,
            }, animatedProgressStyle]}
          />
        </View>
        <ScrollView 
          ref={scrollViewRef}
          className="flex-1" 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          onScrollBeginDrag={() => setIsScrolling(true)}
          onScrollEndDrag={handleScroll}
          onMomentumScrollBegin={() => setIsScrolling(true)}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          bounces={true}
        >
          {/* Add a touchable wrapper that covers the whole scroll area */}
          <TouchableWithoutFeedback onPress={handleNextVerse}>
            <View style={{ minHeight: '100%' }}>
              {versesToShow.map((v, index) => (
                <View key={v.verse}>
                  <Reanimated.View entering={FadeInUp.duration(300).delay(index * 60)}>
                    <View style={{backgroundColor: theme.bubbleBackground, borderColor: theme.bubbleBorder}} className="border-2 mt-4 p-4 rounded-2xl shadow-sm">
                      {index === currentIndex ? (
                        <TypingText
                          text={v.text}
                          baseTextStyle={{...verseTextStyle, fontFamily: 'DIN Next Rounded LT W01 Regular', marginBottom: 12}}
                          speed={20}
                          skipAnimation={skipTyping}
                          onComplete={handleTypingComplete}
                        />
                      ) : (
                        <Text style={{...verseTextStyle, fontFamily: 'DIN Next Rounded LT W01 Regular', marginBottom: 12}}>
                          {v.text}
                        </Text>
                      )}
                      
                      <View style={{borderTopColor: theme.bubbleBorder, opacity: 0.3}} className="flex-row items-center justify-between mt-0 pt-2">
                        <View style={{backgroundColor: theme.verseNumberBackground, height: 32, width: 32}} className="items-center justify-center rounded-full">
                          <Text style={{color: theme.verseNumberText, fontFamily: 'Feather Bold', fontSize:14}}>{v.verse}</Text>
                        </View>
                        <View className="flex-row space-x-5">
                          <TouchableOpacity onPress={(e) => { e.stopPropagation(); Clipboard.setString(`${chapterData.book} ${chapterData.chapter}:${v.verse} - ${v.text}`); Toast.show({ type: 'success', text1: 'Verse copied to clipboard', position: 'top', visibilityTime: 2000 }); }}><Feather name="copy" size={16} color={theme.iconColor} /></TouchableOpacity>
                          {/* <TouchableOpacity onPress={(e) => { e.stopPropagation(); }}><Feather name="edit-2" size={16} color={theme.iconColor} className="mx-8"/></TouchableOpacity>
                          <TouchableOpacity onPress={(e) => { e.stopPropagation(); }}><Feather name="message-circle" size={16} color={theme.iconColor} /></TouchableOpacity> */}
                        </View>
                      </View>
                    </View>
                  </Reanimated.View>
                </View>
              ))}
               
              {currentIndex < chapterData.verses.length - 1 ? (
                <View className="items-center mt-4">
                  {showTapGuidance && (
                    <Text style={{color: theme.headerText, fontFamily:'DIN Next Rounded LT W01 Regular', fontSize:16, opacity:0.7}}>
                      {isTypingComplete ? "Tap for next verse →" : "Tap to show full verse"}
                    </Text>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    console.log('📖 [NewBibleReader] Finish tapped');
                    if (isInPathMode) {
                      handleFinishReading();
                    } else {
                      // If not in path mode, navigate to next chapter instead
                      navigateToNextChapter();
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{backgroundColor: theme.progressBarBackground, paddingVertical:12}} className="items-center mt-6 rounded-xl">
                    <Text style={{color: theme.headerText, fontFamily:'Feather Bold', fontSize:16}}>
                      {isInPathMode ? "Finish Reading 🎉" : "Next Chapter →"}
                      {isInPathMode && currentPath && bookId === currentPath.bookId && chapter === currentPath.endChapter 
                        ? "Next Section 🎉" 
                        : "Next Chapter →"}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              
              {/* Add invisible spacer to ensure touchable area extends to bottom padding */}
              <View style={{ height: 80 }} />
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </View>

      {/* Back button at bottom of screen */}
      {showBackButton && (
        <Reanimated.View
          entering={FadeInUp.duration(300)}
          style={[styles.backButton, { backgroundColor: theme.progressBarBackground }]}
        >
          <TouchableOpacity
            onPress={navigateToPreviousChapter}
            accessibilityLabel="Go back to previous chapter"
          >
            <View className="flex-row items-center">
              <Feather name="chevron-left" size={24} color={theme.iconColor} />
           
            </View>
          </TouchableOpacity>
        </Reanimated.View>
      )}

      {/* Render the local settings modal only when no shared handler is
          provided. */}
      {!onOpenSettings && (
      <Modal
          visible={isSettingsModalVisible}
          transparent
          animationType="none"
          onRequestClose={handleCloseSettingsModal}
      >
          <TouchableWithoutFeedback onPress={handleCloseSettingsModal}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <RNAnimated.View
                  style={[
                    styles.modalContent,
                    {
                      backgroundColor: theme.modalBackground,
                      transform: [{
                        translateY: slideAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [400, 0], 
                        }),
                      }],
                    },
                  ]}
                >
                  <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
                  
                  {/* Default Reader Toggle */}
                  <View style={styles.toggleContainer}>
                    <Text style={[styles.toggleLabel, {color: theme.text}]}>Card View</Text>
                    <Switch
                      trackColor={{ false: "#E0E0E0", true: "#F7B500" }}
                      thumbColor={readerSettings.useCardView ? "#FFFFFF" : "#FFFFFF"}
                      ios_backgroundColor="#E0E0E0"
                      onValueChange={(value) => handleDefaultReaderToggle(value)}
                      value={readerSettings.useCardView}
                    />
                  </View>

                  <Text style={[styles.modalSectionTitle, {color: theme.text}]}>Font Size</Text>
                  <View style={styles.sliderContainer}>
                    <Text style={[styles.sliderLabel, { color: theme.text }]}>A</Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={MIN_FONT_SIZE}
                      maximumValue={MAX_FONT_SIZE}
                      value={readerSettings.fontSize}
                      onValueChange={handleFontSizeChange}
                      minimumTrackTintColor={theme.progressBarFill} 
                      maximumTrackTintColor={theme.sliderTrack}
                      thumbTintColor={theme.progressBarFill} 
                    />
                    <Text style={[styles.sliderLabelLarge, { color: theme.text }]}>A</Text>
                  </View>

                  <Text style={[styles.modalSectionTitle, {color: theme.text, marginTop: 16}]}>Line Spacing</Text>
                  <View style={styles.lineHeightButtons}>
                    {(Object.keys(CARD_LINE_HEIGHT_PRESETS) as LineHeightPreset[]).map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        style={[
                          styles.lineHeightButton,
                          { borderColor: theme.border, backgroundColor: readerSettings.lineHeightPreset === preset ? theme.progressBarFill : 'transparent' },
                        ]}
                        onPress={() => handleLineHeightChange(preset)}
                      >
                        <Text style={[
                          styles.lineHeightButtonText,
                          { color: readerSettings.lineHeightPreset === preset ? (readerSettings.theme === 'dark' ? theme.modalBackground : theme.bubbleBackground) : theme.text },
                        ]}>{preset.charAt(0).toUpperCase() + preset.slice(1).toLowerCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.modalSectionTitle, {color: theme.text, marginTop: 24}]}>Theme</Text>
                  <View style={styles.themeButtonsContainer}>
                    {(Object.keys(THEME_COLORS) as ThemeType[]).map((themeKey) => (
                      <TouchableOpacity
                        key={themeKey}
                        style={[
                          styles.themeButton,
                          { backgroundColor: THEME_COLORS[themeKey].bubbleBackground, borderColor: THEME_COLORS[themeKey].bubbleBorder },
                          readerSettings.theme === themeKey && styles.selectedThemeButton,
                          readerSettings.theme === themeKey && { borderColor: THEME_COLORS[themeKey].progressBarFill }
                        ]}
                        onPress={() => handleThemeChange(themeKey)}
                      />
                    ))}
                  </View>
                </RNAnimated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  backButton: {
    backgroundColor: 'rgba(247, 181, 0, 0.2)',
    borderRadius: 50,
    bottom: 80,
    elevation: 5,
    left: 20,
    padding: 4,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  lineHeightButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  lineHeightButtonText: {
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 14,
  },
  lineHeightButtons: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    width: '100%',
  },
  modalContent: {
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40, 
    paddingHorizontal: 20,
    paddingTop: 12,
    width: '100%',
  },
  modalHandle: {
    borderRadius: 2,
    height: 4,
    marginBottom: 20,
    width: 40,
  },
  modalOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSectionTitle: {
    alignSelf: 'flex-start',
    fontFamily: 'Feather Bold',
    fontSize: 16,
    marginBottom: 12,
  },
  selectedThemeButton: {
    borderWidth: 3,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
    width: '100%',
  },
  sliderContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 50, 
    width: '100%',
  },
  sliderLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    textAlign: 'center',
    width: 20,
  },
  sliderLabelLarge: {
    fontFamily: 'Inter-Medium',
    fontSize: 20,
    textAlign: 'center',
    width: 20,
  },
  themeButton: {
    borderRadius: 25,
    borderWidth: 2,
    height: 50,
    width: 50,
  },
  themeButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    width: '100%',
  },
  toggleContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(247, 181, 0, 0.1)',
    borderColor: '#F7B500',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 12,
    width: '100%',
  },
  toggleLabel: {
    fontFamily: 'Feather Bold',
    fontSize: 16,
  },
});

export default NewBibleReader;
