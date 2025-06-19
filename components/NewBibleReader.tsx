import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchChapter, Verse, ChapterResponse } from '~/app/api/bible';
import { usePathStore } from '~/app/stores/pathStore';
import { AntDesign, Feather, FontAwesome6, Ionicons, MaterialIcons } from '@expo/vector-icons';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Animated as RNAnimated } from 'react-native';
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
  Swipeable,
  GestureHandlerRootView,
  State,
  LongPressGestureHandler,
} from 'react-native-gesture-handler';
import VerseChatView from './VerseChatView';
import useHighlightStore, {
  HighlightColorKey,
  HIGHLIGHT_COLORS,
} from '~/app/stores/highlightStore';
import HighlightColorPicker from './HighlightColorPicker';
import useNoteStore from '~/app/stores/noteStore';
import NoteEditor from './NoteEditor';
import Animated from 'react-native-reanimated';
import { responsiveFontSize } from 'react-native-responsive-dimensions';
import { useDevotionalStore } from '~/app/stores/devotionalStore';
import { BibleVerseActionBar } from './BibleVerseActionBar';
import { RPH } from '~/app/helper/helper';
import { ImageBackground } from 'expo-image';
import { IS_ANDROID } from '~/app/utils/utils';
import i18n from '~/app/utils/i18n';
import { useLanguageStore } from '~/app/stores/languageStore';
import { ReaderSettings } from '~/app/stores/readerSettingsStore';

const FONT_SIZE_KEY = 'userNewBibleFontSize';
const DEFAULT_FONT_SIZE = 20;
const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 30;

const LINE_HEIGHT_KEY = 'userNewBibleLineHeight';
const LINE_HEIGHT_PRESETS = {
  COMPACT: 20,
  REGULAR: 24,
  RELAXED: 32,
} as const;
type LineHeightPreset = keyof typeof LINE_HEIGHT_PRESETS;

const TAP_GUIDANCE_KEY = 'userHideTapGuidance';
const SWIPE_GUIDANCE_KEY = 'userHideSwipeGuidance';
const READER_PREFERENCE_KEY = 'userDefaultReaderPreference';

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
const BIBLE_CHAPTER_COUNTS: { [bookId: number]: number } = {
  1: 50, // Genesis
  2: 40, // Exodus
  3: 27, // Leviticus
  4: 36, // Numbers
  5: 34, // Deuteronomy
  6: 24, // Joshua
  7: 21, // Judges
  8: 4, // Ruth
  9: 31, // 1 Samuel
  10: 24, // 2 Samuel
  11: 22, // 1 Kings
  12: 25, // 2 Kings
  13: 29, // 1 Chronicles
  14: 36, // 2 Chronicles
  15: 10, // Ezra
  16: 13, // Nehemiah
  17: 10, // Esther
  18: 42, // Job
  19: 150, // Psalms
  20: 31, // Proverbs
  21: 12, // Ecclesiastes
  22: 8, // Song of Solomon
  23: 66, // Isaiah
  24: 52, // Jeremiah
  25: 5, // Lamentations
  26: 48, // Ezekiel
  27: 12, // Daniel
  28: 14, // Hosea
  29: 3, // Joel
  30: 9, // Amos
  31: 1, // Obadiah
  32: 4, // Jonah
  33: 7, // Micah
  34: 3, // Nahum
  35: 3, // Habakkuk
  36: 3, // Zephaniah
  37: 2, // Haggai
  38: 14, // Zechariah
  39: 4, // Malachi
  40: 28, // Matthew
  41: 16, // Mark
  42: 24, // Luke
  43: 21, // John
  44: 28, // Acts
  45: 16, // Romans
  46: 16, // 1 Corinthians
  47: 13, // 2 Corinthians
  48: 6, // Galatians
  49: 6, // Ephesians
  50: 4, // Philippians
  51: 4, // Colossians
  52: 5, // 1 Thessalonians
  53: 3, // 2 Thessalonians
  54: 6, // 1 Timothy
  55: 4, // 2 Timothy
  56: 3, // Titus
  57: 1, // Philemon
  58: 13, // Hebrews
  59: 5, // James
  60: 5, // 1 Peter
  61: 3, // 2 Peter
  62: 5, // 1 John
  63: 1, // 2 John
  64: 1, // 3 John
  65: 1, // Jude
  66: 22, // Revelation
};

// For Bible navigation - Map book IDs to names
const BIBLE_BOOK_NAMES: { [bookId: number]: string } = {
  1: 'Genesis',
  2: 'Exodus',
  3: 'Leviticus',
  4: 'Numbers',
  5: 'Deuteronomy',
  6: 'Joshua',
  7: 'Judges',
  8: 'Ruth',
  9: '1 Samuel',
  10: '2 Samuel',
  11: '1 Kings',
  12: '2 Kings',
  13: '1 Chronicles',
  14: '2 Chronicles',
  15: 'Ezra',
  16: 'Nehemiah',
  17: 'Esther',
  18: 'Job',
  19: 'Psalms',
  20: 'Proverbs',
  21: 'Ecclesiastes',
  22: 'Song of Solomon',
  23: 'Isaiah',
  24: 'Jeremiah',
  25: 'Lamentations',
  26: 'Ezekiel',
  27: 'Daniel',
  28: 'Hosea',
  29: 'Joel',
  30: 'Amos',
  31: 'Obadiah',
  32: 'Jonah',
  33: 'Micah',
  34: 'Nahum',
  35: 'Habakkuk',
  36: 'Zephaniah',
  37: 'Haggai',
  38: 'Zechariah',
  39: 'Malachi',
  40: 'Matthew',
  41: 'Mark',
  42: 'Luke',
  43: 'John',
  44: 'Acts',
  45: 'Romans',
  46: '1 Corinthians',
  47: '2 Corinthians',
  48: 'Galatians',
  49: 'Ephesians',
  50: 'Philippians',
  51: 'Colossians',
  52: '1 Thessalonians',
  53: '2 Thessalonians',
  54: '1 Timothy',
  55: '2 Timothy',
  56: 'Titus',
  57: 'Philemon',
  58: 'Hebrews',
  59: 'James',
  60: '1 Peter',
  61: '2 Peter',
  62: '1 John',
  63: '2 John',
  64: '3 John',
  65: 'Jude',
  66: 'Revelation',
};

interface NewBibleReaderProps {
  bookId: number;
  chapter: number;
  translation?: string;
  isInPathMode?: boolean;
  isMapMode?: boolean; // NEW: Detect if we're in Map mode
  onNavigateBack?: () => void; // Callback for back navigation when in path mode
  onSwitchToDefaultReader?: () => void; // Notify parent to switch to default reader
  onHandoffChapterData?: (data: ChapterResponse | null) => void; // Handoff chapter data to parent
  onOpenSettings?: () => void; // Open shared settings sheet from parent
  isBibleReaderScreen?: boolean; // Whether this is the BibleReader screen
  readerSettings: ReaderSettings;
  THEME_COLORS: typeof THEME_COLORS;






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
  skipAnimation = false,
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

  return (
    <Text style={baseTextStyle} className={className}>
      {displayedText}
    </Text>
  );
};

// Get screen width for swipe distance calculations
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Colors to use for swipe action background gradient
const SWIPE_ACTION_COLOR = 'rgba(220, 178, 128, 0.15)'; // Soft amber color matching app theme

// Define swipe threshold and animation constants for better tuning
const SWIPE_THRESHOLD = 0.05; // Lower threshold for more responsive feel
const SWIPE_FEEDBACK_THRESHOLD = 0.02; // Provide feedback sooner
const SWIPE_INDICATOR_SHOW_THRESHOLD = 0.01; // Show indicator earlier
const CHAT_TRANSITION_DELAY = 0; // No delay for immediate response
const FADE_DURATION = 150; // Faster fade transition

// Define handler state change event type
interface HandlerStateChangeEvent {
  nativeEvent: {
    state: number;
    oldState?: number;
    absoluteX: number;
    absoluteY: number;
    x: number;
    y: number;
  };
}

// Define states and types for the floating menu
interface FloatingMenuState {
  isVisible: boolean;
  verse: Verse | null;
  position: {
    x: number;
    y: number;
  };
}

// Define icon type to match the Feather icon set
type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

// Menu item type with properly typed icon
interface MenuAction {
  id: string;
  icon: FeatherIconName;
  label: string;
  color: string;
  action: (verse: Verse) => void;
}
const TAB_BAR_HEIGHT = 64;

const NewBibleReader: React.FC<NewBibleReaderProps> = ({
  bookId,
  chapter,
  translation = 'ESV',
  isInPathMode = false,
  isMapMode = false, // NEW: Detect if we're in Map mode
  onNavigateBack,
  onOpenSettings,
  isBibleReaderScreen = false,
  readerSettings,
  THEME_COLORS,
}): JSX.Element => {
  const { fontSize, theme: currentTheme, lineHeightPreset, useCardView } = readerSettings;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [chapterData, setChapterData] = useState<ChapterResponse | null>(null);
  const [currentBookId, setCurrentBookId] = useState(bookId);
  const [currentChapter, setCurrentChapter] = useState(chapter);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoRenderTimer = useRef<NodeJS.Timeout | null>(null);
  const [showSwipeGuidance, setShowSwipeGuidance] = useState(true);
  const [isFadingToChat, setIsFadingToChat] = useState(false);

  // Add missing state variables from old code
  const [loading, setLoading] = useState(false);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [skipTyping, setSkipTyping] = useState(false);
  const [showTapGuidance, setShowTapGuidance] = useState(true);
  const [tapCount, setTapCount] = useState(0);

  // Add initial render ref
  const isInitialRender = useRef(true);

  // Animation values
  const fadeOpacity = useSharedValue(1);
  const menuScaleAnim = useSharedValue(0);
  const menuOpacityAnim = useSharedValue(0);
  const progressValue = useSharedValue(0);

  // Simple card animation for Map mode
  const [animatingCards, setAnimatingCards] = useState<Set<number>>(new Set());

  // State for floating menu
  const [floatingMenu, setFloatingMenu] = useState<FloatingMenuState>({
    isVisible: false,
    verse: null,
    position: {
      x: 0,
      y: 0,
    },
  });

  // State for chat view
  const [showChatView, setShowChatView] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const pathInProgress = usePathStore((s) => s.pathInProgress);
  const currentPath = usePathStore((s) => s.currentPath);
  const setSavedReading = usePathStore((s) => s.setSavedReading);

  // Add state to track scrolling
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  // Memoize theme to prevent recalculation on every render
  const theme = useMemo(() => {
    return THEME_COLORS[currentTheme as keyof typeof THEME_COLORS];
  }, [THEME_COLORS, currentTheme]);

  // Memoize verse text style to prevent recalculation on every render
  const verseTextStyle = useMemo(() => {
    const lineHeightMultiplier = LINE_HEIGHT_PRESETS[lineHeightPreset];
    const calculatedLineHeight = Math.round(fontSize * lineHeightMultiplier / 16);
    return { fontSize: fontSize, lineHeight: calculatedLineHeight };
  }, [fontSize, lineHeightPreset]);


  const hasFilteredRef = useRef(false);

  const markUnitAsCompleted = usePathStore((s) => s.markUnitAsCompleted);
  const setNextUnitPreview = usePathStore((s) => s.setNextUnitPreview);
  const setPathInProgress = usePathStore((s) => s.setPathInProgress);

  // home/user store helpers (mirrors BibleReader)
  const setHomeMode = useHomeStore((s) => s.setMode);
  const setSuccessType = useHomeStore((s) => s.setSuccessType);
  const setReadingCompleted = useHomeStore((s) => s.setReadingCompleted);
  const readingCompleted = useHomeStore((s) => s.readingCompleted);
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
  // Devotional store actions
  const createAIDevotional = useDevotionalStore((s) => s.createAIDevotional);
  const isCreatingDevotional = useDevotionalStore((s) => s.isCreatingDevotional);


  // Track translation changes in analytics
  useEffect(() => {
    analytics.setUserProperties({ translation });
  }, [translation]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const hideSwipeGuidance = await AsyncStorage.getItem(SWIPE_GUIDANCE_KEY);
        if (hideSwipeGuidance === 'true') {
          setShowSwipeGuidance(false);
        }
      } catch (e) {
        console.error('Failed to load settings from AsyncStorage', e);
      }
          };
      loadSettings();
    }, []);

  // Helper function to load a chapter
  const loadChapter = useCallback(
    async (bookId: number, chapter: number) => {
      setLoading(true);
      if (isMapMode) {
        setCurrentIndex(0); // Reset to first verse when loading a new chapter for Map mode
        setIsTypingComplete(false);
        setSkipTyping(false);
        progressValue.value = withTiming(0, { duration: 0 });
      }

      try {
        console.log(
          `📖 [NewBibleReader] Loading chapter - bookId: ${bookId}, chapter: ${chapter}, translation: ${translation}`
        );

        const res = await fetchChapter(translation, bookId, chapter);
        if (res && !('error' in res)) {
          // Update internal tracking of current book and chapter
          setCurrentBookId(bookId);
          setCurrentChapter(chapter);
          console.log(
            `📖 [NewBibleReader] Updated internal state - bookId: ${bookId}, chapter: ${chapter}`
          );

          // Update chapter data immediately without transition
          setChapterData(res);
          
          // Save to the store for persistence (same as regular BibleReader)
          setSavedReading(res.book, bookId, res.chapter);
          
          setLoading(false);
          return true;
        }
        setLoading(false);
        return false;
      } catch (error) {
        console.error('Error loading chapter:', error);
        setLoading(false);
        return false;
      }
    },
    [translation, setSavedReading, progressValue, isMapMode]
  );

  useEffect(() => {
    const updateUIState = async () => {
      if (chapterData) {
        // Update internal tracking of current book and chapter
        setCurrentBookId(bookId);
        setCurrentChapter(chapter);
        // Set index to show all verses after data is loaded
        setCurrentIndex(chapterData.verses.length - 1);
        console.log(
          `📖 [NewBibleReader] Updated internal state - bookId: ${bookId}, chapter: ${chapter}`
        );
      }
    };

    updateUIState();
  }, [bookId, chapter, chapterData, setSavedReading]);

  // Check if user is at the end chapter of their path
  const isAtEndChapter = useMemo(() => {
    if (!currentPath || !chapterData) return false;
    return currentBookId === currentPath.bookId && currentChapter === currentPath.endChapter;
  }, [currentPath, currentBookId, currentChapter, chapterData]);

  // Reset hasScrolledToBottom when chapter changes
  useEffect(() => {
    setHasScrolledToBottom(false);
  }, [currentBookId, currentChapter]);

  // Function to navigate to the next chapter
  const navigateToNextChapter = useCallback(() => {
    // Add haptic feedback for navigation
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const chaptersInCurrentBook = BIBLE_CHAPTER_COUNTS[currentBookId];

    if (currentChapter >= chaptersInCurrentBook) {
      // At the last chapter of current book, go to next book
      const nextBookId = currentBookId + 1;

      if (nextBookId <= 66) {
        // 66 books in the Bible
        const nextBookName = BIBLE_BOOK_NAMES[nextBookId] || 'Next Book';
        console.log(`End of ${chapterData?.book} reached. Navigating to ${nextBookName} 1`);
        loadChapter(nextBookId, 1);
      } else {
        // Reached the end of the Bible
        console.log('Reached the end of the Bible');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          'End of the Bible',
          "You've reached Revelation 22, the last chapter of the Bible."
        );
      }
    } else {
      // Go to next chapter in current book
      loadChapter(currentBookId, currentChapter + 1);
    }
  }, [currentBookId, currentChapter, chapterData, loadChapter]);

  // Function to navigate back to the previous chapter
  const navigateToPreviousChapter = useCallback(() => {
    // Add haptic feedback for navigation
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (currentBookId === 1 && currentChapter === 1) return; // Genesis 1:1, can't go back
    if (currentChapter > 1) {
      loadChapter(currentBookId, currentChapter - 1);
    } else if (currentBookId > 1) {
      const prevBookId = currentBookId - 1;
      const lastChapter = BIBLE_CHAPTER_COUNTS[prevBookId];
      loadChapter(prevBookId, lastChapter);
    }
  }, [currentBookId, currentChapter, loadChapter]);

  useEffect(() => {
    // Initial chapter load
    if (isInitialRender.current) {
      // Pre-fetch the chapter data before rendering
      fetchChapter(translation, bookId, chapter).then((res) => {
        if (!('error' in res)) {
          setChapterData(res);
          setCurrentBookId(bookId);
          setCurrentChapter(chapter);
          if (isMapMode) {
            setCurrentIndex(0); // Start with first verse only for Map mode
          } else {
            setCurrentIndex(res.verses.length - 1); // Show all verses for other screens
          }
        }
        isInitialRender.current = false;
      });
    }
    // Remove the else block that was causing the issue
  }, [bookId, chapter, translation, isMapMode]);

  useEffect(() => {
    if (chapterData?.verses?.length) {
      // Calculate progress based on current index, starting from 1 card
      const newProgress = (currentIndex + 1) / chapterData.verses.length;
      progressValue.value = withTiming(newProgress, { duration: 600 });
    }
  }, [currentIndex, chapterData, progressValue]);

  // Remove scroll-based rendering
  const handleScroll = useCallback((event: any) => {
    setIsScrolling(true);

    // Check if scrolled to bottom for finish reading button
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const threshold = 50;
    const scrolledToBottomThreshold = contentSize.height - threshold;
    const bottomReached = layoutMeasurement.height + contentOffset.y >= scrolledToBottomThreshold;

    if (bottomReached && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }

    // Clear any existing timeout
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }

    // Set a timeout to mark scrolling as finished after 300ms of no scroll events
    scrollTimeout.current = setTimeout(() => {
      setIsScrolling(false);
    }, 300);
  }, [hasScrolledToBottom]);

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

    // Add completed map path to Firestore
    const addCompletedMapPath = useUserStore.getState().addCompletedMapPath;
    addCompletedMapPath({
      date: now,
      pathId: currentPath.pathId,
      pathTitle: currentPath.pathTitle,
      unitId: currentPath.unitId,
      unitTitle: currentPath.unitTitle,
      bookId: currentPath.bookId,
      startChapter: currentPath.startChapter,
      endChapter: currentPath.endChapter,
    });

    // next unit preview similar to default reader
    let nextUnit: any = null;
    const pathIdx = BIBLE_PATHS.findIndex((p) => p.id === currentPath.pathId);
    if (pathIdx !== -1) {
      const p = BIBLE_PATHS[pathIdx];
      const uIdx = p.units.findIndex((u) => u.id === currentPath.unitId);
      if (uIdx !== -1 && uIdx < p.units.length - 1) nextUnit = p.units[uIdx + 1];
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

    analytics.logEvent('CardBibleReader_Tapped_FinishReading', {
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
      },
    });
  }, [
    currentPath,
    chapterData,
    addCompletedReading,
    setLastReadingDate,
    getVersesReadTotal,
    getChaptersReadTotal,
    setVersesReadTotal,
    setChaptersReadTotal,
    markUnitAsCompleted,
    setNextUnitPreview,
    setPathInProgress,
    setHomeMode,
    setReadingCompleted,
    sawDailyBonus,
    prayerCompleted,
    reflectionCompleted,
    setSuccessType,
  ]);
console.log("RENDERING");

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
        AsyncStorage.setItem(TAP_GUIDANCE_KEY, 'true').catch((e) =>
          console.error('Failed to save tap guidance setting', e)
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
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 150);
    } else {
      // Reached the end of the chapter
      if (isInPathMode) {
        handleFinishReading();
      } else {
        navigateToNextChapter();
      }
    }
  }, [
    currentIndex,
    chapterData,
    isTypingComplete,
    showTapGuidance,
    tapCount,
    isScrolling,
    navigateToNextChapter,
    handleFinishReading,
    isInPathMode,
    isMapMode,
  ]);

  const handleTypingComplete = useCallback(() => {
    setIsTypingComplete(true);
  }, []);

  const handlePresentSettingsModal = useCallback(() => {
    // If a parent-provided settings handler exists, use it to open the
    // shared sheet so both readers reference one source of truth.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onOpenSettings?.();


    // If no parent handler is provided, do nothing instead of trying to show a local modal
    console.warn('No settings handler provided to NewBibleReader');
  }, [onOpenSettings]);

 




  // Handler for opening the selector
  const handleOpenSelector = useCallback(() => {
    console.log(
      `📖 [NewBibleReader] Opening selector with currentBookId: ${currentBookId}, currentChapter: ${currentChapter}`
    );
    console.log(`📖 [NewBibleReader] Props bookId: ${bookId}, chapter: ${chapter}`);
    console.log(
      `📖 [NewBibleReader] chapterData:`,
      chapterData ? `${chapterData.book} ${chapterData.chapter}` : 'null'
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showBookChapterSelector(
      currentBookId,
      currentChapter,
      (newBookId: number, newChapter: number) => {
        console.log(
          `📖 [NewBibleReader] Selector callback - newBookId: ${newBookId}, newChapter: ${newChapter}`
        );
        loadChapter(newBookId, newChapter);
      }
    );
  }, [
    currentBookId,
    currentChapter,
    bookId,
    chapter,
    showBookChapterSelector,
    loadChapter,
    chapterData,
  ]);

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
        (v) => v.verse >= startVerse && v.verse <= endVerse
      );
      setChapterData({ ...chapterData, verses: filtered });
      hasFilteredRef.current = true;
    }
  }, [chapterData, isInPathMode, currentPath, bookId, chapter]);

  // Track swipe progress
  const swipeProgress = useRef({
    isActive: false,
    verse: null as Verse | null,
  });

  // Add refs to track swipeables for auto-closing
  const swipeableRefs = useRef<Map<number, any>>(new Map());
  const viewRefs = useRef<Map<number, any>>(new Map());

  // Add cleanup effect for animations
  useEffect(() => {
    return () => {
      // Reset all animation values on unmount
      if (fadeOpacity) fadeOpacity.value = 1;
      if (menuScaleAnim) menuScaleAnim.value = 0;
      if (menuOpacityAnim) menuOpacityAnim.value = 0;
      if (progressValue) progressValue.value = 0;
    };
  }, [fadeOpacity, menuScaleAnim, menuOpacityAnim, progressValue]);

  // Update handleSwipeVerseToChat
  const handleSwipeVerseToChat = useCallback(
    (verse: Verse) => {
      if (isFadingToChat) return;

      if (showSwipeGuidance) {
        setShowSwipeGuidance(false);
        AsyncStorage.setItem(SWIPE_GUIDANCE_KEY, 'true').catch((e) =>
          console.error('Failed to save swipe guidance setting', e)
        );
      }

      setIsFadingToChat(true);
      setSelectedVerse(verse);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Reset animation value before starting new animation
      fadeOpacity.value = 1;
      fadeOpacity.value = withTiming(0, {
        duration: FADE_DURATION,
        easing: Easing.out(Easing.cubic),
      });

      setTimeout(() => {
        setShowChatView(true);
      }, FADE_DURATION);

      setTimeout(() => {
        const swipeableRef = swipeableRefs.current.get(verse.verse);
        if (swipeableRef) {
          swipeableRef.close();
        }
      }, 50);

      analytics.logEvent('CardBibleReader_Swiped_VerseToChat', {
        book: chapterData?.book,
        chapter: chapterData?.chapter,
        verse: verse.verse,
      });
    },
    [isFadingToChat, showSwipeGuidance, fadeOpacity, chapterData]
  );

  // Update handleCloseChatView
  const handleCloseChatView = useCallback(() => {
    setShowChatView(false);
    setSelectedVerse(null);
    setIsFadingToChat(false);
    //commented out to fix bug where the chat view would not fade out
    // Reset animation value before starting new animation
    fadeOpacity.value = 0;
    fadeOpacity.value = withTiming(1, {
      duration: FADE_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  }, [fadeOpacity]);

  // Update handleLongPress
  const handleLongPress = useCallback(
    (event: any, verse: Verse) => {
      if (isFadingToChat) return;

      // Center the menu on screen
      const MENU_WIDTH = 180; // Width of the menu
      const menuX = (SCREEN_WIDTH - MENU_WIDTH) / 2;
      const menuY = (SCREEN_HEIGHT - 350) / 2; // 160 is approximate menu height

      setFloatingMenu({
        isVisible: true,
        verse: verse,
        position: { x: menuX, y: menuY },
      });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Reset animation values before starting new animations
      menuScaleAnim.value = 0;
      menuOpacityAnim.value = 0;

      menuScaleAnim.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.back(1.5)),
      });

      menuOpacityAnim.value = withTiming(1, {
        duration: 150,
      });
    },
    [isFadingToChat, menuScaleAnim, menuOpacityAnim]
  );

  // Update handleCloseFloatingMenu
  const handleCloseFloatingMenu = useCallback(() => {
    // Reset animation values before starting new animations
    menuScaleAnim.value = 1;
    menuOpacityAnim.value = 1;

    menuScaleAnim.value = withTiming(0, { duration: 100 });
    menuOpacityAnim.value = withTiming(0, { duration: 100 });

    setTimeout(() => {
      setFloatingMenu((prev) => ({
        ...prev,
        isVisible: false,
        verse: null,
      }));
    }, 100);
  }, [menuScaleAnim, menuOpacityAnim]);

  // Handle swipe verse to Devotional
  const handleSwipeVerseToDevotional = useCallback(
    async (verse: Verse) => {
      if (isFadingToChat || isCreatingDevotional) return;

      // Immediate haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Close the swipeable immediately
      const swipeableRef = swipeableRefs.current.get(verse.verse);
      swipeableRef?.close();

      if (chapterData) {
        const reference = `${chapterData.book} ${chapterData.chapter}:${verse.verse}`;
        
        // Navigate to LoadingScreen first
        router.push({
          pathname: '/onboarding/LoadingScreen',
          params: {
            isOnboarding: 'false',
            fromSwipe: 'true',
            verseText: verse.text,
            reference: reference,
          },
        });

        // Start AI devotional creation in the background
        try {
          await createAIDevotional(
            verse.text,
            reference,
            chapterData.book,
            chapterData.chapter,
            verse.verse
          );
        } catch (error) {
          console.error('Failed to create AI devotional:', error);
        }
      }

      analytics.logEvent('CardBibleReader_Swiped_VerseToDevotional', {
        book: chapterData?.book,
        chapter: chapterData?.chapter,
        verse: verse.verse,
      });
    },
    [isFadingToChat, isCreatingDevotional, chapterData, router, createAIDevotional]
  );

  // Handle left swipe to show menu
  const handleSwipeVerseToMenu = useCallback((verse: Verse) => {
    if (isFadingToChat || floatingMenu.isVisible) return;

    // Hide swipe guidance after first use
    if (showSwipeGuidance) {
      setShowSwipeGuidance(false);
      AsyncStorage.setItem(SWIPE_GUIDANCE_KEY, 'true').catch((e) =>
        console.error('Failed to save swipe guidance setting', e)
      );
    }

    // Get the verse widget's position from the view ref
    const viewRef = viewRefs.current.get(verse.verse);
    if (!viewRef) return;

    viewRef.measure(
      (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        const menuX = pageX + width / 2 - 90;
        const menuY = pageY + height / 2 - 40;

        setFloatingMenu({
          isVisible: true,
          verse: verse,
          position: { x: menuX, y: menuY },
        });

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        menuScaleAnim.value = 0.7;
        menuOpacityAnim.value = 0;

        menuScaleAnim.value = withTiming(1, {
          duration: 250,
          easing: Easing.out(Easing.back(1.8)),
        });

        menuOpacityAnim.value = withTiming(1, {
          duration: 200,
        });

        setTimeout(() => {
          const swipeableRef = swipeableRefs.current.get(verse.verse);
          if (swipeableRef) {
            swipeableRef.close();
          }
        }, 100);

        analytics.logEvent('BibleReader_Swiped_VerseToMenu', {
          book: chapterData?.book,
          chapter: chapterData?.chapter,
          verse: verse.verse,
        });
      }
    );
  }, [isFadingToChat, floatingMenu.isVisible, showSwipeGuidance, menuScaleAnim, menuOpacityAnim, chapterData]);

  // Memoize the swipe handlers with useCallback
  const handleSwipeStart = useCallback((verse: Verse) => {
    if (isFadingToChat) return;
    swipeProgress.current.isActive = true;
    swipeProgress.current.verse = verse;
  }, [isFadingToChat]);

  const handleSwipeRelease = useCallback((openRatio: number, verse: Verse) => {
    if (isFadingToChat) return;
    if (openRatio > SWIPE_THRESHOLD && swipeProgress.current.isActive) {
      handleSwipeVerseToChat(verse);
    }
    swipeProgress.current.isActive = false;
  }, [isFadingToChat, handleSwipeVerseToChat]);

  const handleLeftSwipeRelease = useCallback((openRatio: number, verse: Verse) => {
    if (isFadingToChat) return;
    if (openRatio > 0.05 && swipeProgress.current.isActive) {
      handleSwipeVerseToDevotional(verse);
    }
    swipeProgress.current.isActive = false;
  }, [isFadingToChat, handleSwipeVerseToDevotional]);

  const handleSwipeChange = useCallback((progress: number) => {
    if (isFadingToChat) return;
    if (progress > 0 && swipeProgress.current.isActive) {
      if (progress > SWIPE_FEEDBACK_THRESHOLD && progress < SWIPE_FEEDBACK_THRESHOLD + 0.02) {
        Haptics.selectionAsync();
      }
    }
  }, [isFadingToChat]);

  // Optimize the swipe action renderers with useCallback
  const renderRightActions = useCallback((_progress: any, dragX: any, verse: Verse) => {
    if (!swipeProgress.current.isActive && !isFadingToChat) {
      handleSwipeStart(verse);
    }

    const translateX = dragX.interpolate({
      inputRange: [-70, -20, 0],
      outputRange: [0, 10, 60],
      extrapolate: 'clamp',
    });

    const progressValue = _progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    progressValue.__getValue && handleSwipeChange(progressValue.__getValue());

    return (
      <RNAnimated.View style={styles.swipeActionContainer}>
        <RNAnimated.View
          style={[
            styles.swipeActionContent,
            {
              opacity: _progress.interpolate({
                inputRange: [0.03, 0.1, 0.3],
                outputRange: [0, 0.8, 1],
                extrapolate: 'clamp',
              }),
              transform: [
                {
                  scale: _progress.interpolate({
                    inputRange: [0.03, 0.3],
                    outputRange: [0.8, 1],
                    extrapolate: 'clamp',
                  }),
                },
                { translateX },
              ],
            },
          ]}>
          <Ionicons name="chatbubble-ellipses" size={30} color="#634012" style={{ opacity: 0.5 }} />
        </RNAnimated.View>
      </RNAnimated.View>
    );
  }, [handleSwipeStart, handleSwipeChange, isFadingToChat]);

  const renderLeftActions = useCallback((_progress: any, dragX: any, verse: Verse) => {
    if (!swipeProgress.current.isActive && !isFadingToChat) {
      handleSwipeStart(verse);
    }

    const translateX = dragX.interpolate({
      inputRange: [0, 20, 70],
      outputRange: [-60, -10, 0],
      extrapolate: 'clamp',
    });

    const progressValue = _progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    progressValue.__getValue && handleSwipeChange(progressValue.__getValue());

    return (
      <RNAnimated.View style={styles.swipeActionContainer}>
        <RNAnimated.View
          style={[
            styles.swipeActionContent,
            {
              opacity: _progress.interpolate({
                inputRange: [0.03, 0.1, 0.3],
                outputRange: [0, 0.8, 1],
                extrapolate: 'clamp',
              }),
              transform: [
                {
                  scale: _progress.interpolate({
                    inputRange: [0.03, 0.3],
                    outputRange: [0.8, 1],
                    extrapolate: 'clamp',
                  }),
                },
                { translateX },
              ],
            },
          ]}>
          <FontAwesome6 name="book" size={25} color="#634012" style={{ opacity: 0.5 }} />
        </RNAnimated.View>
      </RNAnimated.View>
    );
  }, [handleSwipeStart, handleSwipeChange, isFadingToChat]);

  // Optimize the Swipeable component props
  const swipeableProps = useCallback((verse: Verse) => ({
    renderRightActions: (progress: any, dragX: any) => renderRightActions(progress, dragX, verse),
    renderLeftActions: (progress: any, dragX: any) => renderLeftActions(progress, dragX, verse),
    onSwipeableOpen: (direction: string) => {
      if (direction === 'right') {
        handleSwipeVerseToChat(verse);
      } else if (direction === 'left') {
        handleSwipeVerseToMenu(verse);
      }
    },
    onSwipeableClose: () => {
      if (swipeProgress.current.isActive) {
        swipeProgress.current.isActive = false;
      }
    },
    overshootRight: false,
    overshootLeft: false,
    friction: 0.8,
    rightThreshold: SCREEN_WIDTH * SWIPE_THRESHOLD,
    leftThreshold: SCREEN_WIDTH * SWIPE_THRESHOLD,
    enabled: !isFadingToChat && !floatingMenu.isVisible,
    containerStyle: { marginBottom: 8 },
    onSwipeableWillOpen: (direction: string) => {
      if (direction === 'right') {
        handleSwipeRelease(1, verse);
      } else if (direction === 'left') {
        handleLeftSwipeRelease(1, verse);
      }
    },
  }), [renderRightActions, renderLeftActions, handleSwipeVerseToChat, handleSwipeVerseToMenu, handleSwipeRelease, handleLeftSwipeRelease, isFadingToChat, floatingMenu.isVisible]);


  // Define menu actions
  const handleCopyVerse = (verse: Verse) => {
    if (!chapterData) return;

    Clipboard.setString(
      `${chapterData.book} ${chapterData.chapter}:${verse.verse} - ${verse.text}`
    );
    Toast.show({
      type: 'success',
      text1: i18n.t('verse_copied'),
      position: 'top',
      visibilityTime: 2000,
    });

    handleCloseFloatingMenu();
  };

  const handleExplainVerse = (verse: Verse) => {
    // Transition to chat view with an "explain" prompt
    handleCloseFloatingMenu();

    // Set selected verse and start chat
    setSelectedVerse(verse);
    setIsFadingToChat(true);

    fadeOpacity.value = withTiming(0, {
      duration: FADE_DURATION,
      easing: Easing.out(Easing.cubic),
    });

    setTimeout(() => {
      setShowChatView(true);
    }, FADE_DURATION);
  };

  // Add highlight state
  const [isHighlightPickerVisible, setIsHighlightPickerVisible] = useState(false);
  const [verseToHighlight, setVerseToHighlight] = useState<Verse | null>(null);

  // Get highlight store methods
  const highlights = useHighlightStore((s) => s.highlights);
  const addHighlight = useHighlightStore((s) => s.addHighlight);
  const removeHighlight = useHighlightStore((s) => s.removeHighlight);
  const getHighlight = useHighlightStore((s) => s.getHighlight);
  const loadHighlights = useHighlightStore((s) => s.loadHighlights);
  const syncHighlights = useHighlightStore((s) => s.syncHighlights);

  // Add a reset highlights function
  const resetAndLoadHighlights = useCallback(() => {
    // Make a new request to load highlights whenever currentBookId/currentChapter changes
    console.log(`Resetting and loading highlights for ${currentBookId}:${currentChapter}`);
    loadHighlights();
  }, [currentBookId, currentChapter, loadHighlights]);

  // Load highlights when component mounts or when currentBookId/currentChapter changes
  useEffect(() => {
    resetAndLoadHighlights();
  }, [currentBookId, currentChapter, resetAndLoadHighlights]);

  // Sync highlights when component unmounts
  useEffect(() => {
    return () => {
      syncHighlights();
    };
  }, [syncHighlights]);

  // Modified highlight handler
  const handleHighlightVerse = (verse: Verse) => {
    // Set verse to highlight and show picker
    setVerseToHighlight(verse);

    // Check if the verse is already highlighted
    const existingHighlight = getHighlight(currentBookId, currentChapter, verse.verse);
    const initialColor = existingHighlight?.colorKey || null;

    // Show highlight picker with the verse preview
    setIsHighlightPickerVisible(true);

    // Analytics
    analytics.logEvent('BibleReader_Opened_HighlightPicker', {
      book: chapterData?.book,
      chapter: chapterData?.chapter,
      verse: verse.verse,
      isExistingHighlight: !!existingHighlight,
    });

    // Close floating menu
    handleCloseFloatingMenu();
  };

  // Function to apply verse highlight
  const handleApplyHighlight = (colorKey: HighlightColorKey | null) => {
    if (!verseToHighlight || !chapterData) return;

    // If colorKey is null, remove the highlight
    if (colorKey === null) {
      removeHighlight(currentBookId, currentChapter, verseToHighlight.verse);

      // Show removal confirmation
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Toast.show({
        type: 'success',
        text1: i18n.t('highlight_removed'),
        position: 'top',
        visibilityTime: 2000,
      });

      // Log the event
      analytics.logEvent('BibleReader_Removed_Highlight', {
        book: chapterData.book,
        chapter: chapterData.chapter,
        verse: verseToHighlight.verse,
      });
    } else {
      // Add highlight to store
      addHighlight(currentBookId, currentChapter, verseToHighlight.verse, colorKey);

      // Show confirmation
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Toast.show({
        type: 'success',
        text1: i18n.t('verse_highlighted'),
        position: 'top',
        visibilityTime: 2000,
      });

      // Log the event
      analytics.logEvent('BibleReader_Applied_Highlight', {
        book: chapterData.book,
        chapter: chapterData.chapter,
        verse: verseToHighlight.verse,
        color: colorKey,
      });
    }

    // Close picker
    setIsHighlightPickerVisible(false);
    setVerseToHighlight(null);
  };

  // Function to handle color picker closing
  const handleCloseHighlightPicker = () => {
    setIsHighlightPickerVisible(false);
    setVerseToHighlight(null);
  };

  // Function to remove highlight
  const handleRemoveHighlight = (verse: Verse) => {
    removeHighlight(currentBookId, currentChapter, verse.verse);

    // Show confirmation
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Toast.show({
      type: 'success',
      text1: i18n.t('highlight_removed'),
      position: 'top',
      visibilityTime: 2000,
    });

    // Log the event
    analytics.logEvent('BibleReader_Removed_Highlight', {
      book: chapterData?.book,
      chapter: chapterData?.chapter,
      verse: verse.verse,
    });
  };

  // Add state for managing note editor
  const [isNoteEditorVisible, setIsNoteEditorVisible] = useState(false);
  const [verseForNote, setVerseForNote] = useState<Verse | null>(null);

  // Get note store methods
  const getNote = useNoteStore((state) => state.getNote);
  const loadNotes = useNoteStore((state) => state.loadNotes);
  const syncNotes = useNoteStore((state) => state.syncNotes);

  // Remove the memoized getVerseHighlightColor function and replace with direct function
  const getVerseHighlightColor = (verse: Verse): string | null => {
    if (!verse) return null;
    const highlight = getHighlight(currentBookId, currentChapter, verse.verse);
    return highlight ? HIGHLIGHT_COLORS[highlight.colorKey] : null;
  };

  const hasNote = useCallback(
    (verse: Verse): boolean => {
      if (!verse) return false;
      return !!getNote(currentBookId, currentChapter, verse.verse);
    },
    [getNote, currentBookId, currentChapter]
  );

  // Load notes when component mounts
  const notesLoadedRef = useRef(false);
  useEffect(() => {
    // We avoid any initialization before the component mounts
    // by putting this inside useEffect
    // Only load notes if they haven't been loaded yet
    if (!notesLoadedRef.current) {
      loadNotes();
      notesLoadedRef.current = true;
    }
  }, [loadNotes]);

  // Sync notes when component unmounts
  useEffect(() => {
    return () => {
      syncNotes();
    };
  }, [syncNotes]);

  // Cleanup swipeable refs on unmount
  useEffect(() => {
    return () => {
      swipeableRefs.current.clear();
      viewRefs.current.clear();
    };
  }, []);

  // Update handleAddNote function
  const handleAddNote = (verse: Verse) => {
    // Set the verse for the note and show the editor
    setVerseForNote(verse);
    setIsNoteEditorVisible(true);

    // Log the event
    analytics.logEvent('BibleReader_Opened_NoteEditor', {
      book: chapterData?.book,
      chapter: chapterData?.chapter,
      verse: verse.verse,
    });

    handleCloseFloatingMenu();
  };

  // Function to close note editor
  const handleCloseNoteEditor = () => {
    setIsNoteEditorVisible(false);
    setVerseForNote(null);
  };

  // Floating menu animation styles
  const menuAnimatedStyle = useAnimatedStyle(() => ({
    opacity: menuOpacityAnim.value,
    transform: [{ scale: menuScaleAnim.value }],
  }));

  // Update menu actions to use the new highlight functionality
  const menuActions: MenuAction[] = [
    {
      id: 'copy',
      icon: 'copy',
      label: i18n.t('copy'),
      color: theme.iconColor,
      action: handleCopyVerse,
    },
    {
      id: 'explain',
      icon: 'book-open',
      label: i18n.t('explain'),
      color: theme.headerText,
      action: handleExplainVerse,
    },
    {
      id: 'highlight',
      icon: 'edit-2',
      label: i18n.t('highlight'),
      color: theme.progressBarFill,
      action: handleHighlightVerse,
    },
    {
      id: 'note',
      icon: 'edit-3',
      label: i18n.t('add_note'),
      color: theme.text,
      action: handleAddNote,
    },
  ];

  // Add animation values with initial states
  const fadeAnim = useSharedValue(0);
  const translateY = useSharedValue(50);
  
  // Animation for finish reading button
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(100);

  // Add animation effect
  useEffect(() => {
    // Ensure initial states are set
    fadeAnim.value = 0;
    translateY.value = 50;

    // Use a small delay to ensure component is mounted
      // Start animations together
      fadeAnim.value = withTiming(1, {
        duration: 2000,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
      translateY.value = withTiming(0, {
        duration: 2000,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });


  }, []);

  // Animation for finish reading button
  useEffect(() => {
    if (isInPathMode && isAtEndChapter && hasScrolledToBottom) {
      buttonOpacity.value = withTiming(1, { duration: 400 });
      buttonTranslateY.value = withTiming(0, { duration: 400 });
    } else {
      buttonOpacity.value = withTiming(0, { duration: 400 });
      buttonTranslateY.value = withTiming(100, { duration: 400 });
    }
  }, [isInPathMode, isAtEndChapter, hasScrolledToBottom]);

  // Subscribe to language changes to trigger re-render
  useLanguageStore((state) => state.language);

  // Create animated style for finish reading button
  const finishButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: buttonOpacity.value,
      transform: [{ translateY: buttonTranslateY.value }],
    };
  });

  // Memoize verses to show to prevent recalculation on every render
  const versesToShow: Verse[] = useMemo(() => {
    if (isMapMode) {
      // Map mode: show only up to currentIndex + 1 (old behavior)
      return chapterData?.verses?.slice(0, currentIndex + 1) || [];
    } else {
      // All other screens: show all verses (original behavior)
      return chapterData?.verses || [];
    }
  }, [chapterData?.verses, currentIndex, isMapMode]);

  // Memoize animated styles to prevent recreation on every render
  const animatedProgressStyle = useAnimatedStyle(() => {
    return { width: `${progressValue.value * 100}%` };
  });

  const fadeAnimStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeOpacity.value,
    };
  });

  const showBookChapterSelector = useUIStore((state) => state.showBookChapterSelector);

  // --- Add at the top of the component, after other hooks ---
  const cardSlideAnim = useSharedValue(0);

  useEffect(() => {
    if (isMapMode) {
      cardSlideAnim.value = 50; // Start below
      cardSlideAnim.value = withTiming(0, { duration: 400 }); // Animate up
    }
  }, [currentIndex, isMapMode]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardSlideAnim.value }],
    opacity: isMapMode ? (cardSlideAnim.value === 0 ? 1 : 1) : 1,
  }));

  // --- In the versesToShow.map render ---
  {versesToShow.map((verse, index) => {
    const highlightColor = getVerseHighlightColor(verse);
    const isCurrent = index === currentIndex && isMapMode;

    return (
      <LongPressGestureHandler
        key={verse.verse}
        minDurationMs={800}
        onHandlerStateChange={(e) => {
          if (e.nativeEvent.state === State.ACTIVE) {
            handleLongPress(e, verse);
          }
        }}>
        <View style={{ flex: 1 }}>
          {isCurrent ? (
            <Animated.View style={animatedStyle}>
              <Swipeable
                ref={(ref) => {
                  if (ref) {
                    swipeableRefs.current.set(verse.verse, ref);
                  } else {
                    swipeableRefs.current.delete(verse.verse);
                  }
                }}
                {...swipeableProps(verse)}>
                <View
                  className="bg-surfaceCreamLight"
                  style={[
                    styles.verseBubble,
                    {
                      backgroundColor: highlightColor
                        ? `${highlightColor}80`
                        : '#fff1c9',
                    },
                  ]}>
                  <View style={{ marginBottom: 12 }}>
                    <Text style={verseTextStyle} className="font-nunito-bold">
                      <Text className="text-brown/40">{`${verse.verse}. `}</Text>
                      {index === currentIndex ? (
                        <Text className="text-brown/70">
                          <TypingText
                            text={verse.text}
                            baseTextStyle={{}}
                            className="text-brown/70"
                            speed={20}
                            skipAnimation={skipTyping}
                            onComplete={handleTypingComplete}
                          />
                        </Text>
                      ) : (
                        <Text className="text-brown/70">{verse.text}</Text>
                      )}
                    </Text>
                  </View>
                </View>
              </Swipeable>
            </Animated.View>
          ) : (
            <View>
              <Swipeable
                ref={(ref) => {
                  if (ref) {
                    swipeableRefs.current.set(verse.verse, ref);
                  } else {
                    swipeableRefs.current.delete(verse.verse);
                  }
                }}
                {...swipeableProps(verse)}>
                <View
                  className="bg-surfaceCreamLight"
                  style={[
                    styles.verseBubble,
                    {
                      backgroundColor: highlightColor
                        ? `${highlightColor}80`
                        : '#fff1c9',
                    },
                  ]}>
                  <View style={{ marginBottom: 12 }}>
                    <Text style={verseTextStyle} className="font-nunito-bold">
                      <Text className="text-brown/40">{`${verse.verse}. `}</Text>
                      <Text className="text-brown/70">{verse.text}</Text>
                    </Text>
                  </View>
                </View>
              </Swipeable>
            </View>
          )}
        </View>
      </LongPressGestureHandler>
    );
  })}

  // Update versesToShow to match old code logic
  // Add loading state handling
  // if ((loading || !chapterData) && isMapMode) {
  //   return (
  //     <SafeAreaView
  //       style={{ backgroundColor: theme.background, flex: 1 }}
  //       className="items-center justify-center">
  //       <ActivityIndicator size="large" color={theme.progressBarFill} />
  //     </SafeAreaView>
  //   );
  // }

  // Render chat view if active
  if (showChatView && selectedVerse && chapterData) {
    return (
      <VerseChatView
        verse={selectedVerse}
        bookName={chapterData.book}
        chapter={chapterData.chapter}
        onClose={handleCloseChatView}
      />
    );
  }
  
  return (
 <View className='flex-1'>
      <Animated.View style={{ position: 'absolute', width: '100%', height: '100%' }}>
          <ImageBackground
            source={require('../assets/backgrounds/mainBackground2.png')}
            style={{ width: '100%', height: '100%' }}>
            <Image
              source={require('../assets/backgrounds/mainBackground2.png')}
              style={{ width: '100%', height: '100%' }}
            />
          </ImageBackground>
        </Animated.View>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <View
            className="bg-surfaceCream rounded-t-card "
            style={{ width: '100%', height: IS_ANDROID ? '85%' : '95%', position: 'absolute', bottom: 0 }}>
            {/* Title and Navigation Arrows Row */}
           
              <View style={{ position: 'absolute', left: 20, right: 20, top: -50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                {isInPathMode && onNavigateBack ? (
                  <TouchableOpacity
                    onPress={onNavigateBack}
                    className="flex-row items-center"
                    style={{ flex: 1 }}>
                    <Feather name="arrow-left" size={24} color="white" />
                    <Text
                      className="font-feather text-white ml-2"
                      style={{
                        fontSize: responsiveFontSize(3),
                        fontWeight: '400',
                      }}>
                      Map
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text
                    className="font-feather text-white"
                    style={{
                      fontSize: responsiveFontSize(3),
                      fontWeight: '400',
                    }}>
                    {i18n.t('bible_title')}
                  </Text>
                )}
                
         
                 <TouchableOpacity
        onPress={handlePresentSettingsModal}
        className="bg-white/80 w-10 h-10 rounded-full items-center justify-center">
        <MaterialIcons name="settings" size={22} color="#795323" style={{ opacity: 0.4 }} />
      </TouchableOpacity>
              </View>
        

            {/* Absolute background to cover outer safe areas */}
            <View style={{ ...StyleSheet.absoluteFillObject }} pointerEvents="none" />

            <Reanimated.View
              style={[
                { flex: 1, paddingBottom: !isMapMode ? RPH(10) : 0 , paddingHorizontal: 16, paddingTop: 16 },
                fadeAnimStyle,
              ]}>
              {/* HEADER: Bible Book/Chapter, tap to open selector, styled like bibleReader.tsx */}
              {isBibleReaderScreen ? null : <View className="flex-row items-center justify-between mb-3  px-[4px] py-[10px]">
                <View className="flex-row items-center">
                  {isInPathMode && onNavigateBack && (
                    <TouchableOpacity
                      onPress={onNavigateBack}
                      className="mr-2 bg-[#DCB28033] rounded-[22px] p-[6px]"
                      disabled={isFadingToChat}>
                      <Feather name="arrow-left" size={20} color={theme.iconColor} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={{ width: '100%', justifyContent: 'center', alignItems: 'center' }}>
                  <TouchableOpacity onPress={handleOpenSelector}>
                    <Text
                      className="font-feather text-textPrimary/30 text-center"
                      style={{
                        fontSize: responsiveFontSize(2),
                        fontWeight: '600',
                      }}>
                      {chapterData ? `${chapterData.book} ${chapterData.chapter}` : i18n.t('loading')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>}
              {/* Add progress bar at the top */}
              {!isMapMode ? null : <View
                  style={{
                    height: 12,
                    borderRadius: 12,
                    marginVertical: 8,
                    overflow: 'hidden',
                  }}
                className="bg-brown/5">
                  <Reanimated.View
                    style={[
                      {
                        height: '100%',
                        backgroundColor: theme.progressBarFill,
                        borderRadius: 2,
            
                      },
                      animatedProgressStyle,
                    ]}
                  />
              </View>}
              <ScrollView
                ref={scrollViewRef}
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: 10, paddingBottom: 45 }}
                onScroll={handleScroll}
                onScrollBeginDrag={() => setIsScrolling(true)}
                onScrollEndDrag={handleScroll}
                onMomentumScrollBegin={() => setIsScrolling(true)}
                onMomentumScrollEnd={handleScroll}
                scrollEventThrottle={16}
                bounces={!isFadingToChat}
                scrollEnabled={!isFadingToChat}
                onTouchEnd={() => {
                  // Only apply tap-to-advance behavior for Map mode
                  // REMOVED: This was causing duplicate card rendering
                  // The TouchableWithoutFeedback onPress handles Map mode taps
                }}>
                {/* Wrap TouchableWithoutFeedback with GestureHandlerRootView for proper functioning of gestures */}
                <GestureHandlerRootView style={{ flex: 1 }}>
                  {isMapMode ? (
                    <TouchableWithoutFeedback onPress={handleNextVerse}>
                      <View style={{ minHeight: '100%' }}>
                        {versesToShow.map((verse, index) => {
                          const highlightColor = getVerseHighlightColor(verse);
                          const isCurrent = index === currentIndex && isMapMode;

                          return (
                            <LongPressGestureHandler
                              key={verse.verse}
                              minDurationMs={800}
                              onHandlerStateChange={(e) => {
                                if (e.nativeEvent.state === State.ACTIVE) {
                                  handleLongPress(e, verse);
                                }
                              }}>
                              <View style={{ flex: 1 }}>
                                {isCurrent ? (
                                  <Animated.View style={animatedStyle}>
                                    <Swipeable
                                      ref={(ref) => {
                                        if (ref) {
                                          swipeableRefs.current.set(verse.verse, ref);
                                        } else {
                                          swipeableRefs.current.delete(verse.verse);
                                        }
                                      }}
                                      {...swipeableProps(verse)}>
                                      <View
                                        className="bg-surfaceCreamLight"
                                        style={[
                                          styles.verseBubble,
                                          {
                                            backgroundColor: highlightColor
                                              ? `${highlightColor}80`
                                              : '#fff1c9',
                                          },
                                        ]}>
                                        <View style={{ marginBottom: 12 }}>
                                          <Text style={verseTextStyle} className="font-nunito-bold">
                                            <Text className="text-brown/40">{`${verse.verse}. `}</Text>
                                            {index === currentIndex ? (
                                              <Text className="text-brown/70">
                                                <TypingText
                                                  text={verse.text}
                                                  baseTextStyle={{}}
                                                  className="text-brown/70"
                                                  speed={20}
                                                  skipAnimation={skipTyping}
                                                  onComplete={handleTypingComplete}
                                                />
                                              </Text>
                                            ) : (
                                              <Text className="text-brown/70">{verse.text}</Text>
                                            )}
                                          </Text>
                                        </View>
                                      </View>
                                    </Swipeable>
                                  </Animated.View>
                                ) : (
                                  <View>
                                    <Swipeable
                                      ref={(ref) => {
                                        if (ref) {
                                          swipeableRefs.current.set(verse.verse, ref);
                                        } else {
                                          swipeableRefs.current.delete(verse.verse);
                                        }
                                      }}
                                      {...swipeableProps(verse)}>
                                      <View
                                        className="bg-surfaceCreamLight"
                                        style={[
                                          styles.verseBubble,
                                          {
                                            backgroundColor: highlightColor
                                              ? `${highlightColor}80`
                                              : '#fff1c9',
                                          },
                                        ]}>
                                        <View style={{ marginBottom: 12 }}>
                                          <Text style={verseTextStyle} className="font-nunito-bold">
                                            <Text className="text-brown/40">{`${verse.verse}. `}</Text>
                                            <Text className="text-brown/70">{verse.text}</Text>
                                          </Text>
                                        </View>
                                      </View>
                                    </Swipeable>
                                  </View>
                                )}
                              </View>
                            </LongPressGestureHandler>
                          );
                        })}

                        {/* Show tap guidance for Map mode */}
                        {currentIndex < (chapterData?.verses?.length || 0) - 1 ? (
                          <View style={{ alignItems: 'center', marginTop: 16 }}>
                            {showTapGuidance && (
                              <Text
                                style={{
                                  color: theme.headerText,
                                  fontFamily: 'DIN Next Rounded LT W01 Regular',
                                  fontSize: 16,
                                  opacity: 0.7,
                                }}>
                                {isTypingComplete ? 'Tap for next verse →' : 'Tap to show full verse'}
                              </Text>
                            )}
                          </View>
                        ) : null}
                      </View>
                    </TouchableWithoutFeedback>
                  ) : (
                    <Animated.View 
                      style={{ 
                        flex: 1,
                        opacity: fadeAnim,
                        transform: [{ translateY }],
                      }}>
                      <View style={{ minHeight: '100%' }} className='pb-12'>
                        {versesToShow.map((verse) => {
                          const highlightColor = getVerseHighlightColor(verse);
                          return (
                            <LongPressGestureHandler
                              key={verse.verse}
                              minDurationMs={800}
                              onHandlerStateChange={(e) => {
                                if (e.nativeEvent.state === State.ACTIVE) {
                                  handleLongPress(e, verse);
                                }
                              }}>
                              <View style={{ flex: 1 }}>
                                <Swipeable
                                  ref={(ref) => {
                                    if (ref) {
                                      swipeableRefs.current.set(verse.verse, ref);
                                    } else {
                                      swipeableRefs.current.delete(verse.verse);
                                    }
                                  }}
                                  {...swipeableProps(verse)}>
                                  <View
                                    className="bg-surfaceCreamLight"
                                    style={[
                                      styles.verseBubble,
                                      {
                                        backgroundColor: highlightColor
                                          ? `${highlightColor}80`
                                          : '#fff1c9',
                                      },
                                    ]}>
                                    <View style={{ marginBottom: 12 }}>
                                      <Text style={verseTextStyle} className="font-nunito-bold">
                                        <Text className="text-brown/40">{`${verse.verse}. `}</Text>
                                        <Text className="text-brown/70">{verse.text}</Text>
                                      </Text>
                                    </View>
                                  </View>
                                </Swipeable>
                              </View>
                            </LongPressGestureHandler>
                          );
                        })}
                      </View>
                    </Animated.View>
                  )}
                </GestureHandlerRootView>
              </ScrollView>
            </Reanimated.View>

            {/* Back button at bottom of screen */}
            {/* {showBackButton && !isFadingToChat && (
              <Reanimated.View
                entering={FadeIn.duration(300)}
                style={[styles.backButton, { backgroundColor: theme.progressBarBackground }]}>
                <TouchableOpacity
                  onPress={navigateToPreviousChapter}
                  accessibilityLabel="Go back to previous chapter"
                  disabled={isFadingToChat}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Feather name="chevron-left" size={24} color={theme.iconColor} />
                  </View>
                </TouchableOpacity>
              </Reanimated.View>
            )} */}

            {/* Render the local settings modal only when no shared handler is
          provided. */}

            

            {/* Floating menu overlay */}
            {floatingMenu.isVisible && floatingMenu.verse && (
              <TouchableWithoutFeedback onPress={handleCloseFloatingMenu}>
                <View style={styles.menuOverlay}>
                  <Reanimated.View
                    style={[
                      styles.floatingMenu,
                      {
                        top: floatingMenu.position.y,
                        left: floatingMenu.position.x,
                        backgroundColor: theme.bubbleBackground,
                        borderColor: theme.bubbleBorder,
                        borderWidth: 1,
                      },
                      menuAnimatedStyle,
                    ]}>
                    {menuActions.map((action) => (
                      <TouchableOpacity
                        key={action.id}
                        style={styles.menuItem}
                        onPress={() => action.action(floatingMenu.verse!)}
                        activeOpacity={0.7}>
                        <View
                          style={[
                            styles.menuIconContainer,
                            {
                              backgroundColor: `${action.color}22`, // Add transparency to icon background
                            },
                          ]}>
                          <Feather name={action.icon} size={18} color={action.color} />
                        </View>
                        <Text style={[styles.menuText, { color: theme.text }]}>{action.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </Reanimated.View>
                </View>
              </TouchableWithoutFeedback>
            )}

            {/* HighlightColorPicker modal */}
            {verseToHighlight && (
              <HighlightColorPicker
                isVisible={isHighlightPickerVisible}
                initialColor={
                  getHighlight(currentBookId, currentChapter, verseToHighlight.verse)?.colorKey ||
                  null
                }
                onClose={handleCloseHighlightPicker}
                onSelectColor={handleApplyHighlight}
                versePreview={verseToHighlight.text}
              />
            )}

            {/* Note Editor Modal */}
            {verseForNote && chapterData && (
              <NoteEditor
                isVisible={isNoteEditorVisible}
                bookId={currentBookId}
                chapter={currentChapter}
                verse={verseForNote.verse}
                verseText={verseForNote.text}
                bookName={chapterData.book}
                onClose={handleCloseNoteEditor}
              />
            )}
          </View>
        </SafeAreaView>

        {/* Finish Reading Button - only show in Map mode, at bottom of content */}
        {isMapMode && isInPathMode && isAtEndChapter && (
          <TouchableOpacity
            onPress={() => {
              if (isFadingToChat) return;
              console.log('📖 [NewBibleReader] Finish tapped');
              handleFinishReading();
            }}
            activeOpacity={0.8}
            disabled={isFadingToChat}>
            <View
              style={{
                backgroundColor: theme.progressBarBackground,
                paddingVertical: 12,
                alignItems: 'center',
                marginTop: 24,
                borderRadius: 12,
                marginHorizontal: 20,
                marginBottom: 20,
              }}>
              <Text
                style={{
                  color: theme.headerText,
                  fontFamily: 'Feather Bold',
                  fontSize: 16,
                }}>
                Finish Reading 🎉
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {isBibleReaderScreen && !isMapMode ? (
        <BibleVerseActionBar
          reference={`${chapterData?.book} ${chapterData?.chapter}`}
          onVersePress={handleOpenSelector}
          onPrev={navigateToPreviousChapter}
          onNext={isInPathMode && isAtEndChapter ? handleFinishReading : navigateToNextChapter}
          rightIconComponent={
            isInPathMode && isAtEndChapter ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: '#795323', fontFamily: 'Feather', fontSize: 12, marginRight: 4 }}>
                  Finish Reading
                </Text>
                <AntDesign name="check" size={14} color="#795222" />
              </View>
            ) : undefined
          }
        />
      ) : null}

 </View> 
)
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
    fontFamily: 'Nunito-Black',
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
  // Updated elegant swipe action styles
  swipeActionContainer: {
    height: '100%',
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeActionContent: {
    height: 50,
    width: 50,
    borderRadius: 100,
    backgroundColor: 'rgba(181, 125, 0, 0.15)',
    opacity: 0.2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(247, 181, 0, 0.2)',
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
    fontFamily: 'Nunito-Black',
    fontSize: 16,
  },
  // Floating menu styles with theme-compatible design
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.07)',
    zIndex: 1000,
  } as const,
  floatingMenu: {
    position: 'absolute',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: 180, // Reduced width for a more compact 2x2 grid
  } as const,
  menuItem: {
    alignItems: 'center',
    width: '50%', // Changed from 33% to 50% for 2x2 layout
    paddingVertical: 12,
    paddingHorizontal: 4,
  } as const,
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  } as const,
  menuText: {
    fontSize: 12,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    textAlign: 'center',
  } as const,
  actionIcon: {
    padding: 2, // Add some padding for easier touch
  },
  verseBubble: {
    paddingBottom: 5,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 2,
    borderColor: 'rgba(121, 83, 35, 0.1)', // Light brown border
  },
});

export default memo(NewBibleReader);