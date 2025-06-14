import { useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageBackground,
  Platform,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  Pressable,
  PanResponder,
  Share,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import Toast, { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import Rive, { RiveRef, RNRiveError } from 'rive-react-native';
import DevotionalReader from '../../components/DevotionalReader';
import ProgressPill from '../../components/ProgressPill';
import SecondaryButton from '../../components/SecondaryButton';
import HeartsExplainerModal from '../../components/HeartsExplainerModal';
import ExplainerModal from '../../components/ExplainerModal';
import { HomeMode, useHomeStore } from '../stores/homeStore'; // Import Zustand store
import { usePathStore } from '../stores/pathStore'; // Import path store
import { useUIStore } from '../stores/uiStore'; // Import UI store
import { useUserStore } from '../stores/userStore'; // Import user store
import { useAssetsStore, imageAssets } from '../stores/assetsStore';
import { useAssets } from 'expo-asset';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import * as Sharing from 'expo-sharing';
import analytics from '~/utils/analytics';
import WidgetHowToSheet from '../../components/WidgetHowToSheet';
import useSubscriptionStore from '../stores/subscriptionStore';
import { getLevelData } from '../../utils/levelUtils';
import { useDevotionalStore } from '../stores/devotionalStore'; // Import devotional store
import bibleIcon from '../../assets/icons/bibleIcon.png';
import FullScreenShareCard from '../../components/FullScreenShareCard';
import SpotlightOverlay from '../../components/SpotlightOverlay';
import { usePrayerStore } from '../stores/prayerStore'; // Import prayer store

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
import JournalComponent from '~/components/JournalComponent';
import PrayerView from '~/components/PrayerView';
import { Devotional } from '../models/Devotional';
import { useLocalSearchParams } from 'expo-router';

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
  const { isPrayPresses } = useLocalSearchParams();
  const currentUser = auth().currentUser;
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
  }, [isPrayPresses]);
  

  // Get current path state from pathStore
  const setPathInProgress = usePathStore((state) => state.setPathInProgress);

  // Get user stats from userStore
  const lambHearts = useUserStore((state) => state?.getLambHearts?.());
  const streakCount = useUserStore((state) => state?.getStreakCount?.());
  const gens = useUserStore((state) => state?.getGens?.());
  const lambMood = useUserStore((state) => state?.getLambMood?.());
  const lambName = useUserStore((state) => state?.getLambName?.()); // Get the lamb's name from userStore

  const lamb = useUserStore((state) => state.getLamb?.()); // Get the complete lamb object

  // Get devotional data from devotionalStore
  const currentDevotional = useDevotionalStore((state) => state.currentDevotional);
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

  // Bottom sheet ref and snap points
  const bottomSheetRef = useRef<BottomSheet>(null);
  // Remove the old snapPoints declaration here
  // ...
  // Keep only the new conditional snapPoints definition
  const snapPoints = useMemo(() => (
    showPrayerContent
      ? ['60%', '65%', '70%', '75%', '80%', '85%', '90%', '100%']
      : ['60%', '65%', '70%', '75%', '80%', '85%', '90%']
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
      // Animate in
      Animated.parallel([
        // Fade out default header
        Animated.timing(headerDefaultOpacityAnim, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        // Fade in devotional header
        Animated.timing(devotionalHeaderOpacityAnim, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
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
        // Fade in default header
        Animated.timing(headerDefaultOpacityAnim, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        // Fade out devotional header
        Animated.timing(devotionalHeaderOpacityAnim, {
          toValue: 0,
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
    if (finishReading) {
      Animated.timing(finishReadingOpacityAnim, {
        toValue: 1,
        duration: 1000, // 2 seconds fade-in for slow opacity increase
        delay: 2500, // 2 seconds delay before starting the fade-in
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(finishReadingOpacityAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [finishReading]);

  // --- useEffect to react to external mode changes ---
  useEffect(() => {
    console.log(isPro, 'what is pro');
    console.log('HomeScreen: Mode changed to', mode);
    console.log('🔍 MODE CHANGE - Current completion status:', {
      readingCompleted,
      prayerCompleted,
      reflectionCompleted,
      allCompleted: readingCompleted && prayerCompleted && reflectionCompleted,
      mode,
      homeStoreSnapshot: {
        readingCompleted: useHomeStore.getState().readingCompleted,
        prayerCompleted: useHomeStore.getState().prayerCompleted,
        reflectionCompleted: useHomeStore.getState().reflectionCompleted,
      },
      timestamp: new Date().toLocaleTimeString()
    });

    if (mode === 'DEFAULT') {
      animateToDefault();
      // Update state based on lamb mood from userStore with smooth fade
      const currentMood = useUserStore.getState()?.getLambMood?.();
      console.log('Current mood:', currentMood);
      const targetState = (currentMood && moodToStateInput[currentMood] !== undefined) ? moodToStateInput[currentMood] : 0;

      // Smooth fade transition for state change - faster
      Animated.timing(riveArtboardOpacityAnim, {
        toValue: 0,
        duration: 100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        if (riveRef.current && riveRef.current.setInputState) {
          try {
            riveRef.current.setInputState('State Machine 1', 'Action-Number', targetState);
            setCurrentStateInput(targetState);
            console.log(`Set Rive Action-Number: ${targetState}`);
          } catch (e) {
            console.log('Error setting Rive state:', e);
          }
        }
        Animated.timing(riveArtboardOpacityAnim, {
          toValue: 1,
          duration: 150,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start();
      });
    } else if (mode === 'PRAYER') {
      // Handle prayer mode activation when coming from other screens
      console.log('Activating Prayer mode from external navigation');
      setShowBgRive(true);

      // Prayer state is already set in handlePrayerPress (Raising Hand - 1)

      // Animate lamb size
      Animated.timing(lambSizeAnim, {
        toValue: 128,
        duration: 800,
        useNativeDriver: false,
      }).start();

      // Trigger the animation to prayer state
      animateToState(1, waterOpacityAnim, 800, 'PRAYER');
    } else if (mode === 'REFLECTION') {
      // Handle reflection mode activation when coming from other screens
      console.log('Activating Reflection mode from external navigation');

      // Animate lamb size
      Animated.timing(lambSizeAnim, {
        toValue: 128,
        duration: 800,
        useNativeDriver: false,
      }).start();

      // Trigger the animation to reflection state
      animateToState(1, journalOpacityAnim, 800, 'REFLECTION');
    }
  }, [mode, readingCompleted, prayerCompleted, reflectionCompleted, lambMood]);

  // --- Event Handlers ---
  const handleReadPress = () => {
    if (!isPro && readingCompleted) {
      setFromScreen('home-read');
      handleSubscriptionPress();
    } else {
      console.log('Read the word button pressed');

      // Set Rive Action-Number to 2 (Eat) after 1 second delay
      setTimeout(() => {
        if (riveRef.current && riveRef.current.setInputState) {
          try {
            riveRef.current.setInputState('State Machine 1', 'Action-Number', 2);
            console.log('Set Rive Action-Number: 2 (Eat)');
          } catch (e) {
            console.log('Error setting Rive Action-Number to Eat:', e);
          }
        } else {
          console.log('Rive ref not ready for Action-Number Eat');
        }
      }, 500);

      // Simple fade animation for content transition - longer duration
      Animated.timing(devotionalCardOpacityAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        // Show devotional content after fade out
        setShowDevotionalContent(true);
        // Fade back in
        Animated.timing(devotionalCardOpacityAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start();
      });

      // Show DevotionalReader state immediately
      setShowDevotionalReader(true);
      setDevotionalReaderVisible(true); // Hide tab bar

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
          riveRef.current.setInputState('State Machine 1', 'Number 1', 9);
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
    }
  };

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

      // Simple fade animation for content transition - longer duration
      Animated.timing(devotionalCardOpacityAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        // Show JournalReader content after fade out
        setShowJournalContent(true);
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
        // Set to Reading state (9)
        setCurrentStateInput(9);
        if (riveRef.current?.setInputState) {
          riveRef.current.setInputState('State Machine 1', 'Number 1', 9);
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
            riveRef.current.setInputState('State Machine 1', 'Number 1', targetStateInput);
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

  // Animation for first load after onboarding
  const firstLoadOpacity = useRef(new Animated.Value(0)).current;

  // Run once on mount to defer heavy work
  useEffect(() => {
    setRiveReady(true);

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

    return () => {
      // Cleanup Rive resources
      if (riveRef.current?.reset) {
        riveRef.current.reset();
      }
    };
  }, []);

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



  // Add the hooks with the other state hooks (right before line 619)
  const riveComponent = useMemo(() => {
    if (!riveAssets || !riveReady) return null;

    // Use the appropriate Rive asset based on pro status and level
    const lambAssetIndex = 0;
    const useArtboardName = '[Main] Shpeherd';

    return (
      <View
        style={{
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            analytics.logEvent('HomeScreen_Tapped_LambName', {
              lambName: lambName,
              currentlyExpanded: isLevelPillExpanded,
              action: isLevelPillExpanded ? 'collapse' : 'expand',
            });
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
              artboardName="[Main] Shpeherd"
              stateMachineName="State Machine 1"
              autoplay
              onError={handleRiveError}
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
              url={riveAssets[0].uri!}
              artboardName="[Main] Shpeherd"
              stateMachineName="State Machine 1"
              autoplay
              onError={handleRiveError}
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
  }, [riveAssets, currentStateInput, riveKey, riveReady, isPro]);

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
  
  // Automatically open DevotionalReader when a quick devotional is available
  useEffect(() => {
    if (customDevotional && !showDevotionalContent) {
      console.log('[HomeScreen] Detected quick devotional. Opening DevotionalReader.');
      setShowDevotionalContent(true);
      setDevotionalReaderVisible(true);
      bottomSheetRef.current?.snapToIndex?.(0);
    }
  }, [customDevotional, showDevotionalContent]);
  
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
                  {'Shepherd'}
                </Text>
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
            handleIndicatorStyle={{
              backgroundColor: '#634012',
              opacity: 0.15,
              width: 50,
              height: 5,
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
                  visible={showDevotionalContent}
                  setFinishReading={setFinishReading}
                  onClose={({isPrayPresses}:{isPrayPresses?:boolean}) => {
                    // Clear custom devotional first
                    clearCustomDevotional();
                    setRiveIdle(); // Set to idle on close
                    // Immediately mark devotional reader as hidden so overlay/header animations start in sync
                
                    // Start fade out
                    if(isPrayPresses){
                      handlePrayerPress()
                      setTimeout(() => {
                        setDevotionalReaderVisible(false);
                      }, 2000);
                    }else{
                      setDevotionalReaderVisible(false);
                    }
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
                        // if(isPrayPresses){
                        //   handlePrayerPress()
                        // }
                      });
                    }, 250); // Switch content halfway through fade out
                  }}
                />

              ) : showJournalContent ? (
                <JournalComponent
                  visible={showJournalContent}
                  setFinishReading={setFinishReading}
                  onClose={() => {
                    console.log('🔍 JOURNAL CLOSE - Setting reflectionCompleted to false:', {
                      previousValue: reflectionCompleted,
                      homeStoreState: useHomeStore.getState().reflectionCompleted,
                      timestamp: new Date().toLocaleTimeString()
                    });
                    setReflectionCompleted(false);
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
                  visible={showPrayerContent}
                  setFinishReading={setFinishReading}
                  onClose={({isReflectPresses}:{isReflectPresses?:boolean}) => {
                    // Immediately mark prayer view as hidden so overlay/header animations start in sync
                    
                    if(isReflectPresses){
                      handleReflectionPress()
                      setTimeout(() => {
                        setPrayerViewVisible(false);
                      
                      }, 2000);
                    }else{
                      setPrayerViewVisible(false);
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
                      // Hide prayer content and reset lamb state
                      // Reset to default state
                      

              
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
                          console.log('Reset Rive state to default');
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
                        // if(isReflectPresses){
                        //   handleReflectionPress()
                        // }
                      });
                    }, 250); // Switch content halfway through fade out
                  }}
                />
                : (
                  <BottomSheetScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 24 }}>
                    {prayerCompleted && readingCompleted && reflectionCompleted  ? (
                      // Share Card
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setShowShareCard(true);
                        }}
                        className="bg-surfaceCream rounded-3xl overflow-hidden mb-4 border border-buttonBorder shadow-card">
                        <ImageBackground
                          source={require('../../assets/backgrounds/nightSky.png')}
                          style={{ width: '100%', }}
                          resizeMode="cover">
                          {/* Dark overlay for readability */}
                          <View className="absolute inset-0 bg-black/30" />

                          {/* Content */}
                          <View className="p-6 h-full justify-between">
                            <View>
                              <Text className="font-feather text-white text-heading mb-1">
                                {devotionalData?.bibleReference}
                              </Text>
                              <Text className="font-din text-white/90 text-heading leading-[26px] mb-7 ">
                                Verse of the day
                              </Text>
                              <Text className="font-din text-white/90 text-heading leading-[22px]">
                                {devotionalData?.verse}
                              </Text>
                            </View>

                            {/* Share Button */}
                            <View className="mt-10 w-full">
                              <TouchableOpacity
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  analytics.logEvent('HomeScreen_Tapped_ShareAchievement');
                                  handleShare()
                                }}
                                className="flex-row items-center justify-center px-5 h-[50px] w-full rounded-full border-[3px] bg-[#4FB8FE] border-[#06B6FE]">
                                <Text className="font-feather text-white text-heading text-center w-full">
                                  Share
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </ImageBackground>
                      </Pressable>
                    ) : (
                      <>
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

                        {/* Daily Verse Card */}
                        {currentDevotional?.verse && (
                          <TouchableOpacity
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              analytics.logEvent('HomeScreen_Tapped_DailyVerse', {
                                bibleReference: currentDevotional.bibleReference,
                              });
                              // TODO: Navigate to full devotional or reader in future
                            }}
                            activeOpacity={0.9}
                            className="rounded-2xl overflow-hidden mb-4">
                            {currentDevotional.imageURL ? (
                              <>
                                <ExpoImage
                                  source={{ uri: currentDevotional.imageURL }}
                                  style={{ width: '100%', height: 180 }}
                                  contentFit="cover"
                                />
                                {/* Dark overlay for readability */}
                                <View className="absolute inset-0 bg-black/30" />

                                {/* Star icon */}
                                <View className="absolute items-center w-full" style={{ top: 4 }}>
                                  <Ionicons name="star" size={28} color="#FFD629" />
                                </View>

                                {/* Text content */}
                                <View className="absolute inset-0 p-4 justify-end">
                                  <Text className="font-feather text-white text-heading mb-1">
                                    {currentDevotional.bibleReference}
                                  </Text>
                                  <Text className="font-feather text-white/90 text-caption mb-1">
                                    Verse of the Day
                                  </Text>
                                  <Text
                                    className="font-din text-white text-body leading-[20px]"
                                    numberOfLines={3}>
                                    {currentDevotional.verse}
                                  </Text>
                                </View>
                              </>
                            ) : (
                              /* Fallback cream card if no image */
                              <View className="bg-surfaceCream px-5 py-4 border border-buttonBorder shadow-card">
                                <View className="flex-row items-center mb-3">
                                  <View className="w-7 h-7 bg-lightGreen rounded-lg items-center justify-center mr-3">
                                    <Text className="text-darkGreen text-[18px]">📖</Text>
                                  </View>
                                  <Text className="font-feather text-heading text-textPrimary">
                                    Daily Verse
                                  </Text>
                                </View>
                                <Text className="font-din text-body text-textPrimary/90 leading-[22px] italic mb-3">
                                  &ldquo;{currentDevotional.verse}&rdquo;
                                </Text>
                                <Text className="font-feather text-sm text-description text-right">
                                  — {currentDevotional.bibleReference}
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        )}

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


                      </>


                    )}
                  </BottomSheetScrollView>
                )}
            </Animated.View>
          </BottomSheet>

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
