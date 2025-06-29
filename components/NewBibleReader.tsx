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
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchChapterWithCache, Verse, ChapterResponse } from '~/app/api/bible';
import { usePathStore } from '~/app/stores/pathStore';
import { AntDesign, Feather, FontAwesome6, Ionicons, MaterialIcons } from '@expo/vector-icons';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
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
import { THEME_COLORS } from '~/app/constants/theme';
import SideButton from './SideButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useSubscriptionStore from '~/app/stores/subscriptionStore';
import { hapticLight, hapticMedium, hapticWarning } from '~/utils/haptics';

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

// Add at the top of the file, after imports
// const chapterCache = new Map<string, any>(); // REMOVED: No more caching
// const LOADING_TIMEOUT = 300; // ms // REMOVED: No longer needed

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
  const { fontSize, theme: currentTheme, lineHeightPreset, useCardView, tapToShowNextCard } = readerSettings;

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

  // Add navigation loading state

  // Add note editor state
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [verseToNote, setVerseToNote] = useState<Verse | null>(null);

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

  // Use savedTranslation from pathStore instead of translation prop
  const savedTranslation = usePathStore((s) => s.savedTranslation);

  // Use savedTranslation instead of the translation prop
  const activeTranslation = savedTranslation || translation;

  // Add logging to see current path state
  // console.log('📖 [NewBibleReader] Current path state:', {
  //   pathInProgress,
  //   currentPath,
  //   isInPathMode
  // });

  // Add state to track scrolling
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  // Add state to track scroll progress when tap-to-show is disabled
  const [scrollProgress, setScrollProgress] = useState(0);

  // Add ref to throttle scroll progress updates
  const lastScrollUpdate = useRef(0);
  const SCROLL_THROTTLE_MS = 16; // ~60fps

  // Get UI store for the book chapter selector
  const showBookChapterSelector = useUIStore((state) => state.showBookChapterSelector);

  // Memoize theme to prevent recalculation on every render
  const theme = useMemo(() => {
    return THEME_COLORS[currentTheme as keyof typeof THEME_COLORS];
  }, [THEME_COLORS, currentTheme]);

  // Memoize verse text style to prevent recalculation on every render
  const verseTextStyle = useMemo(() => {
    const lineHeightMultiplier = LINE_HEIGHT_PRESETS[lineHeightPreset];
    const calculatedLineHeight = Math.round(fontSize * lineHeightMultiplier / 16);
    return { fontSize: fontSize, lineHeight: calculatedLineHeight, color: theme?.cardTextColor };
  }, [fontSize, lineHeightPreset, theme?.cardTextColor]);

  // Animation value for button container (using RNAnimated for these)
  const buttonsAnim = useRef(new RNAnimated.Value(0)).current; // 0: hidden, 1: visible

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
    analytics.setUserProperties({ translation: activeTranslation });
  }, [activeTranslation]);

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

  // Helper function to load a chapter - OPTIMIZED to match BibleReader
  const loadChapter = useCallback(
    async (bookId: number, chapter: number, isNavigation = false) => {
      console.log(`📖 [NewBibleReader] loadChapter called with bookId: ${bookId}, chapter: ${chapter}, isNavigation: ${isNavigation}`);

      // Prevent multiple simultaneous loads (same as BibleReader)
      if (loading) {
        console.log('📖 [NewBibleReader] Already loading, skipping');
        return false;
      }

      // Only show loading state for navigation, not initial load
      if (isNavigation) {
        setLoading(true);

        try {
          console.log(
            `📖 [NewBibleReader] Loading chapter - bookId: ${bookId}, chapter: ${chapter}, translation: ${translation}`
          );

          // Always fetch fresh data from API - no caching
          const result = await fetchChapterWithCache(translation, bookId, chapter);

          if ('error' in result) {
            console.error(`❌ Error loading chapter: ${result.message}`);
            setChapterData(null);
            return false;
          } else {
            console.log(`✅ Successfully loaded: ${result.book} ${result.chapter}`);

            // Update all state at once (same as BibleReader)
            setChapterData(result);
            setCurrentBookId(bookId);
            setCurrentChapter(result.chapter);

            // Save to the store for persistence (same as BibleReader)
            setSavedReading(result.book, bookId, result.chapter);

            // Handle map mode specific logic
            if (isMapMode) {
              if (readerSettings.tapToShowNextCard) {
                setCurrentIndex(0);
                setIsTypingComplete(false);
                setSkipTyping(false);
                progressValue.value = withTiming(0, { duration: 0 });
              } else {
                setCurrentIndex(result.verses.length - 1);
              }
            } else {
              setCurrentIndex(result.verses.length - 1);
            }

            // Scroll to top after loading new chapter
            scrollToTop();

            console.log(`📖 [NewBibleReader] Chapter loaded successfully: ${result.book} ${result.chapter}`);
            return true;
          }
        } catch (error) {
          console.error('Failed to load chapter', error);
          setChapterData(null);
          return false;
        } finally {
          setLoading(false);
        }
      } else {
        // For initial load, don't show loading state
        try {
          console.log(
            `📖 [NewBibleReader] Loading initial chapter - bookId: ${bookId}, chapter: ${chapter}, translation: ${translation}`
          );

          // Always fetch fresh data from API - no caching
          const result = await fetchChapterWithCache(translation, bookId, chapter);

          if ('error' in result) {
            console.error(`❌ Error loading chapter: ${result.message}`);
            setChapterData(null);
            return false;
          } else {
            console.log(`✅ Successfully loaded initial chapter: ${result.book} ${result.chapter}`);

            // Update all state at once (same as BibleReader)
            setChapterData(result);
            setCurrentBookId(bookId);
            setCurrentChapter(result.chapter);

            // Save to the store for persistence (same as BibleReader)
            setSavedReading(result.book, bookId, result.chapter);

            // Handle map mode specific logic
            if (isMapMode) {
              if (readerSettings.tapToShowNextCard) {
                setCurrentIndex(0);
                setIsTypingComplete(false);
                setSkipTyping(false);
                progressValue.value = withTiming(0, { duration: 0 });
              } else {
                setCurrentIndex(result.verses.length - 1);
              }
            } else {
              setCurrentIndex(result.verses.length - 1);
            }

            console.log(`📖 [NewBibleReader] Initial chapter loaded successfully: ${result.book} ${result.chapter}`);
            return true;
          }
        } catch (error) {
          console.error('Failed to load initial chapter', error);
          setChapterData(null);
          return false;
        }
      }
    },
    [activeTranslation, setSavedReading, progressValue, isMapMode, readerSettings.tapToShowNextCard]
  );

  // Reload chapter when translation (activeTranslation) changes
  useEffect(() => {
    if (chapterData) {
      console.log(`📖 [NewBibleReader] Detected translation change to ${activeTranslation}, reloading current chapter`);
      loadChapter(currentBookId, currentChapter);
    }
  }, [activeTranslation]);

  // Check if user is at the end chapter of their path
  const isAtEndChapter = useMemo(() => {
    if (!currentPath || !chapterData) return false;
    const result = currentBookId === currentPath.bookId && currentChapter === currentPath.endChapter;
    console.log('📖 [NewBibleReader] isAtEndChapter calculation:', {
      currentBookId,
      currentPathBookId: currentPath.bookId,
      currentChapter,
      currentPathEndChapter: currentPath.endChapter,
      result
    });
    return result;
  }, [currentPath, currentBookId, currentChapter, chapterData]);

  // Reset hasScrolledToBottom when chapter changes
  useEffect(() => {
    setHasScrolledToBottom(false);
    setScrollProgress(0); // Reset scroll progress when chapter changes

  }, [currentBookId, currentChapter]);

  // Reset scroll progress when tap-to-show setting changes
  useEffect(() => {
    if (isMapMode) {
      setScrollProgress(0);
      lastScrollUpdate.current = 0;
    }
  }, [isMapMode, readerSettings.tapToShowNextCard]);

  // Animation effect for navigation buttons
  useEffect(() => {
    console.log(
      `[AnimationEffect] hasScrolledToBottom changed to: ${hasScrolledToBottom}. Animating buttons.`
    );
    RNAnimated.timing(buttonsAnim, {
      toValue: hasScrolledToBottom ? 1 : 0,
      duration: 400,
      easing: RNEasing.out(RNEasing.quad),
      useNativeDriver: true,
    }).start();
  }, [hasScrolledToBottom, buttonsAnim]);

  // Function to scroll to top of the list
  const scrollToTop = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, 100);
  }, []);

  // Optimized navigation functions - use refs to avoid dependencies
  const navigationRef = useRef({
    currentBookId,
    currentChapter,
    loading,
    loadChapter: null as any,
  });

  // Update ref when values change
  useEffect(() => {
    navigationRef.current = {
      currentBookId,
      currentChapter,
      loading,
      loadChapter,
    };
  }, [currentBookId, currentChapter, loading, loadChapter]);

  // Optimized navigation functions with minimal dependencies
  const navigateToNextChapter = useCallback(() => {
    const { currentBookId, currentChapter, loading, loadChapter } = navigationRef.current;

    if (loading) return;

    hapticMedium();
    const chaptersInCurrentBook = BIBLE_CHAPTER_COUNTS[currentBookId];

    if (currentChapter >= chaptersInCurrentBook) {
      const nextBookId = currentBookId + 1;
      if (nextBookId <= 66) {
        loadChapter(nextBookId, 1, true); // isNavigation = true
      } else {
        hapticWarning()
        Alert.alert('End of the Bible', "You've reached Revelation 22, the last chapter of the Bible.");
      }
    } else {
      loadChapter(currentBookId, currentChapter + 1, true); // isNavigation = true
    }
  }, []); // No dependencies - uses ref

  const navigateToPreviousChapter = useCallback(() => {
    const { currentBookId, currentChapter, loading, loadChapter } = navigationRef.current;

    if (loading) return;

    hapticMedium();
    if (currentBookId === 1 && currentChapter === 1) return;

    if (currentChapter > 1) {
      loadChapter(currentBookId, currentChapter - 1, true); // isNavigation = true
    } else if (currentBookId > 1) {
      const prevBookId = currentBookId - 1;
      const lastChapter = BIBLE_CHAPTER_COUNTS[prevBookId];
      loadChapter(prevBookId, lastChapter, true); // isNavigation = true
    }
  }, []); // No dependencies - uses ref

  useEffect(() => {
    // Initial chapter load
    if (isInitialRender.current) {
      // Always fetch fresh data from API - no caching
      const loadInitialChapter = async () => {
        try {
          console.log('📖 [NewBibleReader] Loading initial chapter from API');
          const result = await fetchChapterWithCache(translation, bookId, chapter);

          if (!('error' in result)) {
            setChapterData(result);
            setCurrentBookId(bookId);
            setCurrentChapter(chapter);
            if (isMapMode) {
              setCurrentIndex(0); // Start with first verse only for Map mode
            } else {
              setCurrentIndex(result.verses.length - 1); // Show all verses for other screens
            }
          }
        } catch (error) {
          console.error('Error loading initial chapter:', error);
        } finally {
          isInitialRender.current = false;
        }
      };

      loadInitialChapter();
    }
    // Remove the else block that was causing the issue
  }, [bookId, chapter, translation]);

  // Memoize progress calculation to prevent unnecessary re-renders
  const calculatedProgress = useMemo(() => {
    if (!chapterData?.verses?.length) return 0;

    if (isMapMode && !readerSettings.tapToShowNextCard) {
      // Use scroll progress when tap-to-show is disabled
      return scrollProgress;
    } else {
      // Use current index progress when tap-to-show is enabled
      return (currentIndex + 1) / chapterData.verses.length;
    }
  }, [chapterData?.verses?.length, currentIndex, isMapMode, readerSettings.tapToShowNextCard, scrollProgress]);

  useEffect(() => {
    if (chapterData?.verses?.length) {
      progressValue.value = withTiming(calculatedProgress, { duration: 600 });
    }
  }, [calculatedProgress, progressValue]);

  // Remove scroll-based rendering
  const handleScroll = useCallback((event: any) => {
    setIsScrolling(true);

    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;

    // Calculate scroll progress when tap-to-show is disabled in map mode
    // Use throttling to prevent performance issues
    if (isMapMode && !readerSettings.tapToShowNextCard && contentSize.height > layoutMeasurement.height) {
      const now = Date.now();
      if (now - lastScrollUpdate.current >= SCROLL_THROTTLE_MS) {
        const scrollableHeight = contentSize.height - layoutMeasurement.height;
        const currentScrollPosition = contentOffset.y;
        const newScrollProgress = Math.min(Math.max(currentScrollPosition / scrollableHeight, 0), 1);

        // Only update if progress changed significantly (avoid unnecessary re-renders)
        if (Math.abs(newScrollProgress - scrollProgress) > 0.01) {
          setScrollProgress(newScrollProgress);
        }

        lastScrollUpdate.current = now;
      }
    }

    // Check if scrolled to bottom for finish reading button
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
  }, [hasScrolledToBottom, isMapMode, readerSettings.tapToShowNextCard, scrollProgress]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, []);

  // ---- FINISH READING HANDLER (needs to be in scope before handleNextVerse) ----
  const handleFinishReading = useCallback(() => {
    if (!currentPath || !chapterData) return;

    // haptic
    hapticMedium();

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

  // -----------------------------

  const handleNextVerse = useCallback(() => {
    if (!chapterData || isScrolling) return;

    // If tap-to-show-next-card is disabled in map mode, don't advance
    if (isMapMode && !readerSettings.tapToShowNextCard) {
      return;
    }

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
          scrollViewRef.current.scrollToEnd({ animated: false });
        }
      }, 150);
    } else {
      // Reached the end of the chapter
      if (isInPathMode) {
        // Use a ref to avoid dependency on handleFinishReading
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
    isInPathMode,
    isMapMode,
    readerSettings.tapToShowNextCard,
  ]);

  const handleTypingComplete = useCallback(() => {
    setIsTypingComplete(true);
  }, []);

  const handlePresentSettingsModal = useCallback(() => {
    // If a parent-provided settings handler exists, use it to open the
    // shared sheet so both readers reference one source of truth.
    hapticLight();
    onOpenSettings?.();


    // If no parent handler is provided, do nothing instead of trying to show a local modal
    console.warn('No settings handler provided to NewBibleReader');
  }, [onOpenSettings]);






  // Handler for opening the selector
  const handleOpenSelector = useCallback(() => {
    // Prevent opening selector while loading
    if (loading) return;

    console.log(
      `📖 [NewBibleReader] Opening selector with currentBookId: ${currentBookId}, currentChapter: ${currentChapter}`
    );
    console.log(`📖 [NewBibleReader] Props bookId: ${bookId}, chapter: ${chapter}`);
    console.log(
      `📖 [NewBibleReader] chapterData:`,
      chapterData ? `${chapterData.book} ${chapterData.chapter}` : 'null'
    );
    hapticLight();
    showBookChapterSelector(
      currentBookId,
      currentChapter,
      (newBookId: number, newChapter: number) => {
        console.log(
          `📖 [NewBibleReader] Selector callback - newBookId: ${newBookId}, newChapter: ${newChapter}`
        );
        loadChapter(newBookId, newChapter, true); // isNavigation = true
      }
    );
  }, [
    currentBookId,
    currentChapter,
    showBookChapterSelector,
    loadChapter,
    loading,
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

      hapticLight();

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

      hapticMedium();

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
      hapticMedium();

      // Close the swipeable immediately
      const swipeableRef = swipeableRefs.current.get(verse.verse);
      swipeableRef?.close();

      if (chapterData) {
        const reference = `${chapterData.book} ${chapterData.chapter}:${verse.verse}`;

        // Check if user is pro first
        const isProMember = useSubscriptionStore.getState().isProMember;

        // Start AI devotional creation BEFORE navigation if user is pro
        if (isProMember) {
          try {
            // Start the devotional creation process
            createAIDevotional(
              verse.text,
              reference,
              chapterData.book,
              chapterData.chapter,
              verse.verse
            );
            // Don't await - let it run in background while we navigate
          } catch (error) {
            console.error('Failed to start AI devotional creation:', error);
          }
        }

        // Small delay to ensure devotional creation has started
        setTimeout(() => {
          // Navigate to standalone devotional loading screen (bypasses onboarding)
          router.push({
            pathname: '/devotionalLoading',
            params: {
              isOnboarding: 'false',
              fromSwipe: 'true',
              verseText: verse.text,
              reference: reference,
            },
          });
        }, 100);
      }

      analytics.logEvent('CardBibleReader_Swiped_VerseToDevotional', {
        book: chapterData?.book,
        chapter: chapterData?.chapter,
        verse: verse.verse,
        isProMember: useSubscriptionStore.getState().isProMember,
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

        hapticMedium();

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

    // const translateX = dragX.interpolate({
    //   inputRange: [-70, -20, 0],
    //   outputRange: [0, 10, 60],
    //   extrapolate: 'clamp',
    // });

    // const progressValue = _progress.interpolate({
    //   inputRange: [0, 1],
    //   outputRange: [0, 1],
    //   extrapolate: 'clamp',
    // });

    // progressValue.__getValue && handleSwipeChange(progressValue.__getValue());

    return (
      <View style={styles.swipeActionContainer}>
        <View
          style={styles.swipeActionContent}>
          <Ionicons name="chatbubble-ellipses" size={30} color="#634012" style={{ opacity: 0.5 }} />
        </View>
      </View>
    );
  }, [handleSwipeStart, handleSwipeChange, isFadingToChat]);

  const renderLeftActions = useCallback((_progress: any, dragX: any, verse: Verse) => {
    if (!swipeProgress.current.isActive && !isFadingToChat) {
      handleSwipeStart(verse);
    }

    // const translateX = dragX.interpolate({
    //   inputRange: [0, 20, 70],
    //   outputRange: [-60, -10, 0],
    //   extrapolate: 'clamp',
    // });

    // const progressValue = _progress.interpolate({
    //   inputRange: [0, 1],
    //   outputRange: [0, 1],
    //   extrapolate: 'clamp',
    // });

    // progressValue.__getValue && handleSwipeChange(progressValue.__getValue());

    return (
      <View style={styles.swipeActionContainer}>
        <View
          style={styles.swipeActionContent}>
          <FontAwesome6 name="book" size={25} color="#634012" style={{ opacity: 0.5 }} />
        </View>
      </View>
    );
  }, [handleSwipeStart, handleSwipeChange, isFadingToChat]);

  const createRenderRightActions = useCallback((verse: Verse) => {
    return (progress: any, dragX: any) => renderRightActions(progress, dragX, verse);
  }, [renderRightActions]);

  const createRenderLeftActions = useCallback((verse: Verse) => {
    return (progress: any, dragX: any) => renderLeftActions(progress, dragX, verse);
  }, [renderLeftActions]);

  // Optimize the Swipeable component props
  const swipeableProps = useCallback((verse: Verse) => ({
    renderRightActions: createRenderRightActions(verse),
    renderLeftActions: createRenderLeftActions(verse),
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
  }), [createRenderRightActions, createRenderLeftActions, handleSwipeVerseToChat, handleSwipeVerseToMenu, handleSwipeRelease, handleLeftSwipeRelease, isFadingToChat, floatingMenu.isVisible]);


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
  const insets = useSafeAreaInsets();
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
      hapticMedium();
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
      hapticMedium();
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
    hapticMedium();
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
  const getVerseHighlightColor = useCallback((verse: Verse): string | null => {
    if (!verse) return null;
    const highlight = getHighlight(currentBookId, currentChapter, verse.verse);
    return highlight ? HIGHLIGHT_COLORS[highlight.colorKey] : null;
  }, [currentBookId, currentChapter, getHighlight]);

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

  // Optimized animation effect - only run once on mount
  useEffect(() => {
    // Ensure initial states are set
    fadeAnim.value = 0;
    translateY.value = 50;

    // Use a small delay to ensure component is mounted
    const timer = setTimeout(() => {
      // Start animations together
      fadeAnim.value = withTiming(1, {
        duration: 2000, // Reduced from 2000ms
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
      translateY.value = withTiming(0, {
        duration: 2000, // Reduced from 2000ms
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    }, 0);

    return () => clearTimeout(timer);
  }, []); // Empty dependency array - only run once

  // Optimized animation for finish reading button
  useEffect(() => {
    if (isInPathMode && isAtEndChapter && hasScrolledToBottom) {
      buttonOpacity.value = withTiming(1, { duration: 300 }); // Reduced from 400ms
      buttonTranslateY.value = withTiming(0, { duration: 300 }); // Reduced from 400ms
    } else {
      buttonOpacity.value = withTiming(0, { duration: 200 }); // Reduced from 400ms
      buttonTranslateY.value = withTiming(100, { duration: 200 }); // Reduced from 400ms
    }
  }, [isInPathMode, isAtEndChapter, hasScrolledToBottom]);

  // Subscribe to language changes to trigger re-render
  useLanguageStore((state) => state.language);

  // Removed redundant memoized navigation functions - using original functions directly

  // Memoize the handleOpenSelector to prevent unnecessary re-renders
  const memoizedHandleOpenSelector = useCallback(() => {
    handleOpenSelector();
  }, [handleOpenSelector]);

  // Create animated style for finish reading button
  const finishButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: buttonOpacity.value,
      transform: [{ translateY: buttonTranslateY.value }],
    };
  });

  // Memoize verses to show to prevent recalculation on every render
  const versesToShow: Verse[] = useMemo(() => {
    if (!chapterData?.verses) return [];

    if (isMapMode && readerSettings.tapToShowNextCard) {
      // Map mode with tap-to-show enabled: show only up to currentIndex + 1
      return chapterData.verses.slice(0, currentIndex + 1);
    } else {
      // All other screens or map mode with tap-to-show disabled: show all verses
      return chapterData.verses;
    }
  }, [chapterData?.verses, currentIndex, isMapMode, readerSettings.tapToShowNextCard]);

  // Memoize animated styles to prevent recreation on every render
  const animatedProgressStyle = useAnimatedStyle(() => {
    return { width: `${progressValue.value * 100}%` };
  });

  const fadeAnimStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeOpacity.value,
    };
  });

  // --- Add at the top of the component, after other hooks ---
  const cardSlideAnim = useSharedValue(0);

  // Optimized card slide animation - only run when needed
  useEffect(() => {
    if (isMapMode && readerSettings.tapToShowNextCard) {
      cardSlideAnim.value = 50; // Start below
      cardSlideAnim.value = withTiming(0, { duration: 400 }); // Animate up
    }
  }, [isMapMode, readerSettings.tapToShowNextCard]); // Removed currentIndex dependency

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardSlideAnim.value }],
    opacity: isMapMode ? (cardSlideAnim.value === 0 ? 1 : 1) : 1,
  }));

  // --- In the versesToShow.map render ---
  {
    versesToShow.map((verse, index) => {
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
                        <Text>{`${verse.verse}. `}</Text>
                        {index === currentIndex ? (
                          <Text>
                            <TypingText
                              text={verse.text}
                              baseTextStyle={{}}
                              speed={20}
                              skipAnimation={skipTyping || (isMapMode && !readerSettings.tapToShowNextCard)}
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
              </View>
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
                    style={[
                      styles.verseBubble,
                      {
                        backgroundColor: highlightColor
                          ? `${highlightColor}80`
                          : theme?.cardColor || '#ffffff'
                      },
                    ]}>
                    <View style={{ marginBottom: 12 }}>
                      <Text style={verseTextStyle} className="font-nunito-bold">
                        <Text>{`${verse.verse}. `}</Text>
                        <Text>{verse.text}</Text>
                      </Text>
                    </View>
                  </View>
                </Swipeable>
              </View>
            )}
          </View>
        </LongPressGestureHandler>
      );
    })
  }

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

  // if(loading){
  //   return (
  //     <SafeAreaView
  //     style={{ backgroundColor: theme.background, flex: 1 }}
  //     className="items-center justify-center">
  //     <ActivityIndicator size="large" color={theme.progressBarFill} />
  //   </SafeAreaView>
  //   )
  // }

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
          className="rounded-t-card "
          style={{ width: '100%', height: IS_ANDROID ? '85%' : RPH(85), position: 'absolute', bottom: 0, backgroundColor: theme?.background }}>
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
          {
            false ? <View className='items-center justify-center flex-1'>
              <ActivityIndicator size="large" color={theme.text} />
              <Text style={{ color: theme.text, marginTop: 16, fontSize: 16, fontFamily: 'DIN Next Rounded LT W01 Regular' }}>
                Loading chapter...
              </Text>
            </View> : <>
              {/* Title and Navigation Arrows Row */}




              {/* Absolute background to cover outer safe areas */}
              <View style={{ ...StyleSheet.absoluteFillObject }} pointerEvents="none" />

              <Reanimated.View
                style={[
                  { flex: 1, paddingBottom: !isMapMode ? RPH(10) : 0, paddingHorizontal: 16, paddingTop: 16 },
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
                    <TouchableOpacity onPress={memoizedHandleOpenSelector}>
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
                        <View style={{ minHeight: '100%', paddingBottom: !readerSettings.tapToShowNextCard ? 100 : 0 }}>
                          {versesToShow.map((verse, index) => {
                            const highlightColor = getVerseHighlightColor(verse);
                            const isCurrent = index === currentIndex && isMapMode && readerSettings.tapToShowNextCard;

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
                                          // className="bg-surfaceCreamLight"
                                          style={[
                                            styles.verseBubble,
                                            {
                                              backgroundColor: highlightColor
                                                ? `${highlightColor}80`
                                                : theme?.cardColor || '#ffffff',
                                            },
                                          ]}>
                                          <View style={{ marginBottom: 12 }}>
                                            <Text style={verseTextStyle} className="font-nunito-bold">
                                              <Text >{`${verse.verse}. `}</Text>
                                              <Text >
                                                <TypingText
                                                  text={verse.text}
                                                  baseTextStyle={{}}

                                                  speed={20}
                                                  skipAnimation={skipTyping || (isMapMode && !readerSettings.tapToShowNextCard)}
                                                  onComplete={handleTypingComplete}
                                                />
                                              </Text>
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
                                          // className="bg-surfaceCreamLight"
                                          style={[
                                            styles.verseBubble,
                                            {
                                              backgroundColor: highlightColor
                                                ? `${highlightColor}80`
                                                : theme?.cardColor || '#ffffff',
                                            },
                                          ]}>
                                          <View style={{ marginBottom: 12 }}>
                                            <Text style={verseTextStyle} className="font-nunito-bold">
                                              <Text >{`${verse.verse}. `}</Text>
                                              <Text >{verse.text}</Text>
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
                          {isMapMode && readerSettings.tapToShowNextCard && currentIndex < (chapterData?.verses?.length || 0) - 1 ? (
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

                          {/* Show finish reading button when tap-to-show is disabled and all verses are shown */}
                          {/* {isMapMode && !readerSettings.tapToShowNextCard && chapterData && (
                           <View style={{ alignItems: 'center', marginTop: 16 }}>
                             <PrimaryButton
                               title="Finish Reading 🎉"
                               onPress={() => {
                                 console.log('📖 [NewBibleReader] Finish reading button tapped');
                                 handleFinishReading();
                               }}
                               buttonType="gold"
                               style="w-48"
                             />
                           </View>
                         )} */}
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
                          <FlatList
                            scrollEnabled={false}
                            data={versesToShow}
                            keyExtractor={verse => verse.verse.toString()}
                            renderItem={({ item: verse }) => {
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
                                              : theme?.cardColor || '#ffffff',
                                          },
                                        ]}>
                                        <View style={{ marginBottom: 12 }}>
                                          <Text style={verseTextStyle} className="font-nunito-bold">
                                            <Text>{`${verse.verse}. `}</Text>
                                            <Text>{verse.text}</Text>
                                          </Text>
                                        </View>
                                      </View>
                                    </Swipeable>
                                  </View>
                                </LongPressGestureHandler>
                              );
                            }}
                            initialNumToRender={5}
                            maxToRenderPerBatch={5}
                            windowSize={5}
                            removeClippedSubviews={true}
                            getItemLayout={(data, index) => ({
                              length: 100, // Estimated height of each item
                              offset: 100 * index,
                              index,
                            })}
                          />
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

              {/* Bottom Navigation Row - Only in Map mode when tap-to-next is disabled */}
              {isMapMode && !readerSettings.tapToShowNextCard && isInPathMode && (
                <RNAnimated.View
                  style={[
                    {
                      position: 'absolute',
                      bottom: 50,
                      left: 0,
                      right: 0,
                      flexDirection: 'row',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      paddingHorizontal: 20,
                      zIndex: 10,
                    },
                    buttonsContainerStyle,
                  ]}>
                  {/* Finish Reading Button (in path mode) */}
                  <View style={{ flex: 1, marginRight: -100 }}>
                    <SideButton
                      title="Finish Reading"
                      onPress={isAtEndChapter ? handleFinishReading : navigateToNextChapter}
                      disabled={!hasScrolledToBottom || loading || !isAtEndChapter}
                    />
                  </View>
                  {/* Navigation Buttons */}
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <TouchableOpacity
                      style={[
                        styles.navButton,
                        (currentChapter <= 1 || loading) && styles.disabledNavButton,
                      ]}
                      onPress={navigateToPreviousChapter}
                      disabled={currentChapter <= 1 || loading}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.navButtonText,
                          (currentChapter <= 1 || loading) && styles.disabledButtonText,
                        ]}>
                        ←
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.navButton,
                        (loading || (isInPathMode && isAtEndChapter)) && styles.disabledNavButton,
                      ]}
                      onPress={() => {
                        navigateToNextChapter();
                      }}
                      disabled={loading || (isInPathMode && isAtEndChapter)}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.navButtonText,
                          (loading || (isInPathMode && isAtEndChapter)) && styles.disabledButtonText,
                        ]}>
                        →
                      </Text>
                    </TouchableOpacity>
                  </View>
                </RNAnimated.View>
              )}
            </>

          }

        </View>
      </SafeAreaView>


      {/* Finish Reading Button - only show in Map mode, at bottom of content */}
      {/* {isMapMode && isInPathMode && isAtEndChapter && chapterData && !loading && (
          <PrimaryButton
            title="Finish Reading 🎉"
            onPress={() => {
              if (isFadingToChat) return;
              console.log('📖 [NewBibleReader] Finish tapped');
              handleFinishReading();
            }}
            disabled={isFadingToChat}
            buttonType="gold"
            style="mx-5 mb-5"
          />
        )} */}

      {isBibleReaderScreen && !isMapMode ? (
        <BibleVerseActionBar
          reference={chapterData ? `${chapterData.book} ${chapterData.chapter}` : ''}
          onVersePress={memoizedHandleOpenSelector}
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
  // Floating menu styles with theme-compatible design
  disabledButtonText: {
    color: '#DCB280',
  },
  disabledNavButton: {
    backgroundColor: 'rgba(220, 178, 128, 0.1)',
  },
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
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  } as const,
  menuItem: {
    alignItems: 'center',
    width: '50%', // Changed from 33% to 50% for 2x2 layout
    paddingVertical: 12,
    paddingHorizontal: 4,
  } as const,
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.07)',
    zIndex: 1000,
  } as const,
  menuText: {
    fontSize: 12,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    textAlign: 'center',
  } as const,
  navButton: {
    alignItems: 'center',
    backgroundColor: '#FFE4A8',
    borderRadius: 24,
    elevation: 4,
    height: 48,
    justifyContent: 'center',
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    width: 48,
  },
  navButtonText: {
    color: '#3C584A',
    fontFamily: 'Inter-Bold',
    fontSize: 24,
  },
  // Updated elegant swipe action styles
  swipeActionContainer: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: 70,
  },
  swipeActionContent: {
    alignItems: 'center',
    backgroundColor: 'rgba(181, 125, 0, 0.15)',
    borderColor: 'rgba(247, 181, 0, 0.2)',
    borderRadius: 100,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    opacity: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    width: 50,
  },
  verseBubble: {
    borderColor: 'rgba(121, 83, 35, 0.1)',
    borderRadius: 20,
    borderWidth: 2,
    elevation: 1,
    paddingBottom: 5,
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2, // Light brown border
  },
});

export default memo(NewBibleReader);