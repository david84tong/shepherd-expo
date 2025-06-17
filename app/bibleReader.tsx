import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated as RNAnimated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Easing as RNEasing,
  Alert,
  Pressable,
  ViewStyle,
  TextStyle,
  Modal,
  TouchableWithoutFeedback,
  Switch,
  StatusBar,
  ImageBackground,
  Image,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { fetchChapter, Verse } from './api/bible';
import SideButton from '~/components/SideButton';
import { usePathStore } from './stores/pathStore';
import { useHomeStore, SuccessAnimationType } from './stores/homeStore';
import { useUserStore } from './stores/userStore';
import { useUIStore } from './stores/uiStore';
import { router, useLocalSearchParams } from 'expo-router';
import { BIBLE_PATHS, Unit, BIBLE_BOOK_IDS, BIBLE_CHAPTER_COUNTS } from './models/Path';
import firestore from '@react-native-firebase/firestore';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing as ReanimatedEasing,
} from 'react-native-reanimated';
import analytics from '../utils/analytics';
import Slider from '@react-native-community/slider';
import NewBibleReader from '~/components/NewBibleReader';
import Clipboard from '@react-native-clipboard/clipboard';
import { debounce } from 'lodash';
import {
  useReaderSettingsStore,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  LINE_HEIGHT_PRESETS,
  LineHeightPreset,
} from './stores/readerSettingsStore';
import { BibleVerseActionBar } from '~/components/BibleVerseActionBar';
import i18n from './utils/i18n';
import { useLanguageStore } from './stores/languageStore';
import { useHighlightStore, HighlightColorKey, HIGHLIGHT_COLORS } from './stores/highlightStore';
import { useDevotionalStore } from './stores/devotionalStore';
import Toast from 'react-native-toast-message';
import HighlightColorPicker from '~/components/HighlightColorPicker';
import { Feather } from '@expo/vector-icons';
import VerseChatView from '~/components/VerseChatView';

// Constants
const DEFAULT_LINE_HEIGHT = 24;
const MIN_LINE_HEIGHT = 20;
const MAX_LINE_HEIGHT = 40;
const DEFAULT_THEME = 'light';

// Add theme colors constant
const THEME_COLORS = {
  white: {
    background: '#FFFFFF',
    modalBackground: '#FFFFFF',
    text: '#3C584A',
    border: '#E5E5E5',
    verseHighlight: 'rgba(220, 178, 128, 0.2)',
    sliderTrack: '#E5E5E5',
  },
  light: {
    background: '#FFF4D9',
    modalBackground: '#FFF4D9',
    text: '#3C584A',
    border: '#FFE4A8',
    verseHighlight: 'rgba(220, 178, 128, 0.2)',
    sliderTrack: '#E5E5E5',
  },
  medium: {
    background: '#FFE4A8',
    modalBackground: '#FFE4A8',
    text: '#3C584A',
    border: '#FFD280',
    verseHighlight: 'rgba(255, 245, 210, 0.6)',
    sliderTrack: '#FFF4D9',
  },
  dark: {
    background: '#2C2C2C',
    modalBackground: '#2C2C2C',
    text: '#FFFFFF',
    border: '#3C3C3C',
    verseHighlight: 'rgba(107, 107, 107, 0.34)',
    sliderTrack: '#3C3C3C',
  },
} as const;

type ThemeType = keyof typeof THEME_COLORS;

const DEFAULT_READER_MODE = 'new'; // Changed from 'default' to 'new' to make card view the default

// Define component props
interface BibleReaderProps {
  isEmbedded?: boolean; // Whether it's embedded in another screen
  initialBookId?: number; // Initial book ID to display
  initialBookName?: string; // Initial book name
  initialChapter?: number; // Initial chapter to display
  onNavigateBack?: () => void; // Optional callback for custom back navigation
}

// Add FloatingMenuState interface
interface FloatingMenuState {
  isVisible: boolean;
  verse: Verse | null;
  position: {
    x: number;
    y: number;
  };
}

// Custom Loading Indicator Component (using Reanimated)
const PulsingDotsIndicator = () => {
  const dot1Opacity = useSharedValue(0.3);
  const dot2Opacity = useSharedValue(0.3);
  const dot3Opacity = useSharedValue(0.3);

  const dotAnim = (opacity: Reanimated.SharedValue<number>, delay: number) => {
    return withRepeat(
      withSequence(
        withDelay(
          delay,
          withTiming(1, { duration: 400, easing: ReanimatedEasing.out(ReanimatedEasing.quad) })
        ),
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
      <Text className="font-feather text-description text-base">{i18n.t('loading_chapter')}</Text>
    </View>
  );
};

// Add type for styles
type BibleReaderStyles = {
  container: ViewStyle;
  newHeaderContainer: ViewStyle;
  headerLeft: ViewStyle;
  headerRight: ViewStyle;
  backButton: ViewStyle;
  backButtonText: TextStyle;
  headerButton: ViewStyle;
  headerButtonText: TextStyle;
  navButton: ViewStyle;
  navButtonText: TextStyle;
  disabledNavButton: ViewStyle;
  iconButton: ViewStyle;
  fontSizeAdjustText: TextStyle;
  disabledButtonText: TextStyle;
  contentArea: ViewStyle;
  scrollContainer: ViewStyle;
  verseText: TextStyle;
  verseNumber: TextStyle;
  floatingNavContainer: ViewStyle;
  floatingNavContainerEmbedded: ViewStyle;
  verseContainer: ViewStyle;
  selectedVerse: ViewStyle;
  fontSizeButton: ViewStyle;
  fontSizeButtonText: TextStyle;
  sliderContainer: ViewStyle;
  slider: ViewStyle;
  sliderLabel: TextStyle;
  sliderLabelLarge: TextStyle;
  modalOverlay: ViewStyle;
  modalContent: ViewStyle;
  modalHandle: ViewStyle;
  themeButtonsContainer: ViewStyle;
  themeButton: ViewStyle;
  selectedThemeButton: ViewStyle;
  selectedThemeButtonDark: ViewStyle;
  lineHeightContainer: ViewStyle;
  lineHeightButtons: ViewStyle;
  lineHeightButton: ViewStyle;
  lineHeightButtonSelected: ViewStyle;
  lineHeightButtonText: TextStyle;
  lineHeightButtonTextSelected: TextStyle;
  toggleContainer: ViewStyle;
  toggleLabel: TextStyle;
  floatingMenu: ViewStyle;
  menuItem: ViewStyle;
  menuItemText: TextStyle;
  menuOverlay: ViewStyle;
  menuIconContainer: ViewStyle;
  menuText: TextStyle;
};

// Add type for storing selections by chapter
type SelectionsMap = {
  [key: string]: Set<number>;
};

// Handoff type for chapter data
import type { ChapterResponse } from './api/bible';
import Animated from 'react-native-reanimated';
import { responsiveFontSize } from 'react-native-responsive-dimensions';
import { MaterialIcons } from '@expo/vector-icons';
import { IS_ANDROID } from './utils/utils';

// Add at the top of the file, after imports
const chapterCache = new Map<string, any>();
const LOADING_TIMEOUT = 300; // ms

// Export the component for reuse
export const BibleReader: React.FC<BibleReaderProps> = ({
  isEmbedded = false,
  initialBookId,
  initialBookName,
  initialChapter,
  onNavigateBack,
}) => {
  // Always call hooks unconditionally, even if we don't use the results
  useLanguageStore((state) => state.language);

  const [chapterData, setChapterData] = useState<ChapterResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [pendingChapterData, setPendingChapterData] = useState<ChapterResponse | null>(null);

  // Get settings directly from the store instead of local state
  const readerSettings = useReaderSettingsStore();
  const { fontSize, theme: currentTheme, lineHeightPreset, useCardView } = readerSettings;

  // Animation values for button container (using RNAnimated for these)
  const buttonsAnim = useRef(new RNAnimated.Value(0)).current; // 0: hidden, 1: visible

  // Reference to the ScrollView
  const scrollViewRef = useRef<ScrollView>(null);

  // Get UI store for the book chapter selector
  const showBookChapterSelector = useUIStore((state) => state.showBookChapterSelector);

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
    setNextUnitPreview,
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
  const addCompletedReading = useUserStore((state) => state.addCompletedReading);
  const setLastReadingDate = useUserStore((state) => state.setLastReadingDate);
  const setVersesReadTotal = useUserStore((state) => state.setVersesReadTotal);
  const setChaptersReadTotal = useUserStore((state) => state.setChaptersReadTotal);
  const getVersesReadTotal = useUserStore((state) => state.getVersesReadTotal);
  const getChaptersReadTotal = useUserStore((state) => state.getChaptersReadTotal);

  // Always call hooks unconditionally, even if we don't use the results
  const params = useLocalSearchParams();
  const effectiveParams = !isEmbedded ? params : null;

  // Check if we're in "just read" mode
  const isJustReadMode = !isEmbedded && effectiveParams?.justReadMode === 'true';

  // Animation value for modal slide up
  const slideAnim = useRef(new RNAnimated.Value(0)).current;

  // In the component, add state for selections history
  const [selectionsHistory, setSelectionsHistory] = useState<SelectionsMap>({});

  // Add animation values
  const fadeAnim = useSharedValue(0);
  const translateY = useSharedValue(50); // Start from 50px below

  // Add useEffect for animation that triggers when loading completes
  useEffect(() => {
    if (!loading && (chapterData || pendingChapterData)) {
      fadeAnim.value = withTiming(1, {
        duration: 400,
        easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
      });
      translateY.value = withTiming(0, {
        duration: 400,
        easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
      });
    }
  }, [loading, chapterData, pendingChapterData]);

  // Create animated style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
      transform: [
        { translateY: translateY.value }
      ],
    };
  });

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);

      console.log('🔄 BibleReader: Loading initial data');
      if (!isEmbedded) {
        console.log('📋 URL Params:', effectiveParams);
      }

      // Get route params from useLocalSearchParams if not embedded
      const urlBookId =
        !isEmbedded && effectiveParams?.bookId
          ? parseInt(effectiveParams.bookId as string, 10)
          : null;
      const urlChapters =
        !isEmbedded && effectiveParams?.chapters
          ? (effectiveParams.chapters as string).split(',').map((c) => parseInt(c, 10))
          : null;
      const urlTitle =
        !isEmbedded && effectiveParams?.title ? (effectiveParams.title as string) : null;

      // If embedded, use props; otherwise check URL params then fall back to saved state
      const bookIdToLoad =
        initialBookId || (urlBookId && !isNaN(urlBookId) ? urlBookId : currentBookId);
      const chapterToLoad =
        initialChapter ||
        (urlChapters && urlChapters.length > 0 && !isNaN(urlChapters[0])
          ? urlChapters[0]
          : currentChapter);

      console.log(`🎯 Loading: bookId: ${bookIdToLoad}, chapter: ${chapterToLoad}`);

      // Load from determined values, not default state
      // Force load to ensure chapter loads when switching from card view
      await loadChapter(
        currentVersion,
        initialBookName || 'Loading...',
        bookIdToLoad,
        chapterToLoad,
        true // Force load on initial mount
      );
    };

    loadInitialData();
  }, [initialBookId, initialChapter, currentVersion]);

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
  }, [hasScrolledToBottom, buttonsAnim]); // Added buttonsAnim to dependency array as it's used in effect

  // Automatically mark bottom as reached if content fits without scrolling
  useEffect(() => {
    // Reduce threshold to make it easier to detect when content fits on screen
    const threshold = 50;
    if (contentHeight && containerHeight) {
      if (contentHeight <= containerHeight + threshold && !hasScrolledToBottom) {
        console.log('[AutoBottom] Content fits on screen – showing bottom buttons.');
        setHasScrolledToBottom(true);
      }
    }
  }, [contentHeight, containerHeight, hasScrolledToBottom]);

  // Reset hasScrolledToBottom when chapter, bookId or version changes.
  // This will trigger the animation to hide the buttons via the other useEffect.
  useEffect(() => {
    console.log(
      '[ChapterChangeEffect] Chapter, BookID, or Version changed. Setting hasScrolledToBottom = false.'
    );
    setHasScrolledToBottom(false);
    // buttonsAnim.setValue(0); // No longer needed, the other useEffect handles animation to 0
  }, [currentChapter, currentBookId, currentVersion]);

  // Reload chapter when the translation changes in settings
  useEffect(() => {
    // Only reload if we're not already loading and we have chapter data
    if (!loading && chapterData && currentVersion !== savedTranslation) {
      console.log(
        `📚 Translation changed from ${currentVersion} to ${savedTranslation}. Reloading chapter.`
      );
      setCurrentVersion(savedTranslation);
      loadChapter(savedTranslation, currentBook, currentBookId, currentChapter);
    }
  }, [savedTranslation]);

  const loadChapter = async (version: string, book: string, bookId: number, chapter: number, force: boolean = false) => {
    // Prevent multiple simultaneous loads unless forced
    if (loading && !force) return;

    setLoading(true);
    setError(null);

    // Create a key for the current chapter
    const currentChapterKey = `${bookId}-${chapter}`;
    const previousChapterKey = `${currentBookId}-${currentChapter}`;

    // Save current selections before changing chapter
    if (selectedVerses.size > 0) {
      setSelectionsHistory(prev => ({
        ...prev,
        [previousChapterKey]: new Set(selectedVerses)
      }));
    }

    // Restore selections for the new chapter if they exist
    const savedSelections = selectionsHistory[currentChapterKey];
    setSelectedVerses(savedSelections ? new Set(savedSelections) : new Set());
    setIsSelectionMode(savedSelections ? savedSelections.size > 0 : false);

    console.log(`📚 LOADING CHAPTER - version:${version}, book:${book}, bookId:${bookId}, chapter:${chapter}`);

    try {
      // Check cache first
      const cacheKey = `${version}-${bookId}-${chapter}`;
      let result;

      if (chapterCache.has(cacheKey)) {
        console.log('📚 Using cached chapter data');
        result = chapterCache.get(cacheKey);
      } else {
        // Add a small delay to prevent rapid API calls
        await new Promise(resolve => setTimeout(resolve, LOADING_TIMEOUT));

        // Key line: bookId is now being passed properly to the API
        result = await fetchChapter(version, bookId, chapter);

        // Cache the result
        if (!('error' in result)) {
          chapterCache.set(cacheKey, result);
        }
      }

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
      console.error('Failed to load chapter', error);
      setError('Failed to load chapter');
      setChapterData(null);
    } finally {
      setLoading(false);
    }
  };

  const navigateToPreviousChapter = () => {
    if (loading || !chapterData) return;

    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.logEvent('BibleReader_Tapped_PreviousChapter', {
      chapter: currentChapter,
    });

    if (currentChapter > 1) {
      // Still have previous chapters in this book
      loadChapter(currentVersion, currentBook, currentBookId, currentChapter - 1);
    } else {
      // At first chapter, need to go to previous book's last chapter
      const previousBookId = currentBookId - 1;

      // Check if previous book exists
      if (previousBookId >= 1) {
        // Get the name and last chapter number of the previous book
        const bookNames: Record<number, string> = Object.fromEntries(
          Object.entries(BIBLE_BOOK_IDS).map(([name, id]) => [id, name])
        );
        const previousBookName = bookNames[previousBookId] || 'Previous Book';
        const lastChapterInPreviousBook = BIBLE_CHAPTER_COUNTS[previousBookId];

        console.log(
          `At first chapter of ${currentBook}. Navigating to ${previousBookName} ${lastChapterInPreviousBook}`
        );
        loadChapter(currentVersion, previousBookName, previousBookId, lastChapterInPreviousBook);
      } else {
        console.log('Already at the beginning of the Bible');
        // Provide user feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          'Beginning of the Bible',
          "You're at Genesis 1, the first chapter of the Bible."
        );
      }
    }
  };

  const navigateToNextChapter = () => {
    console.log('Next button pressed, current chapter:', currentChapter);
    if (loading || !chapterData) {
      console.log('Loading or no chapter data, skipping navigation');
      return;
    }
    analytics.logEvent('BibleReader_Tapped_NextChapter', {
      chapter: currentChapter,
    });
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Check if we're at the last chapter of the current book
    const chaptersInCurrentBook = BIBLE_CHAPTER_COUNTS[currentBookId];

    if (currentChapter >= chaptersInCurrentBook) {
      // We've reached the end of the book, go to the next book chapter 1
      // Find the next book ID (books are ordered numerically in the API)
      const nextBookId = currentBookId + 1;

      // Validate that the next book exists
      if (nextBookId <= Object.keys(BIBLE_CHAPTER_COUNTS).length) {
        // Get the name of the next book for logging
        const bookNames: Record<number, string> = Object.fromEntries(
          Object.entries(BIBLE_BOOK_IDS).map(([name, id]) => [id, name])
        );
        const nextBookName = bookNames[nextBookId] || 'Next Book';

        console.log(`End of ${currentBook} reached. Navigating to ${nextBookName} 1`);
        loadChapter(currentVersion, nextBookName, nextBookId, 1);
      } else {
        console.log('Reached the end of the Bible');
        // Provide user feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          'End of the Bible',
          "You've reached Revelation 22, the last chapter of the Bible."
        );
      }
    } else {
      // Standard next chapter navigation
      loadChapter(currentVersion, currentBook, currentBookId, currentChapter + 1);
    }
  };

  // Update the font size update function to use the store directly
  const updateFontSize = async (newSize: number) => {
    if (newSize >= MIN_FONT_SIZE && newSize <= MAX_FONT_SIZE) {
      // Add haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Update the store (which will save to AsyncStorage)
      readerSettings.setFontSize(newSize);
    }
  };

  const increaseFontSize = () => {
    updateFontSize(fontSize + 1);
  };

  const decreaseFontSize = () => {
    updateFontSize(fontSize - 1);
  };

  const handleFinishReading = () => {
    analytics.logEvent('BibleReader_Tapped_FinishReading', {
      book: currentBook,
      bookId: currentBookId,
      version: currentVersion,
      chapter: currentChapter,
    });

    // Add haptic feedback - medium for completion
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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
        isUnit: pathInProgress,
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

      // If we are in a path and at the end chapter, mark the UNIT as completed
      // and track it in Firestore
      if (pathInProgress && currentPath && isAtEndChapter) {
        console.log(`✅ Unit ${currentPath.unitId} completed! Attempting to mark...`);
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

        // Find the next unit logic
        const currentPathIndex = BIBLE_PATHS.findIndex((p) => p.id === currentPath.pathId);
        if (currentPathIndex !== -1) {
          const currentPathData = BIBLE_PATHS[currentPathIndex];
          const currentUnitIndex = currentPathData.units.findIndex(
            (u) => u.id === currentPath.unitId
          );

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
      }

      if (nextUnit) {
        shouldStayInPath = true;
        console.log(`🚀 Setting next unit preview and staying in path.`);
      } else {
        console.log(`🏁 Reached the end of all paths.`);
      }

      console.log(`Reading saved successfully. Added ${versesInChapter} verses and 1 chapter.`);
      console.log(
        `New totals: ${currentVerses + versesInChapter} verses, ${currentChapters + 1} chapters`
      );
    } catch (error) {
      console.error('Error saving reading data:', error);
    }

    // Update store state
    setNextUnitPreview(nextUnit); // Set the next unit (or null if none)
    setPathInProgress(shouldStayInPath); // Keep in path only if there's a next unit

    // --- Existing navigation logic ---
    setHomeMode('DEFAULT');
    setReadingCompleted(true);

    // Check if all tasks are completed
    if (effectiveParams?.isLastUnitInSection === 'true') {
      setSuccessType(SuccessAnimationType.SECTION_COMPLETE);
    } else if (sawDailyBonus) {
      setSuccessType(SuccessAnimationType.READING);
    } else if (prayerCompleted && reflectionCompleted) {
      // Only show BONUS type if the daily bonus hasn't been seen yet
      console.log('All disciplines completed - showing BONUS');
      setSuccessType(SuccessAnimationType.BONUS);
    } else {
      console.log('Regular reading completion - showing READING');
      setSuccessType(SuccessAnimationType.READING);
    }

    // Navigate to success animation screen - Use replace to unmount BibleReader
    router.replace({
      pathname: '/success',
      params: {
        message: sawDailyBonus
          ? 'Reading Complete!'
          : prayerCompleted && reflectionCompleted
            ? 'Daily Trifecta Complete!'
            : 'Reading Complete!',
        subMessage: sawDailyBonus
          ? "You've finished today's chapter. Great progress!"
          : prayerCompleted && reflectionCompleted
            ? "Amazing! You've completed all three spiritual disciplines today."
            : "You've finished today's chapter. Great progress!",
      },
    });
  };

  // Check if the current chapter is the end chapter of the selected path
  const isAtEndChapter = useMemo(() => {
    if (!pathInProgress || !currentPath) {
      console.log('[isAtEndChapter] Not in path or no currentPath data. Returning false.');
      return false;
    }

    const isActuallyAtEnd =
      currentBookId === currentPath.bookId && currentChapter === currentPath.endChapter;
    console.log(
      `[isAtEndChapter] Calculation: pathInProgress=${pathInProgress}, currentPath.bookId=${currentPath.bookId}, currentBookId=${currentBookId}, currentPath.endChapter=${currentPath.endChapter}, currentChapter=${currentChapter}. Result: ${isActuallyAtEnd}`
    );
    return isActuallyAtEnd;
  }, [pathInProgress, currentPath, currentBookId, currentChapter]);

  // Determine if the finish button should be enabled
  const isFinishEnabled = useMemo(() => {
    // Must be scrolled to bottom first
    if (!hasScrolledToBottom) return false;

    // If in just read mode, enable finish on any chapter
    if (isJustReadMode) return true;

    // If there is an active currentPath (came from path unit), only enable
    // when the reader is on the designated end chapter
    if (currentPath) {
      const atEndChapter =
        currentBookId === currentPath.bookId && currentChapter === currentPath.endChapter;
      return atEndChapter;
    }

    // No active path – enable when scrolled to bottom
    return true;
  }, [hasScrolledToBottom, isJustReadMode, currentPath, currentBookId, currentChapter]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;

    // Reduce the threshold to 50 for all cases to make it easier to detect scroll end
    const threshold = 50;
    const scrolledToBottomThreshold = contentSize.height - threshold;
    const bottomReached = layoutMeasurement.height + contentOffset.y >= scrolledToBottomThreshold;

    if (bottomReached && !hasScrolledToBottom) {
      console.log(
        `[handleScroll] Bottom of current view reached. pathInProgress: ${pathInProgress}, isAtEndChapter: ${isAtEndChapter}. Setting hasScrolledToBottom = true.`
      );
      setHasScrolledToBottom(true);
    }
    // Note: hasScrolledToBottom is reset to false only when a new chapter/version loads.
  };

  // Memoize style calculations to prevent unnecessary style object recreations
  const verseTextStyle = useMemo(() => {
    const lineHeightMultiplier = LINE_HEIGHT_PRESETS[lineHeightPreset];
    const calculatedLineHeight = Math.round(fontSize * lineHeightMultiplier);
    return [styles.verseText, { fontSize: fontSize, lineHeight: calculatedLineHeight }];
  }, [fontSize, lineHeightPreset]);

  const verseNumberStyle = useMemo(() => {
    return [styles.verseNumber, { fontSize: fontSize }];
  }, [fontSize]);

  // Update the handleVersePress function with correct types
  const handleVersePress = (verseNumber: number) => {
    if (!isSelectionMode) return;

    setSelectedVerses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(verseNumber)) {
        newSet.delete(verseNumber);
      } else {
        newSet.add(verseNumber);
      }
      return newSet;
    });

    // Save the updated selections separately to avoid type issues
    const currentChapterKey = `${currentBookId}-${currentChapter}`;
    setSelectionsHistory((prevHistory) => {
      const newHistory = { ...prevHistory };
      const currentSelections = new Set(selectedVerses);
      if (currentSelections.has(verseNumber)) {
        currentSelections.delete(verseNumber);
      } else {
        currentSelections.add(verseNumber);
      }

      if (currentSelections.size > 0) {
        newHistory[currentChapterKey] = currentSelections;
      } else {
        delete newHistory[currentChapterKey];
      }
      return newHistory;
    });
  };

  // Add floating menu state
  const [floatingMenu, setFloatingMenu] = useState<FloatingMenuState>({
    isVisible: false,
    verse: null,
    position: {
      x: 0,
      y: 0,
    },
  });

  // Add highlight store methods
  const { addHighlight, removeHighlight, getHighlight } = useHighlightStore();
  const { createAIDevotional } = useDevotionalStore();

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

  const handleHighlightVerse = (verse: Verse) => {
    setVerseToHighlight(verse);
    setIsHighlightPickerVisible(true);
    handleCloseFloatingMenu();
  };

  const handleCreateDevotional = async (verse: Verse) => {
    if (!chapterData) return;

    const reference = `${chapterData.book} ${chapterData.chapter}:${verse.verse}`;
    
    // Navigate to LoadingScreen
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

    handleCloseFloatingMenu();
  };

  const handleCloseFloatingMenu = () => {
    setFloatingMenu({
      isVisible: false,
      verse: null,
      position: { x: 0, y: 0 },
    });
  };

  // Update handleVerseLongPress
  const handleVerseLongPress = (verseNumber: number) => {
    if (!chapterData) return;

    const verse = chapterData.verses.find(v => v.verse === verseNumber);
    if (!verse) return;

    // Center the menu on screen
    const MENU_WIDTH = 180;
    const menuX = (Dimensions.get('window').width - MENU_WIDTH) / 2;
    const menuY = (Dimensions.get('window').height - 350) / 2;

    setFloatingMenu({
      isVisible: true,
      verse: verse,
      position: { x: menuX, y: menuY },
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Add highlight picker state
  const [isHighlightPickerVisible, setIsHighlightPickerVisible] = useState(false);
  const [verseToHighlight, setVerseToHighlight] = useState<Verse | null>(null);

  const handleApplyHighlight = (colorKey: HighlightColorKey | null) => {
    if (!verseToHighlight || !chapterData) return;

    if (colorKey === null) {
      removeHighlight(currentBookId, currentChapter, verseToHighlight.verse);
      Toast.show({
        type: 'success',
        text1: i18n.t('highlight_removed'),
        position: 'top',
        visibilityTime: 2000,
      });
    } else {
      addHighlight(currentBookId, currentChapter, verseToHighlight.verse, colorKey);
      Toast.show({
        type: 'success',
        text1: i18n.t('verse_highlighted'),
        position: 'top',
        visibilityTime: 2000,
      });
    }

    setIsHighlightPickerVisible(false);
    setVerseToHighlight(null);
  };

  const handleCloseHighlightPicker = () => {
    setIsHighlightPickerVisible(false);
    setVerseToHighlight(null);
  };

  // Add getVerseHighlightColor function
  const getVerseHighlightColor = (verse: Verse): string | null => {
    if (!verse) return null;
    const highlight = getHighlight(currentBookId, currentChapter, verse.verse);
    return highlight ? HIGHLIGHT_COLORS[highlight.colorKey] : null;
  };

  const [showChatView, setShowChatView] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);

  const handleChatWithVerse = (verse: Verse) => {
    if (!chapterData) return;

    setSelectedVerse(verse);
    setShowChatView(true);
    handleCloseFloatingMenu();
  };

  const handleCloseChatView = () => {
    setShowChatView(false);
    setSelectedVerse(null);
  };

  const renderBibleContent = (chapterData: ChapterResponse) => {
    return (
      <>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContainer}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onContentSizeChange={(_, height) => setContentHeight(height)}
          onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
          {chapterData.verses.map((verse: Verse) => {
            const highlightColor = getVerseHighlightColor(verse);
            return (
              <Pressable
                key={verse.verse}
                onPress={() => handleVersePress(verse.verse)}
                onLongPress={() => handleVerseLongPress(verse.verse)}
                style={[
                  styles.verseContainer,
                  selectedVerses.has(verse.verse) && [
                    styles.selectedVerse,
                    { backgroundColor: THEME_COLORS[currentTheme].verseHighlight },
                  ],
                  highlightColor && { backgroundColor: `${highlightColor}80` },
                ]}>
                <Text
                  style={[verseTextStyle, { color: "#634012" }]}
                  >
                  <Text style={[verseNumberStyle, { color: '#9c755a' }]}>{`${verse.verse}.`} </Text>
                  {verse.text}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </>
    );
  };

  const handleOpenSelector = debounce(() => {
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    console.log('🔍 DEBUG: Opening selector');
    showBookChapterSelector(currentBookId, currentChapter, handleSelectBookChapter);
  }, 300);

  const handleSelectBookChapter = (bookId: number, chapter: number) => {
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.logEvent('BibleReader_Tapped_BackButton', {
      book: currentBook,
      bookId: currentBookId,
      version: currentVersion,
      chapter: currentChapter,
    });

    // Always set pathInProgress to false when navigating back, regardless of context
    setPathInProgress(false);

    if (onNavigateBack) {
      // Custom back navigation when embedded
      onNavigateBack();
    } else if (!isEmbedded && effectiveParams?.source === 'map') {
      // Navigation back to map when coming from map
      console.log('📱 Navigating back to map, pathInProgress set to false');

      // Allow state update to complete before navigation
      setTimeout(() => {
        router.back();
      }, 50);
    } else {
      // Default back navigation with small delay to allow state update
      setTimeout(() => {
        router.back();
      }, 50);
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

  const handlePresentModal = useCallback(() => {
    console.log('[BibleReader] Present Settings Modal triggered');
    setIsModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    RNAnimated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
      easing: RNEasing.out(RNEasing.cubic),
    }).start();
  }, []);

  const handleCloseModal = useCallback(() => {
    console.log('[BibleReader] Close Settings Modal');
    RNAnimated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
      easing: RNEasing.in(RNEasing.cubic),
    }).start(() => {
      setIsModalVisible(false);
    });
  }, []);

  const handleFontSizeChange = useCallback((value: number) => {
    console.log('[BibleReader] Font size slider value:', value);
    const newSize = Math.round(value);
    updateFontSize(newSize);
  }, []);

  // Update theme directly through the store
  const handleThemeChange = useCallback(
    (theme: ThemeType) => {
      // Add haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Update the store (which will save to AsyncStorage)
      readerSettings.setTheme(theme);
    },
    [readerSettings]
  );

  // Update line height directly through the store
  const handleLineHeightChange = useCallback(
    (preset: LineHeightPreset) => {
      // Update store (which will save to AsyncStorage)
      readerSettings.setLineHeightPreset(preset);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [readerSettings]
  );

  // Update card view toggle handler to use the store directly
  const handleCardViewToggle = useCallback(
    async (value: boolean) => {
      console.log('[BibleReader] CardViewToggle value', value);
      // Add haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      analytics.logEvent('BibleReader_Tapped_CardViewToggle', {
        value: value ? 'default-to-card' : 'card-to-default',
      });
      // Update the store (which will save to AsyncStorage)
      readerSettings.setCardView(value);

      // Close the reader preference modal instantly when switching to card view
      if (value) {
        // Instantly hide modal when switching to Card View
        setIsModalVisible(false);
        slideAnim.setValue(0); // Reset animation immediately
      } else {
        // When switching to Default Reader, close modal and wait for overlay to disappear
        setIsModalVisible(false);
        slideAnim.setValue(0); // Reset animation immediately
        setTimeout(() => {
          (async () => {
            try {
              // Force reload the chapter
              await loadChapter(currentVersion, currentBook, currentBookId, currentChapter, true);
              analytics.logEvent('BibleReader_SwitchedToDefaultReader');
            } catch (error) {
              console.error('Failed to switch reader mode:', error);
            }
          })();
        }, 100); // Shorter delay since we reset animation immediately
      }
    },
    [
      currentVersion,
      currentBook,
      currentBookId,
      currentChapter,
      loadChapter,
      chapterData,
      readerSettings,
    ]
  );

  // Function to receive chapter data from Card View before switching
  const handleHandoffChapterData = useCallback((data: ChapterResponse | null) => {
    console.log('[BibleReader] Received handoff chapter data:', data?.book, data?.chapter);
    if (data) {
      setPendingChapterData(data);
      setChapterData(data);
      setLoading(false); // Ensure loading is false when we have data
      setError(null);

      // Update internal state to match the handoff data
      setCurrentBook(data.book);
      setCurrentChapter(data.chapter);

      // Note: bookId might not be in the ChapterResponse, so we keep currentBookId as is
      // unless we can derive it from the data
    }
  }, []);

  // Function to switch from card view back to default reader
  const handleSwitchToDefaultReader = useCallback(async () => {
    setIsModalVisible(false);
    console.log('[BibleReader] Explicitly closing settings modal when switching to default reader');
    console.log('[BibleReader] Debug - Before switch: useCardView=' + useCardView);
    analytics.logEvent('DefaultReader_Tapped_ToggleDefaultReader');
    try {
      // Switch from card to default reader
      readerSettings.setCardView(false);

      // Reload current chapter data to ensure full content
      await loadChapter(currentVersion, currentBook, currentBookId, currentChapter, true);

      // After loading is complete, ensure modal is still closed
      setIsModalVisible(false);

      analytics.logEvent('BibleReader_SwitchedToDefaultReader');
    } catch (e) {
      console.error('Failed to switch to default reader', e);
      setIsModalVisible(false);
    }
  }, [
    currentVersion,
    currentBook,
    currentBookId,
    currentChapter,
    loadChapter,
    useCardView,
    readerSettings,
  ]);

  // Ensure pathInProgress is reset when unmounting (e.g., via swipe gesture)
  useEffect(() => {
    return () => {
      setPathInProgress(false);
    };
  }, [setPathInProgress]);

  // Move menuActions here, before any return statement or JSX that uses it
  const menuActions = [
    {
      id: 'copy',
      icon: 'copy' as const,
      label: i18n.t('copy'),
      color: '#3C584A',
      action: handleCopyVerse,
    },
    {
      id: 'highlight',
      icon: 'edit-2' as const,
      label: i18n.t('highlight'),
      color: '#F7B500',
      action: handleHighlightVerse,
    },
    {
      id: 'chat',
      icon: 'message-circle' as const,
      label: i18n.t('chat_with_verse'),
      color: '#795323',
      action: handleChatWithVerse,
    },
    {
      id: 'devotional',
      icon: 'book-open' as const,
      label: i18n.t('create_devotional'),
      color: '#795323',
      action: handleCreateDevotional,
    },
  ];

  // When user enabled Card View preference, render the NewBibleReader component
  if (useCardView) {
    return <View className='flex-1 bg-surfaceCream/80'>
      <StatusBar translucent backgroundColor="transparent" />
      <NewBibleReader
        isBibleReaderScreen
        bookId={currentBookId}
        chapter={currentChapter}
        translation={currentVersion}
        isInPathMode={pathInProgress}
        onNavigateBack={handleBackNavigation}
        onSwitchToDefaultReader={handleSwitchToDefaultReader}
        onHandoffChapterData={handleHandoffChapterData}
        onOpenSettings={handlePresentModal}
      />
      {isModalVisible ? <Modal
        visible={true}
        transparent
        animationType="none"
        onRequestClose={handleCloseModal}>
        <TouchableWithoutFeedback onPress={handleCloseModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <RNAnimated.View
                style={[
                  styles.modalContent,
                  {
                    backgroundColor: THEME_COLORS[currentTheme].modalBackground,
                    transform: [
                      {
                        translateY: slideAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [300, 0],
                        }),
                      },
                    ],
                  },
                ]}>
                <View
                  style={[
                    styles.modalHandle,
                    { backgroundColor: THEME_COLORS[currentTheme].border },
                  ]}
                />

                {/* Card View Toggle */}
                <View style={styles.toggleContainer}>
                  <Text style={[styles.toggleLabel, { color: THEME_COLORS[currentTheme].text }]}>
                    {i18n.t('card_view')}
                  </Text>
                  <Switch
                    trackColor={{ false: '#E0E0E0', true: '#F7B500' }}
                    thumbColor={useCardView ? '#FFFFFF' : '#FFFFFF'}
                    ios_backgroundColor="#E0E0E0"
                    onValueChange={handleCardViewToggle}
                    value={useCardView}
                  />
                </View>

                {/* Font Size Controls */}
                <View style={styles.sliderContainer}>
                  <Text style={[styles.sliderLabel, { color: THEME_COLORS[currentTheme].text }]}>
                    {i18n.t('font_size_a')}
                  </Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={MIN_FONT_SIZE}
                    maximumValue={MAX_FONT_SIZE}
                    value={fontSize}
                    onValueChange={handleFontSizeChange}
                    minimumTrackTintColor="#DCB280"
                    maximumTrackTintColor={THEME_COLORS[currentTheme].sliderTrack}
                    thumbTintColor="#DCB280"
                  />
                  <Text
                    style={[styles.sliderLabelLarge, { color: THEME_COLORS[currentTheme].text }]}>
                    {i18n.t('font_size_a')}
                  </Text>
                </View>

                {/* Line Height Controls */}
                <View style={styles.lineHeightContainer}>
                  <View style={styles.lineHeightButtons}>
                    {(['COMPACT', 'REGULAR', 'RELAXED'] as const).map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.lineHeightButton,
                          lineHeightPreset === p && styles.lineHeightButtonSelected,
                          { borderColor: THEME_COLORS[currentTheme].border },
                        ]}
                        onPress={() => handleLineHeightChange(p)}>
                        <Text
                          style={[
                            styles.lineHeightButtonText,
                            { color: THEME_COLORS[currentTheme].text },
                            lineHeightPreset === p && styles.lineHeightButtonTextSelected,
                          ]}>
                          {p.charAt(0) + p.slice(1).toLowerCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Theme Buttons */}
                <View style={styles.themeButtonsContainer}>
                  {(Object.keys(THEME_COLORS) as ThemeType[]).map((k) => (
                    <TouchableOpacity
                      key={k}
                      style={[
                        styles.themeButton,
                        { backgroundColor: THEME_COLORS[k].background },
                        currentTheme === k && [
                          styles.selectedThemeButton,
                          { borderColor: THEME_COLORS[k].border },
                        ],
                      ]}
                      onPress={() => handleThemeChange(k)}
                    />
                  ))}
                </View>
              </RNAnimated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>:null}
    </View>
  } else {
    // Use pendingChapterData if available
    const effectiveChapterData = pendingChapterData || chapterData;
    if (loading && !effectiveChapterData) {
      return <PulsingDotsIndicator />;
    }
    if (error && !effectiveChapterData) {
      return (
        <Text className="text-red-500 mt-10 text-center font-feather px-4">
          {i18n.t('error_loading_chapter')}: {error}
        </Text>
      );
    }

    // Render chat view if active
    if (showChatView && selectedVerse && effectiveChapterData) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF4DC' }}>
          <VerseChatView
            verse={selectedVerse}
            bookName={effectiveChapterData.book}
            chapter={effectiveChapterData.chapter}
            onClose={handleCloseChatView}
          />
        </SafeAreaView>
      );
    }

    return (
      <>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle={'dark-content'}
        />
        <View className="flex-1">
          <Animated.View
            style={
              { position: 'absolute', width: '100%', height: '100%' }
            }>
            <ImageBackground
              source={require('../assets/backgrounds/mainBackground2.png')}
              style={{ width: '100%', height: '100%' }}
            >
              <Image
                source={require('../assets/backgrounds/mainBackground2.png')}
                style={{ width: '100%', height: '100%' }}
              />
            </ImageBackground>
          </Animated.View>
          <SafeAreaView className="flex-1">
            <View
              className="bg-surfaceCream rounded-t-card"
              style={{ width: "100%", height:IS_ANDROID ? '85%' : "95%", position: 'absolute', bottom: 0 }}>
              <View>
                {/* Title and Settings Row */}
                <View style={{ position: 'absolute', left: 20, right: 20, top: -50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text
                    className="font-feather text-white"
                    style={{
                      fontSize: responsiveFontSize(3),
                      fontWeight: "400",
                    }}
                  >
                   {i18n.t('bible_title')}
                  </Text>
                  <TouchableOpacity onPress={handlePresentModal} className="bg-white/80 w-10 h-10 rounded-full items-center justify-center">
                    <MaterialIcons
                      name="settings"
                      size={22}
                      color="#795323"
                      style={{ opacity: 0.4 }}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <Animated.View
                className='py-5 pb-12'
                style={animatedStyle}
              >
                {effectiveChapterData && renderBibleContent(effectiveChapterData)}
              </Animated.View>

              {/* Path Mode Button (when in path mode) */}
              {!isEmbedded && pathInProgress && (
                <RNAnimated.View
                  style={[
                    {
                      position: 'absolute',
                      bottom: isEmbedded ? 170 : effectiveParams?.isFromDailyBread ? 120 : 170,
                      left: 20,
                      right: 20,
                      zIndex: 10,
                    },
                    buttonsContainerStyle,
                  ]}>
                  <SideButton
                    title={
                      isJustReadMode
                        ? 'Finish Reading'
                        : isAtEndChapter
                          ? 'Complete Unit'
                          : 'Next Chapter'
                    }
                    onPress={
                      isJustReadMode
                        ? handleFinishReading
                        : isAtEndChapter
                          ? handleFinishReading
                          : navigateToNextChapter
                    }
                    disabled={!hasScrolledToBottom || loading}
                  />
                </RNAnimated.View>
              )}

              {/* Settings Modal for DEFAULT reader branch!!! */}
              <Modal
                visible={isModalVisible}
                transparent
                animationType="none"
                onRequestClose={handleCloseModal}>
                <TouchableWithoutFeedback onPress={handleCloseModal}>
                  <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback>
                      <RNAnimated.View
                        style={[
                          styles.modalContent,
                          {
                            backgroundColor: THEME_COLORS[currentTheme].modalBackground,
                            transform: [
                              {
                                translateY: slideAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [300, 0],
                                }),
                              },
                            ],
                          },
                        ]}>
                        <View
                          style={[
                            styles.modalHandle,
                            { backgroundColor: THEME_COLORS[currentTheme].border },
                          ]}
                        />

                        {/* Card View Toggle */}
                        <View style={styles.toggleContainer}>
                          <Text style={[styles.toggleLabel, { color: THEME_COLORS[currentTheme].text }]}>
                            {i18n.t('card_view')}
                          </Text>
                          <Switch
                            trackColor={{ false: '#E0E0E0', true: '#F7B500' }}
                            thumbColor={useCardView ? '#FFFFFF' : '#FFFFFF'}
                            ios_backgroundColor="#E0E0E0"
                            onValueChange={handleCardViewToggle}
                            value={useCardView}
                          />
                        </View>

                        {/* Font Size Controls */}
                        <View style={styles.sliderContainer}>
                          <Text style={[styles.sliderLabel, { color: THEME_COLORS[currentTheme].text }]}>
                            {i18n.t('font_size_a')}
                          </Text>
                          <Slider
                            style={styles.slider}
                            minimumValue={MIN_FONT_SIZE}
                            maximumValue={MAX_FONT_SIZE}
                            value={fontSize}
                            onValueChange={handleFontSizeChange}
                            minimumTrackTintColor="#DCB280"
                            maximumTrackTintColor={THEME_COLORS[currentTheme].sliderTrack}
                            thumbTintColor="#DCB280"
                          />
                          <Text
                            style={[styles.sliderLabelLarge, { color: THEME_COLORS[currentTheme].text }]}>
                            {i18n.t('font_size_a')}
                          </Text>
                        </View>

                        {/* Line Height Controls */}
                        <View style={styles.lineHeightContainer}>
                          <View style={styles.lineHeightButtons}>
                            {(['COMPACT', 'REGULAR', 'RELAXED'] as const).map((p) => (
                              <TouchableOpacity
                                key={p}
                                style={[
                                  styles.lineHeightButton,
                                  lineHeightPreset === p && styles.lineHeightButtonSelected,
                                  { borderColor: THEME_COLORS[currentTheme].border },
                                ]}
                                onPress={() => handleLineHeightChange(p)}>
                                <Text
                                  style={[
                                    styles.lineHeightButtonText,
                                    { color: THEME_COLORS[currentTheme].text },
                                    lineHeightPreset === p && styles.lineHeightButtonTextSelected,
                                  ]}>
                                  {p.charAt(0) + p.slice(1).toLowerCase()}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>

                        {/* Theme Buttons */}
                        <View style={styles.themeButtonsContainer}>
                          {(Object.keys(THEME_COLORS) as ThemeType[]).map((k) => (
                            <TouchableOpacity
                              key={k}
                              style={[
                                styles.themeButton,
                                { backgroundColor: THEME_COLORS[k].background },
                                currentTheme === k && [
                                  styles.selectedThemeButton,
                                  { borderColor: THEME_COLORS[k].border },
                                ],
                              ]}
                              onPress={() => handleThemeChange(k)}
                            />
                          ))}
                        </View>
                      </RNAnimated.View>
                    </TouchableWithoutFeedback>
                  </View>
                </TouchableWithoutFeedback>
              </Modal>
            </View>
          </SafeAreaView>

          {/* Add BibleVerseActionBar */}
          <BibleVerseActionBar
            reference={effectiveChapterData
              ? `${effectiveChapterData.book} ${effectiveChapterData.chapter}`
              : i18n.t('loading')}
            onPrev={navigateToPreviousChapter}
            onNext={navigateToNextChapter}
            onVersePress={handleOpenSelector}
          />

          {/* Add Floating Menu */}
          {floatingMenu.isVisible && floatingMenu.verse && (
            <TouchableWithoutFeedback onPress={handleCloseFloatingMenu}>
              <View style={styles.menuOverlay}>
                <View
                  style={[
                    styles.floatingMenu,
                    {
                      position: 'absolute',
                      left: floatingMenu.position.x,
                      top: floatingMenu.position.y,
                    },
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
                            backgroundColor: `${action.color}22`,
                          },
                        ]}>
                        <Feather name={action.icon} size={18} color={action.color} />
                      </View>
                      <Text style={styles.menuText}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableWithoutFeedback>
          )}

          {/* Add Highlight Color Picker */}
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
        </View>
      </>
    );
  }
};

// Standalone screen that uses the component
export default function BibleReaderScreen() {
  const params = useLocalSearchParams();

  // Extract params for initial state
  const urlBookId = params.bookId ? parseInt(params.bookId as string, 10) : undefined;
  const urlChapters = params.chapters
    ? (params.chapters as string).split(',').map((c) => parseInt(c, 10))
    : undefined;
  const initialChapter = urlChapters && urlChapters.length > 0 ? urlChapters[0] : undefined;

  return <BibleReader initialBookId={urlBookId} initialChapter={initialChapter} />;
}

// Styles
const styles = StyleSheet.create<BibleReaderStyles>({
  container: {
    flex: 1,
  },
  newHeaderContainer: {
    alignItems: 'center',
    backgroundColor: '#FFF4D9',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  headerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  headerRight: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 244, 217, 0.95)',
    borderRadius: 22,
    elevation: 3,
    height: 44,
    justifyContent: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    width: 44,
  },
  backButtonText: {
    color: '#3C584A',
    fontFamily: 'Inter-Bold',
    fontSize: 24,
  },
  headerButton: {
    alignSelf: "center",
    width: "100%",
    height: 50,
    justifyContent: "center",
    alignItems: "center",

  },
  headerButtonText: {
    color: '#3C584A',
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    fontWeight: '500',
  },
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
    backgroundColor: '#FFF4D9',
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 130,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  verseText: {
    color: '#3C584A',
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
    marginBottom: 10,
  },
  verseNumber: {
    color: '#DCB280',
    // fontFamily: 'Inter-Bold',
    // fontWeight: 'bold',
  },
  floatingNavContainer: {
    position: 'absolute',
    bottom: 80, // Increased from 30 to 80 to avoid tab bar
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  floatingNavContainerEmbedded: {
    bottom: 100, // Move up when tab bar is present
  },
  verseContainer: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  selectedVerse: {},
  fontSizeButton: {
    backgroundColor: 'rgba(220, 178, 128, 0.2)',
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeButtonText: {
    color: '#3C584A',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  sliderContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 32,
    marginTop: 0,
    paddingHorizontal: 0,
    width: '100%',
  },
  slider: {
    flex: 1,
    width: '100%',
    height: 40,
    marginHorizontal: 10,
  },
  sliderLabel: {
    fontSize: 14,
    color: '#3C584A',
    fontFamily: 'Inter-Medium',
    width: 20,
    textAlign: 'center',
  },
  sliderLabelLarge: {
    fontSize: 20,
    color: '#3C584A',
    fontFamily: 'Inter-Medium',
    width: 20,
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#FFF4D9',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 48,
    alignItems: 'center',
    width: '100%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },
  themeButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 0,
    paddingHorizontal: 10,
  },
  themeButton: {
    width: 75,
    height: 45,
    borderRadius: 50,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  selectedThemeButton: {
    borderWidth: 2,
  },
  selectedThemeButtonDark: {
    borderWidth: 2,
  },
  lineHeightContainer: {
    marginBottom: 32,
    marginTop: 0,
    paddingHorizontal: 16,
    width: '100%',
  },
  lineHeightButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  lineHeightButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  lineHeightButtonSelected: {
    backgroundColor: '#DCB280',
    borderColor: '#DCB280',
  },
  lineHeightButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  lineHeightButtonTextSelected: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Medium',
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
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.07)',
    zIndex: 1000,
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
    width: 180,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(121, 83, 35, 0.1)',
  },
  menuItem: {
    alignItems: 'center',
    width: '50%',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  menuText: {
    fontSize: 12,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    textAlign: 'center',
    color: '#3C584A',
  },
  menuItemText: {
    fontSize: 12,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    textAlign: 'center',
    color: '#3C584A',
  },
});
