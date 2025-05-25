import { useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useRef, useState, } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  ScrollView
} from 'react-native';
import Toast, { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import Rive, { RiveRef, RNRiveError } from 'rive-react-native';
import BiblePreviewComponent from '../../components/BiblePreviewComponent';
import JournalComponent from '../../components/JournalComponent';
import PrayerComponent from '../../components/PrayerComponent';
import ProgressPill from '../../components/ProgressPill';
import SecondaryButton from '../../components/SecondaryButton';
import { HomeMode, useHomeStore } from '../stores/homeStore'; // Import Zustand store
import { usePathStore } from '../stores/pathStore'; // Import path store
import { useUIStore } from '../stores/uiStore'; // Import UI store
import { useUserStore } from '../stores/userStore'; // Import user store
import { useAssetsStore, imageAssets } from '../stores/assetsStore';
import { useAssets } from 'expo-asset';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import analytics from '~/utils/analytics';
import WidgetHowToSheet from '../../components/WidgetHowToSheet';
import useSubscriptionStore from '../stores/subscriptionStore';
import { getLevelData } from '../../utils/levelUtils';
const { height: SCREEN_HEIGHT } = Dimensions.get('window'); // Get screen height
const LAMB_VIEWPORT_PERCENTAGE = 0.4; // 40%
const BASE_LAMB_SIZE = SCREEN_HEIGHT * LAMB_VIEWPORT_PERCENTAGE;

// Max hearts constant
const MAX_HEARTS = 100;

// Backgrounds e ícones - lista única para pré-carregamento
const grassBg = imageAssets[0];
const waterBg = imageAssets[1];
const pathBg = imageAssets[2];
const journalBg = imageAssets[3];
const breadIcon = imageAssets[4];
const dropIcon = imageAssets[5];
const quillIcon = imageAssets[6];
const flameIcon = imageAssets[7];
const gemIcon = imageAssets[8];
const heartIcon = imageAssets[9];
const starIcon = imageAssets[10];

// Custom toast config with tailwind styling
const toastConfig: ToastConfig = {
  success: ({ text1, text2 }: ToastConfigParams<any>) => (
    <View className="bg-surfaceCream rounded-xl px-4 py-3 mx-4 mb-4 border-l-4 border-darkGreen shadow-md">
      <Text className="font-feather text-base text-textPrimary">{text1}</Text>
      {text2 && <Text className="font-din text-sm text-description mt-1">{text2}</Text>}
    </View>
  ),
  error: ({ text1, text2 }: ToastConfigParams<any>) => (
    <View className="bg-surfaceCream rounded-xl px-4 py-3 mx-4 mb-4 border-l-4 border-red shadow-md">
      <Text className="font-feather text-base text-textPrimary">{text1}</Text>
      {text2 && <Text className="font-din text-sm text-description mt-1">{text2}</Text>}
    </View>
  ),
  info: ({ text1, text2 }: ToastConfigParams<any>) => (
    <View className="bg-surfaceCream rounded-xl px-4 py-3 mx-4 mb-4 border-l-4 border-accentGold shadow-md">
      <Text className="font-feather text-base text-textPrimary">{text1}</Text>
      {text2 && <Text className="font-din text-sm text-description mt-1">{text2}</Text>}
    </View>
  ),
};

export default function HomeScreen() {
  const riveRef = useRef<RiveRef>(null);
  const [riveError, setRiveError] = useState<RNRiveError | null>(null);
  const navigation = useNavigation();
  const router = useRouter();

  // Use Zustand store for mode management
  const mode = useHomeStore((state) => state.mode);
  const setMode = useHomeStore((state) => state.setMode);

  // Get completion states from the store
  const readingCompleted = useHomeStore((state) => state.readingCompleted);
  const prayerCompleted = useHomeStore((state) => state.prayerCompleted);
  const reflectionCompleted = useHomeStore((state) => state.reflectionCompleted);

  // Get current path state from pathStore
  const setPathInProgress = usePathStore((state) => state.setPathInProgress);

  // Get user stats from userStore
  const lambHearts = useUserStore((state) => state.getLambHearts());
  const streakCount = useUserStore((state) => state.getStreakCount());
  const gens = useUserStore((state) => state.getGens());
  const lambMood = useUserStore((state) => state.getLambMood());
  const lambName = useUserStore((state) => state.getLambName()); // Get the lamb's name from userStore
  const lamb = useUserStore((state) => state.getLamb()); // Get the complete lamb object

  // State to manage the Rive resource name
  const [artboardName, setArtboardName] = useState('lamb-idle'); // Default artboard
  // State to control background Rive animation
  const [showBgRive, setShowBgRive] = useState(false);
  // Lamb size animation
  const lambSizeAnim = useRef(new Animated.Value(256)).current; // Start with full size (256px)

  // Get subscription state and actions from the store
  const { setFromScreen, presentHalfOffPaywall } = useSubscriptionStore();
  // Get pro status from user store
  const proStatus = useUserStore((state) => state.getProStatus());
  const isPro = proStatus === 'pro';

  // Handle subscription button press using the store action
  const handleSubscriptionPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/PricingScreen' as any);
  }

  // Load Rive assets
  const [riveAssets] = useAssets([
    require('../../assets/riveAnimations/homeLamb.riv'),
    require('../../assets/riveAnimations/bg-green.riv'),
    require('../../assets/riveAnimations/goldLamb.riv'), // Add goldLamb to preloaded assets
    require('../../assets/riveAnimations/lamb-wings-idle.riv') // Add goldLamb to preloaded assets
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

  // Add Rive view specific animations
  const riveScaleAnim = useRef(new Animated.Value(1)).current; // Scale animation
  const riveRotateAnim = useRef(new Animated.Value(0)).current; // Rotation animation

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
    'smoking': 'lamb-dead',
    'lamb-full': 'lamb-full'
  };

  // Get UI store functions
  const showPrayerSheet = useUIStore(state => state.showPrayerSheet);
  const showWidgetPrompt = useUIStore(state => state.showWidgetPrompt);

  const handleRiveError = (error: RNRiveError) => {
    console.error('Rive Error:', error.message, error.type);
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

    if (mode === 'PREVIEW') {
      setArtboardName('lamb-idle');
      // Update artboard based on lamb mood from userStore
      const currentMood = useUserStore.getState().getLambMood();
      console.log('Current mood:', currentMood);
      if (currentMood && moodToArtboard[currentMood]) {
        setArtboardName(moodToArtboard[currentMood]);
      } else {
        setArtboardName('lamb-idle'); // Default fallback
      }
      modeAnim = Animated.timing(previewAnim, {
        toValue: 1,
        duration,
        easing: Easing.bezier(0.16, 1, 0.3, 1), // Use a more natural spring-like easing
        useNativeDriver: true,
      });
    } else if (mode === 'PRAYER') {
      setArtboardName('lamb-drinking');
      modeAnim = Animated.timing(prayerAnim, {
        toValue: 1,
        duration,
        easing: Easing.bezier(0.16, 1, 0.3, 1), // Use a more natural spring-like easing
        useNativeDriver: true,
      });
    } else if (mode === 'REFLECTION') {
      setArtboardName('lamb-writing');
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

  // --- useEffect to react to external mode changes ---
  useEffect(() => {
    console.log(isPro, "what is pro")
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
      setArtboardName('lamb-idle');
      // Update artboard based on lamb mood from userStore
      const currentMood = useUserStore.getState().getLambMood();
      console.log('Current mood:', currentMood);
      if (currentMood && moodToArtboard[currentMood]) {
        setArtboardName(moodToArtboard[currentMood]);
      } else {
        setArtboardName('lamb-idle'); // Default fallback
      }
    } else if (mode === 'PRAYER') {
      // Handle prayer mode activation when coming from other screens
      console.log('Activating Prayer mode from external navigation');
      setShowBgRive(true);

      // Only set the artboard name if it's not already set to lamb-drinking
      if (artboardName !== 'lamb-drinking') {
        setArtboardName('lamb-drinking');
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
      handleSubscriptionPress()
    }
    else {
      console.log('Read the word button pressed');

      // Remove heavy haptic feedback

      // Animate mode transition
      animateToState(0.5, pathOpacityAnim, 800, 'PREVIEW');
      setArtboardName('lamb-reading');

      // Update the mode in the store
      setMode('PREVIEW');

      // Animate the Rive view a bit
      Animated.sequence([
        Animated.timing(riveScaleAnim, {
          toValue: 1.05,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(riveScaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handlePrayerPress = () => {
    console.log('Prayer button pressed');
    if (!isPro && prayerCompleted) {
      setFromScreen('home-prayer');
      handleSubscriptionPress()
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
      handleSubscriptionPress()
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
      setArtboardName('lamb-writing');

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
    analytics.logEvent("HomeScreen_Tapped_AddWidget");
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
      // Always set artboard based on lamb mood in DEFAULT mode
      setArtboardName(moodToArtboard[lambMood] || 'lamb-idle');
    }
  }, [mode, lambMood]);

  // Add this near the top of the component, after other useRef declarations
  const riveKey = useRef('lamb-animation').current;

  // Defer loading of the heavy Rive component until after initial interactions
  const [riveReady, setRiveReady] = useState(false);
  const [isFree, setIsFree] = useState(false);

  // Run once on mount to defer heavy work
  useEffect(() => {
    setRiveReady(true);
  }, []);

  // Add screen view analytics tracking
  useEffect(() => {
    // Log screen view when component mounts
    analytics.logEvent("HomeScreen_Viewed");
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
    let useArtboardName = artboardName;
    
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
      shadowScale = 0.55 + (levelProgress * 0.7); // 0.5 to 1.2
      console.log(`Red shadow debug - Level: ${lambLevel}, Scale: ${shadowScale}`);
    } else if (shouldShowYellowShadow) {
      // Yellow shadow from level 24-33: scale from 0.6 to 1.5 (fresh growth)
      const levelProgress = Math.min((lambLevel - 24) / (33 - 24), 1); // 0 to 1
      shadowScale = 0.35 + (levelProgress * 0.9); // 0.6 to 1.5
      console.log(`Yellow shadow debug - Level: ${lambLevel}, Scale: ${shadowScale}`);
    }

    return (
      <View style={{
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
              position: "absolute",
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
              position: "absolute",
              width: 300 * shadowScale,
              height: 300 * shadowScale,
              zIndex: -10,
              borderRadius: 300,
            }}
            resizeMode="cover"
          />
        )}
        <View
          style={{
            width: `${scaleFactor * 100}%`,
            height: `${scaleFactor * 100}%`,          
            alignItems: 'center',
            justifyContent: 'center',
            // Add overflow hidden to prevent any rendering issues with larger size
            overflow: 'hidden',
            zIndex: 10,
          }}
        >
          
          <Rive
            key={`${riveKey}-${lambLevel}`} // Add level to key to force refresh
            ref={riveRef}
            url={riveAssets[lambAssetIndex].localUri!}
            artboardName={useArtboardName || undefined}
            onError={handleRiveError}
            style={{
              width: '100%',
              height: '100%',
              marginTop: 10
            }}
          />
       
        </View>
      </View>
    );
  }, [riveAssets, artboardName, riveKey, riveReady, isPro, lamb?.level]);

  const [showWidgetSheet, setShowWidgetSheet] = useState(false);
  // Add level pill animation states
  const [isLevelPillExpanded, setIsLevelPillExpanded] = useState(false);
  const levelPillWidthAnim = useRef(new Animated.Value(0)).current;
  const levelPillOpacityAnim = useRef(new Animated.Value(0)).current;
  // Pre-calculate the expanded width for the pill (use a reasonable fixed width instead of screen-based)
  const pillExpandedWidth = 350; // Fixed reasonable width that won't overflow

  // Calculate level and XP progress for the level pill display
  const levelInfo = useMemo(() => {
    if (!lamb || lamb.xp === undefined) return {
      level: 1,
      xp: 0,
      xpForCurrentLevel: 0,
      xpForNextLevel: 90,
      xpProgress: 0,
      xpNeeded: 90,
      progress: 0
    };

    return getLevelData(lamb.xp);
  }, [lamb?.xp]);

  // Gate of rendering: only render the screen if the assets are ready
  if (!assetsLoaded || !assets) return null;

  return (
    <>
      <View className="flex-1">
        {/* Background Layers - Use expo-image for better performance */}
        <Animated.View
          style={[
            { position: 'absolute', width: '100%', height: '100%' },
            { opacity: grassOpacityAnim },
          ]}>
          <Image source={grassBg} style={{ width: '100%', height: '100%' }} />
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
            { opacity: grassOpacityAnim },
          ]}>
          <Image
            source={grassBg}
            style={{ width: '100%', height: '100%' }}
          />
        </Animated.View>

        <Animated.View
          style={[
            { position: 'absolute', width: '100%', height: '100%' },
            { opacity: pathOpacityAnim },
          ]}>
          <Image
            source={pathBg}
            style={{ width: '100%', height: '100%' }}
          />
        </Animated.View>

        <Animated.View
          style={[
            { position: 'absolute', width: '100%', height: '100%' },
            { opacity: journalOpacityAnim },
          ]}>
          <Image
            source={journalBg}
            style={{ width: '100%', height: '100%' }}
          />
        </Animated.View>

        {/* Prayer background Rive animation */}
        <Animated.View
          style={[
            { position: 'absolute', width: '100%', height: '100%', zIndex: 0 },
            { opacity: waterOpacityAnim },
          ]}>
          {showBgRive && riveAssets && (
            <Rive
              url={riveAssets[1].localUri!}
              autoplay={true}
              style={{ width: '160%', height: '160%', top: -300, left: -128 }}
            />
          )}
        </Animated.View>

        <SafeAreaView className="flex-1">
          {/* Header: Contains logic for showing Back OR Title/Stats */}
          <View className="flex-row justify-between items-center px-4 pt-1.5 pb-2 h-[42px] relative">
            {/* Animated Back Button */}

            {/* Animated Default Header Elements (Title + Stats) */}
            <Animated.View
              className="absolute inset-0 flex-row items-center justify-between px-8 w-full"
              style={{ opacity: headerDefaultOpacityAnim }}
              pointerEvents={mode !== 'DEFAULT' ? 'none' : 'auto'}>
              <View className="flex-row items-center flex-1 justify-between">
                {!isLevelPillExpanded && (
                  <Text
                    className="text-h1 font-feather text-white tracking-wide right-2"
                    style={{
                      textShadowColor: 'rgba(0, 0, 0, 0.2)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 2,
                    }}>
                    {lambName
                      ? `${lambName.charAt(0).toUpperCase()}${lambName.slice(1).toLowerCase().slice(0, 8)}${lambName.length > 9 ? '...' : ''}`
                      : 'Shepherd'}
                  </Text>
                )}
                <View className="flex-row gap-2 justify-end ml-2">
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      analytics.logEvent("HomeScreen_Tapped_Level");
                      // Add detailed analytics for XP progress tap
                      analytics.logEvent("HomeScreen_Tapped_XpProgress", {
                        level: levelInfo.level,
                        currentXp: levelInfo.xp,
                        nextLevelXp: levelInfo.xpForNextLevel,
                        progress: Math.round(levelInfo.progress)
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
                        })
                      ]).start();
                    }}
                  >
                    <View style={{ position: 'relative', zIndex: 2 }}>
                      {!isLevelPillExpanded ? (
                        <ProgressPill value={0} label={(lambHearts > 0 ? levelInfo.level : '0').toString()} icon={starIcon} />
                      ) : (
                        <Animated.View
                          className="bg-pillBorder rounded-full overflow-hidden flex-row items-center justify-between -mt-8 p-2"
                          style={{
                            position: 'absolute',
                            right: -36,
                            width: levelPillWidthAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [40, pillExpandedWidth]
                            })
                          }}
                          onLayout={() => {
                            // Debug log to verify the XP calculation
                            console.log(`Level Pill Debug - Level: ${levelInfo.level}, Total XP: ${levelInfo.xp}`);
                            console.log(`XP to next level: ${levelInfo.xpProgress}/${levelInfo.xpNeeded} (${Math.round(levelInfo.progress)}%)`);
                          }}
                        >
                          <View className="bg-white w-8 h-8 rounded-full items-center justify-center">
                            <Image source={starIcon} className="w-7 h-5" />
                          </View>
                          <Animated.View
                            className="flex-1 pl-2"
                            style={{ opacity: levelPillOpacityAnim }}
                          >
                            <View className="flex-row items-center justify-between">
                              <Text className="font-feather text-body text-description">Level {levelInfo.level}</Text>
                              <Text className="font-din text-xs text-description mt-0.5 mr-2">
                                {/* Show actual XP values: current XP / XP needed for next level */}
                                {levelInfo.xp}/{levelInfo.xpForNextLevel} XP
                              </Text>
                            </View>

                            <View className="h-3 bg-lightYellow rounded-full overflow-hidden mb-1 mr-2">
                              <View
                                className="h-full bg-accentGold rounded-full"
                                style={{
                                  width: `${Math.max(Math.min(levelInfo.progress, 100), 1)}%`
                                }}
                              />
                            </View>

                          </Animated.View>
                        </Animated.View>
                      )}
                    </View>
                  </TouchableOpacity>
                  {!isLevelPillExpanded && (
                    <>
                      <TouchableOpacity
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          analytics.logEvent("HomeScreen_Tapped_Star");
                          Toast.show({
                            type: 'info',
                            text1: 'Increase your streak!',
                            text2: 'Complete your daily bread reading to build your streak.',
                            position: 'top',
                            visibilityTime: 4000,
                          });
                        }}
                      >
                        <ProgressPill value={0} label={streakCount.toString()} icon={flameIcon} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          analytics.logEvent("HomeScreen_Tapped_Gems");
                          // Show toast message using Toast component
                          Toast.show({
                            type: 'info',
                            text1: 'Unlock skins at lvl 10!',
                            text2: 'Customize your lamb with special skins from the shop.',
                            position: 'top',
                            visibilityTime: 4000,
                          });
                        }}
                      >
                        <ProgressPill value={0} label={gens.toString()} icon={gemIcon} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </Animated.View>
          </View>

          {/* Top Section - Lamb Avatar */}
          <Animated.View
            className="items-center justify-center"
            style={{
              opacity: lambOpacityAnim,
              transform: [{ translateX: lambTranslateX }, { translateY: lambTranslateY }],
              height: BASE_LAMB_SIZE,
              // Add conditional shadow for the glow effect
              shadowColor: showGlow ? '#FDE047' : 'transparent', // yellow-300
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: showGlow ? 0.6 : 0,
              shadowRadius: 15, // Adjust radius for softness
            }}>
            <Animated.View className="items-center justify-center overflow-hidden" style={{}}>
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
                  {artboardName === 'lamb-dead' && (
                    <View style={{ height: 36 }} />
                  )}
                </>
              )}
            </Animated.View>
          </Animated.View>

          {/* SUPER badge for pro users */}
          {mode === 'DEFAULT' && (
            <TouchableOpacity
              onPress={() => {
                if (!isPro) {
                  analytics.logEvent("HomeScreen_TappedProBadge");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  
                  // Check if user has seen half-off paywall before
                  const subscriptionStore = useSubscriptionStore.getState();
                  if (subscriptionStore.shouldShowFreeTrialPaywall()) {
                    // User has seen half-off paywall before, show free trial
                    console.log('[HomeScreen] Showing free trial paywall (user has seen half-off before)');
                    subscriptionStore.presentFreeTrialPaywall();
                    
                    setTimeout(() => {
                      setIsFree(true);
                    }, 2000);
                  } else {
                    // First time or user hasn't seen half-off paywall, show half-off
                    console.log('[HomeScreen] Showing half-off paywall (first time)');
                    subscriptionStore.presentHalfOffPaywall();
                  }
                }
              }}
              activeOpacity={0.8}
              style={{
                position: 'absolute',
                left: 24,
                // Place it roughly at the bottom of the lamb viewport
                top: SCREEN_HEIGHT * 0.35,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 32,
                zIndex: 20,
              }}
            >
              <LinearGradient
                colors={['#F7B500', '#FFF45B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{
                  position: 'absolute',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 32,
                  zIndex: 20,
                  opacity: isPro ? 1 : 1
                }}
              >
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
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Bottom Section - Action Buttons Card */}
          <Animated.View
            className="bg-surfaceCream rounded-t-card px-6 py-6 flex-1 justify-start gap-2 -mt-28"
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
              opacity: bottomCardOpacity,
            }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 120 }}
            >
              <View className="flex-row items-center gap-2.5 mb-0 px-1">
                <View className="flex-1 h-4 bg-pillBorder rounded-full overflow-hidden">
                  <View
                    className="h-full bg-red rounded-full"
                    style={{ width: `${Math.min(100, (lambHearts / MAX_HEARTS) * 100)}%` }}
                  />
                </View>
                <View className="flex-row items-center gap-1">
                  <Text className="font-feather text-body text-description">
                    {lambHearts}/{MAX_HEARTS}
                  </Text>
                  <Image source={heartIcon} className="w-8 h-8" />
                </View>
              </View>

              <SecondaryButton
                icon={breadIcon}
                title="Daily Bread – Read"
                subtitle="Feed your soul with scripture"
                points={5}
                onPress={handleReadPress}
                completed={readingCompleted}
              />
              <SecondaryButton
                icon={dropIcon}
                title="Living Water – Pray"
                subtitle="Refresh your spirit with prayer"
                points={5}
                onPress={handlePrayerPress}
                completed={prayerCompleted}
                disabled={!readingCompleted}
              />
              <SecondaryButton
                icon={quillIcon}
                title="Quiet Time – Reflect"
                subtitle="Pause and meet with God"
                points={5}
                onPress={handleReflectionPress}
                completed={reflectionCompleted}
                disabled={!readingCompleted}
              />

              {/* Widget How-To Sheet test button */}
              {/* <TouchableOpacity
              onPress={() => setShowWidgetSheet(true)}
              className="mt-6 flex-row items-center justify-center py-3 px-4 bg-amber-100 border border-amber-300 rounded-xl"
              activeOpacity={0.7}
            >
              <Feather name="smartphone" size={20} color="#B45309" style={{ marginRight: 8 }} />
              <Text className="font-feather text-base text-amber-800">
                How to Add Widget
              </Text>
            </TouchableOpacity> */}


            </ScrollView>
          </Animated.View>

          {/* Overlays */}
          <BiblePreviewComponent visible={mode === 'PREVIEW'} onClose={handleCloseOverlay} />
          <PrayerComponent visible={mode === 'PRAYER'} onClose={handleCloseOverlay} />
          <JournalComponent visible={mode === 'REFLECTION'} onClose={handleCloseOverlay} />
          <WidgetHowToSheet visible={showWidgetSheet} onClose={() => setShowWidgetSheet(false)} />
        </SafeAreaView>
      </View>
      <Toast config={toastConfig} />
    </>
  );
}