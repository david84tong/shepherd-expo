import { useNavigation } from '@react-navigation/native';
import { Asset, useAssets } from 'expo-asset';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  SafeAreaView,
  Text,
  View
} from 'react-native';

import Rive, { RiveRef, RNRiveError } from 'rive-react-native';
import BiblePreviewComponent from '../../components/BiblePreviewComponent';
import JournalComponent from '../../components/JournalComponent';
import PrayerComponent from '../../components/PrayerComponent';
import PrayerSheet, { PrayerSheetRef } from '../../components/PrayerSheet';
import ProgressPill from '../../components/ProgressPill';
import SecondaryButton from '../../components/SecondaryButton';
import { HomeMode, useHomeStore } from '../stores/homeStore'; // Import Zustand store
import { usePathStore } from '../stores/pathStore'; // Import path store
import { useUserStore } from '../stores/userStore'; // Import user store

const { height: SCREEN_HEIGHT } = Dimensions.get('window'); // Get screen height
const LAMB_VIEWPORT_PERCENTAGE = 0.4; // 40%
const BASE_LAMB_SIZE = SCREEN_HEIGHT * LAMB_VIEWPORT_PERCENTAGE;

// Backgrounds
const grassBg = require('../../assets/backgrounds/defaultBackground.png');
const waterBg = require('../../assets/backgrounds/waterBackground.png');
const pathBg = require('../../assets/backgrounds/path1Background.png');
const journalBg = require('../../assets/backgrounds/mainBackground.png'); // Add a background for reflection

// Icons
const breadIcon = require('../../assets/icons/breadIcon.png');
const dropIcon = require('../../assets/icons/waterIcon.png');
const quillIcon = require('../../assets/icons/journalIcon.png');
const flameIcon = require('../../assets/icons/flameIcon.png');
const gemIcon = require('../../assets/icons/greenGemIcon.png');
const heartIcon = require('../../assets/icons/heartIcon.png');
const starIcon = require('../../assets/icons/starIcon.png'); // Import star icon

// Max hearts constant
const MAX_HEARTS = 100;

export default function HomeScreen() {
  const riveRef = useRef<RiveRef>(null);
  const [riveError, setRiveError] = useState<RNRiveError | null>(null);
  const navigation = useNavigation();

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

  // State to manage the Rive resource name
  const [artboardName, setArtboardName] = useState('lamb-idle'); // Default artboard
  // State to control background Rive animation
  const [showBgRive, setShowBgRive] = useState(false);
  // Lamb size animation
  const lambSizeAnim = useRef(new Animated.Value(256)).current; // Start with full size (256px)

  // Load Rive assets
  const [riveAssets] = useAssets([
    require('../../assets/riveAnimations/homeLamb.riv'),
    require('../../assets/riveAnimations/bg-green.riv')
  ]);

  // Add state for asset loading
  const [assetsLoaded, setAssetsLoaded] = useState(false);

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
  const bottomCardTranslateY = useMemo(
    () => uiAnim.interpolate({ inputRange: [0, 0.5], outputRange: [0, 300], extrapolate: 'clamp' }),
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
    'smoking': 'smoke',
    'lamb-full': 'lamb-full'
  };

  // Add ref for the prayer sheet
  const prayerSheetRef = useRef<PrayerSheetRef>(null);

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

      // Set the Rive resource
      setArtboardName('lamb-drinking');

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
    console.log('Read Daily Bread Pressed - Setting resource to lamb-eating');

    // Set the UI mode to preview
    setMode('PREVIEW');
    animateToState(0.5, pathOpacityAnim, 1000, 'PREVIEW');

    // Animate the Rive view itself
    Animated.sequence([
      Animated.parallel([
        Animated.timing(riveScaleAnim, {
          toValue: 0.9,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(riveRotateAnim, {
          toValue: 0.05,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(riveScaleAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(riveRotateAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Set Rive resource after a delay
    setTimeout(() => {
      console.log('Setting Rive to lamb-reading');
      setArtboardName('lamb-reading');
    }, 300);
  };

  const handlePrayerPress = () => {
    console.log('Daily Prayer Pressed - Showing prayer sheet');

    // Provide haptic feedback when prayer button pressed
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });

    // Show the prayer sheet
    prayerSheetRef.current?.show();

    // Original animation code - we'll use this when moving to the prayer component
    // but not immediately, we'll wait for prayer generation
  };

  // Add a new function to handle prayer generation when sheet is submitted
  const handlePrayerGenerated = () => {
    console.log('Prayer Generated - Setting resource to lamb-drinking');
    setMode('PRAYER');
    setShowBgRive(true);

    Animated.timing(lambSizeAnim, {
      toValue: 128,
      duration: 1200,
      useNativeDriver: false,
    }).start();

    animateToState(1, waterOpacityAnim, 1000, 'PRAYER');

    // Animate the Rive view itself
    Animated.sequence([
      Animated.parallel([
        Animated.timing(riveScaleAnim, {
          toValue: 0.85,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(riveRotateAnim, {
          toValue: -0.05,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(riveScaleAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(riveRotateAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Set Rive resource after a delay
    setTimeout(() => {
      console.log('Setting Rive to lamb-drinking');
      setArtboardName('lamb-drinking');
    }, 300);
  };

  const handleReflectionPress = () => {
    console.log('Daily Reflection / QT Pressed - No resource change');
    setMode('REFLECTION');

    Animated.timing(lambSizeAnim, {
      toValue: 128,
      duration: 1200,
      useNativeDriver: false,
    }).start();

    animateToState(1, journalOpacityAnim, 1000, 'REFLECTION');

    // Animate the Rive view itself
    Animated.sequence([
      Animated.parallel([
        Animated.timing(riveScaleAnim, {
          toValue: 0.9,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(riveRotateAnim, {
          toValue: 0.05,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(riveScaleAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(riveRotateAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    // Set Rive resource after a delay
    setTimeout(() => {
      console.log('Setting Rive to lamb-drinking');
      setArtboardName('lamb-writing');
    }, 300);
    // No Rive change needed here currently

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
  }, [readingCompleted, prayerCompleted, reflectionCompleted, mode, lambMood]);

  // --- Load and cache images ---
  const cacheImages = useMemo(
    () => async () => {
      // Define all the assets to preload
      const images = [
        grassBg,
        waterBg,
        pathBg,
        journalBg,
        breadIcon,
        dropIcon,
        quillIcon,
        flameIcon,
        gemIcon,
        heartIcon,
        starIcon,
      ];

      try {
        console.log('Preloading images for faster rendering');

        // Create assets from modules for better caching
        const imageAssets = images.map((image) => Asset.fromModule(image).downloadAsync());

        // Wait for all assets to download and cache
        await Promise.all(imageAssets);

        // Explicitly process asset sources for better native caching

        console.log('Image preloading complete, cached', images.length, 'images');
        setAssetsLoaded(true);
      } catch (error) {
        console.error('Failed to cache images:', error);
        // Continue even if caching fails
        setAssetsLoaded(true);
      }
    },
    []
  ); // Empty dependency array ensures this function only gets created once

  // Call cache images when component mounts
  useEffect(() => {
    cacheImages();
  }, []);

  // Show loading indicator while assets load
  if (!assetsLoaded || !riveAssets) {
    return (
      <View className="flex-1 items-center justify-center bg-surfaceCream">
        <ActivityIndicator size="large" color="#3C584A" />
        <Text className="font-feather text-textPrimary mt-4">Loading Shepherd...</Text>
      </View>
    );
  }

  return (
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
        <View className="flex-row justify-between items-center px-4 pt-1 pb-2 h-[42px] relative">
          {/* Animated Back Button */}

          {/* Animated Default Header Elements (Title + Stats) */}
          <Animated.View
            className="absolute inset-0 flex-row items-center justify-between px-8 w-full"
            style={{ opacity: headerDefaultOpacityAnim }}
            pointerEvents={mode !== 'DEFAULT' ? 'none' : 'auto'}>
            <View className="flex-row items-center flex-1 justify-between">
              <Text
                className="text-h1 font-feather text-white tracking-wide right-0"
                style={{
                  textShadowColor: 'rgba(0, 0, 0, 0.2)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}>
                {lambName || 'Shepherd'}
              </Text>
              <View className="flex-row gap-2 left-8">
                <ProgressPill value={0} label={streakCount.toString()} icon={flameIcon} />
                <ProgressPill value={0} label={gens.toString()} icon={gemIcon} />
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
            elevation: showGlow ? 10 : 0, // Android shadow
          }}>
          <Animated.View className="items-center justify-center overflow-hidden" style={{}}>
            {riveError ? (
              <Text className="text-red-500 p-4 text-center">
                Error loading animation: {riveError.message} ({riveError.type})
              </Text>
            ) : (
              <Animated.View
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
                  {riveAssets && (
                    <Rive
                      ref={riveRef}
                      url={riveAssets[0].localUri!}
                      artboardName={artboardName}
                      onError={handleRiveError}
                      style={{ width: '100%', height: '100%' }}
                    />
                  )}
                </Animated.View>
              </Animated.View>
            )}
          </Animated.View>
        </Animated.View>

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
            transform: [{ translateY: bottomCardTranslateY }],
          }}>
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
          />
          <SecondaryButton
            icon={quillIcon}
            title="Quiet Time – Reflect"
            subtitle="Pause and meet with God"
            points={5}
            onPress={handleReflectionPress}
            completed={reflectionCompleted}
          />
        </Animated.View>

        {/* Overlays */}
        <BiblePreviewComponent visible={mode === 'PREVIEW'} onClose={handleCloseOverlay} />
        <PrayerComponent visible={mode === 'PRAYER'} onClose={handleCloseOverlay} />
        <JournalComponent visible={mode === 'REFLECTION'} onClose={handleCloseOverlay} />

        {/* Add PrayerSheet component */}
        <PrayerSheet
          prayerSheetRef={prayerSheetRef}
          snapPoints={['60%', '85%']}
          onPrayerGenerated={handlePrayerGenerated}
        />
      </SafeAreaView>
    </View>
  );
}
