import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Dimensions,
} from 'react-native';
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
  Easing,
  Layout,
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
import { Audio } from 'expo-av';
import { useAuth } from '~/app/hooks/authHook';
import useSubscriptionStore from '../app/stores/subscriptionStore';
import Tts from 'react-native-tts';

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
const TTS_AUTO_PLAY_KEY = 'userTtsAutoPlay';
const TTS_COUNT_KEY = 'userTtsCount';
const TTS_FREE_LIMIT = 5;

// TTS prefetching constants
const TTS_PREFETCH_BATCH_SIZE = 5;
const TTS_PREFETCH_TRIGGER_POINT = 3; // When to fetch the next batch

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
const SWIPE_THRESHOLD = 0.08; // Lower threshold to detect smaller swipes
const SWIPE_FEEDBACK_THRESHOLD = 0.03; // Provide feedback sooner
const SWIPE_INDICATOR_SHOW_THRESHOLD = 0.02; // Show indicator earlier
const CHAT_TRANSITION_DELAY = 0; // No delay for immediate response
const FADE_DURATION = 200; // Even faster fade transition

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
  const [showSwipeGuidance, setShowSwipeGuidance] = useState(true);
  const [tapCount, setTapCount] = useState(0);
  const [useDefaultReader, setUseDefaultReader] = useState(false);
  const [showBackButton, setShowBackButton] = useState(false);
  const [previousChapterInfo, setPreviousChapterInfo] = useState<{
    bookId: number;
    chapter: number;
  } | null>(null);

  // TTS state variables
  const [autoPlayTts, setAutoPlayTts] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingTTS, setIsLoadingTTS] = useState(false);
  const [selectedSpeakingVerse, setSelectedSpeakingVerse] = useState<Verse | null>(null);
  const [verseSpokenMap, setVerseSpokenMap] = useState<Record<string, boolean>>({});
  const [audioCache, setAudioCache] = useState<Record<string, string>>({});
  const [ttsCount, setTtsCount] = useState(0);
  const [reachedTtsLimit, setReachedTtsLimit] = useState(false);

  // Chat and UI state variables
  const [showChatView, setShowChatView] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [isFadingToChat, setIsFadingToChat] = useState(false);

  // TTS refs
  const sound = useRef<Audio.Sound | null>(null);
  const prefetchInProgress = useRef<Set<string>>(new Set());
  const nextBatchTimer = useRef<NodeJS.Timeout | null>(null);

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

  const [fontSize, setFontSize] = useState<number>(DEFAULT_FONT_SIZE);
  const [lineHeightPreset, setLineHeightPreset] = useState<LineHeightPreset>('REGULAR');
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('light');
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const slideAnim = useRef(new RNAnimated.Value(0)).current;

  const theme = THEME_COLORS[currentTheme];
  const verseTextStyle = {
    fontSize: fontSize,
    lineHeight: LINE_HEIGHT_PRESETS[lineHeightPreset],
    color: theme.text,
  };

  const showBookChapterSelector = useUIStore((state) => state.showBookChapterSelector);

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

  // Add subscription store and auth hook
  const { isProMember, presentPaywall } = useSubscriptionStore();
  const { getFirebaseIdToken } = useAuth();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSize = await AsyncStorage.getItem(FONT_SIZE_KEY);
        if (savedSize !== null) setFontSize(parseInt(savedSize, 10));

        const savedLineHeightValue = await AsyncStorage.getItem(LINE_HEIGHT_KEY);
        if (savedLineHeightValue !== null) {
          const preset = Object.keys(LINE_HEIGHT_PRESETS).find(
            (key) => LINE_HEIGHT_PRESETS[key as LineHeightPreset] === parseInt(savedLineHeightValue)
          ) as LineHeightPreset | undefined;
          if (preset) setLineHeightPreset(preset);
        }

        // Load tap guidance preference
        const hideTapGuidance = await AsyncStorage.getItem(TAP_GUIDANCE_KEY);
        if (hideTapGuidance === 'true') {
          setShowTapGuidance(false);
        }

        // Load swipe guidance preference
        const hideSwipeGuidance = await AsyncStorage.getItem(SWIPE_GUIDANCE_KEY);
        if (hideSwipeGuidance === 'true') {
          setShowSwipeGuidance(false);
        }

        // Load reader preference
        const readerPref = await AsyncStorage.getItem(READER_PREFERENCE_KEY);
        if (readerPref === 'default') {
          setUseDefaultReader(true);
        }

        // Load TTS auto play preference
        const ttsAutoPlay = await AsyncStorage.getItem(TTS_AUTO_PLAY_KEY);
        if (ttsAutoPlay === 'false') {
          setAutoPlayTts(false);
        }
      } catch (e) {
        console.error('Failed to load settings from AsyncStorage', e);
      }
    };
    loadSettings();
  }, []);

  // Initialize Audio and TTS
  useEffect(() => {
    const initAudio = async () => {
      try {
        // Initialize Audio
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          allowsRecordingIOS: false,
        });

        // Initialize React Native TTS
        Tts.setDefaultLanguage('en-US');
        Tts.setDefaultRate(0.5);
        Tts.setDefaultPitch(1.0);
      } catch (error) {
        console.error('Failed to initialize Audio/TTS modules:', error);
      }
    };
    
    initAudio();
  }, []);

  // Load TTS count from AsyncStorage
  useEffect(() => {
    const loadTtsCount = async () => {
      try {
        const savedCount = await AsyncStorage.getItem(TTS_COUNT_KEY);
        if (savedCount !== null) {
          const count = parseInt(savedCount, 10);
          setTtsCount(count);
          setReachedTtsLimit(count >= TTS_FREE_LIMIT);
          
          // Don't automatically disable TTS - let the user decide
          // The TTS functions will handle the limit checking
        }
      } catch (error) {
        console.error('Error loading TTS count:', error);
      }
    };
    
    loadTtsCount();
  }, [isProMember]);

  // Cleanup function for audio and timers
  useEffect(() => {
    return () => {
      if (sound.current) {
        sound.current.unloadAsync().catch(err => 
          console.error("Error unloading sound:", err)
        );
      }
      
      // Clear batch timer on cleanup
      if (nextBatchTimer.current) {
        clearTimeout(nextBatchTimer.current);
        nextBatchTimer.current = null;
      }

      // Stop any TTS playback
      Tts.stop();
    };
  }, []);

  // Helper function to load a chapter
  const loadChapter = useCallback(
    async (bookId: number, chapter: number) => {
      setLoading(true);
      setCurrentIndex(0); // Reset to first verse when loading a new chapter
      setIsTypingComplete(false);
      setSkipTyping(false);
      progressValue.value = withTiming(0, { duration: 0 });
      // Reset the verse spoken map when loading a new chapter
      setVerseSpokenMap({});

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
    },
    [translation, progressValue]
  );

  // Function to check and increment TTS count
  const checkAndIncrementTtsCount = useCallback(async () => {
    // Pro users don't need to track count
    if (isProMember) return true;
    
    // Already reached limit
    if (ttsCount >= TTS_FREE_LIMIT) {
      setReachedTtsLimit(true);
      return false;
    }
    
    // Increment count
    const newCount = ttsCount + 1;
    setTtsCount(newCount);
    
    try {
      await AsyncStorage.setItem(TTS_COUNT_KEY, newCount.toString());
      
      // Check if reached limit with this increment
      if (newCount >= TTS_FREE_LIMIT) {
        setReachedTtsLimit(true);
        
        // Show toast notification about the limit
        Toast.show({
          type: 'info',
          text1: 'TTS Limit Reached',
          text2: 'Free TTS plays used up. Upgrade for unlimited access.',
          position: 'top',
          visibilityTime: 3000
        });
        
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error saving TTS count:', error);
      return true; // Allow usage on error to avoid blocking
    }
  }, [ttsCount, isProMember]);



  // Stop speaking function
  const stopSpeaking = useCallback(async () => {
    if (sound.current) {
      await sound.current.stopAsync();
      await sound.current.unloadAsync();
      sound.current = null;
    }
    
    // Also stop React Native TTS
    Tts.stop();
    
    setIsSpeaking(false);
    setSelectedSpeakingVerse(null);
  }, []);

  // Prefetch verse audio using OpenAI TTS for pro users or first 5 for free users
  const prefetchVerseAudio = useCallback(async (verses: Verse[], startIndex: number) => {
    // Skip if no chapter data or verses
    if (!chapterData || !verses.length) return;
    
    // Skip prefetching entirely if TTS is turned off
    if (!autoPlayTts) return;
    
    // Check if user is allowed to prefetch
    const canPrefetch = isProMember || !reachedTtsLimit;
    if (!canPrefetch) return;
    
    try {
      // Get Firebase ID token for authentication (only for OpenAI TTS)
      const idToken = await getFirebaseIdToken();
      if (!idToken && isProMember) {
        console.error('Failed to get Firebase ID token for pro user');
        return;
      }
      
      // Determine how many verses to fetch (capped at TTS_PREFETCH_BATCH_SIZE)
      const endIndex = Math.min(startIndex + TTS_PREFETCH_BATCH_SIZE, verses.length);
      
      // Create an array of promises for fetching TTS for multiple verses
      const fetchPromises = [];
      
      for (let i = startIndex; i < endIndex; i++) {
        const verse = verses[i];
        const verseKey = `${chapterData.book}-${chapterData.chapter}-${verse.verse}`;
        
        // Skip verses already cached or being fetched
        if (audioCache[verseKey] || prefetchInProgress.current.has(verseKey)) {
          continue;
        }
        
        // Mark this verse as being fetched
        prefetchInProgress.current.add(verseKey);
        
        // For pro users, use OpenAI TTS
        if (isProMember) {
          fetchPromises.push(
            fetch('https://shepherd-dev-api.skylar.gg/oai/tts', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                input: verse.text,
                voice: "shimmer",
              }),
            }).then(async response => {
              if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
              }
              
              // Convert response to base64 audio
              const buffer = await response.arrayBuffer();
              const base64Audio = btoa(
                new Uint8Array(buffer)
                  .reduce((data, byte) => data + String.fromCharCode(byte), '')
              );
              
              // Create a data URI for the audio
              const audioUri = `data:audio/mp3;base64,${base64Audio}`;
              
              // Save in cache
              return { verseKey, audioUri, isOpenAI: true };
            }).catch(error => {
              console.error(`Error prefetching OpenAI TTS for verse ${verse.verse}:`, error);
              // Remove from in-progress set on error
              prefetchInProgress.current.delete(verseKey);
              return null;
            })
          );
        } else {
          // For free users, just mark as ready for React Native TTS (no prefetching needed)
          prefetchInProgress.current.delete(verseKey);
          setAudioCache(prev => ({...prev, [verseKey]: 'native-tts'}));
        }
      }
      
      // Execute all fetch requests in parallel (only for pro users)
      if (fetchPromises.length > 0) {
        console.log(`📲 Prefetching OpenAI TTS for ${fetchPromises.length} verses starting at index ${startIndex}`);
        
        const results = await Promise.all(fetchPromises);
        
        // Update the audio cache with fetched results
        const newCacheEntries = results
          .filter(result => result !== null)
          .reduce((acc, result) => {
            if (result) {
              // Remove from in-progress set
              prefetchInProgress.current.delete(result.verseKey);
              // Add to accumulator
              acc[result.verseKey] = result.audioUri;
            }
            return acc;
          }, {} as Record<string, string>);
        
        if (Object.keys(newCacheEntries).length > 0) {
          setAudioCache(prev => ({...prev, ...newCacheEntries}));
        }
        
        // Schedule next batch prefetch if needed
        if (startIndex + TTS_PREFETCH_TRIGGER_POINT < verses.length && endIndex < verses.length) {
          // Clear any existing timer
          if (nextBatchTimer.current) {
            clearTimeout(nextBatchTimer.current);
          }
          
          // Schedule next batch prefetch
          nextBatchTimer.current = setTimeout(() => {
            prefetchVerseAudio(verses, endIndex);
            nextBatchTimer.current = null;
          }, 1000); // 1 second delay before fetching next batch
        }
      }
    } catch (error) {
      console.error('Error in batch prefetch:', error);
    }
  }, [chapterData, audioCache, getFirebaseIdToken, isProMember, reachedTtsLimit, autoPlayTts]);

  // Play text-to-speech for a verse
  const playTextToSpeech = useCallback(async (text: string, verse?: Verse) => {
    // Early return if TTS is completely disabled via toggle (unless it's a manual tap)
    if (!autoPlayTts && !verse) {
      return;
    }

    if (isSpeaking || isLoadingTTS) {
      if (isSpeaking && (sound.current || selectedSpeakingVerse)) {
        // Stop current playback if the same verse is clicked again
        if (verse && selectedSpeakingVerse && verse.verse === selectedSpeakingVerse.verse) {
          stopSpeaking();
          return;
        }
      }
      return;
    }

    try {
      // For pro users, always use OpenAI TTS
      // For free users, use OpenAI TTS for first 5 requests, then React Native TTS
      let useOpenAI = isProMember;
      
      // For free users, check if they can still use OpenAI TTS
      if (!isProMember && !reachedTtsLimit) {
        const canContinue = await checkAndIncrementTtsCount();
        if (canContinue) {
          useOpenAI = true;
        }
      }
      
      setIsLoadingTTS(true);
      if (verse) setSelectedSpeakingVerse(verse);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Unload any previous sound
      if (sound.current) {
        await sound.current.unloadAsync();
        sound.current = null;
      }
      
      // Stop any React Native TTS
      Tts.stop();
      
      // Check if we have this verse audio in cache
      let audioUri = '';
      let useNativeTts = !useOpenAI; // Use native TTS if not using OpenAI
      
      if (verse && chapterData && useOpenAI) {
        const verseKey = `${chapterData.book}-${chapterData.chapter}-${verse.verse}`;
        if (audioCache[verseKey] && audioCache[verseKey] !== 'native-tts') {
          console.log(`🔈 Using cached OpenAI TTS for ${verseKey}`);
          audioUri = audioCache[verseKey];
        }
      }

      // If not in cache and using OpenAI, fetch from API
      if (!audioUri && useOpenAI) {
        const idToken = await getFirebaseIdToken();
        if (!idToken) {
          console.error('Failed to get Firebase ID token');
          throw new Error('Authentication failed');
        }

        // Log analytics
        analytics.logEvent("CardBibleReader_TTS_Started", {
          bookId,
          chapter,
          translation,
          type: 'openai'
        });

        const response = await fetch('https://shepherd-dev-api.skylar.gg/oai/tts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: text,
            voice: "shimmer",
          }),
        });

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        const base64Audio = btoa(
          new Uint8Array(buffer)
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        
        audioUri = `data:audio/mp3;base64,${base64Audio}`;
        
        // Save to cache if it's a verse
        if (verse && chapterData) {
          const verseKey = `${chapterData.book}-${chapterData.chapter}-${verse.verse}`;
          setAudioCache(prev => ({...prev, [verseKey]: audioUri}));
        }
      }
      
      // Play the audio
      if (audioUri) {
        // Use Expo AV for OpenAI TTS
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded && status.didJustFinish) {
              setIsSpeaking(false);
              setSelectedSpeakingVerse(null);
            }
          }
        );
        
        sound.current = newSound;
        setIsSpeaking(true);
        setIsLoadingTTS(false);
      } else {
        // Use React Native TTS for free users or fallback
        analytics.logEvent("CardBibleReader_TTS_Started", {
          bookId,
          chapter,
          translation,
          type: 'native'
        });

        // Set up TTS event listeners
        const onTtsFinish = () => {
          setIsSpeaking(false);
          setSelectedSpeakingVerse(null);
        };

        const onTtsStart = () => {
          setIsSpeaking(true);
          setIsLoadingTTS(false);
        };

        Tts.addEventListener('tts-finish', onTtsFinish);
        Tts.addEventListener('tts-start', onTtsStart);

        // Speak the text
        Tts.speak(text);

        // Clean up listeners after a delay
        setTimeout(() => {
          Tts.removeEventListener('tts-finish', onTtsFinish);
          Tts.removeEventListener('tts-start', onTtsStart);
        }, 30000); // 30 second cleanup
      }
    } catch (error) {
      console.error('Error playing TTS:', error);
      setIsLoadingTTS(false);
      setIsSpeaking(false);
      setSelectedSpeakingVerse(null);
      Toast.show({ 
        type: 'error', 
        text1: 'Failed to play audio',
        position: 'top',
        visibilityTime: 2000
      });
    }
  }, [isSpeaking, isLoadingTTS, getFirebaseIdToken, bookId, chapter, translation, 
      stopSpeaking, selectedSpeakingVerse, isProMember, reachedTtsLimit, autoPlayTts,
      checkAndIncrementTtsCount, audioCache, chapterData]);

  // Show paywall method for TTS
  const showTtsPaywall = useCallback(async () => {
    analytics.logEvent("Bible_TTS_PaywallShown", {
      book: chapterData?.book,
      chapter: chapterData?.chapter,
      ttsCount
    });
    
    const result = await presentPaywall();
    
    // If purchase was successful, batch next 5 verses and continue
    if (result && chapterData?.verses) {
      console.log('🎉 User upgraded! Batching next 5 verses with OpenAI TTS');
      
      // Calculate which batch we should prefetch (current verse batch)
      const batchStartIndex = Math.floor(currentIndex / TTS_PREFETCH_BATCH_SIZE) * TTS_PREFETCH_BATCH_SIZE;
      
      // Prefetch the current batch with OpenAI TTS
      prefetchVerseAudio(chapterData.verses, batchStartIndex);
    }
    
    return result;
  }, [chapterData, ttsCount, presentPaywall, currentIndex, prefetchVerseAudio]);

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
    loadChapter(prevBookId, prevChapter).then((success) => {
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

  // Initial TTS batch prefetch when chapter loads
  useEffect(() => {
    if (chapterData?.verses && autoPlayTts && !loading) {
      console.log('🔊 TTS enabled - batching first 5 verses for chapter');
      
      // Batch the first 5 verses (or all verses if less than 5)
      const versesToBatch = chapterData.verses.slice(0, TTS_PREFETCH_BATCH_SIZE);
      
      // For pro users or free users who haven't hit limit, use OpenAI
      if (isProMember || !reachedTtsLimit) {
        prefetchVerseAudio(chapterData.verses, 0);
      }
      // For free users who hit limit, we'll use React Native TTS (no prefetch needed)
    }
  }, [chapterData?.book, chapterData?.chapter, autoPlayTts]); // Trigger when chapter changes OR TTS is toggled

  useEffect(() => {
    if (chapterData?.verses?.length) {
      const newProgress = (currentIndex + 1) / chapterData.verses.length;
      progressValue.value = withTiming(newProgress, { duration: 600 });
    }
  }, [currentIndex, chapterData, progressValue]);

  // TTS auto-play effect - plays current verse and handles batching
  useEffect(() => {
    // When TTS is turned off, stop everything
    if (!autoPlayTts) {
      if (isSpeaking) {
        stopSpeaking();
      }
      console.log('🔇 TTS disabled - stopping all audio');
      return;
    }

    // Only proceed if we have chapter data and TTS is enabled
    if (!chapterData?.verses || loading || isFadingToChat) return;

    // Check if we need to batch next 5 verses (when free user hits verse 6, 11, 16, etc.)
    const isStartOfNewBatch = currentIndex > 0 && currentIndex % TTS_PREFETCH_BATCH_SIZE === 0;
    if (isStartOfNewBatch && !isProMember && !reachedTtsLimit) {
      // Free user is about to exceed their limit - show paywall
      console.log(`🚫 Free user reached verse ${currentIndex + 1} - showing paywall`);
      showTtsPaywall();
      return;
    }

    // For the current verse, check if we should play it
    const currentVerse = chapterData.verses[currentIndex];
    if (currentVerse) {
      const verseKey = `${chapterData.book}-${chapterData.chapter}-${currentVerse.verse}`;
      
      // Only play if this verse hasn't been spoken yet
      if (!verseSpokenMap[verseKey]) {
        setVerseSpokenMap(prev => ({...prev, [verseKey]: true}));
        playTextToSpeech(currentVerse.text, currentVerse);
      }
    }

    // If we're at the start of a new batch and user is pro, prefetch next batch
    if (isStartOfNewBatch && isProMember) {
      console.log(`🔊 Pro user - batching next 5 verses starting at ${currentIndex + 1}`);
      prefetchVerseAudio(chapterData.verses, currentIndex);
    }
  }, [currentIndex, autoPlayTts, chapterData, loading, isFadingToChat, 
      verseSpokenMap, playTextToSpeech, isSpeaking, stopSpeaking, 
      isProMember, reachedTtsLimit, showTtsPaywall, prefetchVerseAudio]);

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

    // Stop any current TTS playback when advancing to next verse
    if (isSpeaking) {
      stopSpeaking();
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
  }, [
    currentIndex,
    chapterData,
    isTypingComplete,
    scrollToBottom,
    showTapGuidance,
    tapCount,
    isScrolling,
    navigateToNextChapter,
    handleFinishReading,
    isInPathMode,
    isSpeaking,
    stopSpeaking,
  ]);

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

  const updateFontSize = async (newSize: number) => {
    if (newSize >= MIN_FONT_SIZE && newSize <= MAX_FONT_SIZE) {
      setFontSize(newSize);
      try {
        await AsyncStorage.setItem(FONT_SIZE_KEY, newSize.toString());
      } catch (e) {
        console.error('Failed to save font size', e);
      }
    }
  };

  const handleFontSizeChange = useCallback((value: number) => {
    updateFontSize(Math.round(value));
  }, []);

  const handleThemeChange = (newTheme: ThemeType) => {
    setCurrentTheme(newTheme);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleLineHeightChange = useCallback(async (preset: LineHeightPreset) => {
    setLineHeightPreset(preset);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await AsyncStorage.setItem(LINE_HEIGHT_KEY, LINE_HEIGHT_PRESETS[preset].toString());
    } catch (e) {
      console.error('Failed to save line height', e);
    }
  }, []);

  const handleDefaultReaderToggle = useCallback(
    async (value: boolean) => {
      setUseDefaultReader(value);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      analytics.logEvent('CardBibleReader_Tapped_ToggleDefaultReader', {
        value: value ? 'default' : 'new',
      });
      try {
        console.log(`Setting reader preference to: ${value ? 'default' : 'new'}`);
        await AsyncStorage.setItem(READER_PREFERENCE_KEY, value ? 'default' : 'new');

        // If the user toggled ON the default reader (value === true) we must
        // close this settings modal immediately to avoid leaving the grey
        // overlay visible after this component unmounts.
        if (value) {
          setIsSettingsModalVisible(false);
          // Handoff chapter data to parent before switching
          if (onHandoffChapterData) {
            onHandoffChapterData(chapterData);
          }
        }

        // Notify parent to switch back to default reader
        if (value && onSwitchToDefaultReader) {
          setTimeout(() => {
            if (onSwitchToDefaultReader) onSwitchToDefaultReader();
          }, 50);
        }
      } catch (e) {
        console.error('Failed to save reader preference', e);
      }
    },
    [onSwitchToDefaultReader, onHandoffChapterData, chapterData]
  );

  // Update the autoTTS toggle handler
  const handleAutoTtsToggle = useCallback(async (value: boolean) => {
    // Simple toggle behavior - TTS always works, just with different voice quality
    setAutoPlayTts(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.logEvent("CardBibleReader_Toggled_AutoTTS", {
      value: value ? 'on' : 'off'
    });
    
    try {
      await AsyncStorage.setItem(TTS_AUTO_PLAY_KEY, value ? 'true' : 'false');
      
      // If turning off, stop any current playback
      if (!value && isSpeaking) {
        stopSpeaking();
      }
    } catch (e) {
      console.error("Failed to save auto TTS preference", e);
    }
  }, [isSpeaking, stopSpeaking]);

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
        (v) => v.verse >= startVerse && v.verse <= endVerse
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
          console.log(
            `📚 [NewBibleReader] Syncing UI state for book ${bookId}, chapter ${chapter}`
          );
          setSavedReading(chapterData.book, bookId, chapter);
        }
      };

      updateUIState();
    }
  }, [bookId, chapter, chapterData, loading, setSavedReading]);



  // Animation values
  const fadeOpacity = useSharedValue(1);

  // Track swipe progress
  const swipeProgress = useRef({
    isActive: false,
    verse: null as Verse | null,
  });

  // Add refs to track swipeables for auto-closing
  const swipeableRefs = useRef<Map<number, any>>(new Map());
  const viewRefs = useRef<Map<number, any>>(new Map());

  // Handle verse swipe to chat transition with immediate fade
  const handleSwipeVerseToChat = (verse: Verse) => {
    if (isFadingToChat) return; // Prevent multiple triggers

    // Hide swipe guidance after first use
    if (showSwipeGuidance) {
      setShowSwipeGuidance(false);
      // Save preference to AsyncStorage
      AsyncStorage.setItem(SWIPE_GUIDANCE_KEY, 'true').catch((e) =>
        console.error('Failed to save swipe guidance setting', e)
      );
    }

    setIsFadingToChat(true);
    setSelectedVerse(verse);

    // Trigger gentle haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Start fading out immediately without delay
    fadeOpacity.value = withTiming(0, {
      duration: FADE_DURATION,
      easing: Easing.out(Easing.cubic),
    });

    // Show chat view after fade completes
    setTimeout(() => {
      setShowChatView(true);
    }, FADE_DURATION);

    // Close the swipeable smoothly after a short delay
    setTimeout(() => {
      const swipeableRef = swipeableRefs.current.get(verse.verse);
      if (swipeableRef) {
        swipeableRef.close();
      }
    }, 50); // Shorter delay for chat since it's transitioning away

    // Log the event
    analytics.logEvent('CardBibleReader_Swiped_VerseToChat', {
      book: chapterData?.book,
      chapter: chapterData?.chapter,
      verse: verse.verse,
    });
  };

  // Handle closing chat view with a faster transition back
  const handleCloseChatView = () => {
    setShowChatView(false);
    setSelectedVerse(null);
    setIsFadingToChat(false);

    // Faster restoration of the fade opacity
    fadeOpacity.value = withTiming(1, {
      duration: FADE_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  };

  // Handle swipe state tracking
  const handleSwipeStart = (verse: Verse) => {
    if (isFadingToChat) return;
    swipeProgress.current.isActive = true;
    swipeProgress.current.verse = verse;
  };

  const handleSwipeRelease = (openRatio: number, verse: Verse) => {
    if (isFadingToChat) return;

    // If opened enough, trigger the chat transition
    // Lower threshold for more responsive feel
    if (openRatio > SWIPE_THRESHOLD && swipeProgress.current.isActive) {
      handleSwipeVerseToChat(verse);
    }
    swipeProgress.current.isActive = false;
  };

  // Add left swipe handler for menu
  const handleLeftSwipeRelease = (openRatio: number, verse: Verse) => {
    if (isFadingToChat) return;

    // If opened enough, trigger the menu
    if (openRatio > SWIPE_THRESHOLD && swipeProgress.current.isActive) {
      handleSwipeVerseToMenu(verse);
    }
    swipeProgress.current.isActive = false;
  };

  // Handle left swipe to show menu
  const handleSwipeVerseToMenu = (verse: Verse) => {
    if (isFadingToChat || floatingMenu.isVisible) return;

    // Hide swipe guidance after first use
    if (showSwipeGuidance) {
      setShowSwipeGuidance(false);
      // Save preference to AsyncStorage
      AsyncStorage.setItem(SWIPE_GUIDANCE_KEY, 'true').catch((e) =>
        console.error('Failed to save swipe guidance setting', e)
      );
    }

    // Get the verse widget's position from the view ref (not swipeable ref)
    const viewRef = viewRefs.current.get(verse.verse);
    if (!viewRef) return;

    // Get the verse widget's position
    viewRef.measure(
      (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        // Position menu at the center of the verse widget
        const menuX = pageX + width / 2 - 90; // Center horizontally (menu width ~180)
        const menuY = pageY + height / 2 - 40; // Center vertically (menu height ~80)

        // Set menu visibility and position
        setFloatingMenu({
          isVisible: true,
          verse: verse,
          position: {
            x: menuX,
            y: menuY,
          },
        });

        // Trigger haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Animate the menu appearance with spring effect
        menuScaleAnim.value = 0.7;
        menuOpacityAnim.value = 0;

        menuScaleAnim.value = withTiming(1, {
          duration: 250,
          easing: Easing.out(Easing.back(1.8)),
        });

        menuOpacityAnim.value = withTiming(1, {
          duration: 200,
        });

        // Close the swipeable smoothly after a short delay
        setTimeout(() => {
          const swipeableRef = swipeableRefs.current.get(verse.verse);
          if (swipeableRef) {
            swipeableRef.close();
          }
        }, 100);

        // Log the event
        analytics.logEvent('BibleReader_Swiped_VerseToMenu', {
          book: chapterData?.book,
          chapter: chapterData?.chapter,
          verse: verse.verse,
        });
      }
    );
  };

  const handleSwipeChange = (progress: number) => {
    // If already transitioning, don't respond to swipe changes
    if (isFadingToChat) return;

    // Immediate feedback as soon as progress begins
    if (progress > 0 && swipeProgress.current.isActive) {
      // Provide subtle haptic feedback at the threshold for a better feel
      if (progress > SWIPE_FEEDBACK_THRESHOLD && progress < SWIPE_FEEDBACK_THRESHOLD + 0.02) {
        Haptics.selectionAsync();
      }
    }
  };

  // Subtle indicator component for swipe that fades in gradually
  const renderRightActions = (_progress: any, dragX: any, verse: Verse) => {
    if (!swipeProgress.current.isActive && !isFadingToChat) {
      handleSwipeStart(verse);
    }

    // Make indicator appear even quicker in response to swipe
    const translateX = dragX.interpolate({
      inputRange: [-70, -20, 0],
      outputRange: [0, 10, 60],
      extrapolate: 'clamp',
    });

    // Track swipe progress for haptic feedback
    const progressValue = _progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    // Allow very subtle movement to start seeing the indicator
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
          <Feather name="message-circle" size={18} color="#B89B4C" />
        </RNAnimated.View>
      </RNAnimated.View>
    );
  };

  // Add left actions for menu
  const renderLeftActions = (_progress: any, dragX: any, verse: Verse) => {
    if (!swipeProgress.current.isActive && !isFadingToChat) {
      handleSwipeStart(verse);
    }

    // Make indicator appear even quicker in response to swipe
    const translateX = dragX.interpolate({
      inputRange: [0, 20, 70],
      outputRange: [-60, -10, 0],
      extrapolate: 'clamp',
    });

    // Track swipe progress for haptic feedback
    const progressValue = _progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    // Allow very subtle movement to start seeing the indicator
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
          <Feather name="more-horizontal" size={18} color="#B89B4C" />
        </RNAnimated.View>
      </RNAnimated.View>
    );
  };

  // Create animated styles for fading
  const fadeAnimStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeOpacity.value,
    };
  });

  // State for floating menu
  const [floatingMenu, setFloatingMenu] = useState<FloatingMenuState>({
    isVisible: false,
    verse: null,
    position: {
      x: 0,
      y: 0,
    },
  });

  // Additional animations for floating menu
  const menuScaleAnim = useSharedValue(0);
  const menuOpacityAnim = useSharedValue(0);

  // Handle long press to show floating menu
  const handleLongPress = (event: any, verse: Verse) => {
    // Prevent showing menu if already transitioning to chat
    if (isFadingToChat) return;

    // Get the press position to show menu near it
    const { absoluteX, absoluteY } = event.nativeEvent;

    // Calculate position, ensuring menu stays within screen bounds
    const menuX = Math.min(
      absoluteX,
      SCREEN_WIDTH - 240 // Approx menu width
    );

    const menuY = Math.min(
      absoluteY - 50, // Position menu above the press
      SCREEN_HEIGHT - 130 // Keep menu within screen height
    );

    // Set menu visibility and position
    setFloatingMenu({
      isVisible: true,
      verse: verse,
      position: {
        x: menuX,
        y: menuY,
      },
    });

    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animate the menu appearance
    menuScaleAnim.value = 0.8;
    menuOpacityAnim.value = 0;

    menuScaleAnim.value = withTiming(1, {
      duration: 200,
      easing: Easing.out(Easing.back(1.5)),
    });

    menuOpacityAnim.value = withTiming(1, {
      duration: 150,
    });
  };

  // Close the floating menu
  const handleCloseFloatingMenu = () => {
    // Animate menu disappearance
    menuScaleAnim.value = withTiming(0.8, { duration: 100 });
    menuOpacityAnim.value = withTiming(0, { duration: 100 });

    // After animation completes, hide the menu
    setTimeout(() => {
      setFloatingMenu((prev) => ({
        ...prev,
        isVisible: false,
        verse: null,
      }));
    }, 100);
  };

  // Define menu actions
  const handleCopyVerse = (verse: Verse) => {
    if (!chapterData) return;

    Clipboard.setString(
      `${chapterData.book} ${chapterData.chapter}:${verse.verse} - ${verse.text}`
    );
    Toast.show({
      type: 'success',
      text1: 'Verse copied to clipboard',
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
    // Make a new request to load highlights whenever bookId/chapter changes
    console.log(`Resetting and loading highlights for ${bookId}:${chapter}`);
    loadHighlights();
  }, [bookId, chapter, loadHighlights]);

  // Load highlights when component mounts or when bookId/chapter changes
  useEffect(() => {
    resetAndLoadHighlights();
  }, [bookId, chapter, resetAndLoadHighlights]);

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
    const existingHighlight = getHighlight(bookId, chapter, verse.verse);
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
      removeHighlight(bookId, chapter, verseToHighlight.verse);

      // Show removal confirmation
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Toast.show({
        type: 'success',
        text1: 'Highlight removed',
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
      addHighlight(bookId, chapter, verseToHighlight.verse, colorKey);

      // Show confirmation
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Toast.show({
        type: 'success',
        text1: 'Verse highlighted',
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
    removeHighlight(bookId, chapter, verse.verse);

    // Show confirmation
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Toast.show({
      type: 'success',
      text1: 'Highlight removed',
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

  // Memoized highlight and note getters to avoid re-rendering issues
  const getVerseHighlightColor = useCallback(
    (verse: Verse): string | null => {
      if (!verse) return null;
      const highlight = getHighlight(bookId, chapter, verse.verse);
      return highlight ? HIGHLIGHT_COLORS[highlight.colorKey] : null;
    },
    [getHighlight, bookId, chapter]
  );

  const hasNote = useCallback(
    (verse: Verse): boolean => {
      if (!verse) return false;
      return !!getNote(bookId, chapter, verse.verse);
    },
    [getNote, bookId, chapter]
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
      label: 'Copy',
      color: theme.iconColor,
      action: handleCopyVerse,
    },
    {
      id: 'explain',
      icon: 'book-open',
      label: 'Explain',
      color: theme.headerText,
      action: handleExplainVerse,
    },
    {
      id: 'highlight',
      icon: 'edit-2',
      label: 'Highlight',
      color: theme.progressBarFill,
      action: handleHighlightVerse,
    },
    {
      id: 'note',
      icon: 'edit-3',
      label: 'Add Note',
      color: theme.text,
      action: handleAddNote,
    },
  ];

  if (loading || !chapterData) {
    return (
      <SafeAreaView
        style={{ backgroundColor: theme.background, flex: 1 }}
        className="items-center justify-center">
        <ActivityIndicator size="large" color={theme.progressBarFill} />
      </SafeAreaView>
    );
  }

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

  const versesToShow: Verse[] = chapterData.verses.slice(0, currentIndex + 1);

  return (
    <SafeAreaView style={{ backgroundColor: theme.background, flex: 1 }}>
      {/* Absolute background to cover outer safe areas */}
      <View style={{ ...StyleSheet.absoluteFillObject }} pointerEvents="none" />

      <Reanimated.View
        style={[
          { flex: 1, paddingBottom: 24, paddingHorizontal: 16, paddingTop: 16 },
          fadeAnimStyle,
        ]}>
        {/* HEADER: Bible Book/Chapter, tap to open selector, styled like bibleReader.tsx */}
        <View className="flex-row items-center justify-between mb-3  px-[4px] py-[10px]">
          <View className="flex-row items-center">
            {isInPathMode && onNavigateBack && (
              <TouchableOpacity
                onPress={onNavigateBack}
                className="mr-2 bg-[#DCB28033] rounded-[22px] p-[6px]"
                disabled={isFadingToChat}>
                <Feather name="arrow-left" size={20} color={theme.iconColor} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleOpenSelector}
              className="bg-[#DCB28033] rounded-[15px] py-[5px] px-[12px] mr-2"
              disabled={isFadingToChat}>
              <Text className="font-feather text-[14px] text-[#3C584A]">
                {chapterData ? `${chapterData.book} ${chapterData.chapter}` : 'Loading...'}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={handlePresentSettingsModal}
            className="bg-[#DCB28033] rounded-[15px] py-[5px] px-[12px] items-center justify-center"
            disabled={isFadingToChat}>
            <Feather name="settings" size={20} color={theme.iconColor} />
          </TouchableOpacity>
        </View>
        {/* Add progress bar at the top */}
        <View
          style={{
            height: 8,
            backgroundColor: theme.progressBarBackground,
            borderRadius: 2,
            marginBottom: 8,
            overflow: 'hidden',
          }}>
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
          bounces={!isFadingToChat}
          scrollEnabled={!isFadingToChat}>
          {/* Wrap TouchableWithoutFeedback with GestureHandlerRootView for proper functioning of gestures */}
          <GestureHandlerRootView style={{ flex: 1 }}>
            <TouchableWithoutFeedback onPress={handleNextVerse}>
              <View style={{ minHeight: '100%' }}>
                {versesToShow.map((v, index) => {
                  // Get highlight color for this verse if it exists
                  const highlightColor = getVerseHighlightColor(v);

                  return (
                    <LongPressGestureHandler
                      key={v.verse}
                      minDurationMs={800}
                      onHandlerStateChange={(e) => {
                        if (e.nativeEvent.state === State.ACTIVE) {
                          handleLongPress(e, v);
                        }
                      }}>
                      <View>
                        <Swipeable
                          ref={(ref) => {
                            if (ref) {
                              swipeableRefs.current.set(v.verse, ref);
                            } else {
                              swipeableRefs.current.delete(v.verse);
                            }
                          }}
                          renderRightActions={(progress, dragX) =>
                            renderRightActions(progress, dragX, v)
                          }
                          renderLeftActions={(progress, dragX) =>
                            renderLeftActions(progress, dragX, v)
                          }
                          onSwipeableOpen={(direction) => {
                            if (direction === 'right') {
                              handleSwipeVerseToChat(v);
                            } else if (direction === 'left') {
                              handleSwipeVerseToMenu(v);
                            }
                          }}
                          onSwipeableClose={() => {
                            if (swipeProgress.current.isActive) {
                              swipeProgress.current.isActive = false;
                            }
                          }}
                          overshootRight={false}
                          overshootLeft={false}
                          friction={0.8}
                          rightThreshold={SCREEN_WIDTH * SWIPE_THRESHOLD}
                          leftThreshold={SCREEN_WIDTH * SWIPE_THRESHOLD}
                          enabled={!isFadingToChat && !floatingMenu.isVisible}
                          containerStyle={{ marginBottom: 16 }}
                          onSwipeableWillOpen={(direction) => {
                            if (direction === 'right') {
                              handleSwipeRelease(1, v);
                            } else if (direction === 'left') {
                              handleLeftSwipeRelease(1, v);
                            }
                          }}>
                          <Reanimated.View
                            entering={FadeInUp.duration(300).delay(index * 60)}
                            layout={Layout.springify()}
                            ref={(ref) => {
                              if (ref) {
                                viewRefs.current.set(v.verse, ref);
                              } else {
                                viewRefs.current.delete(v.verse);
                              }
                            }}>
                            <View
                              style={[
                                styles.verseBubble,
                                {
                                  backgroundColor: highlightColor
                                    ? `${highlightColor}80`
                                    : theme.bubbleBackground,
                                  borderColor: highlightColor || theme.bubbleBorder,
                                },
                              ]}>
                              <View
                                style={{
                                  marginBottom: 12,
                                }}>
                                {index === currentIndex ? (
                                  <TypingText
                                    text={v.text}
                                    baseTextStyle={{
                                      ...verseTextStyle,
                                      fontFamily: 'DIN Next Rounded LT W01 Regular',
                                    }}
                                    speed={20}
                                    skipAnimation={skipTyping}
                                    onComplete={handleTypingComplete}
                                  />
                                ) : (
                                  <Text
                                    style={{
                                      ...verseTextStyle,
                                      fontFamily: 'DIN Next Rounded LT W01 Regular',
                                    }}>
                                    {v.text}
                                  </Text>
                                )}
                              </View>

                              <View
                                style={{
                                  borderTopColor: theme.bubbleBorder,
                                  opacity: 0.3,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginTop: 0,
                                  paddingTop: 8,
                                }}>
                                <View
                                  style={{
                                    backgroundColor: theme.verseNumberBackground,
                                    height: 32,
                                    width: 32,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 16,
                                  }}>
                                  <Text
                                    style={{
                                      color: theme.verseNumberText,
                                      fontFamily: 'Feather Bold',
                                      fontSize: 14,
                                    }}>
                                    {v.verse}
                                  </Text>
                                </View>
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    columnGap: 20,
                                  }}>
                                  {/* Only show edit note button if verse has a note */}
                                  {hasNote(v) && (
                                    <TouchableOpacity
                                      onPress={(e) => {
                                        e.stopPropagation();
                                        if (isFadingToChat) return;
                                        handleAddNote(v);
                                      }}
                                      disabled={isFadingToChat}
                                      style={styles.actionIcon}>
                                      <Feather name="edit-3" size={16} color={theme.iconColor} />
                                    </TouchableOpacity>
                                  )}

                                  {/* TTS button */}
                                  <TouchableOpacity
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      if (isFadingToChat) return;
                                      playTextToSpeech(v.text, v);
                                    }}
                                    disabled={isFadingToChat || isLoadingTTS}
                                    style={[
                                      styles.actionIcon,
                                      {
                                        opacity: selectedSpeakingVerse?.verse === v.verse && isSpeaking ? 1 : 0.7,
                                      },
                                    ]}>
                                    {isLoadingTTS && selectedSpeakingVerse?.verse === v.verse ? (
                                      <ActivityIndicator size={16} color={theme.iconColor} />
                                    ) : (
                                      <Feather 
                                        name={selectedSpeakingVerse?.verse === v.verse && isSpeaking ? "pause" : "volume-2"} 
                                        size={16} 
                                        color={selectedSpeakingVerse?.verse === v.verse && isSpeaking ? theme.progressBarFill : theme.iconColor} 
                                      />
                                    )}
                                  </TouchableOpacity>

                                  {/* Copy button */}
                                  <TouchableOpacity
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      if (isFadingToChat) return;
                                      Clipboard.setString(
                                        `${chapterData.book} ${chapterData.chapter}:${v.verse} - ${v.text}`
                                      );
                                      Toast.show({
                                        type: 'success',
                                        text1: 'Verse copied to clipboard',
                                        position: 'top',
                                        visibilityTime: 2000,
                                      });
                                    }}
                                    disabled={isFadingToChat}
                                    style={styles.actionIcon}>
                                    <Feather name="copy" size={16} color={theme.iconColor} />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            </View>
                          </Reanimated.View>
                        </Swipeable>
                      </View>
                    </LongPressGestureHandler>
                  );
                })}

                {currentIndex < chapterData.verses.length - 1 ? (
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
                    {showSwipeGuidance && (
                      <Text
                        style={{
                          color: theme.headerText,
                          fontFamily: 'DIN Next Rounded LT W01 Regular',
                          fontSize: 14,
                          opacity: 0.6,
                          marginTop: 4,
                        }}>
                        ← Swipe left for annotations • Swipe right for chat →
                      </Text>
                    )}
                  </View>
                ) : (
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

                {/* Add invisible spacer to ensure touchable area extends to bottom padding */}
                <View style={{ height: 80 }} />
              </View>
            </TouchableWithoutFeedback>
          </GestureHandlerRootView>
        </ScrollView>
      </Reanimated.View>

      {/* Back button at bottom of screen */}
      {showBackButton && !isFadingToChat && (
        <Reanimated.View
          entering={FadeInUp.duration(300)}
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
      )}

      {/* Render the local settings modal only when no shared handler is
          provided. */}
      {!onOpenSettings && (
        <Modal
          visible={isSettingsModalVisible}
          transparent
          animationType="none"
          onRequestClose={handleCloseSettingsModal}>
          <TouchableWithoutFeedback onPress={handleCloseSettingsModal}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <RNAnimated.View
                  style={[
                    styles.modalContent,
                    {
                      backgroundColor: theme.modalBackground,
                      transform: [
                        {
                          translateY: slideAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [400, 0],
                          }),
                        },
                      ],
                    },
                  ]}>
                  <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />

                  {/* Default Reader Toggle */}
                  <View style={styles.toggleContainer}>
                    <Text style={[styles.toggleLabel, { color: theme.text }]}>Card View</Text>
                    <Switch
                      trackColor={{ false: '#E0E0E0', true: '#F7B500' }}
                      thumbColor={!useDefaultReader ? '#FFFFFF' : '#FFFFFF'}
                      ios_backgroundColor="#E0E0E0"
                      onValueChange={(value) => handleDefaultReaderToggle(!value)}
                      value={!useDefaultReader}
                    />
                  </View>

                  {/* TTS Toggle */}
                  <View style={styles.toggleContainer}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.toggleLabel, { color: theme.text }]}>Text-to-Speech</Text>
                      {!isProMember && (
                        <Text style={[styles.toggleSubLabel, { color: theme.text, opacity: 0.6 }]}>
                          {reachedTtsLimit ? 'Using device voice • Upgrade for AI voice' : `${TTS_FREE_LIMIT - ttsCount} AI voice plays left`}
                        </Text>
                      )}
                      {isProMember && (
                        <Text style={[styles.toggleSubLabel, { color: theme.text, opacity: 0.6 }]}>
                          Unlimited AI voice
                        </Text>
                      )}
                    </View>
                    <Switch
                      trackColor={{ false: '#E0E0E0', true: '#F7B500' }}
                      thumbColor={autoPlayTts ? '#FFFFFF' : '#FFFFFF'}
                      ios_backgroundColor="#E0E0E0"
                      onValueChange={handleAutoTtsToggle}
                      value={autoPlayTts}
                    />
                  </View>

                  <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Font Size</Text>
                  <View style={styles.sliderContainer}>
                    <Text style={[styles.sliderLabel, { color: theme.text }]}>A</Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={MIN_FONT_SIZE}
                      maximumValue={MAX_FONT_SIZE}
                      value={fontSize}
                      onValueChange={handleFontSizeChange}
                      minimumTrackTintColor={theme.progressBarFill}
                      maximumTrackTintColor={theme.sliderTrack}
                      thumbTintColor={theme.progressBarFill}
                    />
                    <Text style={[styles.sliderLabelLarge, { color: theme.text }]}>A</Text>
                  </View>

                  <Text style={[styles.modalSectionTitle, { color: theme.text, marginTop: 16 }]}>
                    Line Spacing
                  </Text>
                  <View style={styles.lineHeightButtons}>
                    {(Object.keys(LINE_HEIGHT_PRESETS) as LineHeightPreset[]).map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        style={[
                          styles.lineHeightButton,
                          {
                            borderColor: theme.border,
                            backgroundColor:
                              lineHeightPreset === preset ? theme.progressBarFill : 'transparent',
                          },
                        ]}
                        onPress={() => handleLineHeightChange(preset)}>
                        <Text
                          style={[
                            styles.lineHeightButtonText,
                            {
                              color:
                                lineHeightPreset === preset
                                  ? currentTheme === 'dark'
                                    ? theme.modalBackground
                                    : theme.bubbleBackground
                                  : theme.text,
                            },
                          ]}>
                          {preset.charAt(0).toUpperCase() + preset.slice(1).toLowerCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.modalSectionTitle, { color: theme.text, marginTop: 24 }]}>
                    Theme
                  </Text>
                  <View style={styles.themeButtonsContainer}>
                    {(Object.keys(THEME_COLORS) as ThemeType[]).map((themeKey) => (
                      <TouchableOpacity
                        key={themeKey}
                        style={[
                          styles.themeButton,
                          {
                            backgroundColor: THEME_COLORS[themeKey].bubbleBackground,
                            borderColor: THEME_COLORS[themeKey].bubbleBorder,
                          },
                          currentTheme === themeKey && styles.selectedThemeButton,
                          currentTheme === themeKey && {
                            borderColor: THEME_COLORS[themeKey].progressBarFill,
                          },
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
          initialColor={getHighlight(bookId, chapter, verseToHighlight.verse)?.colorKey || null}
          onClose={handleCloseHighlightPicker}
          onSelectColor={handleApplyHighlight}
          versePreview={verseToHighlight.text}
        />
      )}

      {/* Note Editor Modal */}
      {verseForNote && chapterData && (
        <NoteEditor
          isVisible={isNoteEditorVisible}
          bookId={bookId}
          chapter={chapter}
          verse={verseForNote.verse}
          verseText={verseForNote.text}
          bookName={chapterData.book}
          onClose={handleCloseNoteEditor}
        />
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
  // Updated elegant swipe action styles
  swipeActionContainer: {
    width: 70,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeActionContent: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 249, 230, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    fontFamily: 'Feather Bold',
    fontSize: 16,
  },
  toggleSubLabel: {
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 12,
    marginTop: 2,
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
    borderWidth: 2,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
});

export default NewBibleReader;
