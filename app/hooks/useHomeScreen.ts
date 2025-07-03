// /Users/mac/Documents/projects/shepherd-expo/app/hooks/useHomeScreen.ts

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  Keyboard,
  Share as RNShare,
  PanResponder,
  AppState,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import auth from '@react-native-firebase/auth';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import {  useHomeStore } from '../stores/homeStore';
import { usePathStore } from '../stores/pathStore';
import { useUIStore } from '../stores/uiStore';
import { useUserStore } from '../stores/userStore';
import analytics from '../../utils/analytics';
import useSubscriptionStore from '../stores/subscriptionStore';
import { getLevelData } from '../../utils/levelUtils';
import { useDevotionalStore } from '../stores/devotionalStore';
import { usePrayerStore } from '../stores/prayerStore';
import { getLambMoodByHearts } from './streakHook';
import { IS_ANDROID } from '../utils/utils';
import { Devotional } from '../models/Devotional';
import { useRiveAnimation } from './useRiveAnimation';
import i18n from '../utils/i18n';
import { useSoundStore } from '../stores/soundStore';
import { hapticLight, hapticMedium } from '~/utils/haptics';

// Constants
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const LAMB_VIEWPORT_PERCENTAGE = 0.4;
const BASE_LAMB_SIZE = SCREEN_HEIGHT * LAMB_VIEWPORT_PERCENTAGE;

// Mood to State Machine Input Mapping
const moodToStateInput: Record<string, number> = {
  'lamb-idle': 0,
  'lamb-sleepy': 4,
  'lamb-angry': 5,
  'lamb-chubby dying': 6,
  'lamb-skinny dying': 7,
  'smoking': 8,
  'lamb-full': 3,
};

let effectCounter = 0;

export const useHomeScreen = () => {
  console.log('🎯 useHomeScreen hook called!');
  const router = useRouter();
  const { isPrayPresses, isReflectPresses, showDevotional } = useLocalSearchParams();
  
  const currentUser = auth().currentUser;

  // Refs
  const devotionalReaderRef = useRef<any>(null);
  const prayerViewRef = useRef<any>(null);
  const journalRef = useRef<any>(null);
  const bottomSheetRef = useRef<any>(null);
  const prevFinishReadingRef = useRef(false);
  const riveKeyRef = useRef(Date.now());
  const lastActionInputRef = useRef<number | null>(null);

  // State
  const [devotionalReadedFully, setDevotionalReadedFully] = useState(false);
  const [currentVerseReference, setCurrentVerseReference] = useState('');
  const [isCompletePrayerDisabled, setIsCompletePrayerDisabled] = useState(true);
  const [journalButtonEnabled, setJournalButtonEnabled] = useState(false);
  const [showControlRow, setShowControlRow] = useState(true);
  const [isControlRowVisible, setIsControlRowVisible] = useState(true);
  const [finishReading, setFinishReading] = useState(false);
  const [showPrayerView, setShowPrayerView] = useState(false);
  const [showPrayerContent, setShowPrayerContent] = useState(false);
  const [currentStateInput, setCurrentStateInput] = useState(0);
  const [showBgRive, setShowBgRive] = useState(false);
  const [devotionalData, setDevotionalData] = useState<Devotional | null>(null);
  const [riveReady, setRiveReady] = useState(false);
  const [isFree, setIsFree] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [showWidgetSheet, setShowWidgetSheet] = useState(false);
  const [isLevelPillExpanded, setIsLevelPillExpanded] = useState(false);
  const [showHeartsModal, setShowHeartsModal] = useState(false);
  const [showExplainerModal, setShowExplainerModal] = useState(false);
  const [showDevotionalReader, setShowDevotionalReader] = useState(false);
  const [showDevotionalContent, setShowDevotionalContent] = useState(false);
  const [showJournalReader, setShowJournalReader] = useState(false);
  const [showJournalContent, setShowJournalContent] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [riveError, setRiveError] = useState<any>(null);
  const [riveSkinInitialized, setRiveSkinInitialized] = useState(false);
  const [hasHandledDevotionalParam, setHasHandledDevotionalParam] = useState(false);
  const clearParamTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Store hooks  
  const mode = useHomeStore((state) => state.mode);
  const setMode = useHomeStore((state) => state.setMode);
  const setDevotionalReaderVisible = useHomeStore((state) => state.setDevotionalReaderVisible);
  const devotionalReaderVisible = useHomeStore((state) => state.devotionalReaderVisible);
  const setReflectionCompleted = useHomeStore((state) => state.setReflectionCompleted);
  const readingCompleted = useHomeStore((state) => state.readingCompleted);
  const prayerCompleted = useHomeStore((state) => state.prayerCompleted);
  const reflectionCompleted = useHomeStore((state) => state.reflectionCompleted);
  const showGlobalButtons = useHomeStore((state) => state.showGlobalButtons);
  const setPathInProgress = usePathStore((state) => state.setPathInProgress);
  const nextUnitPreview = usePathStore((state) => state.nextUnitPreview);
  const lambHearts = useUserStore((state) => state?.getLambHearts?.());
  const streakCount = useUserStore((state) => state?.getStreakCount?.());
  const gens = useUserStore((state) => state?.getGens?.());
  const lambMood = useUserStore((state) => state?.getLambMood?.());
  const lambName = useUserStore((state) => state?.getLambName?.());
  const lamb = useUserStore((state) => state.getLamb?.());
  const currentDevotional = useDevotionalStore((state) => state.currentDevotional);
  const dailyDevotional = useDevotionalStore((state) => state.dailyDevotional);
  const isLoadingDevotional = useDevotionalStore((state) => state.isLoading);
  const devotionalError = useDevotionalStore((state) => state.error);
  const fetchTodaysDevotional = useDevotionalStore((state) => state.fetchTodaysDevotional);
  
  // Debug: Log whenever currentDevotional changes
  useEffect(() => {
    console.log('📱 CurrentDevotional updated in useHomeScreen:', currentDevotional?.id, currentDevotional?.bibleReference);
  }, [currentDevotional]);
  
  // Add immediate console log to see store state
  console.log('🔍 Store state at hook init:', {
    currentDevotional: currentDevotional?.id,
    isLoadingDevotional,
    devotionalError,
    hasFetchFunction: !!fetchTodaysDevotional
  });
  const customDevotional = useDevotionalStore((state) => state.customDevotional);
  const clearCustomDevotional = useDevotionalStore((state) => state.clearCustomDevotional);
  const { setFromScreen, presentHalfOffPaywall } = useSubscriptionStore();
  const proStatus = useUserStore((state) => state?.getProStatus?.());
  const isPro = proStatus === 'pro';
  const showWidgetPrompt = useUIStore((state) => state.showWidgetPrompt);
  const { recentPrayers } = usePrayerStore();
  const setPrayerViewVisible = useHomeStore((state) => state.setPrayerViewVisible);
  const hasSeenWidgetModal = useUserStore((state) => state.getHasSeenWidgetModal());
  const setHasSeenWidgetModal = useUserStore((state) => state.setHasSeenWidgetModal);
  const setRiveRef = useHomeStore((state) => state.setRiveRef);
  const currentSkin = useHomeStore((state) => state.currentSkin);

  // Animation refs
  const lambSizeAnim = useRef(new Animated.Value(256)).current;
  const uiAnim = useRef(new Animated.Value(0)).current;
  const headerDefaultOpacityAnim = useRef(new Animated.Value(1)).current;
  const grassOpacityAnim = useRef(new Animated.Value(1)).current;
  const pathOpacityAnim = useRef(new Animated.Value(0)).current;
  const waterOpacityAnim = useRef(new Animated.Value(0)).current;
  const journalOpacityAnim = useRef(new Animated.Value(0)).current;
  const previewAnim = useRef(new Animated.Value(0)).current;
  const prayerAnim = useRef(new Animated.Value(0)).current;
  const reflectionAnim = useRef(new Animated.Value(0)).current;
  const lambOpacityAnim = useRef(new Animated.Value(1)).current;
  const lambChangeOpacityAnim = useRef(new Animated.Value(1)).current;
  const riveArtboardOpacityAnim = useRef(new Animated.Value(1)).current;
  const riveScaleAnim = useRef(new Animated.Value(1)).current;
  const riveRotateAnim = useRef(new Animated.Value(0)).current;
  const devotionalCardOpacityAnim = useRef(new Animated.Value(1)).current;
  const devotionalHeaderOpacityAnim = useRef(new Animated.Value(0)).current;
  const devotionalBgOpacityAnim = useRef(new Animated.Value(0)).current;
  const finishReadingOpacityAnim = useRef(new Animated.Value(0)).current;
  const devotionaleRadingOpacityAnim = useRef(new Animated.Value(0)).current;
  const levelPillWidthAnim = useRef(new Animated.Value(0)).current;
  const levelPillOpacityAnim = useRef(new Animated.Value(0)).current;
  const androidBgOpacityAnim = useRef(new Animated.Value(0)).current;
  const firstLoadOpacity = useRef(new Animated.Value(0)).current;
  const bottomContentOpacity = useRef(new Animated.Value(0)).current;
  const bottomContentAnimY = useRef(new Animated.Value(100)).current;
  const controlRowOpacity = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.ValueXY()).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const MAX_HEARTS = 100;
  // Rive animation hook
  const { riveRef, setRiveIdle, handleRiveError: handleRiveAnimationError, setRiveState } = useRiveAnimation({
    onError: (error) => {
      console.error('Rive animation error:', error);
      if (Platform.OS === 'android') return;
      setRiveError(error);
    },
  });

  // Memoized values
  const snapPoints = useMemo(() => (
    showPrayerContent
      ? ['60%'] // Fixed at 60% for WaterPrayerView
      : showJournalContent
        ? ['60%', '65%', '70%', '75%', '80%', '85%', '88%']
        : ['60%', '65%', '70%', '75%', '80%', '85%', '88%']
  ), [showPrayerContent, showJournalContent]);

  const lambTranslateX = useMemo(
    () =>
      Animated.add(
        new Animated.Value(0), // Base offset to center the lamb
        Animated.add(
          previewAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0], extrapolate: 'clamp' }),
          Animated.add(
            prayerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20], extrapolate: 'clamp' }),
            reflectionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40], extrapolate: 'clamp' })
          )
        )
      ),
    []
  );

  const lambTranslateY = useMemo(
    () =>
      Animated.add(
        previewAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 240], extrapolate: 'clamp' }),
        Animated.add(
          prayerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 330], extrapolate: 'clamp' }),
          reflectionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 200], extrapolate: 'clamp' })
        )
      ),
    []
  );

  const showGlow = useMemo(() => lambHearts > 80, [lambHearts]);

  const levelInfo = useMemo(() => {
    if (!lamb || lamb.xp === undefined) return {
      level: 1,
      xp: 0,
      xpForCurrentLevel: 0,
      xpForNextLevel: 90,
      xpProgress: 0,
      xpNeeded: 90,
      progress: 0,
    };
    return getLevelData(lamb.xp);
  }, [lamb?.xp]);

  const buttonTitle = useMemo(() => showDevotionalContent ? i18n.t('continue_button') : i18n.t('amen_button'), [showDevotionalContent]);
  const isDarkContant = useMemo(() => new Date().getHours() >= 19, []);

  // Effects
  useFocusEffect(
    useCallback(() => {
      console.log('[useHomeScreen] Focus effect triggered:', {
        showDevotional,
        hasHandledDevotionalParam,
        customDevotional: !!customDevotional,
        currentDevotional: !!currentDevotional
      });
      
      if (showDevotional === 'true' && !hasHandledDevotionalParam && !devotionalReaderVisible && !showDevotionalContent) {
        console.log('[useHomeScreen] Opening devotional reader from navigation param');
        setTimeout(() => {
          setShowDevotionalContent(true);
          setDevotionalReaderVisible(true);
          if(riveRef.current){
            riveRef.current.setInputState('State Machine 1', 'Action-Number', 9);
          }
        }, 100);
        
        // Clear any existing timer
        if (clearParamTimerRef.current) {
          clearTimeout(clearParamTimerRef.current);
        }
        
        // Set new timer to clear the parameter
        clearParamTimerRef.current = setTimeout(() => {
          if (router?.setParams) {
            router.setParams({ showDevotional: undefined });
          }
          clearParamTimerRef.current = null;
        }, 1000);
        
        setHasHandledDevotionalParam(true);
      }
      
      // Cleanup function to clear timer on unmount
      return () => {
        if (clearParamTimerRef.current) {
          clearTimeout(clearParamTimerRef.current);
          clearParamTimerRef.current = null;
        }
      };
    }, [showDevotional, router, customDevotional, currentDevotional, devotionalReaderVisible, showDevotionalContent])
  );

  // Sync devotional data from store
  useEffect(() => {
    console.log('📱 Syncing devotional from store:', currentDevotional?.id);
    if (currentDevotional) {
      setDevotionalData(currentDevotional);
    }
  }, [currentDevotional]);

  // Move the sound store hooks inside the component
  const backgroundMusicEnabled = useSoundStore.getState().backgroundMusicEnabled;
  // Initialize background music
  useEffect(() => {
    if (backgroundMusicEnabled) {
      useSoundStore.getState().playBackgroundMusic();
    } else {
      useSoundStore.getState().stopBackgroundMusic();
    }
  }, [backgroundMusicEnabled]);
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        // App has gone to background, stop the music
        if (backgroundMusicEnabled) {
          useSoundStore.getState().stopBackgroundMusic();
        }
      } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to foreground, restart music if it was enabled
        if (backgroundMusicEnabled) {
          useSoundStore.getState().playBackgroundMusic();
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Set riveRef in home store so other components can access it
  useEffect(() => {
    setRiveRef(riveRef);
  }, [riveRef, setRiveRef]);

  // Apply current skin whenever it changes or rive becomes ready
  useEffect(() => {
    if (riveRef.current && riveSkinInitialized) {
      // Use the user's selected skin from store
      const skinNumber = currentSkin ? parseInt(currentSkin, 10) : 0;
      try {
        riveRef.current.setInputState('State Machine 1', 'Skin-Number', skinNumber);
        console.log(`Applied skin change: ${skinNumber} (${isPro ? 'golden pro' : currentSkin || 'normal'} skin)`);
      } catch (error) {
        console.log('Error applying skin change:', error);
      }
    }
  }, [currentSkin, riveSkinInitialized, isPro]);

  useEffect(() => {
    if (isPrayPresses === 'true') handlePrayerPress();
    if (isReflectPresses === 'true') handleReflectionPress();
  }, [isPrayPresses, isReflectPresses]);

  useEffect(() => {
    const setLambMood = useUserStore.getState().setLambMood;
    if (!setLambMood) return;
    const desiredMood = getLambMoodByHearts(lambHearts);
    if (desiredMood !== lambMood) setLambMood(desiredMood);
  }, [lambHearts, lambMood]);

  useEffect(() => {
    if (devotionalReaderVisible) {
      Animated.parallel([
        Animated.timing(devotionalBgOpacityAnim, {
          toValue: 0.3,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(headerDefaultOpacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(devotionalBgOpacityAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [devotionalReaderVisible]);

  useEffect(() => {
    if (!prevFinishReadingRef.current && !finishReading) return;

    if (finishReading) {
      Animated.timing(finishReadingOpacityAnim, {
        toValue: 1,
        duration: 1000,
        delay: 2500,
        useNativeDriver: true,
      }).start();

      Keyboard.dismiss();
      bottomSheetRef.current?.snapToIndex(0);

      if (showDevotionalContent && riveRef.current?.setInputState) {
        try {
          if(riveRef.current){

            riveRef.current.setInputState('State Machine 1', 'Action-Number', 2);
          }
        } catch (_) {
          // Ignore if Action-Number input not present
        }
      }
    } else if (prevFinishReadingRef.current) {
      Animated.timing(finishReadingOpacityAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }

    prevFinishReadingRef.current = finishReading;
  }, [finishReading]);

  useEffect(() => {
    if (showGlobalButtons) {
      Animated.timing(bottomContentOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        delay: 500,
      }).start();
      Animated.timing(bottomContentAnimY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
        delay: 500,
      }).start();
    } else {
      bottomContentOpacity.setValue(0);
      bottomContentAnimY.setValue(100);
      if (devotionalReadedFully) setDevotionalReadedFully(false);
      if (isCompletePrayerDisabled) setIsCompletePrayerDisabled(true);
      if (journalButtonEnabled) setJournalButtonEnabled(false);
      Animated.timing(controlRowOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [showGlobalButtons]);

  useEffect(() => {
    if (showPrayerContent && showControlRow) {
      Animated.timing(controlRowOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setIsControlRowVisible(true));
    } else {
      Animated.timing(controlRowOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsControlRowVisible(false));
    }
  }, [showPrayerContent, showControlRow]);

  useEffect(() => {
    if (IS_ANDROID && mode === 'PRAYER') {
      Animated.timing(androidBgOpacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } else {
      Animated.timing(androidBgOpacityAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  }, [mode]);

  useEffect(() => {
    if (showDevotionalContent || showPrayerContent || showJournalContent) {
      Animated.timing(devotionaleRadingOpacityAnim, {
        toValue: 1,
        duration: 1000,
        delay: 0,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(devotionaleRadingOpacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showDevotionalContent, showPrayerContent, showJournalContent]);

  useEffect(() => {
    const showWidgetModalOnFirstSignup = async () => {
      if (Platform.OS === 'ios' && !hasSeenWidgetModal) {
        const createdAt = useUserStore.getState().getCreatedAt();
        const now = new Date();
        const signupTime = createdAt?.toDate?.() || new Date();

        if (now.getTime() - signupTime.getTime() < 5 * 60 * 1000) {
          analytics.logEvent('HomeScreen_Tapped_WidgetHowTo_new_user');
          setShowWidgetSheet(true);
        }
      }
    };

    showWidgetModalOnFirstSignup();
  }, [hasSeenWidgetModal]);

  useEffect(() => {
    setRiveReady(true);

    const fallbackTimeout = setTimeout(() => {
      if (!riveSkinInitialized) {
        console.log('Fallback: Setting skin to initialized after timeout');
        setRiveSkinInitialized(true);
      }
      
      // Force set the level after initialization
      if (riveRef.current && levelInfo) {
        const currentLevel = levelInfo.level || 1;
        const levelNumber = currentLevel < 10 ? 1 : 0;
        try {
          console.log(`[ForceLevelSet] Setting Level-Number to ${levelNumber} for level ${currentLevel}`);
          riveRef.current.setInputState('State Machine 1', 'Level-Number', levelNumber);
          
          // Apply the user's selected skin from store
          const skinNumber = currentSkin ? parseInt(currentSkin, 10) : 0;
          riveRef.current.setInputState('State Machine 1', 'Skin-Number', skinNumber);
          console.log(`[ForceLevelSet] Also set Skin-Number to ${skinNumber} (${currentSkin || 'normal'} skin)`);
        } catch (e) {
          console.log('[ForceLevelSet] Error:', e);
        }
      }
    }, 1000); // 1 second fallback

    if (isFirstLoad) {
      Animated.timing(firstLoadOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => setIsFirstLoad(false));
    }

    return () => {
      console.log('Cleaning up Home component');
      clearTimeout(fallbackTimeout);
    };
  }, [riveSkinInitialized, isFirstLoad, isPro, currentSkin, levelInfo]);

  // First, add a simple effect to verify effects are running at all
  useEffect(() => {
    effectCounter++;
    console.log(`🚨 EFFECT #${effectCounter} REGISTERED - Basic test effect is running!`);
  });
  
  // Handlers
  const handleDevotionalFinishPress = useCallback(() => {
    if (devotionalReaderRef.current) devotionalReaderRef.current.onFinishPress();
  }, []);

  const handleDevotionalClose = useCallback(({ isPrayPresses }: { isPrayPresses?: boolean }) => {
    console.log('[useHomeScreen] handleDevotionalClose called, isPrayPresses:', isPrayPresses);
    console.log('[useHomeScreen] Current state:', {
      showDevotionalContent,
      devotionalReaderVisible,
      hasHandledDevotionalParam,
      showDevotional
    });
    
    if (devotionalReaderRef.current) {
      // Cancel any pending parameter clear timer
      if (clearParamTimerRef.current) {
        console.log('[useHomeScreen] Canceling parameter clear timer');
        clearTimeout(clearParamTimerRef.current);
        clearParamTimerRef.current = null;
      }
      
      // Clear the showDevotional param immediately to prevent re-opening
      if (router?.setParams) {
        console.log('[useHomeScreen] Clearing showDevotional parameter');
        router.setParams({ showDevotional: undefined });
      }
      // Keep the handled flag as true until navigation completes
      // This prevents re-opening if there's a race condition with the parameter clearing
      setHasHandledDevotionalParam(true);
      
      // Reset the flag after a longer delay to prevent race conditions
      // This ensures the parameter is fully cleared from navigation state
      setTimeout(() => {
        console.log('[useHomeScreen] Resetting hasHandledDevotionalParam to false');
        setHasHandledDevotionalParam(false);
      }, 2000);
      
      if (isPrayPresses) {
        // Only clear custom devotional when user completes the devotional
        clearCustomDevotional();
        
        setFinishReading(false);
        Animated.parallel([
          Animated.timing(devotionalCardOpacityAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(riveArtboardOpacityAnim, { toValue: 0, duration: 400, useNativeDriver: true })
        ]).start(() => {
          setShowPrayerContent(true);
          setShowDevotionalContent(false);
          
          if (riveRef.current && riveRef.current.setInputState) {
            try {
              riveRef.current.setInputState('State Machine 1', 'Action-Number', 1);
            } catch (e) {
              console.log('Error setting Rive Action-Number to Raising Hand:', e);
            }
          }
          
          Animated.parallel([
            Animated.timing(devotionalCardOpacityAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(riveArtboardOpacityAnim, { toValue: 1, duration: 600, useNativeDriver: true })
          ]).start(() => {
            setShowDevotionalReader(false);
            setDevotionalReaderVisible(false);
          });
        });
        
        setShowPrayerView(true);
        setPrayerViewVisible(true);
      } else {
        console.log('[useHomeScreen] Closing devotional (non-prayer path)');
        
        // Check streak trigger conditions when user presses "Go Home"
        const homeStore = useHomeStore.getState();
        const { readingCompleted, sawStreakToday } = homeStore;
        
        // Only trigger if reading is completed and streak hasn't been shown today
        if (readingCompleted && !sawStreakToday) {
          
          // Mark that we've shown the streak screen today
          homeStore.setSawStreakToday(true);
          
          // Navigate to streak screen
          router.push('/streak');
          
          analytics.logEvent('HomeScreen_StreakTriggered', {
            readingCompleted,
            sawStreakToday: false,
            timestamp: new Date().toISOString()
          });
          
          return; // Exit early to prevent further processing
        }
        
        // Immediately hide the devotional content
        setDevotionalReaderVisible(false);
        setShowDevotionalContent(false);
        
        Animated.parallel([
          Animated.timing(devotionalCardOpacityAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
          Animated.timing(riveArtboardOpacityAnim, { toValue: 0, duration: 500, useNativeDriver: true })
        ]).start();
        
        setTimeout(() => {
          
          // Check if all three actions are completed - if so, set to full (3)
          const allActionsCompleted = homeStore.readingCompleted && homeStore.prayerCompleted && homeStore.reflectionCompleted;
          
          let targetStateInput;
          if (allActionsCompleted) {
            targetStateInput = 3; // lamb-full state
          } else {
            const currentMood = useUserStore.getState()?.getLambMood?.();
            targetStateInput = moodToStateInput[currentMood] || 0;
          }
          
          setRiveIdle();
          setCurrentStateInput(targetStateInput);
          if (riveRef.current?.setInputState) {
            riveRef.current.setInputState('State Machine 1', 'Action-Number', targetStateInput);
          }
          Animated.parallel([
            Animated.timing(devotionalCardOpacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(riveArtboardOpacityAnim, { toValue: 1, duration: 500, useNativeDriver: true })
          ]).start(() => {
          });
        }, 250);
      }
    }
  }, [router, showDevotionalContent, devotionalReaderVisible, clearCustomDevotional, setShowDevotionalContent, setDevotionalReaderVisible, setFinishReading, setShowPrayerView, setPrayerViewVisible, devotionalCardOpacityAnim, riveArtboardOpacityAnim, setRiveIdle, setCurrentStateInput, riveRef, analytics]);

  const handlePrayerPress = useCallback(() => {
    if (!isPro && prayerCompleted) {
      setFromScreen('home-prayer');
      handleSubscriptionPress();
    } else {
      if (!__DEV__ && !readingCompleted) return;

      setFinishReading(false);
      Animated.timing(devotionalCardOpacityAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setShowPrayerContent(true);
        Animated.timing(devotionalCardOpacityAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      });

      setShowPrayerView(true);
      setPrayerViewVisible(true);
      Animated.timing(riveArtboardOpacityAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        if (riveRef.current && riveRef.current.setInputState) {
          try {
            riveRef.current.setInputState('State Machine 1', 'Action-Number', 1);
          } catch (e) {
            console.log('Error setting Rive Action-Number to Raising Hand:', e);
          }
        }
        Animated.timing(riveArtboardOpacityAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      });

      analytics.logEvent('HomeScreen_Tapped_Prayer', {
        prayerTopic: recentPrayers[0] || 'general',
      });
    }
  }, [isPro, prayerCompleted, readingCompleted]);

  const handleReadPress = useCallback(() => {
    const setShowGlobalButtons = useHomeStore.getState().setShowGlobalButtons;
    setShowGlobalButtons(true);
    setShowDevotionalReader(true);
    setDevotionalReaderVisible(true);
    setShowDevotionalContent(true);
    
    // Reset the handled param flag when manually opening devotional
    setHasHandledDevotionalParam(false);

    Animated.timing(devotionalCardOpacityAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(devotionalCardOpacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    });

    Animated.timing(riveArtboardOpacityAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStateInput(9);
      if (riveRef.current?.setInputState) {
        riveRef.current.setInputState('State Machine 1', 'Action-Number', 9);
        try {
          riveRef.current.setInputState('State Machine 1', 'Action-Number', 9);
        } catch (_) {
          // Ignore if Action-Number input not present
        }
      }
      Animated.timing(riveArtboardOpacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    });

    analytics.logEvent('HomeScreen_Tapped_DailyBread', {
      hasDevotional: !!currentDevotional,
      bibleReference: currentDevotional?.bibleReference,
    });
  }, [currentDevotional]);

  const handleReflectionPress = useCallback(() => {
    // Analytics for pro users accessing reflection
    analytics.logEvent('HomeScreen_Reflection_Accessed', {
      userType: isPro ? 'pro' : 'free',
      readingCompleted: readingCompleted,
      reflectionCompleted: reflectionCompleted,
      prayerCompleted: prayerCompleted,
    });
    setFinishReading(false);
    Animated.timing(devotionalCardOpacityAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setShowJournalContent(true);
      const setJournalViewVisible = useHomeStore.getState().setJournalViewVisible;
      setJournalViewVisible(true);
      Animated.timing(devotionalCardOpacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    });

    setShowJournalReader(true);
    Animated.timing(riveArtboardOpacityAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStateInput(12);
      if (riveRef.current?.setInputState) {
        setTimeout(() => {
          if (riveRef.current) {
            riveRef.current.setInputState('State Machine 1', 'Action-Number', 10);
          }
        }, 500);
        try {
          riveRef.current.setInputState('State Machine 1', 'Action-Number', 10);
        } catch (_) {
          // Ignore if Action-Number input not present
        }
      }
      Animated.timing(riveArtboardOpacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    });
  }, [isPro, reflectionCompleted, readingCompleted, prayerCompleted]);

  const handleWidgetPromptPress = useCallback(() => {
    hapticLight();
    analytics.logEvent('HomeScreen_Tapped_AddWidget');
    showWidgetPrompt();
  }, []);

  const handleCloseOverlay = useCallback(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(riveScaleAnim, { toValue: 0.95, duration: 200, useNativeDriver: true }),
        Animated.timing(riveRotateAnim, { toValue: -0.03, duration: 250, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(riveScaleAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(riveRotateAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();

    setShowBgRive(false);
    setMode('DEFAULT');
  }, []);

  const handleSheetChanges = useCallback((_index: number) => {
    hapticLight();
  }, []);

  const handleSubscriptionPress = useCallback(async () => {
    hapticMedium();
    router.push('/PricingScreen' as any);
  }, [router]);

  const handleShare = useCallback(async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        alert("Sharing isn't available on your platform");
        return;
      }

      if (!devotionalData?.imageURL) {
        alert("No image available to share");
        return;
      }

      await RNShare.share({
        url: devotionalData.imageURL,
        message: devotionalData.verse || 'Check out this daily verse!',
        title: 'Share your daily verse'
      });
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Error sharing image');
    }
  }, [devotionalData]);

  const onCloseJournal = useCallback(({isCompleted, isReflectPresses}:{isCompleted?:boolean, isReflectPresses?:boolean}) => {
    // If isReflectPresses is true, trigger prayer navigation
    if (isReflectPresses) {

      setFinishReading(false);
      handlePrayerPress(); // Use the existing prayer handler
      setTimeout(() => {
        setShowJournalContent(false);
        const setJournalViewVisible = useHomeStore.getState().setJournalViewVisible;
        setJournalViewVisible(false);
      }, 500);
      return;
    }


    setReflectionCompleted(false);
    Animated.parallel([
      Animated.timing(devotionalCardOpacityAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(riveArtboardOpacityAnim, { toValue: 0, duration: 500, useNativeDriver: true })
    ]).start();
    
    setTimeout(() => {
      setShowJournalContent(false);
      
      // Check if all three actions are completed - if so, set to full (3)
      const homeStore = useHomeStore.getState();
      const allActionsCompleted = homeStore.readingCompleted && homeStore.prayerCompleted && homeStore.reflectionCompleted;
      
      let targetStateInput;
      if (allActionsCompleted) {
        targetStateInput = 3; // lamb-full state
      } else {
        const currentMood = useUserStore.getState()?.getLambMood?.();
        targetStateInput = moodToStateInput[currentMood] || 0;
      }
      
      setCurrentStateInput(targetStateInput);
      if (riveRef.current?.setInputState) {
        riveRef.current.setInputState('State Machine 1', 'Action-Number', targetStateInput);
      }


                    // Only reset reflection completion if the user didn't complete it
                    if (!isCompleted) {
                      console.log('🔍 JOURNAL CLOSE - Setting reflectionCompleted to false (cancelled)')
                      setReflectionCompleted(false);
                    } else {
                      console.log('🔍 JOURNAL CLOSE - Keeping reflectionCompleted as true (completed)');
                      // Ensure it stays true
                      setReflectionCompleted(true);
                    }

      Animated.parallel([
        Animated.timing(devotionalCardOpacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(riveArtboardOpacityAnim, { toValue: 1, duration: 500, useNativeDriver: true })
      ]).start(() => {
        setShowJournalReader(false);
      });
    }, 250);


    // Check streak trigger conditions when user presses back/cancel from journal
    const homeStore = useHomeStore.getState();
    const { readingCompleted, sawStreakToday } = homeStore;
    
    // Only trigger if reading is completed and streak hasn't been shown today
    if (readingCompleted && !sawStreakToday) {
      
      // Mark that we've shown the streak screen today
      homeStore.setSawStreakToday(true);
      
      // Navigate to streak screen
      router.push('/streak');
      
      analytics.logEvent('HomeScreen_StreakTriggered_FromJournal', {
        readingCompleted,
        sawStreakToday: false,
        timestamp: new Date().toISOString()
      });
      
      return; // Exit early to prevent further processing
    }
  }, [handlePrayerPress]);

  const onClosePrayer = useCallback(({ isReflectPresses }: { isReflectPresses?: boolean }) => {
    if (isReflectPresses) {
      if(finishReading){
        setFinishReading(false);
      }
      // Clear prayer state immediately to prevent race condition in handleRivePlay
      
      // Close prayer view first with animation
      // Animated.timing(riveArtboardOpacityAnim, {
      //   toValue: 0,
      //   duration: 400,
      //   useNativeDriver: true,
      // }).start(() => {
      //   // Then start reflection with proper Rive state
      //   handleReflectionPress();
      // });

      // setTimeout(() => {
        // setShowPrayerContent(false);
        // setPrayerViewVisible(false);
      // }, 300);

      Animated.parallel([
        Animated.timing(devotionalCardOpacityAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(riveArtboardOpacityAnim, { toValue: 0, duration: 400, useNativeDriver: true })
      ]).start(() => {
        setShowJournalContent(true);
        setShowPrayerContent(false);
        setPrayerViewVisible(false);
        
        
        if (riveRef.current && riveRef.current.setInputState) {
          try {

                riveRef.current.setInputState('State Machine 1', 'Action-Number', 10);
           

          } catch (e) {
            console.log('Error setting Rive Action-Number to Raising Hand:', e);
          }
        }
        Animated.parallel([
          Animated.timing(devotionalCardOpacityAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(riveArtboardOpacityAnim, { toValue: 1, duration: 600, useNativeDriver: true })
        ]).start(() => {
          setShowPrayerContent(false);
          setPrayerViewVisible(false);
        });
      });
      
      setShowPrayerView(true);
      setPrayerViewVisible(true);
    } else {
      setPrayerViewVisible(false);
      Animated.parallel([
        Animated.timing(devotionalCardOpacityAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(riveArtboardOpacityAnim, { toValue: 0, duration: 500, useNativeDriver: true })
      ]).start();
      
      setTimeout(() => {
        setMode('DEFAULT');
        setShowPrayerContent(false);
        if (riveRef.current?.setInputState) {
          try {
            // Check if all three actions are completed - if so, set to full (3)
            const homeStore = useHomeStore.getState();
            const allActionsCompleted = homeStore.readingCompleted && homeStore.prayerCompleted && homeStore.reflectionCompleted;
            
            let targetStateInput;
            if (allActionsCompleted) {
              targetStateInput = 3; // lamb-full state
            } else {
              const currentMood = useUserStore.getState()?.getLambMood?.();
              targetStateInput = moodToStateInput[currentMood] || 0;
            }
            
            setCurrentStateInput(targetStateInput);
            setRiveIdle();
            if (riveRef.current?.setInputState) {
              riveRef.current.setInputState('State Machine 1', 'Action-Number', targetStateInput);
            }
          } catch (e) {
            console.log('Error resetting Rive state:', e);
          }
        }

        Animated.parallel([
          Animated.timing(devotionalCardOpacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(riveArtboardOpacityAnim, { toValue: 1, duration: 500, useNativeDriver: true })
        ]).start(() => {
          setShowPrayerView(false);
        });
      }, 250);

            // Check streak trigger conditions when user presses back from prayer
      const homeStore = useHomeStore.getState();
      const { readingCompleted, sawStreakToday } = homeStore;
      
      // Only trigger if reading is completed and streak hasn't been shown today
      if (readingCompleted && !sawStreakToday) {
        
        // Mark that we've shown the streak screen today
        homeStore.setSawStreakToday(true);
        
        // Navigate to streak screen
        router.push('/streak');
        
        analytics.logEvent('HomeScreen_StreakTriggered_FromPrayer', {
          readingCompleted,
          sawStreakToday: false,
          timestamp: new Date().toISOString()
        });
        
        return; // Exit early to prevent further processing
      }

    }
  }, [handleReflectionPress]);

  const onSuperBadgePress = useCallback(() => {
    if (!isPro) {
      analytics.logEvent('HomeScreen_TappedProBadge');
      hapticLight();

      const subscriptionStore = useSubscriptionStore.getState();
      if (subscriptionStore.shouldShowFreeTrialPaywall()) {
        subscriptionStore.presentFreeTrialPaywall();
      } else {
        subscriptionStore.presentHalfOffPaywall();
        setTimeout(() => setIsFree(true), 2000);
      }
    }
  }, [isPro]);

  const onLevelPress = useCallback(() => {
    hapticLight();
    analytics.logEvent('HomeScreen_Tapped_Level');
    setIsLevelPillExpanded(!isLevelPillExpanded);

    Animated.parallel([
      Animated.timing(levelPillWidthAnim, {
        toValue: isLevelPillExpanded ? 0 : 1,
        duration: 500,
        easing: Easing.out(Easing.exp),
        useNativeDriver: false,
      }),
      Animated.timing(levelPillOpacityAnim, {
        toValue: isLevelPillExpanded ? 0 : 1,
        duration: 500,
        easing: Easing.out(Easing.exp),
        useNativeDriver: false,
      }),
    ]).start();
  }, [isLevelPillExpanded]);

  const onGemsPress = useCallback(() => {
    hapticLight();
    analytics.logEvent('HomeScreen_Tapped_Gems');
    
    // Show the store sheet
    const showStoreSheet = useUIStore.getState().showStoreSheet;
    showStoreSheet();
  }, []);

  const handleWidgetSheetClose = useCallback(() => {
    setShowWidgetSheet(false);
    if (setHasSeenWidgetModal) setHasSeenWidgetModal(true);
    
    // Trigger the GlobalCheckIn sheet after dismissing the widget modal
    setTimeout(() => {
      const showCheckIn = (global as any).showCheckIn;
      if (showCheckIn && typeof showCheckIn === 'function') {
        console.log('[HomeScreen] Triggering check-in after widget modal close');
        showCheckIn();
      } else {
        console.error('[HomeScreen] showCheckIn function not found on global');
      }
    }, 300); // Small delay to allow widget modal to fully close
  }, [setHasSeenWidgetModal]);

  const handleNextUnitPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.logEvent('HomeScreen_Tapped_NextUnit', {
      unitTitle: nextUnitPreview?.title,
    });
    // Navigate to map screen with animation
    router.push({
      pathname: '/components/map',
      params: {
        fromHome: 'true',
        targetUnitId: nextUnitPreview?.id || '',
      }
    });
  }, [nextUnitPreview, router]);

  // Pan responder for share card
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) pan.y.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          Animated.timing(pan.y, {
            toValue: Dimensions.get('window').height,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setShowShareCard(false);
            pan.y.setValue(0);
          });
        } else {
          Animated.spring(pan.y, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  function onStreakPress() {
    hapticLight();
    analytics.logEvent('HomeScreen_Tapped_Streak');
    const showStatsSheet = useUIStore.getState().showStatsSheet;
    showStatsSheet();
  }

    // Additional effect to ensure the lamb skin is set from currentSkin store
  // This will run on component mount and whenever the riveRef or riveReady changes
  useEffect(() => {
    if (!riveRef.current || !riveReady || riveSkinInitialized) return;
    
    // Use the user's selected skin from store
    const skinNumber = currentSkin ? parseInt(currentSkin, 10) : 0;
    try {
      riveRef.current.setInputState('State Machine 1', 'Skin-Number', skinNumber);
      console.log(`Applied skin from store: ${skinNumber} (${isPro ? 'golden pro' : currentSkin || 'normal'} skin)`);
      setRiveSkinInitialized(true);
    } catch (e) {
      console.log('Error setting lamb skin:', e);
      // Still mark as initialized to prevent blocking
      setRiveSkinInitialized(true);
    }
  }, [riveRef, riveReady, riveSkinInitialized, currentSkin, isPro]);

  // ADD: Ensure the correct Level-Number is always applied once Rive is ready
  useEffect(() => {
    if (!riveReady || !riveRef.current || !riveSkinInitialized) return;

    const currentLevel = levelInfo?.level ?? 1;
    // In our Rive state machine, 1 = baby/low-level (<10), 0 = grown (>=10)
    const targetLevelNumber = currentLevel < 10 ? 1 : 0;

    try {
      console.log(`[LevelDebug] Current level: ${currentLevel}, Setting Level-Number to: ${targetLevelNumber}`);
      riveRef.current.setInputState('State Machine 1', 'Level-Number', targetLevelNumber);
      console.log(`[LevelFallback] Applied Level-Number ${targetLevelNumber} for level ${currentLevel}`);
    } catch (e) {
      console.log('[LevelFallback] Error applying Level-Number:', e);
    }
  }, [riveReady, levelInfo?.level, riveSkinInitialized]);

  // Handler for when Rive starts playing (indicates it's ready)
  const handleRivePlay = () => {
    console.log('Rive component started playing, ensuring correct skin & action state');
    
    // Use a small timeout to ensure Rive is fully ready before sending inputs
    setTimeout(() => {
      if (!riveRef.current || !riveRef.current.setInputState) return;
      
      try {
        // Initialise skin once
        if (!riveSkinInitialized) {
          // Use the user's selected skin from store
          const skinNumber = currentSkin ? parseInt(currentSkin, 10) : 0;
          
          if(showBgRive){
            if(riveRef.current){
              riveRef.current.setInputState('State Machine 1', 'Skin-Number', skinNumber);
            }
          } else {
            riveRef.current.setInputState('State Machine 1', 'Skin-Number', skinNumber);
          }
          console.log(`Set Rive Skin-Number: ${skinNumber} (${isPro ? 'golden pro' : currentSkin || 'normal'} skin) on play`);
          
          // Set Level-Number based on lamb level
          const currentLevel = levelInfo?.level || 1;
          const levelNumber = currentLevel < 10 ? 1 : 0;
          console.log(`[RivePlay] Current level: ${currentLevel}, Setting Level-Number to: ${levelNumber}`);
          riveRef.current.setInputState('State Machine 1', 'Level-Number', levelNumber);
          console.log(`Set Rive Level-Number: ${levelNumber} (level ${currentLevel})`);
          
          setRiveSkinInitialized(true);
        }
         // if(showDevotional){
         //   riveRef.current.setInputState('State Machine 1', 'Action-Number', 2);
         //   riveRef.current.setInputState('State Machine 1', 'Skin-Number', 0);

         // }
        
      
      // Determine which action should be active
      let targetAction = 0;
      if (showDevotionalContent) {
        targetAction = 9; // reading
      } else if (showPrayerContent) {
        targetAction = 1; // prayer
      } else if (showJournalContent) {
        targetAction = 12; // journal
      } else {
        // Check if all three actions are completed - if so, set to full (3)
        const homeStore = useHomeStore.getState();
        const allActionsCompleted = homeStore.readingCompleted && homeStore.prayerCompleted && homeStore.reflectionCompleted;
        
        if (allActionsCompleted) {
          targetAction = 3; // lamb-full state
        } else {
          const currentMood = useUserStore.getState()?.getLambMood?.();
          const moodToStateInput: Record<string, number> = {
            'lamb-idle': 0,
            'lamb-sleepy': 4,
            'lamb-angry': 5,
            'lamb-chubby dying': 6,
            'lamb-skinny dying': 7,
            'smoking': 8,
            'lamb-full': 3,
          };
          targetAction = moodToStateInput[currentMood] || 0;
        }
      }

      // Only update if action changed to prevent spamming
      if (lastActionInputRef.current !== targetAction) {
        riveRef.current.setInputState('State Machine 1', 'Action-Number', targetAction);
        lastActionInputRef.current = targetAction;
        console.log(`Set Rive Action-Number: ${targetAction} on play (changed)`);
      }
    } catch (e) {
      console.log('Error setting Rive inputs on play:', e);
    }
  }, 100); // Delay ensures Rive is ready for state changes
};

  // Return all values and handlers needed by the component
  return {
    // State
    riveError,
    currentUser,
    devotionalReadedFully,
    currentVerseReference,
    isCompletePrayerDisabled,
    journalButtonEnabled,
    showControlRow,
    isControlRowVisible,
    finishReading,
    showPrayerView,
    showPrayerContent,
    currentStateInput,
    showBgRive,
    devotionalData,
    riveReady,
    isFree,
    isFirstLoad,
    showWidgetSheet,
    isLevelPillExpanded,
    showHeartsModal,
    showExplainerModal,
    showDevotionalReader,
    showDevotionalContent,
    showJournalReader,
    showJournalContent,
    showShareCard,
    isDarkContant,

    // Store values
    mode,
    devotionalReaderVisible,
    readingCompleted,
    prayerCompleted,
    reflectionCompleted,
    lambHearts,
    streakCount,
    gens,
    lambMood,
    lambName,
    lamb,
    currentDevotional,
    dailyDevotional,
    customDevotional,
    isLoadingDevotional,
    devotionalError,
    isPro,
    showGlobalButtons,
    nextUnitPreview,

    // Refs
    devotionalReaderRef,
    prayerViewRef,
    journalRef,
    bottomSheetRef,
    riveRef,

    // Animation refs and values
    lambSizeAnim,
    uiAnim,
    headerDefaultOpacityAnim,
    grassOpacityAnim,
    pathOpacityAnim,
    waterOpacityAnim,
    journalOpacityAnim,
    previewAnim,
    prayerAnim,
    reflectionAnim,
    lambOpacityAnim,
    lambChangeOpacityAnim,
    riveArtboardOpacityAnim,
    riveScaleAnim,
    riveRotateAnim,
    devotionalCardOpacityAnim,
    devotionalHeaderOpacityAnim,
    devotionalBgOpacityAnim,
    finishReadingOpacityAnim,
    devotionaleRadingOpacityAnim,
    levelPillWidthAnim,
    levelPillOpacityAnim,
    androidBgOpacityAnim,
    firstLoadOpacity,
    bottomContentOpacity,
    bottomContentAnimY,
    controlRowOpacity,
    pan,
    translateY,
    lambTranslateX,
    lambTranslateY,
    showGlow,
    levelInfo,
    buttonTitle,

    // Handlers
    handleDevotionalFinishPress,
    handleDevotionalClose,
    handlePrayerPress,
    handleReadPress,
    handleReflectionPress,
    handleWidgetPromptPress,
    handleCloseOverlay,
    handleSheetChanges,
    handleSubscriptionPress,
    handleShare,
    onCloseJournal,
    onClosePrayer,
    onSuperBadgePress,
    onLevelPress,
    onGemsPress,
    handleWidgetSheetClose,
    handleNextUnitPress,

    // Other values
    snapPoints,
    panResponder,
    BASE_LAMB_SIZE,
    riveKey: riveKeyRef.current,
    handleRiveAnimationError,
    onStreakPress,
    setShowShareCard,
    setFinishReading,
    setDevotionalReadedFully,
    setCurrentVerseReference,
    setIsCompletePrayerDisabled,
    setJournalButtonEnabled,
    setShowControlRow,
    setIsControlRowVisible,
    setShowPrayerView,
    setShowHeartsModal,
    setShowExplainerModal,
    setShowDevotionalReader,
    setShowDevotionalContent,
    setShowJournalReader,
    setShowJournalContent,
    setShowPrayerContent,
    handleRivePlay,
    riveSkinInitialized,
    MAX_HEARTS,
    showDevotional
  };
};

// Default export for Expo Router compatibility
export default {}