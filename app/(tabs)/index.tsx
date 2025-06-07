import { useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  ScrollView,
  StatusBar,
} from 'react-native';
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

import analytics from '~/utils/analytics';
import WidgetHowToSheet from '../../components/WidgetHowToSheet';
import useSubscriptionStore from '../stores/subscriptionStore';
import { getLevelData } from '../../utils/levelUtils';
import { useDevotionalStore } from '../stores/devotionalStore'; // Import devotional store
import bibleIcon from '../../assets/icons/bibleIcon.png';
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

  const currentUser = auth().currentUser;
  console.log('currentUser======>', currentUser);

  // Use Zustand store for mode management
  const mode = useHomeStore((state) => state.mode);
  const setMode = useHomeStore((state) => state.setMode);
  const setDevotionalReaderVisible = useHomeStore((state) => state.setDevotionalReaderVisible);
  const devotionalReaderVisible = useHomeStore((state) => state.devotionalReaderVisible);

  // Get completion states from the store
  const readingCompleted = useHomeStore((state) => state.readingCompleted);
  const prayerCompleted = useHomeStore((state) => state.prayerCompleted);
  const reflectionCompleted = useHomeStore((state) => state.reflectionCompleted);

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

  // State to manage the Rive resource name
  const [artboardName, setArtboardName] = useState('lamb-idle'); // Default artboard
  // State to control background Rive animation
  const [showBgRive, setShowBgRive] = useState(false);
  // Lamb size animation
  const lambSizeAnim = useRef(new Animated.Value(256)).current; // Start with full size (256px)

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
    require('../../assets/riveAnimations/homeLamb.riv'),
    require('../../assets/riveAnimations/bg-green.riv'),
    require('../../assets/riveAnimations/goldLamb.riv'), // Add goldLamb to preloaded assets
    require('../../assets/riveAnimations/lamb-wings-idle.riv'), // Add goldLamb to preloaded assets
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
  
  // Devotional reader animation values
  const devotionalHeaderOpacityAnim = useRef(new Animated.Value(0)).current; // 0 = hidden, 1 = visible
  const devotionalBgOpacityAnim = useRef(new Animated.Value(0)).current; // 0 = no overlay, 0.7 = black overlay

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

  // --- Mood to Artboard Mapping ---
  const moodToArtboard: Record<string, string> = {
    'lamb-idle': 'lamb-idle',
    'lamb-sleepy': 'lamb-sleepy',
    'lamb-angry': 'lamb-angry',
    'lamb-chubby dying': 'lamb-chubby dying',
    'lamb-skinny dying': 'lamb-skinny dying',
    smoking: 'lamb-dead',
    'lamb-full': 'lamb-full',
  };

  // Get UI store functions
  const showPrayerSheet = useUIStore((state) => state.showPrayerSheet);
  const showWidgetPrompt = useUIStore((state) => state.showWidgetPrompt);

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

    // Smooth artboard change with fade animation - faster
    const changeArtboardWithFade = (newArtboard: string) => {
      Animated.timing(riveArtboardOpacityAnim, {
        toValue: 0,
        duration: 100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setArtboardName(newArtboard);
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
      // Update artboard based on lamb mood from userStore
      const currentMood = useUserStore.getState()?.getLambMood?.();
      console.log('Current mood:', currentMood);
      const targetArtboard = (currentMood && moodToArtboard[currentMood]) ? moodToArtboard[currentMood] : 'lamb-idle';
      changeArtboardWithFade(targetArtboard);
      
      modeAnim = Animated.timing(previewAnim, {
        toValue: 1,
        duration,
        easing: Easing.bezier(0.16, 1, 0.3, 1), // Use a more natural spring-like easing
        useNativeDriver: true,
      });
    } else if (mode === 'PRAYER') {
      changeArtboardWithFade('lamb-drinking');
      modeAnim = Animated.timing(prayerAnim, {
        toValue: 1,
        duration,
        easing: Easing.bezier(0.16, 1, 0.3, 1), // Use a more natural spring-like easing
        useNativeDriver: true,
      });
    } else if (mode === 'REFLECTION') {
      changeArtboardWithFade('lamb-writing');
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

  // --- useEffect to react to external mode changes ---
  useEffect(() => {
    console.log(isPro, 'what is pro');
    console.log('HomeScreen: Mode changed to', mode);
    console.log('DEBUG - Current completion status:', {
      readingCompleted,
      prayerCompleted,
      reflectionCompleted,
      allCompleted: readingCompleted && prayerCompleted && reflectionCompleted,
      mode,
    });

    if (mode === 'DEFAULT') {
      animateToDefault();
      // Update artboard based on lamb mood from userStore with smooth fade
      const currentMood = useUserStore.getState()?.getLambMood?.();
      console.log('Current mood:', currentMood);
      const targetArtboard = (currentMood && moodToArtboard[currentMood]) ? moodToArtboard[currentMood] : 'lamb-idle';
      
      // Smooth fade transition for artboard change - faster
      Animated.timing(riveArtboardOpacityAnim, {
        toValue: 0,
        duration: 100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setArtboardName(targetArtboard);
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

      // Only set the artboard name if it's not already set to lamb-drinking
      if (artboardName !== 'lamb-drinking') {
        // Smooth fade transition - faster
        Animated.timing(riveArtboardOpacityAnim, {
          toValue: 0,
          duration: 100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start(() => {
          setArtboardName('lamb-drinking');
          Animated.timing(riveArtboardOpacityAnim, {
            toValue: 1,
            duration: 150,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }).start();
        });
      }

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
        setArtboardName('lamb-reading');
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
      // Don't proceed if reading is not completed
      if (!readingCompleted) {
        console.log('Prayer button disabled: Reading not completed');
        return;
      }

      // Remove rigid haptic feedback

      // Show the global prayer sheet and set mode to PRAYER when prayer is generated
      showPrayerSheet(() => {
        setMode('PRAYER');
      });
    }
  };

  const handleReflectionPress = () => {
    if (!isPro && reflectionCompleted) {
      setFromScreen('home-reflection');
      handleSubscriptionPress();
    } else {
      console.log('Reflection button pressed');

      // Don't proceed if reading is not completed
      if (!readingCompleted) {
        console.log('Reflection button disabled: Reading not completed');
        return;
      }

      // Remove heavy haptic feedback

      // Update the mode in the store
      setMode('REFLECTION');

      // Animate to reflection state
      animateToState(0.5, journalOpacityAnim, 800, 'REFLECTION');

      // Rotate the lamb slightly when transitioning to reflection
      Animated.timing(riveRotateAnim, {
        toValue: 0.05, // Slightly rotated
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // Return to normal rotation after a delay
        Animated.timing(riveRotateAnim, {
          toValue: 0,
          duration: 500,
          delay: 500,
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
    console.log('DEBUG - Current completion status when closing overlay:', {
      readingCompleted,
      prayerCompleted,
      reflectionCompleted,
      allCompleted: readingCompleted && prayerCompleted && reflectionCompleted,
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
    console.log('DEBUG - Completion status changed:', {
      readingCompleted,
      prayerCompleted,
      reflectionCompleted,
      mode,
    });

    if (mode === 'DEFAULT') {
      // Always set artboard based on lamb mood in DEFAULT mode with smooth fade
      const targetArtboard = moodToArtboard[lambMood] || 'lamb-idle';
      if (artboardName !== targetArtboard) {
        Animated.timing(riveArtboardOpacityAnim, {
          toValue: 0,
          duration: 100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start(() => {
          setArtboardName(targetArtboard);
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
    // Log screen view when component mounts
    analytics.logEvent('HomeScreen_Viewed');

    // Fetch today's devotional when component mounts
    console.log('📖 About to call fetchTodaysDevotional');
    fetchTodaysDevotional();
    console.log('📖 fetchTodaysDevotional call completed');
  }, []);

  // Add the hooks with the other state hooks (right before line 619)
  const riveComponent = useMemo(() => {
    if (!riveAssets || !riveReady) return null;

    // Calculate lamb scale based on level (grows with level)
    // Level 1: 55% size, Level 10+: 110% size (10% larger overall)
    const lambLevel = lamb?.level || 1;
    const minScale = 0.55; // 55% size at level 1 (was 50%)
    const scaleFactor = Math.min(minScale + (lambLevel - 1) * 0.055, 1.1); // Max is now 110%

    console.log(`Lamb level: ${lambLevel}, Scale factor: ${scaleFactor}`);

    // Use the appropriate Rive asset based on pro status and level
    let lambAssetIndex;
    let useArtboardName: string | undefined = artboardName;

    if (lambLevel >= 33) {
      // Level 33: Use lamb-wings-idle.riv with no artboard name
      lambAssetIndex = 3; // lamb-wings-idle.riv
      useArtboardName = undefined; // No artboard name for wings animation
    } else {
      // Levels 1-32: Use normal or pro lamb based on pro status
      lambAssetIndex = isPro ? 2 : 0; // Index 2 for goldLamb, 0 for homeLamb
    }

    // Calculate position adjustment to keep lamb centered
    // As the lamb gets smaller, we need to adjust its position to stay centered
    const positionAdjustment = (1 - scaleFactor) * 50; // % adjustment for centering

    // Calculate shadow scale and color for levels 10+
    const shouldShowRedShadow = lambLevel >= 10 && lambLevel < 24;
    const shouldShowYellowShadow = lambLevel >= 24;
    let shadowScale = 0;

    if (shouldShowRedShadow) {
      // Red shadow from level 10-23: scale from 0.5 to 1.2
      const levelProgress = Math.min((lambLevel - 10) / (23 - 10), 1); // 0 to 1
      shadowScale = 0.55 + levelProgress * 0.7; // 0.5 to 1.2
      console.log(`Red shadow debug - Level: ${lambLevel}, Scale: ${shadowScale}`);
    } else if (shouldShowYellowShadow) {
      // Yellow shadow from level 24-33: scale from 0.6 to 1.5 (fresh growth)
      const levelProgress = Math.min((lambLevel - 24) / (33 - 24), 1); // 0 to 1
      shadowScale = 0.35 + levelProgress * 0.9; // 0.6 to 1.5
      console.log(`Yellow shadow debug - Level: ${lambLevel}, Scale: ${shadowScale}`);
    }

    return (
      <View
        style={{
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {/* Red shadow behind lamb for level 10+ */}
        {shouldShowRedShadow && (
          <Image
            source={require('../../assets/redShadow.png')}
            style={{
              position: 'absolute',
              width: 300 * shadowScale,
              height: 300 * shadowScale,
              zIndex: -10,
              borderRadius: 300,
            }}
            resizeMode="cover"
          />
        )}
        {shouldShowYellowShadow && (
          <Image
            source={require('../../assets/yellowShadow.png')}
            style={{
              position: 'absolute',
              width: 300 * shadowScale,
              height: 300 * shadowScale,
              zIndex: -10,
              borderRadius: 300,
            }}
            resizeMode="cover"
          />
        )}
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
          className="bg-surfaceCream/80 rounded-full items-center justify-center flex-row h-6 -mb-2 px-2">
          <Text className="font-feather text-textPrimary text-xs">
            {lambName
              ? `${lambName.charAt(0).toUpperCase()}${lambName.slice(1).toLowerCase().slice(0, 8)}${lambName.length > 9 ? '...' : ''}`
              : ''}
          </Text>
        </TouchableOpacity>
        <View
          style={{
            width: `${scaleFactor * 100}%`,
            height: `${scaleFactor * 100}%`,
            alignItems: 'center',
            justifyContent: 'center',
            // Add overflow hidden to prevent any rendering issues with larger size
            overflow: 'hidden',
            zIndex: 10,
          }}>
          {IS_ANDROID ? (
            <Rive
              key={riveKey}
              ref={riveRef}
              resourceName={lambAssetIndex === 2 ? 'gold_lamb' : 'home_lamb'}
              artboardName={artboardName}
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
              url={riveAssets[lambAssetIndex].uri!}
              artboardName={artboardName}
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
  }, [riveAssets, artboardName, riveKey, riveReady, isPro, lamb?.level]);

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

  // Gate of rendering: only render the screen if the assets are ready
  if (!assetsLoaded || !assets) return null;

  const isDarkContant = new Date().getHours() >= 19;

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
            { position: 'absolute', width: '100%', height: '100%' },
            { opacity: 0.4 },
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
            { position: 'absolute', width: '100%', height: '100%' },
            { opacity: 0.4 },
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
        <Animated.View
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
        />

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
                        label={(lambHearts > 0 ? levelInfo.level : '0')?.toString?.()}
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
                        analytics.logEvent('HomeScreen_Tapped_Star');
                        Toast.show({
                          type: 'info',
                          text1: 'Increase your streak!',
                          text2: 'Complete your daily bread reading to build your streak.',
                          position: 'top',
                          visibilityTime: 4000,
                        });
                      }}>
                      <ProgressPill value={0} label={streakCount?.toString?.()} icon={dropIcon} />
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
                Daily Devotional
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
                  {artboardName === 'lamb-dead' && <View style={{ height: 36 }} />}
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
          <Animated.View
            style={{
              flex: 1,
              marginTop: showDevotionalContent ? -124 : -124,
              opacity: bottomCardOpacity,
              marginBottom: -120,
            }}>
                          <Animated.View
                className="bg-surfaceCream rounded-t-card px-6 py-6 flex-1 justify-start gap-2"
                style={{
                  ...Platform.select({
                    ios: {
                      shadowColor: 'rgba(0,0,0,0.08)',
                      shadowOffset: { width: 0, height: 2 },
                      shadowRadius: 4,
                      shadowOpacity: 1,
                    },
                    android: { elevation: 3, shadowColor: 'rgba(0,0,0,0.08)' },
                  }),
                }}>
                <View
                  className="w-[50px] h-[5] bg-textPrimary/15 rounded-full"
                  style={{ position: 'absolute', top: 10, alignSelf: 'center' }}
                />
                {/* Animated content wrapper - only this fades */}
                <Animated.View style={{ flex: 1, opacity: devotionalCardOpacityAnim }}>
                  {/* Conditionally show DevotionalReader or normal content */}
                  {showDevotionalContent ? (
                <DevotionalReader
                  visible={showDevotionalContent}
                  onClose={() => {
                    // Immediately mark devotional reader as hidden so overlay/header animations start in sync
                    setDevotionalReaderVisible(false);
                    
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
                      // Hide devotional content and reset lamb artboard
                      setShowDevotionalContent(false);
                      const currentMood = useUserStore.getState()?.getLambMood?.();
                      const targetArtboard = moodToArtboard[currentMood] || 'lamb-idle';
                      setArtboardName(targetArtboard);
                      
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
                  }}
                />
              ) : (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 120 }}>
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
                            “{currentDevotional.verse}”
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
                </ScrollView>
              )}
                </Animated.View>
              </Animated.View>
            </Animated.View>

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
      <Toast config={toastConfig} />
    </>
  );
}
