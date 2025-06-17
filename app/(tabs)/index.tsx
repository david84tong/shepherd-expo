import { useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  
  ImageBackground,
  Platform,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  PanResponder,
  Share,
  Keyboard,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Toast, { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import Rive, { RiveRef, RNRiveError } from 'rive-react-native';
import DevotionalReader from '../../components/DevotionalReader';
import ProgressPill from '../../components/ProgressPill';
import SecondaryButton from '../../components/SecondaryButton';
import HeartsExplainerModal from '../../components/HeartsExplainerModal';
import ExplainerModal from '../../components/ExplainerModal';
import { HomeMode, useHomeStore } from '../stores/homeStore';
import { usePathStore } from '../stores/pathStore';
import { useUIStore } from '../stores/uiStore';
import { useUserStore } from '../stores/userStore';
import { useAssetsStore, imageAssets } from '../stores/assetsStore';
import { useAssets } from 'expo-asset';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import analytics from '~/utils/analytics';
import WidgetHowToSheet from '../../components/WidgetHowToSheet';
import useSubscriptionStore from '../stores/subscriptionStore';
import { getLevelData } from '../../utils/levelUtils';
import { useDevotionalStore } from '../stores/devotionalStore';
import bibleIcon from '../../assets/icons/bibleIcon.png';
import FullScreenShareCard from '../../components/FullScreenShareCard';
import SpotlightOverlay from '../../components/SpotlightOverlay';
import { usePrayerStore } from '../stores/prayerStore';
import { DevotionalReaderRef } from '../../components/DevotionalReader';
import PrayerView, { PrayerViewRef } from '~/components/PrayerView';
import {Image} from 'expo-image';
const { height: SCREEN_HEIGHT } = Dimensions.get('window'); // Get screen height
const LAMB_VIEWPORT_PERCENTAGE = 0.4; // 40%
const BASE_LAMB_SIZE = SCREEN_HEIGHT * LAMB_VIEWPORT_PERCENTAGE;
import auth from '@react-native-firebase/auth';
import { IS_ANDROID, IS_IOS } from '../utils/utils';
// Max hearts constant
const MAX_HEARTS = 100;

const grassBg = imageAssets[0];
const waterBg = imageAssets[1];
const pathBg = imageAssets[2];
const journalBg = imageAssets[3];
const breadIcon = imageAssets[4];
const dropIcon = imageAssets[5];
const flameIcon = imageAssets[7];
const gemIcon = imageAssets[8];
const heartIcon = imageAssets[9];
const starIcon = imageAssets[10];

import { responsiveHeight } from 'react-native-responsive-dimensions';
import JournalComponent, { JournalComponentRef } from '~/components/JournalComponent';
import { Devotional } from '../models/Devotional';
import { useLocalSearchParams } from 'expo-router';
import CircleButton from '~/components/Shared/CircleButton';
import PrimaryButton from '~/components/PrimaryButton';
import { RPH } from '../helper/helper';
import BluePrimaryButton from '~/components/Shared/BluePrimaryButton';
import DailyVerseCard from '~/components/Shared/DailyVerseCard';
import { getLambMoodByHearts } from '../hooks/streakHook';

// Custom toast config with explicit styling
const toastConfig: ToastConfig = {
  success: ({ text1, text2 }: ToastConfigParams<any>) => (
    <View
      style={{
        backgroundColor: '#FDEBB8',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#24CA17',
        shadowColor: 'rgba(0,0,0,0.08)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 3,
      }}>
      <Text style={{ fontFamily: 'Nunito-Black', fontSize: 16, color: '#3C584A' }}>{text1}</Text>
      {text2 && (
        <Text
          style={{
            fontFamily: 'DIN Next Rounded LT W01 Regular',
            fontSize: 14,
            color: '#B89B4C',
            marginTop: 4,
          }}>
          {text2}
        </Text>
      )}
    </View>
  ),
  error: ({ text1, text2 }: ToastConfigParams<any>) => (
    <View
      style={{
        backgroundColor: '#FDEBB8',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#DF4533',
        shadowColor: 'rgba(0,0,0,0.08)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 3,
      }}>
      <Text style={{ fontFamily: 'Nunito-Black', fontSize: 16, color: '#3C584A' }}>{text1}</Text>
      {text2 && (
        <Text
          style={{
            fontFamily: 'DIN Next Rounded LT W01 Regular',
            fontSize: 14,
            color: '#B89B4C',
            marginTop: 4,
          }}>
          {text2}
        </Text>
      )}
    </View>
  ),
  info: ({ text1, text2 }: ToastConfigParams<any>) => (
    <View
      style={{
        backgroundColor: '#FDEBB8',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#FCD34D',
        shadowColor: 'rgba(0,0,0,0.08)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 3,
      }}>
      <Text style={{ fontFamily: 'Nunito-Black', fontSize: 16, color: '#3C584A' }}>{text1}</Text>
      {text2 && (
        <Text
          style={{
            fontFamily: 'DIN Next Rounded LT W01 Regular',
            fontSize: 14,
            color: '#B89B4C',
            marginTop: 4,
          }}>
          {text2}
        </Text>
      )}
    </View>
  ),
};

export default function HomeScreen() {
  const riveRef = useRef<RiveRef>(null);
  const [riveError, setRiveError] = useState<RNRiveError | null>(null);
  const navigation = useNavigation();
  const router = useRouter();
  const { isPrayPresses, isReflectPresses, showDevotional } = useLocalSearchParams();
  const currentUser = auth().currentUser;
  const devotionalReaderRef = useRef<DevotionalReaderRef>(null);
  const prayerViewRef = useRef<PrayerViewRef>(null);
  const journalRef = useRef<JournalComponentRef>(null);
  const [devotionalReadedFully, setDevotionalReadedFully] = useState(false);
  const [currentVerseReference, setCurrentVerseReference] = useState('');
  const [isCompletePrayerDisabled, setIsCompletePrayerDisabled] = useState(true);
  const [journalButtonEnabled, setJournalButtonEnabled] = useState(false);
  const [showControlRow, setShowControlRow] = useState(true);
  const [isControlRowVisible, setIsControlRowVisible] = useState(true);

  // Add effect to handle showDevotional parameter
  useEffect(() => {
    if (showDevotional === 'true') {
      setShowDevotionalContent(true);
      setDevotionalReaderVisible(true);
    }
  }, [showDevotional]);

  const handleDevotionalFinishPress = useCallback(() => {
    if (devotionalReaderRef.current) {
      devotionalReaderRef.current.onFinishPress();
    }
  }, []);

  const handleDevotionalClose = useCallback(({isPrayPresses}:{isPrayPresses?:boolean}) => {
    if (devotionalReaderRef.current) {
      // Clear custom devotional first
      clearCustomDevotional();
      
      if(isPrayPresses){
        // Don't set to idle when transitioning to prayer - go directly from eating to praying
        // Reset finishReading when transitioning to prayer
        setFinishReading(false);
        
        // Start fade out with same timing as PrayerView to JournalComponent transition
        Animated.parallel([
          // Card content fade out
          Animated.timing(devotionalCardOpacityAnim, {
            toValue: 0,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          // Lamb fade out at the same time
          Animated.timing(riveArtboardOpacityAnim, {
            toValue: 0,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          })
        ]).start(() => {
          // Show prayer content after fade out
          setShowPrayerContent(true);
          setShowDevotionalContent(false);
          
          // Set Rive Action-Number to 1 (Raising Hand) for prayer
          if (riveRef.current && riveRef.current.setInputState) {
            try {
              riveRef.current.setInputState('State Machine 1', 'Action-Number', 1);
              console.log('Set Rive Action-Number: 1 (Raising Hand)');
            } catch (e) {
              console.log('Error setting Rive Action-Number to Raising Hand:', e);
            }
          }
          
                     // Fade back in with prayer content
           Animated.parallel([
             // Card content fade in
             Animated.timing(devotionalCardOpacityAnim, {
               toValue: 1,
               duration: 600,
               easing: Easing.inOut(Easing.ease),
               useNativeDriver: true,
             }),
             // Lamb fade in at the same time
             Animated.timing(riveArtboardOpacityAnim, {
               toValue: 1,
               duration: 600,
               easing: Easing.inOut(Easing.ease),
               useNativeDriver: true,
             })
           ]).start(() => {
             // Reset reader state after animations complete
             setShowDevotionalReader(false);
             // Hide devotional reader visibility only after the full transition is complete
             setDevotionalReaderVisible(false);
           });
        });
        
        // Show PrayerView state immediately
        setShowPrayerView(true);
        setPrayerViewVisible(true); // Hide tab bar
        // Don't hide devotional reader visibility until after the transition completes
        // This keeps the header showing "Reading" during the fade out
              }else{
          // Normal close to home screen - only set to idle when going back to home
          setRiveIdle();
          setDevotionalReaderVisible(false);
        Animated.parallel([
          // Card content fade out
          Animated.timing(devotionalCardOpacityAnim, {
            toValue: 0,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          // Lamb fade out at the same time
          Animated.timing(riveArtboardOpacityAnim, {
            toValue: 0,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          })
        ]).start();
        // Switch content and artboard immediately after a short delay
        setTimeout(() => {
          // Hide devotional content and reset lamb state
          setShowDevotionalContent(false);
          const currentMood = useUserStore.getState()?.getLambMood?.();
          const targetStateInput = moodToStateInput[currentMood] || 0;
          setCurrentStateInput(targetStateInput);
          if (riveRef.current?.setInputState) {
            riveRef.current.setInputState('State Machine 1', 'Number 1', targetStateInput);
          }

          // Start fade in immediately after content switch
          Animated.parallel([
            // Card content fade in
            Animated.timing(devotionalCardOpacityAnim, {
              toValue: 1,
              duration: 500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            // Lamb fade in at the same time
            Animated.timing(riveArtboardOpacityAnim, {
              toValue: 1,
              duration: 500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            })
          ]).start(() => {
            // Reset reader state after animations complete
            setShowDevotionalReader(false);
          });
        }, 250); // Switch content halfway through fade out
      }
    }
  }, []);

  console.log('currentUser======>', currentUser);

  // Use Zustand store for mode management
  const mode = useHomeStore((state) => state.mode);
  const setMode = useHomeStore((state) => state.setMode);
  const setDevotionalReaderVisible = useHomeStore((state) => state.setDevotionalReaderVisible);
  const devotionalReaderVisible = useHomeStore((state) => state.devotionalReaderVisible);
  const setReflectionCompleted = useHomeStore((state) => state.setReflectionCompleted);

  // Get completion states from the store
  const readingCompleted = useHomeStore((state) => state.readingCompleted);
  const prayerCompleted = useHomeStore((state) => state.prayerCompleted);
  const reflectionCompleted = useHomeStore((state) => state.reflectionCompleted);

  // DEBUG: Track completion state changes
  console.log('🔍 COMPLETION STATES DEBUG:', {
    readingCompleted,
    prayerCompleted,
    reflectionCompleted,
    timestamp: new Date().toLocaleTimeString()
  });

  // DEBUG: Specific tracking for reflectionCompleted changes
  useEffect(() => {
    console.log('🔍 REFLECTION COMPLETED CHANGED:', {
      reflectionCompleted,
      previousValue: useHomeStore.getState().reflectionCompleted,
      whoSetIt: new Error().stack?.split('\n')[2] || 'unknown',
      timestamp: new Date().toLocaleTimeString()
    });
  }, [reflectionCompleted]);

  // DEBUG: Track render cycles and homeStore persistence loading
  useEffect(() => {
    console.log('🔍 COMPONENT RENDER CYCLE - HomeStore state:', {
      fullHomeStore: useHomeStore.getState(),
      completionStates: {
        readingCompleted: useHomeStore.getState().readingCompleted,
        prayerCompleted: useHomeStore.getState().prayerCompleted, 
        reflectionCompleted: useHomeStore.getState().reflectionCompleted,
      },
      timestamp: new Date().toLocaleTimeString()
    });
  });

  useEffect(() => {
    if (isPrayPresses === 'true') {
      handlePrayerPress();
    }
    if (isReflectPresses === 'true') {
      handleReflectionPress();
    }
  }, [isPrayPresses,isReflectPresses]);
  

  // Get current path state from pathStore
  const setPathInProgress = usePathStore((state) => state.setPathInProgress);

  // Get user stats from userStore
  const lambHearts = useUserStore((state) => state?.getLambHearts?.());
  const streakCount = useUserStore((state) => state?.getStreakCount?.());
  const gens = useUserStore((state) => state?.getGens?.());
  const lambMood = useUserStore((state) => state?.getLambMood?.()); // Get the lamb's name from userStore

  // Sync lamb mood with hearts whenever hearts change
  useEffect(() => {
    const setLambMood = useUserStore.getState().setLambMood;
    if (!setLambMood) return;
    const desiredMood = getLambMoodByHearts(lambHearts);
    if (desiredMood !== lambMood) {
      setLambMood(desiredMood);
    }
  }, [lambHearts, lambMood]);

  const lambName = useUserStore((state) => state?.getLambName?.()); // Get the lamb's name from userStore

  const lamb = useUserStore((state) => state.getLamb?.()); // Get the complete lamb object

  // Get devotional data from devotionalStore
  const currentDevotional = useDevotionalStore((state) => state.currentDevotional);
  console.log("currentDevotional ===>",currentDevotional);
  
  const isLoadingDevotional = useDevotionalStore((state) => state.isLoading);
  const devotionalError = useDevotionalStore((state) => state.error);
  const fetchTodaysDevotional = useDevotionalStore((state) => state.fetchTodaysDevotional);
  const [finishReading, setFinishReading] = useState(false)

  // PrayerView local UI states
  const [showPrayerView, setShowPrayerView] = useState(false);
  const [showPrayerContent, setShowPrayerContent] = useState(false);

  // State to manage the current Rive state
  const [currentStateInput, setCurrentStateInput] = useState(0); // Default to idle (0)
  // State to control background Rive animation
  const [showBgRive, setShowBgRive] = useState(false);
  // Lamb size animation
  const lambSizeAnim = useRef(new Animated.Value(256)).current; // Start with full size (256px)

  const [devotionalData, setDevotionalData] = useState<Devotional | null>(null);

  // Get subscription state and actions from the store
  const { setFromScreen, presentHalfOffPaywall } = useSubscriptionStore();
  // Get pro status from user store
  const proStatus = useUserStore((state) => state?.getProStatus?.());
  const isPro = proStatus === 'pro';

  // Handle subscription button press using the store action
  const handleSubscriptionPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/PricingScreen' as any);
  };

  // Load Rive assets
  const [riveAssets] = useAssets([
    require('../../assets/riveAnimations/new_shepherd.riv'), // 0 – main lamb
    require('../../assets/riveAnimations/bg-green.riv'),     // 1 – prayer background
  ]);

  // Add state for asset loading
  const assetsLoaded = useAssetsStore((s) => s.loaded);
  const assets = useAssetsStore((s) => s.assets);

  // --- Animation Values ---
  const uiAnim = useRef(new Animated.Value(0)).current; // 0: default, 0.5: preview, 1: full overlay
  const headerDefaultOpacityAnim = useRef(new Animated.Value(1)).current; // Opacity for default header elements

  // Background opacities
  const grassOpacityAnim = useRef(new Animated.Value(1)).current;
  const pathOpacityAnim = useRef(new Animated.Value(0)).current;
  const waterOpacityAnim = useRef(new Animated.Value(0)).current;
  const journalOpacityAnim = useRef(new Animated.Value(0)).current;

  // Lamb position animations
  const previewAnim = useRef(new Animated.Value(0)).current;
  const prayerAnim = useRef(new Animated.Value(0)).current;
  const reflectionAnim = useRef(new Animated.Value(0)).current;

  // Opacity for the main screen's Rive wrapper
  const lambOpacityAnim = useRef(new Animated.Value(1)).current; // 1 = visible, 0 = hidden

  // Add lamb artboard change animation
  const lambChangeOpacityAnim = useRef(new Animated.Value(1)).current;
  // Separate animation for Rive artboard transitions
  const riveArtboardOpacityAnim = useRef(new Animated.Value(1)).current;

  // Add Rive view specific animations
  const riveScaleAnim = useRef(new Animated.Value(1)).current; // Scale animation
  const riveRotateAnim = useRef(new Animated.Value(0)).current; // Rotation animation

  // Devotional card animation values
  const devotionalCardHeightAnim = useRef(new Animated.Value(1)).current; // 1 = normal height
  const devotionalCardTranslateYAnim = useRef(new Animated.Value(0)).current; // 0 = normal position
  const devotionalCardOpacityAnim = useRef(new Animated.Value(1)).current; // 1 = visible
  const journalCardOpacityAnim = useRef(new Animated.Value(1)).current; // 1 = visible

  // Devotional reader animation values
  const devotionalHeaderOpacityAnim = useRef(new Animated.Value(0)).current; // 0 = hidden, 1 = visible
  const devotionalBgOpacityAnim = useRef(new Animated.Value(0)).current; // 0 = no overlay, 0.7 = black overlay
  const finishReadingOpacityAnim = useRef(new Animated.Value(0)).current; // New animation value for finish reading overlay
  const devotionaleRadingOpacityAnim = useRef(new Animated.Value(0)).current; // New animation value for finish reading overlay

  // Track previous `finishReading` value so we can differentiate the first render from toggles
  const prevFinishReadingRef = useRef(false);

  // Bottom sheet ref and snap points
  const bottomSheetRef = useRef<BottomSheet>(null);
  
  // Store the bottomSheetRef and riveRef in homeStore for access from other components
  useEffect(() => {
    useHomeStore.getState().setBottomSheetRef(bottomSheetRef);
    useHomeStore.getState().setRiveRef(riveRef);
  }, []);
  // Remove the old snapPoints declaration here
  // ...
  // Keep only the new conditional snapPoints definition
  const snapPoints = useMemo(() => (
    showPrayerContent
      ? ['60%', '65%', '70%', '75%', '80%', '85%', '88%']
      : ['60%', '65%', '70%', '75%', '80%', '85%', '88%']
  ), [showPrayerContent]);
  // ... existing code ...

  // Bottom sheet change handler
  const handleSheetChanges = useCallback((index: number) => {
    // Haptic feedback when snapping
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);



  // --- Derived Animated Values (memoized to avoid recreating nodes each render) ---

  // Back button opacity (inverse of default header opacity)
  const headerBackOpacityAnim = useMemo(
    () =>
      headerDefaultOpacityAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      }),
    []
  );

  // Water background effects
  const waterTranslateY = useMemo(
    () =>
      waterOpacityAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [50, 0],
        extrapolate: 'clamp',
      }),
    []
  );
  const waterScale = useMemo(
    () =>
      waterOpacityAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.05],
        extrapolate: 'clamp',
      }),
    []
  );

  // Lamb position interpolation
  const lambTranslateX = useMemo(
    () =>
      Animated.add(
        previewAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0], extrapolate: 'clamp' }),
        Animated.add(
          prayerAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -20],
            extrapolate: 'clamp',
          }),
          reflectionAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -40],
            extrapolate: 'clamp',
          })
        )
      ),
    []
  );

  const lambTranslateY = useMemo(
    () =>
      Animated.add(
        previewAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 240],
          extrapolate: 'clamp',
        }),
        Animated.add(
          prayerAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 330],
            extrapolate: 'clamp',
          }),
          reflectionAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 200],
            extrapolate: 'clamp',
          })
        )
      ),
    []
  );

  // Bottom card animation
  const bottomCardOpacity = useMemo(
    () => uiAnim.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: 'clamp' }),
    []
  );

  // --- Conditional Glow Style ---
  const showGlow = lambHearts > 80;

  // --- Mood to State Machine Input Mapping ---
  // Based on Rive state machine: 0 Idle, 1 Raising Hand, 2 Eating, 3 Full, 4 Sleepy, 5 Angry, 6 Dying Chubby, 7 Dying Skinny, 8 Dead, 9 Reading, 12 Writing
  const moodToStateInput: Record<string, number> = {
    'lamb-idle': 0,           // >= 50 hearts - Idle
    'lamb-sleepy': 4,         // < 50 hearts - Sleepy  
    'lamb-angry': 5,          // < 30 hearts - Angry
    'lamb-chubby dying': 6,   // < 20 hearts - Dying Chubby
    'lamb-skinny dying': 7,   // < 10 hearts - Dying Skinny
    'smoking': 8,             // < 1 hearts - Dead
    'lamb-full': 3,           // After eating - Full
  };

  // Get UI store functions
  const showPrayerSheet = useUIStore((state) => state.showPrayerSheet);
  const showWidgetPrompt = useUIStore((state) => state.showWidgetPrompt);

  // Get prayer data and store setter for visibility
  const { recentPrayers } = usePrayerStore();
  const setPrayerViewVisible = useHomeStore((state) => state.setPrayerViewVisible);

  const handleRiveError = (error: RNRiveError) => {
    console.log('Rive Error:', error.message, error.type);
    if (Platform.OS === 'android') {
      return;
    }
    setRiveError(error);
  };

  // --- Animation Helpers ---
  const animateToState = (
    targetUiAnim: number,
    targetOpacityAnim: Animated.Value,
    duration: number = 1000,
    mode: HomeMode
  ) => {
    // Remove haptic feedback when animating to a new state

    const fadeOutAnims = [grassOpacityAnim, pathOpacityAnim, waterOpacityAnim, journalOpacityAnim]
      .filter((anim) => anim !== targetOpacityAnim)
      .map((anim) => Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }));

    const resetAnims = [
      Animated.timing(previewAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      Animated.timing(prayerAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      Animated.timing(reflectionAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
    ];

    let modeAnim: Animated.CompositeAnimation;
    let lambOpacityTarget = 1; // Default to visible

    // Set Rive state machine input with fade animation
    const setRiveStateWithFade = (stateNumber: number) => {
      Animated.timing(riveArtboardOpacityAnim, {
        toValue: 0,
        duration: 100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        if (riveRef.current && riveRef.current.setInputState) {
          try {
            riveRef.current.setInputState('State Machine 1', 'Action-Number', stateNumber);
            setCurrentStateInput(stateNumber);
            console.log(`Set Rive Action-Number: ${stateNumber}`);
          } catch (e) {
            console.log('Error setting Rive state:', e);
          }
        }
        // Fade back in
        Animated.timing(riveArtboardOpacityAnim, {
          toValue: 1,
          duration: 150,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start();
      });
    };

    if (mode === 'PREVIEW') {
      // Update state based on lamb mood from userStore
      const currentMood = useUserStore.getState()?.getLambMood?.();
      console.log('Current mood:', currentMood);
      const targetState = (currentMood && moodToStateInput[currentMood] !== undefined) ? moodToStateInput[currentMood] : 0;
      setRiveStateWithFade(targetState);

      modeAnim = Animated.timing(previewAnim, {
        toValue: 1,
        duration,
        easing: Easing.bezier(0.16, 1, 0.3, 1), // Use a more natural spring-like easing
        useNativeDriver: true,
      });
    } else if (mode === 'PRAYER') {
      // Prayer doesn't have a specific state in the list, keep current state
      modeAnim = Animated.timing(prayerAnim, {
        toValue: 1,
        duration,
        easing: Easing.bezier(0.16, 1, 0.3, 1), // Use a more natural spring-like easing
        useNativeDriver: true,
      });
    } else if (mode === 'REFLECTION') {
      setRiveStateWithFade(12); // Writing state
      modeAnim = Animated.timing(reflectionAnim, {
        toValue: 1,
        duration,
        easing: Easing.bezier(0.16, 1, 0.3, 1), // Use a more natural spring-like easing
        useNativeDriver: true,
      });
      lambOpacityTarget = 0; // Hide main lamb when journal is open
    } else {
      modeAnim = Animated.timing(previewAnim, { toValue: 0, duration: 0, useNativeDriver: true });
    }

    Animated.sequence([
      Animated.parallel(resetAnims),
      Animated.parallel([
        Animated.timing(uiAnim, {
          toValue: targetUiAnim,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(headerDefaultOpacityAnim, { toValue: 0, duration, useNativeDriver: true }),
        Animated.timing(targetOpacityAnim, { toValue: 1, duration, useNativeDriver: true }),
        // Animate main lamb opacity
        Animated.timing(lambOpacityAnim, {
          toValue: lambOpacityTarget,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        ...fadeOutAnims,
        modeAnim,
      ]),
    ]).start();
  };

  const animateToDefault = (duration: number = 800) => {
    console.log('Animating back to default state');
    // Remove haptic feedback when returning to default state

    const resetPositionAnims = [
      Animated.timing(previewAnim, {
        toValue: 0,
        duration,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }),
      Animated.timing(prayerAnim, {
        toValue: 0,
        duration,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }),
      Animated.timing(reflectionAnim, {
        toValue: 0,
        duration,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }),
    ];

    Animated.parallel([
      // UI element animations
      Animated.timing(uiAnim, {
        toValue: 0,
        duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(headerDefaultOpacityAnim, { toValue: 1, duration, useNativeDriver: true }),
      Animated.timing(grassOpacityAnim, { toValue: 1, duration, useNativeDriver: true }),
      Animated.timing(pathOpacityAnim, { toValue: 0, duration, useNativeDriver: true }),
      Animated.timing(waterOpacityAnim, { toValue: 0, duration, useNativeDriver: true }),
      Animated.timing(journalOpacityAnim, { toValue: 0, duration, useNativeDriver: true }),
      // Lamb position animations
      ...resetPositionAnims,
      // Lamb opacity animation (ensure it fades back in fully)
      Animated.timing(lambOpacityAnim, { toValue: 1, duration, useNativeDriver: true }),
      // Reset Rive view animations
      Animated.timing(riveScaleAnim, { toValue: 1, duration, useNativeDriver: true }),
      Animated.timing(riveRotateAnim, { toValue: 0, duration, useNativeDriver: true }),
    ]).start();

    // Animate lamb size separately as it cannot use native driver
    Animated.timing(lambSizeAnim, {
      toValue: 256,
      duration: duration, // Use the same duration
      useNativeDriver: false, // Explicitly set to false
    }).start();
  };

  // --- useEffect to handle devotional reader visibility animations ---
  useEffect(() => {
    const duration = 400; // Match the card animation duration

    if (devotionalReaderVisible) {
      // Animate in - keep default header visible to show "Reading" text
      Animated.parallel([
        // Keep default header visible (don't fade it out)
        // Fade in black overlay
        Animated.timing(devotionalBgOpacityAnim, {
          toValue: 0.3,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        // Ensure default header is visible
        Animated.timing(headerDefaultOpacityAnim, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        // Fade out black overlay
        Animated.timing(devotionalBgOpacityAnim, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [devotionalReaderVisible]);

  // Add effect to animate finish reading overlay
  useEffect(() => {
    // Prevent side-effects on the very first render when `finishReading` is still false
    if (!prevFinishReadingRef.current && !finishReading) {
      return;
    }

    if (finishReading) {
      // Show success overlay
      Animated.timing(finishReadingOpacityAnim, {
        toValue: 1,
        duration: 1000,
        delay: 2500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();

      // Collapse bottom sheet and dismiss keyboard when success overlay is shown
      Keyboard.dismiss();
      bottomSheetRef.current?.snapToIndex(0);

      // Show eating animation for success
      if (showDevotionalContent && riveRef.current?.setInputState) {
        try {
          riveRef.current.setInputState('State Machine 1', 'Action-Number', 2);
        } catch (_) {/* ignore if input not present */}
      }
    } else {
      // Only run this block if the user just closed the success overlay
      if (prevFinishReadingRef.current) {
        Animated.timing(finishReadingOpacityAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start();
      }
    }

    // Update ref for next render
    prevFinishReadingRef.current = finishReading;
  }, [finishReading]);

  const handlePrayerPress = () => {
    console.log('Prayer button pressed');
    if (!isPro && prayerCompleted) {
      setFromScreen('home-prayer');
      handleSubscriptionPress();
    } else {
      // In dev mode, never disable prayer
      if (!__DEV__ && !readingCompleted) {
        console.log('Prayer button disabled: Reading not completed');
        return;
      }
      console.log('Prayer button pressed - transitioning to PrayerView');
      // Reset finishReading to prevent success animation from showing
      setFinishReading(false);
      // Simple fade animation for content transition - longer duration
      Animated.timing(devotionalCardOpacityAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        // Show prayer content after fade out
        setShowPrayerContent(true);
        // Fade back in
        Animated.timing(devotionalCardOpacityAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start();
      });
      // Show PrayerView state immediately
      setShowPrayerView(true);
      setPrayerViewVisible(true); // Hide tab bar
      // Synchronize lamb fade with card content fade
      Animated.timing(riveArtboardOpacityAnim, {
        toValue: 0,
        duration: 400, // Same as card fade out
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        // Set Rive Action-Number to 1 (Raising Hand)
        if (riveRef.current && riveRef.current.setInputState) {
          try {
            riveRef.current.setInputState('State Machine 1', 'Action-Number', 1);
            console.log('Set Rive Action-Number: 1 (Raising Hand)');
          } catch (e) {
            console.log('Error setting Rive Action-Number to Raising Hand:', e);
          }
        }
        // Fade back in
        Animated.timing(riveArtboardOpacityAnim, {
          toValue: 1,
          duration: 600, // Same as card fade in
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start();
      });
      // Log analytics
      analytics.logEvent('HomeScreen_Tapped_Prayer', {
        prayerTopic: recentPrayers[0] || 'general',
      });
    }
  };











  // Helper to set Rive to Idle
  const setRiveIdle = () => {
    if (riveRef.current && riveRef.current.setInputState) {
      try {
        riveRef.current.setInputState('State Machine 1', 'Action-Number', 0);
        console.log('Set Rive Action-Number: 0 (Idle)');
      } catch (e) {
        console.log('Error setting Rive Action-Number to Idle:', e);
      }
    } else {
      console.log('Rive ref not ready for Action-Number Idle');
    }
  };

  const handleReadPress = () => {
    console.log('Read the word button pressed');
    
    // Set showGlobalButtons to true when starting reading flow
    const setShowGlobalButtons = useHomeStore.getState().setShowGlobalButtons;
    setShowGlobalButtons(true);
    
    // Show DevotionalReader state immediately so header shows "Reading"
    setShowDevotionalReader(true);
    setDevotionalReaderVisible(true); // Hide tab bar
    setShowDevotionalContent(true); // Set this immediately so header shows "Reading"
    
    // Simple fade animation for content transition - longer duration
    Animated.timing(devotionalCardOpacityAnim, {
      toValue: 0,
      duration: 400,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      // Content is already set to devotional, just fade back in
      Animated.timing(devotionalCardOpacityAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    });

    // Synchronize lamb fade with card content fade
    Animated.timing(riveArtboardOpacityAnim, {
      toValue: 0,
      duration: 400, // Same as card fade out
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      // Set to Reading state (9)
      setCurrentStateInput(9);
      if (riveRef.current?.setInputState) {
        // Primary input used across the app
        riveRef.current.setInputState('State Machine 1', 'Action-Number', 9);
        // Fallback for older artboards that still expose 'Number 1'
        try {
          riveRef.current.setInputState('State Machine 1', 'Number 1', 9);
        } catch (_) {
          /* no-op – some artboards may not have this legacy input */
        }
      }
      Animated.timing(riveArtboardOpacityAnim, {
        toValue: 1,
        duration: 600, // Same as card fade in
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    });

    // Log analytics
    analytics.logEvent('HomeScreen_Tapped_DailyBread', {
      hasDevotional: !!currentDevotional,
      bibleReference: currentDevotional?.bibleReference,
    });
  };

  const handleReflectionPress = () => {
    console.log('🔍 REFLECTION PRESS - Button pressed with states:', {
      reflectionCompleted,
      isPro,
      readingCompleted,
      homeStoreSnapshot: useHomeStore.getState(),
      timestamp: new Date().toLocaleTimeString()
    });
    
    if (!isPro && reflectionCompleted) {
      console.log('🔍 REFLECTION PRESS - Redirecting to subscription (already completed)');
      setFromScreen('home-read');
      handleSubscriptionPress();
    } else {
      console.log('🔍 REFLECTION PRESS - Proceeding with reflection flow');

      // Reset finishReading to prevent success animation from showing
      setFinishReading(false);

      // Simple fade animation for content transition - longer duration
      Animated.timing(devotionalCardOpacityAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        // Show JournalReader content after fade out
        setShowJournalContent(true);
        const setJournalViewVisible = useHomeStore.getState().setJournalViewVisible;
        setJournalViewVisible(true);
        // Fade back in
        Animated.timing(devotionalCardOpacityAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start();
      });

      // Show JournalReader state immediately
      setShowJournalReader(true);

      // Synchronize lamb fade with card content fade
      Animated.timing(riveArtboardOpacityAnim, {
        toValue: 0,
        duration: 400, // Same as card fade out
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        // Set to Writing state (12)
        setCurrentStateInput(12);
        if (riveRef.current?.setInputState) {
          // Primary input used across the app
          riveRef.current.setInputState('State Machine 1', 'Action-Number', 12);
          // Fallback for older artboards that still expose 'Number 1'
          try {
            riveRef.current.setInputState('State Machine 1', 'Number 1', 12);
          } catch (_) {
            /* no-op – some artboards may not have this legacy input */
          }
        }
        Animated.timing(riveArtboardOpacityAnim, {
          toValue: 1,
          duration: 600, // Same as card fade in
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start();
      });


    }
  };

  const handleWidgetPromptPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.logEvent('HomeScreen_Tapped_AddWidget');
    showWidgetPrompt();
  };

  // --- Handlers for Closing Overlays ---
  const handleCloseOverlay = () => {
    console.log('Closing Overlay, triggering return to default');
    console.log('🔍 CLOSE OVERLAY - Current completion status when closing overlay:', {
      readingCompleted,
      prayerCompleted,
      reflectionCompleted,
      allCompleted: readingCompleted && prayerCompleted && reflectionCompleted,
      homeStoreSnapshot: useHomeStore.getState(),
      timestamp: new Date().toLocaleTimeString()
    });

    // Animate the Rive view for closing
    Animated.sequence([
      Animated.parallel([
        Animated.timing(riveScaleAnim, {
          toValue: 0.95,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(riveRotateAnim, {
          toValue: -0.03,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(riveScaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(riveRotateAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Hide any specific background elements
    setShowBgRive(false);

    // Set mode to trigger animateToDefault via useEffect
    setMode('DEFAULT');
  };

  // Additional useEffect to update Rive animation when completion status changes
  useEffect(() => {
    // Only update when in DEFAULT mode, as other modes have their own animations
    console.log('🔍 COMPLETION STATUS CHANGED:', {
      readingCompleted,
      prayerCompleted,
      reflectionCompleted,
      mode,
      homeStoreValues: {
        readingCompleted: useHomeStore.getState().readingCompleted,
        prayerCompleted: useHomeStore.getState().prayerCompleted,
        reflectionCompleted: useHomeStore.getState().reflectionCompleted,
      },
      timestamp: new Date().toLocaleTimeString()
    });

    if (mode === 'DEFAULT') {
      // Always set state input based on lamb mood in DEFAULT mode with smooth fade
      const targetStateInput = moodToStateInput[lambMood] || 0;
      if (currentStateInput !== targetStateInput) {
        Animated.timing(riveArtboardOpacityAnim, {
          toValue: 0,
          duration: 100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start(() => {
          setCurrentStateInput(targetStateInput);
          if (riveRef.current?.setInputState) {
            riveRef.current.setInputState('State Machine 1', 'Action-Number', targetStateInput);
          }
          try {
            if (riveRef.current) {
              riveRef.current.setInputState('State Machine 1', 'Number 1', targetStateInput);
            }
          } catch (_) {
            // ignore if Action-Number input not present (older artboard)
          }
          try {
            if (riveRef.current) {
              riveRef.current.setInputState('State Machine 1', 'Number 1', targetStateInput);
            }
          } catch (_) {
            // ignore if legacy Number 1 input missing
          }
          Animated.timing(riveArtboardOpacityAnim, {
            toValue: 1,
            duration: 150,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }).start();
        });
      }
    }
  }, [mode, lambMood]);

  // Debug useEffect to track heart and mood changes
  useEffect(() => {
    console.log('🐑 LAMB STATE DEBUG:', {
      lambHearts,
      lambMood,
      currentStateInput,
      mode,
      expectedStateInput: moodToStateInput[lambMood] || 0,
    });
    console.log('📊 DISPLAY VALUES DEBUG:', {
      heartsDisplay: lambHearts?.toString?.(),
      gemsDisplay: gens?.toString?.(),
      streakDisplay: streakCount?.toString?.(),
    });
  }, [lambHearts, lambMood, currentStateInput, mode, gens, streakCount]);

  // Add this near the top of the component, after other useRef declarations
  const riveKey = useRef('lamb-animation').current;

  // Defer loading of the heavy Rive component until after initial interactions
  const [riveReady, setRiveReady] = useState(false);
  const [isFree, setIsFree] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [riveSkinInitialized, setRiveSkinInitialized] = useState(false);

  // Animation for first load after onboarding
  const firstLoadOpacity = useRef(new Animated.Value(0)).current;

  // Run once on mount to defer heavy work
  useEffect(() => {
    setRiveReady(true);

    // Fallback timeout to ensure skin is initialized even if onPlay doesn't fire
    const fallbackTimeout = setTimeout(() => {
      if (!riveSkinInitialized) {
        console.log('Fallback: Setting skin to initialized after timeout');
        setRiveSkinInitialized(true);
      }
    }, 1000); // 1 second fallback

    // Check if this is the first load after onboarding completion
    if (isFirstLoad) {
      // Start with opacity 0 and animate to 1
      Animated.timing(firstLoadOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        setIsFirstLoad(false);
      });
    }
    
    // Make sure to clean up any references when unmounting
    return () => {
      console.log('Cleaning up Home component');
      clearTimeout(fallbackTimeout);
    };
  }, [riveSkinInitialized, isFirstLoad]);

  // Add screen view analytics tracking
  useEffect(() => {
    console.log('🏠 Home screen useEffect called');
    
    // DEBUG: Log initial completion states when component mounts
    console.log('🔍 INITIAL COMPLETION STATES ON MOUNT:', {
      readingCompleted,
      prayerCompleted,
      reflectionCompleted,
      homeStoreRaw: useHomeStore.getState(),
      timestamp: new Date().toLocaleTimeString()
    });
    
    // Log screen view when component mounts
    analytics.logEvent('HomeScreen_Viewed');

    // Fetch today's devotional when component mounts
    console.log('📖 About to call fetchTodaysDevotional');
    fetchTodaysDevotional().then(() => {
      // Get the current devotional data from the store
      const devotionalStore = useDevotionalStore.getState();
      const data = devotionalStore.currentDevotional
      setDevotionalData(data)
    });
    console.log('📖 fetchTodaysDevotional call completed');
  }, []);
  
  // Additional effect to ensure the lamb skin is always set to normal (0)
  // This will run on component mount and whenever the riveRef or riveReady changes
  useEffect(() => {
    if (!riveRef.current || !riveReady || riveSkinInitialized) return;
    
    // Ensure skin is always set to normal (0) - only if not already initialized
    try {
      riveRef.current.setInputState('State Machine 1', 'Skin-Number', 0);
      console.log('Reapplied normal skin (0) to lamb');
      setRiveSkinInitialized(true);
    } catch (e) {
      console.log('Error setting lamb skin:', e);
      // Still mark as initialized to prevent blocking
      setRiveSkinInitialized(true);
    }
  }, [riveRef, riveReady, riveSkinInitialized]);



  // riveComponent will be defined after state declarations

  const [showWidgetSheet, setShowWidgetSheet] = useState(false);
  // Add level pill animation states
  const [isLevelPillExpanded, setIsLevelPillExpanded] = useState(false);
  // Add hearts explainer modal state
  const [showHeartsModal, setShowHeartsModal] = useState(false);
  // Add explainer modal state
  const [showExplainerModal, setShowExplainerModal] = useState(false);
  // Add devotional reader state
  const [showDevotionalReader, setShowDevotionalReader] = useState(false);
  const [showDevotionalContent, setShowDevotionalContent] = useState(false);
  const [showJournalReader, setShowJournalReader] = useState(false);
  const [showJournalContent, setShowJournalContent] = useState(false);
  
  // Get customDevotional from store
  const customDevotional = useDevotionalStore((state) => state.customDevotional);
  const clearCustomDevotional = useDevotionalStore((state) => state.clearCustomDevotional);
  

  const bottomContentOpacity = useRef(new Animated.Value(0)).current;
  const bottomContentAnimY = useRef(new Animated.Value(100)).current;
  const controlRowOpacity = useRef(new Animated.Value(0)).current; // New animation value for control row

  const bottomContentStyle = useMemo(() => {
    return {
      opacity: bottomContentOpacity,
      transform: [{ translateY: bottomContentAnimY }],
    };
  }, [bottomContentOpacity, bottomContentAnimY]);

  // Define riveComponent after state declarations so it can access showJournalContent and showPrayerContent
  const riveComponent = useMemo(() => {
    if (!riveAssets || !riveReady) return null;

    // Always use the main lamb asset (index 0)
    const lambAssetIndex = 0;
    const useArtboardName = '[Main] Shpeherd';

    // Handler for when Rive starts playing (indicates it's ready)
    const handleRivePlay = () => {
      // Only run once to prevent spam
      if (riveSkinInitialized) return;
      
      console.log('Rive component started playing, setting skin to normal');
      // Use a small timeout to ensure Rive is fully ready
      setTimeout(() => {
        if (riveRef.current && riveRef.current.setInputState) {
          try {
            // Set skin to normal (0) immediately when Rive starts playing
            riveRef.current.setInputState('State Machine 1', 'Skin-Number', 0);
            console.log('Set Rive Skin-Number: 0 (normal skin) on play');
            setRiveSkinInitialized(true);
          } catch (e) {
            console.log('Error setting Rive skin on play:', e);
            // Still mark as initialized to prevent blocking
            setRiveSkinInitialized(true);
          }
        } else {
          // If setInputState is not available, still mark as initialized
          setRiveSkinInitialized(true);
        }
      }, 50); // Small delay to ensure Rive is fully ready
    };

    return (
      <View
        style={{
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: riveSkinInitialized ? 1 : 0, // Hide until skin is initialized
        }}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            analytics.logEvent('HomeScreen_Tapped_LambName');
          }}
          activeOpacity={0.7}
          className="bg-surfaceCream/80 rounded-full items-center justify-center flex-row h-6 top-12 px-2">
          <Text className="font-feather text-textPrimary text-xs">
            {lambName
              ? `${lambName.charAt(0).toUpperCase()}${lambName.slice(1).toLowerCase().slice(0, 8)}${lambName.length > 9 ? '...' : ''}`
              : ''}
          </Text>
        </TouchableOpacity>
        <View
          style={{
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}>
          {IS_ANDROID ? (
            <Rive
              key={riveKey}
              ref={riveRef}
              resourceName="new_shepherd"
              artboardName={useArtboardName}
              stateMachineName="State Machine 1"
              autoplay
              onError={handleRiveError}
              onPlay={handleRivePlay}
              style={{
                width: '100%',
                height: '100%',
                opacity: new Date().getHours() >= 19 ? 0.85 : 1,
              }}
            />
          ) : (
            <Rive
              key={riveKey}
              ref={riveRef}
              url={riveAssets[lambAssetIndex].uri!}
              artboardName={useArtboardName}
              stateMachineName="State Machine 1"
              autoplay
              onError={handleRiveError}
              onPlay={handleRivePlay}
              style={{
                width: '100%',
                height: '100%',
                opacity: new Date().getHours() >= 19 ? 0.85 : 1,
              }}
            />
          )}
        </View>
      </View>
    );
  }, [riveAssets, currentStateInput, riveKey, riveReady, isPro, lambName, isLevelPillExpanded, riveSkinInitialized]);

  const showGlobalButtons = useHomeStore((state) => state.showGlobalButtons);
useEffect(() => {
  if(showGlobalButtons){
       // Animate bottom content (Rive + Button)
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

 
}else{
  bottomContentOpacity.setValue(0);
  bottomContentAnimY.setValue(100);
  if(devotionalReadedFully){
    setDevotionalReadedFully(false);
  }
  if(isCompletePrayerDisabled){
    setIsCompletePrayerDisabled(true);
  }
  if(journalButtonEnabled){
    setJournalButtonEnabled(false);
  }
  Animated.timing(controlRowOpacity, {
    toValue: 1,
    duration: 400,
    useNativeDriver: true,
  }).start();
}
}, [showDevotionalContent,showPrayerContent,showJournalContent,showGlobalButtons])

// Add effect for control row fade animation
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

  // Removed auto-open DevotionalReader - user must manually tap "Daily Bread" button
  
  const levelPillWidthAnim = useRef(new Animated.Value(0)).current;
  const levelPillOpacityAnim = useRef(new Animated.Value(0)).current;
  // Pre-calculate the expanded width for the pill (use a reasonable fixed width instead of screen-based)
  const pillExpandedWidth = 350; // Fixed reasonable width that won't overflow

  // Calculate level and XP progress for the level pill display
  const levelInfo = useMemo(() => {
    if (!lamb || lamb.xp === undefined)
      return {
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

  // Add this with other animation values at the top
  const androidBgOpacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showDevotionalContent || showPrayerContent || showJournalContent) {
      Animated.timing(devotionaleRadingOpacityAnim, {
        toValue: 1,
        duration: 1000, // 2 seconds fade-in for slow opacity increase
        delay: 0, // 2 seconds delay before starting the fade-in
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(devotionaleRadingOpacityAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [showDevotionalContent,showPrayerContent,showJournalContent]);

  // Add this effect to handle Android background animation
  useEffect(() => {
    if (IS_ANDROID && mode === 'PRAYER') {
      Animated.timing(androidBgOpacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(androidBgOpacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [mode]);

  // Get widget modal state from user store
  const hasSeenWidgetModal = useUserStore((state) => state.getHasSeenWidgetModal());
  const setHasSeenWidgetModal = useUserStore((state) => state.setHasSeenWidgetModal);

  // Add effect to show widget modal on first signup
  useEffect(() => {
    const showWidgetModalOnFirstSignup = async () => {
      // Only show for iOS users who haven't seen the modal
      if (Platform.OS === 'ios' && !hasSeenWidgetModal) {
        // Check if this is a new signup by comparing creation time
        const createdAt = useUserStore.getState().getCreatedAt();
        const now = new Date();
        const signupTime = createdAt?.toDate?.() || new Date();

        // If signup was within the last 5 minutes, show the modal
        if (now.getTime() - signupTime.getTime() < 5 * 60 * 1000) {
          analytics.logEvent('HomeScreen_Tapped_WidgetHowTo_new_user');
          setShowWidgetSheet(true);
        }
      }
    };

    showWidgetModalOnFirstSignup();
  }, [hasSeenWidgetModal]);

  // Modify the widget sheet close handler
  const handleWidgetSheetClose = () => {
    setShowWidgetSheet(false);
    // Mark as seen when closed
    if (setHasSeenWidgetModal) {
      setHasSeenWidgetModal(true);
    }
  };

  // Add state for share card modal
  const [showShareCard, setShowShareCard] = useState(false);
  const pan = useRef(new Animated.ValueXY()).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // Create pan responder for swipe gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) { // Only allow downward swipe
          pan.y.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) { // If swiped down more than 100 units
          Animated.timing(pan.y, {
            toValue: Dimensions.get('window').height,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setShowShareCard(false);
            pan.y.setValue(0);
          });
        } else {
          // Reset position if not swiped enough
          Animated.spring(pan.y, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Gate of rendering: only render the screen if the assets are ready
  if (!assetsLoaded || !assets) return null;

  const isDarkContant = new Date().getHours() >= 19;

  const handleShare = async () => {
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

      // Share both the devotional image and verse text
      await Share.share({
        url: devotionalData.imageURL,
        message: devotionalData.verse || 'Check out this daily verse!',
        title: 'Share your daily verse'
      });

    } catch (error) {
      console.error('Error sharing:', error);
      alert('Error sharing image');
    }
  };

const buttonTitle = showDevotionalContent ? 'Continue' : 'Amen';
  // HEADER
  return (
    <>
      {/* <StatusBar translucent backgroundColor="transparent" /> */}

      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDarkContant ? 'light-content' : 'dark-content'}
      />
      <Animated.View className="flex-1" style={{ opacity: isFirstLoad ? firstLoadOpacity : 1 }}>
        {/* Background Layers - Use expo-image for better performance */}
        <Animated.View
          style={[
            { position: 'absolute', width: '100%', height: '100%', top: -100 },
            { opacity: showDevotionalContent ? 1 : 1 },
          ]}>
          <ImageBackground
            source={require('../../assets/backgrounds/mainBackground2.png')}
            style={{ width: '100%', height: '100%' }}>
            <Image
              source={require('../../assets/backgrounds/mainBackground2.png')}
              style={{ width: '100%', height: '100%' }}
            />
          </ImageBackground>
        </Animated.View>





        {/* Black overlay for devotional mode */}
        {/* {!finishReading && <Animated.View
          style={[
            {
              position: 'absolute',
              width: '100%',
              height: '100%',
              backgroundColor: 'black',
            },
            { opacity: devotionalBgOpacityAnim },
          ]}
          pointerEvents="none"
        />} */}



        {(showDevotionalContent || showPrayerContent || showJournalContent) && !finishReading && (
          <Animated.View
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              opacity: devotionaleRadingOpacityAnim,
            }}
            pointerEvents="none"
          >
            <SpotlightOverlay visible={true} radius={150} centerY={SCREEN_HEIGHT * 0.25} />
          </Animated.View>
        )}

        <Animated.View
          style={[
            { position: 'absolute', width: '100%', height: '100%' },
            { opacity: pathOpacityAnim },
          ]}>
          <Image source={pathBg} style={{ width: '100%', height: '100%' }} />
        </Animated.View>

        <Animated.View
          style={[
            { position: 'absolute', width: '100%', height: '100%' },
            { opacity: journalOpacityAnim },
          ]}>
          <Image source={journalBg} style={{ width: '100%', height: '100%' }} />
        </Animated.View>

        {/* Prayer background Rive animation */}
        <Animated.View
          style={[
            { position: 'absolute', width: '100%', height: '100%', zIndex: 0 },
            { opacity: IS_IOS ? waterOpacityAnim : androidBgOpacityAnim },
          ]}>
          {IS_IOS ? (
            showBgRive &&
            riveAssets && (
              <Rive
                url={riveAssets[1].uri!}
                autoplay={true}
                style={{ width: '160%', height: '160%', top: -300, left: -128 }}
              />
            )
          ) : (
            <Image
              source={require('../../assets/backgrounds/Forest Clearing Background Apr 18 2025.png')}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          )}
        </Animated.View>

        <SafeAreaView className="flex-1">
          {/* Header: Contains logic for showing Back OR Title/Stats */}
          <View
            className="flex-row justify-between items-center px-4 pt-1.5 pb-2 h-[42px] relative"
            style={{ zIndex: 9999, marginTop: Platform.OS === 'android' ? 25 : 0 }}>
            {/* Animated Back Button */}

            {/* Animated Default Header Elements (Title + Stats) */}
            <Animated.View
              className="absolute inset-0 flex-row items-center justify-between px-8 w-full"
              style={{ opacity: headerDefaultOpacityAnim }}
              pointerEvents={mode !== 'DEFAULT' ? 'none' : 'auto'}>
              <View className="flex-row items-center flex-1 justify-between">
                <Text
                  className="text-h1 font-feather text-white tracking-wide right-2"
                  style={{
                    textShadowColor: 'rgba(0, 0, 0, 0.2)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2,
                  }}>
                  {showDevotionalContent ? 'Devotional' : showPrayerContent ? 'Praying' : showJournalContent ? 'Reflecting' : 'Shepherd'}
                </Text>
                {!showDevotionalContent && !showPrayerContent && !showJournalContent && (
                  <View className="flex-row gap-2 justify-end ml-2">
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        analytics.logEvent('HomeScreen_Tapped_Level');
                        // Add detailed analytics for XP progress tap
                        analytics.logEvent('HomeScreen_Tapped_XpProgress', {
                          level: levelInfo.level,
                          currentXp: levelInfo.xp,
                          nextLevelXp: levelInfo.xpForNextLevel,
                          progress: Math.round(levelInfo.progress),
                        });
                        // Toggle expanded state
                        setIsLevelPillExpanded(!isLevelPillExpanded);

                        // Animate width and opacity
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
                      }}>
                      <View style={{ position: 'relative', zIndex: 2 }}>
                        <ProgressPill
                          value={0}
                          label={lambHearts?.toString?.()}
                          icon={heartIcon}
                        />

                        {isLevelPillExpanded && (
                          <Animated.View
                            className="bg-surfaceCreamLight rounded-xl overflow-hidden flex-row items-center p-2"
                            style={{
                              position: 'absolute',
                              top: 40,
                              left: '50%',
                              transform: [
                                {
                                  translateX: levelPillWidthAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, -pillExpandedWidth / 2],
                                  }),
                                },
                              ],
                              width: levelPillWidthAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [40, pillExpandedWidth],
                              }),
                            }}
                            onLayout={() => {
                              // Debug log to verify the XP calculation
                              console.log(
                                `Level Pill Debug - Level: ${levelInfo.level}, Total XP: ${levelInfo.xp}`
                              );
                              console.log(
                                `XP to next level: ${levelInfo.xpProgress}/${levelInfo.xpNeeded} (${Math.round(levelInfo.progress)}%)`
                              );
                            }}>
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingRight: 10,
                              }}>
                              <Image source={heartIcon} className="w-7 h-7" />
                              <Image source={starIcon} tintColor={'#FF8800'} className="w-7 h-7" />
                            </View>

                            <View style={{ width: '80%' }}>
                              <View className="h-2 bg-red/25 rounded-md overflow-hidden">
                                <View
                                  className="h-full bg-red rounded-full"
                                  style={{
                                    width: `${Math.min(100, (lambHearts / MAX_HEARTS) * 100)}%`,
                                  }}
                                />
                              </View>

                              <View className="h-2 bg-orange/25 rounded-full overflow-hidden mt-1 ">
                                <View
                                  className="h-full bg-orange rounded-full"
                                  style={{
                                    width: `${Math.max(Math.min(levelInfo.progress, 100), 1)}%`,
                                  }}
                                />
                              </View>
                            </View>
                          </Animated.View>
                        )}
                      </View>
                    </TouchableOpacity>
                    <>
                      <TouchableOpacity
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          analytics.logEvent('HomeScreen_Tapped_Gems');
                          // Show toast message using Toast component
                          Toast.show({
                            type: 'info',
                            text1: 'Unlock skins at lvl 10!',
                            text2: 'Customize your lamb with special skins from the shop.',
                            position: 'top',
                            visibilityTime: 4000,
                          });
                        }}>
                        <ProgressPill value={0} label={gens?.toString?.()} icon={gemIcon} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          analytics.logEvent('HomeScreen_Tapped_Streak');
                          Toast.show({
                            type: 'info',
                            text1: 'Increase your streak!',
                            text2: 'Complete your daily bread reading to build your streak.',
                            position: 'top',
                            visibilityTime: 4000,
                          });
                        }}>
                        <ProgressPill value={0} label={streakCount?.toString?.()} icon={flameIcon} />
                      </TouchableOpacity>
                    </>
                  </View>
                )}
              </View>
            </Animated.View>

            {/* Devotional Header - animated visibility */}
            <Animated.View
              className="absolute inset-0 flex-row items-center justify-center px-8 w-full"
              style={{ opacity: devotionalHeaderOpacityAnim }}
              pointerEvents={devotionalReaderVisible ? 'auto' : 'none'}>
              <Text
                className="text-h1 font-feather text-white tracking-wide"
                style={{
                  textShadowColor: 'rgba(0, 0, 0, 0.2)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}>
                {/* Daily Devotional */}
              </Text>
            </Animated.View>
          </View>

          {/* Top Section - Lamb Avatar */}
          <Animated.View
            className="items-center justify-center"
            style={{
              opacity: Animated.multiply(
                Animated.multiply(lambOpacityAnim, lambChangeOpacityAnim),
                riveArtboardOpacityAnim
              ),
              transform: [{ translateX: lambTranslateX }, { translateY: lambTranslateY }],
              height: BASE_LAMB_SIZE,
              // Add conditional shadow for the glow effect
              shadowColor: showGlow ? '#FDE047' : 'transparent', // yellow-300
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: showGlow ? 0.6 : 0,
              shadowRadius: 15, // Adjust radius for softness
              marginTop: -48,
            }}>
            <Animated.View className="items-center justify-center" style={{}}>
              {riveError ? (
                <Text className="text-red-500 p-4 text-center">
                  Error loading animation: {riveError.message} ({riveError.type})
                </Text>
              ) : (
                <>
                  <Animated.View
                    onTouchStart={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={{
                      width: lambSizeAnim,
                      height: lambSizeAnim,
                    }}>
                    <Animated.View
                      style={{
                        width: '100%',
                        height: '100%',
                        transform: [
                          { scale: riveScaleAnim },
                          {
                            rotate: riveRotateAnim.interpolate({
                              inputRange: [-1, 0, 1],
                              outputRange: ['-60deg', '0deg', '60deg'],
                            }),
                          },
                        ],
                      }}>
                      {riveComponent}
                    </Animated.View>
                  </Animated.View>
                  {currentStateInput === 8 && <View style={{ height: 36 }} />}
                </>
              )}
            </Animated.View>
          </Animated.View>

          {/* SUPER badge for pro users */}
          {mode === 'DEFAULT' && (
            <TouchableOpacity
              onPress={() => {
                if (!isPro) {
                  analytics.logEvent('HomeScreen_TappedProBadge');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

                  // Check if user has seen half-off paywall before
                  const subscriptionStore = useSubscriptionStore.getState();
                  if (subscriptionStore.shouldShowFreeTrialPaywall()) {
                    // User has seen half-off paywall before, show free trial
                    console.log(
                      '[HomeScreen] Showing free trial paywall (user has seen half-off before)'
                    );
                    subscriptionStore.presentFreeTrialPaywall();
                  } else {
                    // First time or user hasn't seen half-off paywall, show half-off
                    console.log('[HomeScreen] Showing half-off paywall (first time)');
                    subscriptionStore.presentHalfOffPaywall();
                    setTimeout(() => {
                      setIsFree(true);
                    }, 2000);
                  }
                }
              }}
              activeOpacity={0.8}
              style={{
                position: 'absolute',
                left: 24,
                // Place it roughly at the bottom of the lamb viewport
                top: SCREEN_HEIGHT * (Platform.select({ android: 0.28, ios: 0.35 }) || 0.35),
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 32,
                zIndex: 20,
              }}>
              {/* <LinearGradient
                colors={['#F7B500', '#FFF45B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{
                  position: 'absolute',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 32,
                  zIndex: 20,
                  opacity: isPro ? 1 : 1,
                }}>
                <Text
                  className="font-nunito-italic text-lg text-white text-center p-0 m-0"
                  style={{
                    textShadowColor: 'rgba(0,0,0,0.15)',
                    textShadowOffset: { width: 1, height: 1 },
                    textShadowRadius: 3,
                  }}
                >
                  {isPro ? "SUPER" : isFree ? 'FREE Trial 🔓' : '🎁'}
                </Text>
              </LinearGradient> */}
            </TouchableOpacity>
          )}

          {/* Bottom Section - Action Buttons Card or DevotionalReader */}
          <BottomSheet
            ref={bottomSheetRef}
            index={0} // Start closed
            snapPoints={snapPoints}
            enablePanDownToClose={false} // Never dismissable
            animateOnMount={true} // Disable initial animation
            enableDynamicSizing={false} // Prevent dynamic snap points
            bottomInset={0} // No bottom inset
            detached={false} // Not detached from bottom
            handleComponent={showPrayerContent ? ()=>null : undefined}
            handleIndicatorStyle={{
              opacity: showPrayerContent || showDevotionalContent || showJournalContent ? 0 : 0.3,
              height: 4,
              width: showPrayerContent || showDevotionalContent || showJournalContent ? 0 : 40,
              backgroundColor: '#634012',
              borderRadius: 2,
            }}
            backgroundStyle={{
              backgroundColor: '#FDEBB8',
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              ...Platform.select({
                ios: {
                  shadowColor: 'rgba(0,0,0,0.08)',
                  shadowOffset: { width: 0, height: 2 },
                  shadowRadius: 4,
                  shadowOpacity: 1,
                },
                android: { elevation: 3, shadowColor: 'rgba(0,0,0,0.08)' },
              }),
            }}
            onChange={handleSheetChanges}>
            {/* Animated content wrapper - only this fades */}
            <Animated.View style={{ flex: 1, opacity: devotionalCardOpacityAnim }}>
              {/* Conditionally show DevotionalReader or normal content */}
              {showDevotionalContent ? (
                <DevotionalReader
                  ref={devotionalReaderRef}
                  visible={showDevotionalContent}
                  onClose={handleDevotionalClose}
                  setFinishReading={setFinishReading}
                  setDevotionalReadedFully={setDevotionalReadedFully}
                  setCurrentVerseReference={setCurrentVerseReference}
                />
              ) : showJournalContent ? (
                <JournalComponent
                  setJournalButtonEnabled={setJournalButtonEnabled}
                  ref={journalRef}
                  visible={showJournalContent}
                  setFinishReading={setFinishReading}
                  onClose={({isCompleted}:{isCompleted?:boolean}) => {
                    console.log('🔍 JOURNAL CLOSE - Handling journal close:', {
                      isCompleted,
                      previousValue: reflectionCompleted,
                      homeStoreState: useHomeStore.getState().reflectionCompleted,
                      timestamp: new Date().toLocaleTimeString()
                    });
                    
                    // Only reset reflection completion if the user didn't complete it
                    if (!isCompleted) {
                      console.log('🔍 JOURNAL CLOSE - Setting reflectionCompleted to false (cancelled)');
                      setReflectionCompleted(false);
                    } else {
                      console.log('🔍 JOURNAL CLOSE - Keeping reflectionCompleted as true (completed)');
                      // Ensure it stays true
                      setReflectionCompleted(true);
                    }
                    // Start fade out
                    Animated.parallel([
                      // Card content fade out
                      Animated.timing(devotionalCardOpacityAnim, {
                        toValue: 0,
                        duration: 500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                      }),
                      // Lamb fade out at the same time
                      Animated.timing(riveArtboardOpacityAnim, {
                        toValue: 0,
                        duration: 500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                      })
                    ]).start();
                    // Switch content and artboard immediately after a short delay
                    setTimeout(() => {
                      // Hide devotional content and reset lamb state
                      setShowJournalContent(false);
                      const currentMood = useUserStore.getState()?.getLambMood?.();
                      const targetStateInput = moodToStateInput[currentMood] || 0;
                      setCurrentStateInput(targetStateInput);
                      if (riveRef.current?.setInputState) {
                        riveRef.current.setInputState('State Machine 1', 'Number 1', targetStateInput);
                      }

                      // Start fade in immediately after content switch
                      Animated.parallel([
                        // Card content fade in
                        Animated.timing(devotionalCardOpacityAnim, {
                          toValue: 1,
                          duration: 500,
                          easing: Easing.inOut(Easing.ease),
                          useNativeDriver: true,
                        }),
                        // Lamb fade in at the same time
                        Animated.timing(riveArtboardOpacityAnim, {
                          toValue: 1,
                          duration: 500,
                          easing: Easing.inOut(Easing.ease),
                          useNativeDriver: true,
                        })
                      ]).start(() => {
                        // Reset reader state after animations complete
                        setShowJournalReader(false);
                      });
                    }, 250); // Switch content halfway through fade out

                  }}
                />
              ) : showPrayerContent ?
                <PrayerView
                setIsCompletePrayerDisabled={setIsCompletePrayerDisabled}
                  ref={prayerViewRef}
                  setShowControlRow={setShowControlRow}
                  showControlRow={showControlRow}
                  visible={showPrayerContent}
                  setFinishReading={setFinishReading}
                  onClose={({isReflectPresses}:{isReflectPresses?:boolean}) => {
                    if (isReflectPresses) {
                      // Transitioning to reflection view
                      setFinishReading(false);
                      handleReflectionPress();
                      setTimeout(() => {
                        setShowPrayerContent(false);
                        setPrayerViewVisible(false);
                      }, 500);
                    } else {
                      // Closing to go back to home screen
                      setPrayerViewVisible(false);
                      // Start fade out
                      Animated.parallel([
                        // Card content fade out
                        Animated.timing(devotionalCardOpacityAnim, {
                          toValue: 0,
                          duration: 500,
                          easing: Easing.inOut(Easing.ease),
                          useNativeDriver: true,
                        }),
                        // Lamb fade out at the same time
                        Animated.timing(riveArtboardOpacityAnim, {
                          toValue: 0,
                          duration: 500,
                          easing: Easing.inOut(Easing.ease),
                          useNativeDriver: true,
                        })
                      ]).start();
                      // Switch content and artboard immediately after a short delay
                      setTimeout(() => {
                        // Hide prayer content and reset lamb state
                        setMode('DEFAULT');
                        setShowPrayerContent(false);
                        // Reset Rive state to default
                        if (riveRef.current?.setInputState) {
                          try {
                            const currentMood = useUserStore.getState()?.getLambMood?.();
                            const targetStateInput = moodToStateInput[currentMood] || 0;
                            setCurrentStateInput(targetStateInput);
                            setRiveIdle();
                            if (riveRef.current?.setInputState) {
                              riveRef.current.setInputState('State Machine 1', 'Number 1', targetStateInput);
                            }
                          } catch (e) {
                            console.log('Error resetting Rive state:', e);
                          }
                        }
                        // Start fade in immediately after content switch
                        Animated.parallel([
                          // Card content fade in
                          Animated.timing(devotionalCardOpacityAnim, {
                            toValue: 1,
                            duration: 500,
                            easing: Easing.inOut(Easing.ease),
                            useNativeDriver: true,
                          }),
                          // Lamb fade in at the same time
                          Animated.timing(riveArtboardOpacityAnim, {
                            toValue: 1,
                            duration: 500,
                            easing: Easing.inOut(Easing.ease),
                            useNativeDriver: true,
                          })
                        ]).start(() => {
                          // Reset prayer view state after animations complete
                          setShowPrayerView(false);
                        });
                      }, 250); // Switch content halfway through fade out
                    }
                  }}
                />
                : (
                  <BottomSheetScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 24 }}>
                    {/* Share Card - shown when all activities completed */}
                    {prayerCompleted && readingCompleted && reflectionCompleted && (currentDevotional || devotionalData) && (
                      <DailyVerseCard
                        devotional={currentDevotional || devotionalData!}
                        share={true}
                        onPress={() => setShowShareCard(true)}
                        onShare={handleShare}
                        onExpand={() => setShowShareCard(true)}
                        showShareButton={true}
                        showExpandButton={true}
                      />
                    )}


                    <View
                      className="flex-row items-center justify-between "
                      style={{ marginTop: responsiveHeight(2) }}>
                      {/* Circle/checkmark indicator for Daily Bread */}
                      <View
                        style={{
                          width: 22,
                          marginRight: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                        {readingCompleted ? (
                          <Image
                            source={require('../../assets/icons/checkMini.png')}
                            style={{ width: 20, height: 20, resizeMode: 'contain' }}
                          />
                        ) : (
                          <View
                            className="bg-textPrimary/15"
                            style={{ width: 20, height: 20, borderRadius: 12 }}
                          />
                        )}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <SecondaryButton
                          icon={breadIcon}
                          title="Daily Bread – Read"
                          subtitle="Feed your soul with scripture"
                          points={25}
                          onPress={handleReadPress}
                          completed={readingCompleted}
                        />
                      </View>
                    </View>
                    <View
                      className="flex-row items-center "
                      style={{ marginTop: responsiveHeight(2) }}>
                      {/* Circle/checkmark indicator for Living Water */}
                      <View
                        style={{
                          width: 22,
                          marginRight: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        {prayerCompleted ? (
                          <Image
                            source={require('../../assets/icons/checkMini.png')}
                            style={{ width: 20, height: 20, resizeMode: 'contain' }}
                          />
                        ) : (
                          <View
                            className="bg-textPrimary/15"
                            style={{ width: 20, height: 20, borderRadius: 12 }}
                          />
                        )}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <SecondaryButton
                          icon={dropIcon}
                          title="Living Water – Pray"
                          subtitle="Feed your soul with scripture"
                          points={25}
                          onPress={handlePrayerPress}
                          completed={prayerCompleted}
                          disabled={!readingCompleted}
                        />
                      </View>
                    </View>
                    <View
                      className="flex-row items-center"
                      style={{ marginTop: responsiveHeight(2) }}>
                      {/* Circle/checkmark indicator for Quiet Time */}
                      <View
                        style={{
                          width: 22,
                          marginRight: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                        {reflectionCompleted ? (
                          <Image
                            source={require('../../assets/icons/checkMini.png')}
                            style={{ width: 20, height: 20, resizeMode: 'contain' }}
                          />
                        ) : (
                          <View
                            className="bg-textPrimary/15"
                            style={{ width: 20, height: 20, borderRadius: 12 }}
                          />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <SecondaryButton
                          icon={bibleIcon}
                          title="Quiet Time – Reflect"
                          subtitle="Feed your soul with scripture"
                          points={25}
                          onPress={handleReflectionPress}
                          completed={reflectionCompleted}
                          disabled={!readingCompleted}
                        />
                      </View>
                    </View>

                    {/* Loading state for devotional */}
                    {isLoadingDevotional && (
                      <View className="bg-white/60 rounded-xl p-4 mb-4 border border-lightGreen/20">
                        <View className="flex-row items-center mb-2">
                          <View className="w-6 h-6 bg-lightGreen rounded-full items-center justify-center mr-2">
                            <Text className="text-darkGreen text-xs font-feather">📖</Text>
                          </View>
                          <Text className="font-feather text-base text-description">
                            Loading daily verse...
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Error state for devotional */}
                    {devotionalError && !currentDevotional && (
                      <View className="bg-red/10 rounded-xl p-4 mb-4 border border-red/20">
                        <View className="flex-row items-center mb-2">
                          <View className="w-6 h-6 bg-red rounded-full items-center justify-center mr-2">
                            <Text className="text-white text-xs font-feather">⚠️</Text>
                          </View>
                          <Text className="font-feather text-base text-red">
                            Daily verse unavailable
                          </Text>
                        </View>
                        <Text className="font-din text-sm text-description">
                          Check your connection and try again later.
                        </Text>
                      </View>
                    )}
                  </BottomSheetScrollView>
                )}
            </Animated.View>
          </BottomSheet>

{/* BUTTONS */}
       <Animated.View 
          style={[
            bottomContentStyle,
            {bottom:RPH(3)},
            { 
              opacity: showPrayerContent ? controlRowOpacity : 1,
              pointerEvents: showPrayerContent ? (isControlRowVisible ? 'auto' : 'none') : 'auto'
            }
          ]}
        className='px-10 absolute items-center w-full justify-between'
         
          
          >
         {showDevotionalContent &&    <View className='flex-row    items-center w-full justify-between mr-12'>
                {/* {cardsToShow[0]?.reference && ( */}
             
                  {/* )} */}
                  {/* Top right icons */}
                  <View className="flex-row gap-3">
                    <Image source={require('../../assets/icons/share.png')} style={{opacity:0.7}} />
                    <Image source={require('../../assets/icons/bookmark.png')} style={{opacity:0.7}} />
                  </View>
                </View>}
                <View  className="flex-row items-center    justify-between w-full">

          {!showJournalContent && <Animated.View style={{ width:  '10%'}}>
            <CircleButton 
              icon='chevron-left' 
              size={53} 
              onPress={()=>{
                if(showDevotionalContent){
                  handleDevotionalClose({})
                  devotionalReaderRef.current?.handleClose();
                }
                if(showPrayerContent){
                  prayerViewRef.current?.handleBack();
                }
              }} 
              
            />
          </Animated.View>}

          <Animated.View style={{ width: showPrayerContent ? '60%' : showJournalContent ? '100%' : '82%' }}>
           {showDevotionalContent ? (
  <PrimaryButton
    title={buttonTitle}
    onPress={handleDevotionalFinishPress}
    disabled={devotionalReaderRef.current?.isRewarding || !devotionalReadedFully}
    buttonType="blue"
    icon={require('../../assets/icons/starIcon.png')}
    reward={'+25'}
    opacity={!devotionalReadedFully ? 0.7 : 1}
  />
) : showPrayerContent  ? (
  <BluePrimaryButton
    title="Amen"
    width="100%"
    disabled={isCompletePrayerDisabled}
    onPress={() => {
      prayerViewRef.current?.handleCompletePrayer();
    }}
  />
) : null}
          </Animated.View> 
          
         {showPrayerContent && <Animated.View style={{ width: '10%' }}>
          <CircleButton
                      icon="settings"
                      size={50}
                      // hapticsEnabled={hapticsEnabled}
                      onPress={() => {
                        prayerViewRef.current?.handleSettings();
                      }}
                    />
          </Animated.View>}
          </View>
        </Animated.View>
        
{/* BUTTONS END */}
          {/* Widget and Explainer Modals - Keep these inside SafeAreaView */}
          <WidgetHowToSheet visible={showWidgetSheet} onClose={handleWidgetSheetClose} />
          <HeartsExplainerModal
            visible={showHeartsModal}
            onClose={() => setShowHeartsModal(false)}
          />
          <ExplainerModal
            visible={showExplainerModal}
            onClose={() => setShowExplainerModal(false)}
          />
        </SafeAreaView>
      </Animated.View>

      <FullScreenShareCard visible={showShareCard} devotionalData={devotionalData} onClose={() => setShowShareCard(false)} onShare={handleShare} />


      <Toast config={toastConfig} />
    </>
  );
}